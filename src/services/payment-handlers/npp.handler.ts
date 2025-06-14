/**
 * NPP Payment Handler
 * Handles NPP (New Payments Platform) specific payment logic
 */

import { IPaymentTypeHandler } from '../bian/bian-operations.interface';
import {
  InitiateNPPPaymentRequest,
  InitiateNPPPaymentResponse,
  NPPPaymentInstruction,
  NPPMessageType,
  NPPUrgency,
  PayIDResolutionResult
} from '../../models/australian-payments/npp.model';

import {
  BianOperationResult,
  PaymentStatus,
  ErrorDetail
} from '../../models/bian/common-types.model';

import { TestScenariosService } from '../../utils/test-scenarios.util';
import { v4 as uuidv4 } from 'uuid';

export class NPPPaymentHandler implements IPaymentTypeHandler<InitiateNPPPaymentRequest, InitiateNPPPaymentResponse> {
  private nppPayments: Map<string, NPPPaymentInstruction> = new Map();

  /**
   * Validate NPP payment request
   */
  public async validate(request: InitiateNPPPaymentRequest): Promise<BianOperationResult<boolean>> {
    const errors: ErrorDetail[] = [];
    const timestamp = new Date().toISOString();

    // Validate PayID if provided
    if (request.payIdDetails) {
      const payIdValidation = this.validatePayID(request.payIdDetails);
      if (!payIdValidation.success && payIdValidation.errors) {
        errors.push(...payIdValidation.errors);
      }
    }

    // Validate NPP specific data
    if (request.nppData) {
      if (!request.nppData.paymentCategory) {
        errors.push({
          errorCode: 'MISSING_PAYMENT_CATEGORY',
          errorDescription: 'NPP payment category is required'
        });
      }
    }

    // Validate amount limits for NPP
    const amount = parseFloat(request.paymentInstructionAmount.amount);
    if (amount > 1000000) {
      errors.push({
        errorCode: 'AMOUNT_EXCEEDS_LIMIT',
        errorDescription: 'NPP payment amount exceeds maximum limit of $1,000,000'
      });
    }

    // Validate BSB format for Australian accounts
    if (request.debitAccount.bankCode && !this.isValidBSB(request.debitAccount.bankCode)) {
      errors.push({
        errorCode: 'INVALID_BSB',
        errorDescription: 'Invalid BSB format for debit account'
      });
    }

    if (request.creditAccount.bankCode && !this.isValidBSB(request.creditAccount.bankCode)) {
      errors.push({
        errorCode: 'INVALID_BSB',
        errorDescription: 'Invalid BSB format for credit account'
      });
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      correlationId: uuidv4(),
      timestamp
    };
  }

  /**
   * Initiate NPP payment
   */
  public async initiate(request: InitiateNPPPaymentRequest): Promise<BianOperationResult<InitiateNPPPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      // Validate request first
      const validationResult = await this.validate(request);
      if (!validationResult.success) {
        return {
          success: false,
          errors: validationResult.errors,
          correlationId,
          timestamp
        };
      }

      // Resolve PayID if provided
      let payIdResolutionResult: PayIDResolutionResult | undefined;
      if (request.payIdDetails) {
        payIdResolutionResult = await this.resolvePayID(request.payIdDetails);
        
        if (payIdResolutionResult.resolutionStatus !== 'SUCCESS') {
          return {
            success: false,
            errors: [{
              errorCode: 'PAYID_RESOLUTION_FAILED',
              errorDescription: payIdResolutionResult.resolutionError || 'PayID could not be resolved'
            }],
            correlationId,
            timestamp
          };
        }
      }

      // Generate references
      const paymentInstructionReference = this.generateNPPReference();
      const endToEndReference = request.nppData.endToEndReference || this.generateEndToEndReference();

      // Create NPP payment instruction
      const nppPaymentInstruction: NPPPaymentInstruction = {
        // Base payment instruction fields
        paymentInstructionReference,
        paymentInstructionInstanceReference: uuidv4(),
        paymentInstructionType: request.paymentInstructionType,
        paymentInstructionStatus: PaymentStatus.INITIATED,
        paymentInstructionDateTime: timestamp,
        paymentInstructionAmount: request.paymentInstructionAmount,
        paymentMechanism: request.paymentMechanism,
        debitAccount: request.debitAccount,
        creditAccount: payIdResolutionResult?.resolvedAccount || request.creditAccount,
        paymentPurpose: request.paymentPurpose,
        paymentDescription: request.paymentDescription,
        remittanceInformation: request.remittanceInformation,
        requestedExecutionDate: request.requestedExecutionDate,
        payIdDetails: request.payIdDetails,
        serviceDomainControlRecord: request.serviceDomainControlRecord,
        createdBy: 'SYSTEM',
        createdDateTime: timestamp,
        processingLog: [{
          timestamp,
          status: PaymentStatus.INITIATED,
          description: 'NPP payment instruction initiated',
          performedBy: 'SYSTEM'
        }],

        // NPP specific fields
        nppSpecificData: {
          messageType: NPPMessageType.PACS_008,
          paymentCategory: request.nppData.paymentCategory,
          urgency: request.nppData.urgency || NPPUrgency.NORMAL,
          endToEndReference,
          ofiReference: this.generateOFIReference(),
          payIdResolutionResult,
          overlayServices: request.nppData.overlayServices || [],
          extendedRemittanceInfo: request.nppData.extendedRemittanceInfo
        }
      };

      // Apply test scenarios
      const testResult = TestScenariosService.evaluatePayment(request);
      if (testResult) {
        nppPaymentInstruction.paymentInstructionStatus = testResult.status;
        if (testResult.errorCode) {
          nppPaymentInstruction.processingLog?.push({
            timestamp,
            status: testResult.status,
            description: testResult.errorMessage || 'Test scenario applied',
            performedBy: 'SYSTEM',
            errorCode: testResult.errorCode,
            errorDescription: testResult.errorMessage
          });
        }
      }

      // Store payment
      this.nppPayments.set(paymentInstructionReference, nppPaymentInstruction);

      const response: InitiateNPPPaymentResponse = {
        paymentInstructionReference,
        paymentInstructionInstanceReference: nppPaymentInstruction.paymentInstructionInstanceReference!,
        paymentInstruction: nppPaymentInstruction,
        nppPaymentInstruction
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          errorCode: 'NPP_PROCESSING_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Update NPP payment
   */
  public async update(paymentId: string, request: Partial<InitiateNPPPaymentRequest>): Promise<BianOperationResult<InitiateNPPPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.nppPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'NPP payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Update allowed fields
      if (request.paymentInstructionAmount) {
        payment.paymentInstructionAmount = request.paymentInstructionAmount;
      }
      if (request.requestedExecutionDate) {
        payment.requestedExecutionDate = request.requestedExecutionDate;
      }
      if (request.remittanceInformation) {
        payment.remittanceInformation = request.remittanceInformation;
      }
      if (request.nppData?.urgency) {
        payment.nppSpecificData.urgency = request.nppData.urgency;
      }
      if (request.nppData?.extendedRemittanceInfo) {
        payment.nppSpecificData.extendedRemittanceInfo = request.nppData.extendedRemittanceInfo;
      }

      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: payment.paymentInstructionStatus,
        description: 'NPP payment updated',
        performedBy: 'SYSTEM'
      });

      const response: InitiateNPPPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        nppPaymentInstruction: payment
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          errorCode: 'NPP_UPDATE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Submit NPP payment for processing
   */
  public async request(paymentId: string, request: any): Promise<BianOperationResult<InitiateNPPPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.nppPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'NPP payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Simulate NPP processing
      payment.paymentInstructionStatus = PaymentStatus.PROCESSING;
      payment.nppSpecificData.rfiReference = this.generateRFIReference();
      
      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: PaymentStatus.PROCESSING,
        description: 'NPP payment submitted for processing',
        performedBy: 'SYSTEM'
      });

      // Apply final test scenarios
      const testResult = TestScenariosService.evaluatePayment(payment);
      if (testResult) {
        payment.paymentInstructionStatus = testResult.status;
        payment.processingLog?.push({
          timestamp,
          status: testResult.status,
          description: testResult.errorMessage || 'Final processing result',
          performedBy: 'NPP_SYSTEM',
          errorCode: testResult.errorCode,
          errorDescription: testResult.errorMessage
        });
      } else {
        payment.paymentInstructionStatus = PaymentStatus.COMPLETED;
        payment.processingLog?.push({
          timestamp,
          status: PaymentStatus.COMPLETED,
          description: 'NPP payment completed successfully',
          performedBy: 'NPP_SYSTEM'
        });
      }

      const response: InitiateNPPPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        nppPaymentInstruction: payment
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          errorCode: 'NPP_REQUEST_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Retrieve NPP payment
   */
  public async retrieve(paymentId: string): Promise<BianOperationResult<InitiateNPPPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.nppPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'NPP payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      const response: InitiateNPPPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        nppPaymentInstruction: payment
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          errorCode: 'NPP_RETRIEVE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Control NPP payment
   */
  public async control(paymentId: string, request: any): Promise<BianOperationResult<InitiateNPPPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.nppPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'NPP payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Handle control actions
      switch (request.controlActionType) {
        case 'CANCEL':
          payment.paymentInstructionStatus = PaymentStatus.CANCELLED;
          break;
        case 'SUSPEND':
          // Mark as suspended but keep current status
          break;
        case 'RESUME':
          // Resume processing
          break;
      }

      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: payment.paymentInstructionStatus,
        description: `NPP payment ${request.controlActionType.toLowerCase()}`,
        performedBy: 'SYSTEM'
      });

      const response: InitiateNPPPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        nppPaymentInstruction: payment
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          errorCode: 'NPP_CONTROL_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Handle NPP payment exchanges
   */
  public async exchange(paymentId: string, request: any): Promise<BianOperationResult<InitiateNPPPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.nppPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'NPP payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Handle exchange actions
      switch (request.exchangeActionType) {
        case 'ACCEPT':
          // External system accepted
          break;
        case 'REJECT':
          payment.paymentInstructionStatus = PaymentStatus.FAILED;
          break;
      }

      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: payment.paymentInstructionStatus,
        description: `NPP payment ${request.exchangeActionType.toLowerCase()} by external system`,
        performedBy: 'EXTERNAL_SYSTEM'
      });

      const response: InitiateNPPPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        nppPaymentInstruction: payment
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      return {
        success: false,
        errors: [{
          errorCode: 'NPP_EXCHANGE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  // Helper methods

  private validatePayID(payIdDetails: any): BianOperationResult<boolean> {
    const errors: ErrorDetail[] = [];

    if (!payIdDetails.payIdType || !payIdDetails.payIdValue) {
      errors.push({
        errorCode: 'INVALID_PAYID',
        errorDescription: 'PayID type and value are required'
      });
    }

    // Validate PayID format based on type
    switch (payIdDetails.payIdType) {
      case 'EMAIL':
        if (!this.isValidEmail(payIdDetails.payIdValue)) {
          errors.push({
            errorCode: 'INVALID_EMAIL_PAYID',
            errorDescription: 'Invalid email format for PayID'
          });
        }
        break;
      case 'MOBILE':
        if (!this.isValidMobile(payIdDetails.payIdValue)) {
          errors.push({
            errorCode: 'INVALID_MOBILE_PAYID',
            errorDescription: 'Invalid mobile number format for PayID'
          });
        }
        break;
      case 'ABN':
        if (!this.isValidABN(payIdDetails.payIdValue)) {
          errors.push({
            errorCode: 'INVALID_ABN_PAYID',
            errorDescription: 'Invalid ABN format for PayID'
          });
        }
        break;
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      correlationId: uuidv4(),
      timestamp: new Date().toISOString()
    };
  }

  private async resolvePayID(payIdDetails: any): Promise<PayIDResolutionResult> {
    // Simulate PayID resolution
    const timestamp = new Date().toISOString();
    
    // Test scenarios for PayID resolution
    if (payIdDetails.payIdValue.endsWith('@fail.com')) {
      return {
        payIdType: payIdDetails.payIdType,
        payIdValue: payIdDetails.payIdValue,
        resolvedAccount: {
          accountIdentification: '',
          accountName: ''
        },
        payIdName: '',
        resolutionDateTime: timestamp,
        resolutionStatus: 'NOT_FOUND',
        resolutionError: 'PayID not registered'
      };
    }

    return {
      payIdType: payIdDetails.payIdType,
      payIdValue: payIdDetails.payIdValue,
      resolvedAccount: {
        accountIdentification: '123456789',
        accountName: 'Test Account Holder',
        bankCode: '123-456'
      },
      payIdName: 'Test Account Holder',
      resolutionDateTime: timestamp,
      resolutionStatus: 'SUCCESS'
    };
  }

  private isValidBSB(bsb: string): boolean {
    return /^\d{3}-\d{3}$/.test(bsb);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidMobile(mobile: string): boolean {
    return /^(\+61|0)[4-5]\d{8}$/.test(mobile);
  }

  private isValidABN(abn: string): boolean {
    return /^\d{11}$/.test(abn.replace(/\s/g, ''));
  }

  private generateNPPReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `NPP-${timestamp}-${random}`.toUpperCase();
  }

  private generateEndToEndReference(): string {
    return `E2E${Date.now()}${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
  }

  private generateOFIReference(): string {
    return `OFI${Date.now()}${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
  }

  private generateRFIReference(): string {
    return `RFI${Date.now()}${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
  }
}