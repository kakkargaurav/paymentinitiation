/**
 * BECS Payment Handler
 * Handles BECS (Bulk Electronic Clearing System) specific payment logic
 */

import { IPaymentTypeHandler } from '../bian/bian-operations.interface';
import {
  InitiateBECSPaymentRequest,
  InitiateBECSPaymentResponse,
  BECSPaymentInstruction,
  BECSTransactionCode,
  BECSProcessingDay,
  BECSFileFormat
} from '../../models/australian-payments/becs.model';

import {
  BianOperationResult,
  PaymentStatus,
  ErrorDetail
} from '../../models/bian/common-types.model';

import { TestScenariosService } from '../../utils/test-scenarios.util';
import { v4 as uuidv4 } from 'uuid';

export class BECSPaymentHandler implements IPaymentTypeHandler<InitiateBECSPaymentRequest, InitiateBECSPaymentResponse> {
  private becsPayments: Map<string, BECSPaymentInstruction> = new Map();

  /**
   * Validate BECS payment request
   */
  public async validate(request: InitiateBECSPaymentRequest): Promise<BianOperationResult<boolean>> {
    const errors: ErrorDetail[] = [];
    const timestamp = new Date().toISOString();

    // Validate BECS specific data
    if (!request.becsData) {
      errors.push({
        errorCode: 'MISSING_BECS_DATA',
        errorDescription: 'BECS specific data is required'
      });
    } else {
      // Validate transaction code
      if (!request.becsData.transactionCode) {
        errors.push({
          errorCode: 'MISSING_TRANSACTION_CODE',
          errorDescription: 'BECS transaction code is required'
        });
      }

      // Validate direct entry user ID
      if (!request.becsData.directEntryUserId || request.becsData.directEntryUserId.length !== 6) {
        errors.push({
          errorCode: 'INVALID_USER_ID',
          errorDescription: 'Direct Entry User ID must be 6 characters'
        });
      }

      // Validate APCS number
      if (!request.becsData.apcsNumber || !/^\d{6}$/.test(request.becsData.apcsNumber)) {
        errors.push({
          errorCode: 'INVALID_APCS_NUMBER',
          errorDescription: 'APCS number must be 6 digits'
        });
      }

      // Validate lodgement reference
      if (!request.becsData.lodgementReference || request.becsData.lodgementReference.length > 18) {
        errors.push({
          errorCode: 'INVALID_LODGEMENT_REFERENCE',
          errorDescription: 'Lodgement reference is required and must be max 18 characters'
        });
      }
    }

    // Validate amount limits for BECS
    const amount = parseFloat(request.paymentInstructionAmount.amount);
    if (amount > 99999999.99) {
      errors.push({
        errorCode: 'AMOUNT_EXCEEDS_LIMIT',
        errorDescription: 'BECS payment amount exceeds maximum limit'
      });
    }

    // Validate BSB format for Australian accounts
    if (request.debitAccount.bankCode && !this.isValidBSB(request.debitAccount.bankCode)) {
      errors.push({
        errorCode: 'INVALID_DEBIT_BSB',
        errorDescription: 'Invalid BSB format for debit account'
      });
    }

    if (request.creditAccount.bankCode && !this.isValidBSB(request.creditAccount.bankCode)) {
      errors.push({
        errorCode: 'INVALID_CREDIT_BSB',
        errorDescription: 'Invalid BSB format for credit account'
      });
    }

    // Validate account numbers (9 digits for BECS)
    if (request.debitAccount.accountIdentification && !/^\d{9}$/.test(request.debitAccount.accountIdentification)) {
      errors.push({
        errorCode: 'INVALID_DEBIT_ACCOUNT',
        errorDescription: 'Debit account number must be 9 digits'
      });
    }

    if (request.creditAccount.accountIdentification && !/^\d{9}$/.test(request.creditAccount.accountIdentification)) {
      errors.push({
        errorCode: 'INVALID_CREDIT_ACCOUNT',
        errorDescription: 'Credit account number must be 9 digits'
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
   * Initiate BECS payment
   */
  public async initiate(request: InitiateBECSPaymentRequest): Promise<BianOperationResult<InitiateBECSPaymentResponse>> {
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

      // Generate references
      const paymentInstructionReference = this.generateBECSReference();
      const batchNumber = this.generateBatchNumber();

      // Create BECS payment instruction
      const becsPaymentInstruction: BECSPaymentInstruction = {
        // Base payment instruction fields
        paymentInstructionReference,
        paymentInstructionInstanceReference: uuidv4(),
        paymentInstructionType: request.paymentInstructionType,
        paymentInstructionStatus: PaymentStatus.INITIATED,
        paymentInstructionDateTime: timestamp,
        paymentInstructionAmount: request.paymentInstructionAmount,
        paymentMechanism: request.paymentMechanism,
        debitAccount: request.debitAccount,
        creditAccount: request.creditAccount,
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
          description: 'BECS payment instruction initiated',
          performedBy: 'SYSTEM'
        }],

        // BECS specific fields
        becsSpecificData: {
          transactionCode: request.becsData.transactionCode,
          fileFormat: BECSFileFormat.DIRECT_ENTRY,
          processingDay: request.becsData.processingDay,
          lodgementReference: request.becsData.lodgementReference,
          remitterName: request.becsData.remitterName,
          directEntryUserId: request.becsData.directEntryUserId,
          apcsNumber: request.becsData.apcsNumber,
          batchDetails: {
            batchNumber,
            descriptiveRecord: {
              recordType: '0',
              reel: '01',
              sequence: '000001',
              financialInstitution: request.becsData.apcsNumber.substring(0, 3),
              userId: request.becsData.directEntryUserId,
              userSuppliedDescription: request.becsData.userSuppliedDescription,
              processingDate: request.becsData.processingDate || this.formatDateDDMMYY(new Date())
            },
            detailRecords: [{
              recordType: '1',
              bsb: request.creditAccount.bankCode?.replace('-', '') || '000000',
              accountNumber: request.creditAccount.accountIdentification.padStart(9, '0'),
              indicator: ' ',
              transactionCode: request.becsData.transactionCode,
              amount: Math.round(parseFloat(request.paymentInstructionAmount.amount) * 100),
              accountName: (request.creditAccount.accountName || '').padEnd(32, ' ').substring(0, 32),
              lodgementReference: request.becsData.lodgementReference.padEnd(18, ' ').substring(0, 18),
              traceRecordNumber: this.generateTraceNumber(),
              remitterName: request.becsData.remitterName.padEnd(16, ' ').substring(0, 16)
            }],
            totalCreditAmount: request.paymentInstructionAmount,
            totalDebitAmount: { amount: '0.00', currency: request.paymentInstructionAmount.currency },
            totalRecordCount: 1
          },
          fileSequenceNumber: 1,
          recordSequenceNumber: 1
        }
      };

      // Apply test scenarios
      const testResult = TestScenariosService.evaluatePayment(request);
      if (testResult) {
        becsPaymentInstruction.paymentInstructionStatus = testResult.status;
        if (testResult.errorCode) {
          becsPaymentInstruction.processingLog?.push({
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
      this.becsPayments.set(paymentInstructionReference, becsPaymentInstruction);

      const response: InitiateBECSPaymentResponse = {
        paymentInstructionReference,
        paymentInstructionInstanceReference: becsPaymentInstruction.paymentInstructionInstanceReference!,
        paymentInstruction: becsPaymentInstruction,
        becsPaymentInstruction
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
          errorCode: 'BECS_PROCESSING_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Update BECS payment
   */
  public async update(paymentId: string, updateRequest: Partial<InitiateBECSPaymentRequest>): Promise<BianOperationResult<InitiateBECSPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.becsPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'BECS payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Update allowed fields
      if (updateRequest.paymentInstructionAmount) {
        payment.paymentInstructionAmount = updateRequest.paymentInstructionAmount;
        // Update detail record amount
        if (payment.becsSpecificData.batchDetails.detailRecords.length > 0) {
          payment.becsSpecificData.batchDetails.detailRecords[0].amount = 
            Math.round(parseFloat(updateRequest.paymentInstructionAmount.amount) * 100);
        }
      }
      if (updateRequest.requestedExecutionDate) {
        payment.requestedExecutionDate = updateRequest.requestedExecutionDate;
      }
      if (updateRequest.remittanceInformation) {
        payment.remittanceInformation = updateRequest.remittanceInformation;
      }
      if (updateRequest.becsData?.processingDay) {
        payment.becsSpecificData.processingDay = updateRequest.becsData.processingDay;
      }
      if (updateRequest.becsData?.lodgementReference) {
        payment.becsSpecificData.lodgementReference = updateRequest.becsData.lodgementReference;
      }

      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: payment.paymentInstructionStatus,
        description: 'BECS payment updated',
        performedBy: 'SYSTEM'
      });

      const response: InitiateBECSPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        becsPaymentInstruction: payment
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
          errorCode: 'BECS_UPDATE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Submit BECS payment for processing
   */
  public async request(paymentId: string, requestData: any): Promise<BianOperationResult<InitiateBECSPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.becsPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'BECS payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Simulate BECS processing
      payment.paymentInstructionStatus = PaymentStatus.PROCESSING;
      
      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: PaymentStatus.PROCESSING,
        description: 'BECS payment submitted for processing',
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
          performedBy: 'BECS_SYSTEM',
          errorCode: testResult.errorCode,
          errorDescription: testResult.errorMessage
        });
      } else {
        payment.paymentInstructionStatus = PaymentStatus.COMPLETED;
        payment.processingLog?.push({
          timestamp,
          status: PaymentStatus.COMPLETED,
          description: 'BECS payment completed successfully',
          performedBy: 'BECS_SYSTEM'
        });
      }

      const response: InitiateBECSPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        becsPaymentInstruction: payment
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
          errorCode: 'BECS_REQUEST_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Retrieve BECS payment
   */
  public async retrieve(paymentId: string): Promise<BianOperationResult<InitiateBECSPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.becsPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'BECS payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      const response: InitiateBECSPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        becsPaymentInstruction: payment
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
          errorCode: 'BECS_RETRIEVE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Control BECS payment
   */
  public async control(paymentId: string, controlRequest: any): Promise<BianOperationResult<InitiateBECSPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.becsPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'BECS payment not found'
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
        description: `BECS payment ${controlRequest.controlActionType.toLowerCase()}`,
        performedBy: 'SYSTEM'
      });

      const response: InitiateBECSPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        becsPaymentInstruction: payment
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
          errorCode: 'BECS_CONTROL_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Handle BECS payment exchanges
   */
  public async exchange(paymentId: string, exchangeRequest: any): Promise<BianOperationResult<InitiateBECSPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.becsPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'BECS payment not found'
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
        description: `BECS payment ${exchangeRequest.exchangeActionType.toLowerCase()} by external system`,
        performedBy: 'EXTERNAL_SYSTEM'
      });

      const response: InitiateBECSPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        becsPaymentInstruction: payment
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
          errorCode: 'BECS_EXCHANGE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  // Helper methods

  private isValidBSB(bsb: string): boolean {
    return /^\d{3}-\d{3}$/.test(bsb);
  }

  private generateBECSReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `BECS-${timestamp}-${random}`.toUpperCase();
  }

  private generateBatchNumber(): number {
    return Math.floor(Math.random() * 999999) + 1;
  }

  private generateTraceNumber(): string {
    return Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
  }

  private formatDateDDMMYY(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().substring(2);
    return `${day}${month}${year}`;
  }
}