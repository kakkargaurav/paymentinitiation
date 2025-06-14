/**
 * BPAY Payment Handler
 * Handles BPAY (Bill Payment) specific payment logic
 */

import { IPaymentTypeHandler } from '../bian/bian-operations.interface';
import {
  InitiateBPAYPaymentRequest,
  InitiateBPAYPaymentResponse,
  BPAYPaymentInstruction,
  BPAYTransactionType,
  BPAYPaymentMethod,
  BPAYProcessingCode,
  BPAYBillerCategory,
  BPAYValidationResult
} from '../../models/australian-payments/bpay.model';

import {
  BianOperationResult,
  PaymentStatus,
  ErrorDetail
} from '../../models/bian/common-types.model';

import { TestScenariosService } from '../../utils/test-scenarios.util';
import { v4 as uuidv4 } from 'uuid';

export class BPAYPaymentHandler implements IPaymentTypeHandler<InitiateBPAYPaymentRequest, InitiateBPAYPaymentResponse> {
  private bpayPayments: Map<string, BPAYPaymentInstruction> = new Map();

  /**
   * Validate BPAY payment request
   */
  public async validate(request: InitiateBPAYPaymentRequest): Promise<BianOperationResult<boolean>> {
    const errors: ErrorDetail[] = [];
    const timestamp = new Date().toISOString();

    // Validate BPAY specific data
    if (!request.bpayData) {
      errors.push({
        errorCode: 'MISSING_BPAY_DATA',
        errorDescription: 'BPAY specific data is required'
      });
    } else {
      // Validate customer reference number
      if (!request.bpayData.customerReferenceNumber) {
        errors.push({
          errorCode: 'MISSING_CUSTOMER_REFERENCE',
          errorDescription: 'Customer reference number is required'
        });
      } else if (request.bpayData.customerReferenceNumber.length > 20) {
        errors.push({
          errorCode: 'INVALID_CUSTOMER_REFERENCE',
          errorDescription: 'Customer reference number must be max 20 characters'
        });
      }
    }

    // Validate BPAY reference
    if (!request.bpayReference) {
      errors.push({
        errorCode: 'MISSING_BPAY_REFERENCE',
        errorDescription: 'BPAY reference is required'
      });
    } else {
      // Validate biller code (6 digits)
      if (!request.bpayReference.billerCode || !/^\d{6}$/.test(request.bpayReference.billerCode)) {
        errors.push({
          errorCode: 'INVALID_BILLER_CODE',
          errorDescription: 'Biller code must be 6 digits'
        });
      }

      // Validate reference number
      if (!request.bpayReference.referenceNumber) {
        errors.push({
          errorCode: 'MISSING_REFERENCE_NUMBER',
          errorDescription: 'BPAY reference number is required'
        });
      }
    }

    // Validate amount limits for BPAY
    const amount = parseFloat(request.paymentInstructionAmount.amount);
    if (amount > 999999.99) {
      errors.push({
        errorCode: 'AMOUNT_EXCEEDS_LIMIT',
        errorDescription: 'BPAY payment amount exceeds maximum limit of $999,999.99'
      });
    }

    if (amount <= 0) {
      errors.push({
        errorCode: 'INVALID_AMOUNT',
        errorDescription: 'BPAY payment amount must be greater than zero'
      });
    }

    // Validate BSB format for Australian debit account
    if (request.debitAccount.bankCode && !this.isValidBSB(request.debitAccount.bankCode)) {
      errors.push({
        errorCode: 'INVALID_BSB',
        errorDescription: 'Invalid BSB format for debit account'
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
   * Initiate BPAY payment
   */
  public async initiate(request: InitiateBPAYPaymentRequest): Promise<BianOperationResult<InitiateBPAYPaymentResponse>> {
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

      // Perform BPAY validation
      const bpayValidation = await this.validateBPAYReference(request.bpayReference);

      if (!bpayValidation.isValid) {
        return {
          success: false,
          errors: bpayValidation.validationErrors.map(err => ({
            errorCode: err.errorCode,
            errorDescription: err.errorDescription,
            errorPath: err.field
          })),
          correlationId,
          timestamp
        };
      }

      // Generate references
      const paymentInstructionReference = this.generateBPAYReference();
      const receiptNumber = this.generateReceiptNumber();

      // Create BPAY payment instruction
      const bpayPaymentInstruction: BPAYPaymentInstruction = {
        // Base payment instruction fields
        paymentInstructionReference,
        paymentInstructionInstanceReference: uuidv4(),
        paymentInstructionType: request.paymentInstructionType,
        paymentInstructionStatus: PaymentStatus.INITIATED,
        paymentInstructionDateTime: timestamp,
        paymentInstructionAmount: request.paymentInstructionAmount,
        paymentMechanism: request.paymentMechanism,
        debitAccount: request.debitAccount,
        creditAccount: {
          accountIdentification: request.bpayReference.billerCode,
          accountName: request.bpayReference.billerName || 'BPAY Biller'
        },
        paymentPurpose: request.paymentPurpose,
        paymentDescription: request.paymentDescription,
        remittanceInformation: request.remittanceInformation,
        requestedExecutionDate: request.requestedExecutionDate,
        serviceDomainControlRecord: request.serviceDomainControlRecord,
        createdBy: 'SYSTEM',
        createdDateTime: timestamp,
        processingLog: [{
          timestamp,
          status: PaymentStatus.INITIATED,
          description: 'BPAY payment instruction initiated',
          performedBy: 'SYSTEM'
        }],

        // BPAY specific fields
        bpaySpecificData: {
          transactionType: request.bpayData.transactionType,
          paymentMethod: request.bpayData.paymentMethod,
          processingCode: request.bpayData.processingCode || BPAYProcessingCode.REAL_TIME,
          billerDetails: {
            billerCode: request.bpayReference.billerCode,
            billerName: request.bpayReference.billerName || 'Unknown Biller',
            billerCategory: this.getBillerCategory(request.bpayReference.billerCode),
            acceptsPartialPayments: false,
            paymentDueDays: 30
          },
          paymentDetails: {
            customerReferenceNumber: request.bpayData.customerReferenceNumber,
            billerReferenceNumber: this.generateBillerReference(),
            invoiceNumber: request.bpayData.invoiceNumber,
            accountNumber: request.bpayData.accountNumber,
            paymentDueDate: request.bpayData.paymentDueDate,
            partialPaymentAllowed: false,
            paymentNarrative: request.bpayData.paymentNarrative
          },
          validationResult: bpayValidation,
          receiptDetails: {
            receiptNumber,
            receiptDateTime: timestamp,
            transactionId: this.generateTransactionId(),
            paymentReference: paymentInstructionReference,
            receiptText: [
              `BPAY Payment Receipt`,
              `Biller: ${request.bpayReference.billerCode}`,
              `Reference: ${request.bpayData.customerReferenceNumber}`,
              `Amount: ${request.paymentInstructionAmount.currency} ${request.paymentInstructionAmount.amount}`,
              `Date: ${new Date().toLocaleDateString('en-AU')}`
            ]
          }
        }
      };

      // Apply test scenarios
      const testResult = TestScenariosService.evaluatePayment(request);
      if (testResult) {
        bpayPaymentInstruction.paymentInstructionStatus = testResult.status;
        if (testResult.errorCode) {
          bpayPaymentInstruction.processingLog?.push({
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
      this.bpayPayments.set(paymentInstructionReference, bpayPaymentInstruction);

      const response: InitiateBPAYPaymentResponse = {
        paymentInstructionReference,
        paymentInstructionInstanceReference: bpayPaymentInstruction.paymentInstructionInstanceReference!,
        paymentInstruction: bpayPaymentInstruction,
        bpayPaymentInstruction,
        bpayValidationResult: bpayValidation
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
          errorCode: 'BPAY_PROCESSING_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Update BPAY payment
   */
  public async update(paymentId: string, updateRequest: Partial<InitiateBPAYPaymentRequest>): Promise<BianOperationResult<InitiateBPAYPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.bpayPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'BPAY payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Update allowed fields
      if (updateRequest.paymentInstructionAmount) {
        payment.paymentInstructionAmount = updateRequest.paymentInstructionAmount;
      }
      if (updateRequest.requestedExecutionDate) {
        payment.requestedExecutionDate = updateRequest.requestedExecutionDate;
      }
      if (updateRequest.remittanceInformation) {
        payment.remittanceInformation = updateRequest.remittanceInformation;
      }
      if (updateRequest.bpayData?.customerReferenceNumber) {
        payment.bpaySpecificData.paymentDetails.customerReferenceNumber = updateRequest.bpayData.customerReferenceNumber;
      }
      if (updateRequest.bpayData?.paymentNarrative) {
        payment.bpaySpecificData.paymentDetails.paymentNarrative = updateRequest.bpayData.paymentNarrative;
      }

      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: payment.paymentInstructionStatus,
        description: 'BPAY payment updated',
        performedBy: 'SYSTEM'
      });

      const response: InitiateBPAYPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        bpayPaymentInstruction: payment,
        bpayValidationResult: payment.bpaySpecificData.validationResult!
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
          errorCode: 'BPAY_UPDATE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Submit BPAY payment for processing
   */
  public async request(paymentId: string, requestData: any): Promise<BianOperationResult<InitiateBPAYPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.bpayPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'BPAY payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Simulate BPAY processing
      payment.paymentInstructionStatus = PaymentStatus.PROCESSING;
      payment.bpaySpecificData.paymentDetails.billerReferenceNumber = this.generateBillerReference();
      
      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: PaymentStatus.PROCESSING,
        description: 'BPAY payment submitted for processing',
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
          performedBy: 'BPAY_SYSTEM',
          errorCode: testResult.errorCode,
          errorDescription: testResult.errorMessage
        });
      } else {
        payment.paymentInstructionStatus = PaymentStatus.COMPLETED;
        payment.processingLog?.push({
          timestamp,
          status: PaymentStatus.COMPLETED,
          description: 'BPAY payment completed successfully',
          performedBy: 'BPAY_SYSTEM'
        });
      }

      const response: InitiateBPAYPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        bpayPaymentInstruction: payment,
        bpayValidationResult: payment.bpaySpecificData.validationResult!
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
          errorCode: 'BPAY_REQUEST_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Retrieve BPAY payment
   */
  public async retrieve(paymentId: string): Promise<BianOperationResult<InitiateBPAYPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.bpayPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'BPAY payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      const response: InitiateBPAYPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        bpayPaymentInstruction: payment,
        bpayValidationResult: payment.bpaySpecificData.validationResult!
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
          errorCode: 'BPAY_RETRIEVE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Control BPAY payment
   */
  public async control(paymentId: string, controlRequest: any): Promise<BianOperationResult<InitiateBPAYPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.bpayPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'BPAY payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Handle control actions
      switch (controlRequest.controlActionType) {
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
        description: `BPAY payment ${controlRequest.controlActionType.toLowerCase()}`,
        performedBy: 'SYSTEM'
      });

      const response: InitiateBPAYPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        bpayPaymentInstruction: payment,
        bpayValidationResult: payment.bpaySpecificData.validationResult!
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
          errorCode: 'BPAY_CONTROL_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Handle BPAY payment exchanges
   */
  public async exchange(paymentId: string, exchangeRequest: any): Promise<BianOperationResult<InitiateBPAYPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.bpayPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'BPAY payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Handle exchange actions
      switch (exchangeRequest.exchangeActionType) {
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
        description: `BPAY payment ${exchangeRequest.exchangeActionType.toLowerCase()} by external system`,
        performedBy: 'EXTERNAL_SYSTEM'
      });

      const response: InitiateBPAYPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        bpayPaymentInstruction: payment,
        bpayValidationResult: payment.bpaySpecificData.validationResult!
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
          errorCode: 'BPAY_EXCHANGE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  // Helper methods

  private async validateBPAYReference(bpayReference: any): Promise<BPAYValidationResult> {
    const timestamp = new Date().toISOString();
    
    // Simulate BPAY validation
    const isValid = !bpayReference.billerCode.startsWith('99999'); // Test failure scenario
    
    return {
      isValid,
      validationDateTime: timestamp,
      billerCodeValid: isValid,
      referenceNumberValid: isValid,
      amountValid: true,
      validationErrors: isValid ? [] : [{
        errorCode: 'INVALID_BILLER_CODE',
        errorDescription: 'Biller code not found in BPAY registry',
        field: 'billerCode',
        severity: 'ERROR'
      }],
      validationWarnings: []
    };
  }

  private getBillerCategory(billerCode: string): BPAYBillerCategory {
    // Simple categorization based on biller code ranges
    const code = parseInt(billerCode);
    if (code >= 100000 && code < 200000) return BPAYBillerCategory.UTILITIES;
    if (code >= 200000 && code < 300000) return BPAYBillerCategory.TELECOMMUNICATIONS;
    if (code >= 300000 && code < 400000) return BPAYBillerCategory.INSURANCE;
    if (code >= 400000 && code < 500000) return BPAYBillerCategory.GOVERNMENT;
    if (code >= 500000 && code < 600000) return BPAYBillerCategory.EDUCATION;
    return BPAYBillerCategory.OTHER;
  }

  private isValidBSB(bsb: string): boolean {
    return /^\d{3}-\d{3}$/.test(bsb);
  }

  private generateBPAYReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `BPAY-${timestamp}-${random}`.toUpperCase();
  }

  private generateReceiptNumber(): string {
    return `R${Date.now()}${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
  }

  private generateBillerReference(): string {
    return `BR${Date.now()}${Math.random().toString(36).substring(2, 6)}`.toUpperCase();
  }

  private generateTransactionId(): string {
    return `TX${Date.now()}${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  }
}