/**
 * Direct Debit Payment Handler
 * Handles Direct Debit specific payment logic for recurring payments
 */

import { IPaymentTypeHandler } from '../bian/bian-operations.interface';
import {
  InitiateDirectDebitPaymentRequest,
  InitiateDirectDebitPaymentResponse,
  DirectDebitPaymentInstruction,
  DirectDebitType,
  DirectDebitFrequency,
  DirectDebitStatus,
  DishonourReason
} from '../../models/australian-payments/direct-debit.model';

import {
  BianOperationResult,
  PaymentStatus,
  ErrorDetail
} from '../../models/bian/common-types.model';

import { TestScenariosService } from '../../utils/test-scenarios.util';
import { v4 as uuidv4 } from 'uuid';

export class DirectDebitPaymentHandler implements IPaymentTypeHandler<InitiateDirectDebitPaymentRequest, InitiateDirectDebitPaymentResponse> {
  private directDebitPayments: Map<string, DirectDebitPaymentInstruction> = new Map();

  /**
   * Validate Direct Debit payment request
   */
  public async validate(request: InitiateDirectDebitPaymentRequest): Promise<BianOperationResult<boolean>> {
    const errors: ErrorDetail[] = [];
    const timestamp = new Date().toISOString();

    // Validate Direct Debit specific data
    if (!request.directDebitData) {
      errors.push({
        errorCode: 'MISSING_DIRECT_DEBIT_DATA',
        errorDescription: 'Direct Debit specific data is required'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    }

    // Validate mandate reference
    if (!request.directDebitData.mandateReference) {
      errors.push({
        errorCode: 'MISSING_MANDATE_REFERENCE',
        errorDescription: 'Direct Debit mandate reference is required'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    }

    // Validate creditor details
    if (!request.directDebitData.creditorReference) {
      errors.push({
        errorCode: 'MISSING_CREDITOR_REFERENCE',
        errorDescription: 'Creditor reference is required'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    }

    if (!request.directDebitData.creditorName) {
      errors.push({
        errorCode: 'MISSING_CREDITOR_NAME',
        errorDescription: 'Creditor name is required'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    }

    // Validate amount limits for Direct Debit first (before date validation)
    const amount = parseFloat(request.paymentInstructionAmount.amount);
    if (amount > 999999.99) {
      errors.push({
        errorCode: 'INVALID_PAYMENT_AMOUNT',
        errorDescription: 'Direct Debit amount exceeds maximum limit of $999,999.99'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    }

    if (amount <= 0) {
      errors.push({
        errorCode: 'INVALID_PAYMENT_AMOUNT',
        errorDescription: 'Direct Debit amount must be greater than zero'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    }

    // Validate BSB format for Australian accounts
    if (request.debitAccount.bankCode && !this.isValidBSB(request.debitAccount.bankCode)) {
      errors.push({
        errorCode: 'INVALID_BANK_DETAILS',
        errorDescription: 'Invalid BSB format for debit account'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    }

    if (request.creditAccount.bankCode && !this.isValidBSB(request.creditAccount.bankCode)) {
      errors.push({
        errorCode: 'INVALID_BANK_DETAILS',
        errorDescription: 'Invalid BSB format for credit account'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    }

    // Validate first debit date
    if (!request.directDebitData.firstDebitDate) {
      errors.push({
        errorCode: 'MISSING_FIRST_DEBIT_DATE',
        errorDescription: 'First debit date is required'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    } else {
      const firstDebitDate = new Date(request.directDebitData.firstDebitDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      firstDebitDate.setHours(0, 0, 0, 0);
      if (firstDebitDate < today) {
        errors.push({
          errorCode: 'INVALID_FIRST_DEBIT_DATE',
          errorDescription: 'First debit date cannot be in the past'
        });
        return {
          success: false,
          errors,
          correlationId: uuidv4(),
          timestamp
        };
      }
    }

    // Validate debtor reference
    if (!request.directDebitData.debtorReference) {
      errors.push({
        errorCode: 'MISSING_DEBTOR_REFERENCE',
        errorDescription: 'Debtor reference is required'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    }

    // Validate frequency
    if (!request.directDebitData.frequency) {
      errors.push({
        errorCode: 'MISSING_FREQUENCY',
        errorDescription: 'Direct Debit frequency is required'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    }

    // Validate authorisation method
    if (!request.directDebitData.authorisationMethod) {
      errors.push({
        errorCode: 'MISSING_AUTHORISATION_METHOD',
        errorDescription: 'Authorisation method is required'
      });
      return {
        success: false,
        errors,
        correlationId: uuidv4(),
        timestamp
      };
    }

    return {
      success: true,
      correlationId: uuidv4(),
      timestamp
    };
  }

  /**
   * Initiate Direct Debit payment
   */
  public async initiate(request: InitiateDirectDebitPaymentRequest): Promise<BianOperationResult<InitiateDirectDebitPaymentResponse>> {
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
      const paymentInstructionReference = this.generateDirectDebitReference();
      const mandateId = this.generateMandateId();

      // Calculate schedule details
      const scheduleDetails = this.calculateScheduleDetails(
        request.directDebitData.firstDebitDate,
        request.directDebitData.frequency,
        request.directDebitData.numberOfPayments
      );

      // Create Direct Debit payment instruction
      const directDebitPaymentInstruction: DirectDebitPaymentInstruction = {
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
          description: 'Direct Debit payment instruction initiated',
          performedBy: 'SYSTEM'
        }],

        // Direct Debit specific fields
        directDebitSpecificData: {
          mandateReference: request.directDebitData.mandateReference,
          directDebitType: request.directDebitData.directDebitType,
          frequency: request.directDebitData.frequency,
          mandateDetails: {
            mandateId,
            mandateReference: request.directDebitData.mandateReference,
            creditorReference: request.directDebitData.creditorReference,
            creditorName: request.directDebitData.creditorName,
            debtorReference: request.directDebitData.debtorReference,
            debtorName: request.debitAccount.accountName || 'Unknown',
            mandateDescription: request.directDebitData.mandateDescription,
            mandateStatus: DirectDebitStatus.PENDING_APPROVAL,
            mandateStartDate: request.directDebitData.firstDebitDate,
            maximumAmount: request.directDebitData.maximumAmount,
            authorisationMethod: request.directDebitData.authorisationMethod,
            authorisationDate: timestamp,
            authorisedBy: 'CUSTOMER'
          },
          scheduleDetails: {
            firstDebitDate: request.directDebitData.firstDebitDate,
            nextDebitDate: request.directDebitData.firstDebitDate,
            frequency: request.directDebitData.frequency,
            numberOfPayments: request.directDebitData.numberOfPayments,
            remainingPayments: request.directDebitData.numberOfPayments,
            totalAmount: request.directDebitData.numberOfPayments ? {
              amount: (parseFloat(request.paymentInstructionAmount.amount) * request.directDebitData.numberOfPayments).toFixed(2),
              currency: request.paymentInstructionAmount.currency
            } : undefined,
            variableAmountAllowed: request.directDebitData.variableAmountAllowed || false,
            advanceNotificationDays: request.directDebitData.advanceNotificationDays || 5,
            retryAttempts: 3,
            retryInterval: 7
          },
          notificationSettings: {
            advanceNotificationRequired: true,
            advanceNotificationDays: request.directDebitData.advanceNotificationDays || 5,
            notificationMethod: 'EMAIL',
            dishonourNotificationRequired: true,
            successNotificationRequired: false,
            changeNotificationRequired: true
          }
        }
      };

      // Apply test scenarios
      const testResult = TestScenariosService.evaluatePayment(request);
      if (testResult) {
        directDebitPaymentInstruction.paymentInstructionStatus = testResult.status;
        if (testResult.errorCode) {
          directDebitPaymentInstruction.processingLog?.push({
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
      this.directDebitPayments.set(paymentInstructionReference, directDebitPaymentInstruction);

      const response: InitiateDirectDebitPaymentResponse = {
        paymentInstructionReference,
        paymentInstructionInstanceReference: directDebitPaymentInstruction.paymentInstructionInstanceReference!,
        paymentInstruction: directDebitPaymentInstruction,
        directDebitPaymentInstruction
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
          errorCode: 'DIRECT_DEBIT_PROCESSING_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Update Direct Debit payment
   */
  public async update(paymentId: string, updateRequest: Partial<InitiateDirectDebitPaymentRequest>): Promise<BianOperationResult<InitiateDirectDebitPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.directDebitPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'Direct Debit payment not found'
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
      if (updateRequest.directDebitData?.numberOfPayments) {
        payment.directDebitSpecificData.scheduleDetails.numberOfPayments = updateRequest.directDebitData.numberOfPayments;
        payment.directDebitSpecificData.scheduleDetails.remainingPayments = updateRequest.directDebitData.numberOfPayments;
      }
      if (updateRequest.directDebitData?.maximumAmount) {
        payment.directDebitSpecificData.mandateDetails.maximumAmount = updateRequest.directDebitData.maximumAmount;
      }

      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: payment.paymentInstructionStatus,
        description: 'Direct Debit payment updated',
        performedBy: 'SYSTEM'
      });

      const response: InitiateDirectDebitPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        directDebitPaymentInstruction: payment
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
          errorCode: 'DIRECT_DEBIT_UPDATE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Submit Direct Debit payment for processing
   */
  public async request(paymentId: string, requestData: any): Promise<BianOperationResult<InitiateDirectDebitPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.directDebitPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'Direct Debit payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Simulate Direct Debit processing
      payment.paymentInstructionStatus = PaymentStatus.PROCESSING;
      payment.directDebitSpecificData.mandateDetails.mandateStatus = DirectDebitStatus.ACTIVE;
      
      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: PaymentStatus.PROCESSING,
        description: 'Direct Debit payment submitted for processing',
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
          performedBy: 'DIRECT_DEBIT_SYSTEM',
          errorCode: testResult.errorCode,
          errorDescription: testResult.errorMessage
        });
      } else {
        payment.paymentInstructionStatus = PaymentStatus.COMPLETED;
        payment.processingLog?.push({
          timestamp,
          status: PaymentStatus.COMPLETED,
          description: 'Direct Debit mandate activated successfully',
          performedBy: 'DIRECT_DEBIT_SYSTEM'
        });
      }

      const response: InitiateDirectDebitPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        directDebitPaymentInstruction: payment
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
          errorCode: 'DIRECT_DEBIT_REQUEST_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Retrieve Direct Debit payment
   */
  public async retrieve(paymentId: string): Promise<BianOperationResult<InitiateDirectDebitPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.directDebitPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'Direct Debit payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      const response: InitiateDirectDebitPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        directDebitPaymentInstruction: payment
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
          errorCode: 'DIRECT_DEBIT_RETRIEVE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Control Direct Debit payment
   */
  public async control(paymentId: string, controlRequest: any): Promise<BianOperationResult<InitiateDirectDebitPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.directDebitPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'Direct Debit payment not found'
          }],
          correlationId,
          timestamp
        };
      }

      // Handle control actions
      switch (controlRequest.controlActionType) {
        case 'CANCEL':
          payment.paymentInstructionStatus = PaymentStatus.CANCELLED;
          payment.directDebitSpecificData.mandateDetails.mandateStatus = DirectDebitStatus.CANCELLED;
          break;
        case 'SUSPEND':
          payment.directDebitSpecificData.mandateDetails.mandateStatus = DirectDebitStatus.SUSPENDED;
          break;
        case 'RESUME':
          payment.directDebitSpecificData.mandateDetails.mandateStatus = DirectDebitStatus.ACTIVE;
          break;
      }

      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: payment.paymentInstructionStatus,
        description: `Direct Debit payment ${controlRequest.controlActionType.toLowerCase()}`,
        performedBy: 'SYSTEM'
      });

      const response: InitiateDirectDebitPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        directDebitPaymentInstruction: payment
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
          errorCode: 'DIRECT_DEBIT_CONTROL_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  /**
   * Handle Direct Debit payment exchanges
   */
  public async exchange(paymentId: string, exchangeRequest: any): Promise<BianOperationResult<InitiateDirectDebitPaymentResponse>> {
    const correlationId = uuidv4();
    const timestamp = new Date().toISOString();

    try {
      const payment = this.directDebitPayments.get(paymentId);
      if (!payment) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: 'Direct Debit payment not found'
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
          // Add dishonour details if provided
          if (exchangeRequest.directDebitExchangeData?.dishonourReason) {
            payment.directDebitSpecificData.dishonourDetails = {
              dishonourDate: timestamp,
              dishonourReason: exchangeRequest.directDebitExchangeData.dishonourReason,
              dishonourCode: exchangeRequest.directDebitExchangeData.dishonourCode || 'UNKNOWN',
              dishonourDescription: 'Payment dishonoured by bank',
              retryScheduled: false,
              retryCount: 0,
              notificationSent: false
            };
          }
          break;
      }

      payment.lastModifiedDateTime = timestamp;
      payment.processingLog?.push({
        timestamp,
        status: payment.paymentInstructionStatus,
        description: `Direct Debit payment ${exchangeRequest.exchangeActionType.toLowerCase()} by external system`,
        performedBy: 'EXTERNAL_SYSTEM'
      });

      const response: InitiateDirectDebitPaymentResponse = {
        paymentInstructionReference: payment.paymentInstructionReference,
        paymentInstructionInstanceReference: payment.paymentInstructionInstanceReference!,
        paymentInstruction: payment,
        directDebitPaymentInstruction: payment
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
          errorCode: 'DIRECT_DEBIT_EXCHANGE_ERROR',
          errorDescription: (error as Error).message
        }],
        correlationId,
        timestamp
      };
    }
  }

  // Helper methods

  private calculateScheduleDetails(firstDebitDate: string, frequency: DirectDebitFrequency, numberOfPayments?: number) {
    // This is a simplified calculation - in real implementation this would be more complex
    return {
      firstDebitDate,
      nextDebitDate: firstDebitDate,
      frequency,
      numberOfPayments,
      remainingPayments: numberOfPayments
    };
  }

  private isValidBSB(bsb: string): boolean {
    return /^\d{3}-\d{3}$/.test(bsb);
  }

  private generateDirectDebitReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `DD-${timestamp}-${random}`.toUpperCase();
  }

  private generateMandateId(): string {
    return `MND${Date.now()}${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  }
}