/**
 * BIAN Payment Initiation Service
 * Core service implementing BIAN Payment Initiation service domain
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IBianPaymentInitiationService,
  IPaymentTypeHandler,
  IBianCorrelationService
} from './bian-operations.interface';

import {
  PaymentInstruction,
  InitiatePaymentInstructionRequest,
  InitiatePaymentInstructionResponse,
  UpdatePaymentInstructionRequest,
  UpdatePaymentInstructionResponse,
  RequestPaymentInstructionRequest,
  RequestPaymentInstructionResponse,
  RetrievePaymentInstructionResponse,
  ControlPaymentInstructionRequest,
  ControlPaymentInstructionResponse,
  ExchangePaymentInstructionRequest,
  ExchangePaymentInstructionResponse,
  PaymentInstructionQuery,
  PaymentInstructionList
} from '../../models/bian/payment-instruction.model';

import {
  BianOperationResult,
  PaymentType,
  PaymentStatus,
  PaymentMechanism,
  ErrorDetail
} from '../../models/bian/common-types.model';

import { TestScenariosService } from '../../utils/test-scenarios.util';
import { getBianConfig } from '../../config/app.config';

export class BianPaymentInitiationService implements IBianPaymentInitiationService {
  private paymentInstructions: Map<string, PaymentInstruction> = new Map();
  private paymentHandlers: Map<PaymentType, IPaymentTypeHandler<any, any>> = new Map();
  private correlationService: IBianCorrelationService;

  constructor(correlationService: IBianCorrelationService) {
    this.correlationService = correlationService;
  }

  /**
   * Register payment type handler
   */
  public registerPaymentHandler<TRequest, TResponse>(
    paymentType: PaymentType,
    handler: IPaymentTypeHandler<TRequest, TResponse>
  ): void {
    this.paymentHandlers.set(paymentType, handler);
  }

  /**
   * Initiate Payment Instruction (BIAN Operation)
   */
  public async initiate(
    paymentType: PaymentType,
    request: InitiatePaymentInstructionRequest
  ): Promise<BianOperationResult<InitiatePaymentInstructionResponse>> {
    const correlationId = this.correlationService.generateCorrelationId();
    const timestamp = new Date().toISOString();

    try {
      // Validate request
      const validationResult = this.validateInitiateRequest(request);
      if (!validationResult.success) {
        return {
          success: false,
          errors: validationResult.errors,
          correlationId,
          timestamp
        };
      }

      // Generate payment instruction reference
      const paymentInstructionReference = this.generatePaymentReference(paymentType);
      const paymentInstructionInstanceReference = uuidv4();

      // Create base payment instruction
      const paymentInstruction: PaymentInstruction = {
        paymentInstructionReference,
        paymentInstructionInstanceReference,
        paymentInstructionType: paymentType,
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
        payIdDetails: request.payIdDetails,
        bpayDetails: request.bpayDetails,
        serviceDomainControlRecord: request.serviceDomainControlRecord,
        createdBy: 'SYSTEM', // In real implementation, this would be the authenticated user
        createdDateTime: timestamp,
        processingLog: [{
          timestamp,
          status: PaymentStatus.INITIATED,
          description: 'Payment instruction initiated',
          performedBy: 'SYSTEM'
        }]
      };

      // Apply test scenarios
      const testResult = TestScenariosService.evaluatePayment(request);
      if (testResult) {
        paymentInstruction.paymentInstructionStatus = testResult.status;
        if (testResult.errorCode) {
          paymentInstruction.processingLog?.push({
            timestamp,
            status: testResult.status,
            description: testResult.errorMessage || 'Test scenario triggered',
            performedBy: 'SYSTEM',
            errorCode: testResult.errorCode,
            errorDescription: testResult.errorMessage
          });
        }
      }

      // Store payment instruction
      this.paymentInstructions.set(paymentInstructionReference, paymentInstruction);

      // Track operation
      this.correlationService.trackOperation(correlationId, 'INITIATE', 'SUCCESS');

      const response: InitiatePaymentInstructionResponse = {
        paymentInstructionReference,
        paymentInstructionInstanceReference,
        paymentInstruction
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      this.correlationService.trackOperation(correlationId, 'INITIATE', 'ERROR');
      return this.handleError(error as Error, correlationId, timestamp);
    }
  }

  /**
   * Update Payment Instruction (BIAN Operation)
   */
  public async update(
    paymentType: PaymentType,
    paymentId: string,
    request: UpdatePaymentInstructionRequest
  ): Promise<BianOperationResult<UpdatePaymentInstructionResponse>> {
    const correlationId = this.correlationService.generateCorrelationId();
    const timestamp = new Date().toISOString();

    try {
      const paymentInstruction = this.paymentInstructions.get(paymentId);
      
      if (!paymentInstruction) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: `Payment instruction ${paymentId} not found`
          }],
          correlationId,
          timestamp
        };
      }

      // Check if payment can be updated
      if (!this.canUpdatePayment(paymentInstruction.paymentInstructionStatus)) {
        return {
          success: false,
          errors: [{
            errorCode: 'INVALID_STATUS',
            errorDescription: `Cannot update payment in status ${paymentInstruction.paymentInstructionStatus}`
          }],
          correlationId,
          timestamp
        };
      }

      // Update payment instruction
      if (request.paymentInstructionAmount) {
        paymentInstruction.paymentInstructionAmount = request.paymentInstructionAmount;
      }
      if (request.requestedExecutionDate) {
        paymentInstruction.requestedExecutionDate = request.requestedExecutionDate;
      }
      if (request.paymentPurpose) {
        paymentInstruction.paymentPurpose = request.paymentPurpose;
      }
      if (request.paymentDescription) {
        paymentInstruction.paymentDescription = request.paymentDescription;
      }
      if (request.remittanceInformation) {
        paymentInstruction.remittanceInformation = request.remittanceInformation;
      }
      if (request.payIdDetails) {
        paymentInstruction.payIdDetails = request.payIdDetails;
      }
      if (request.bpayDetails) {
        paymentInstruction.bpayDetails = request.bpayDetails;
      }

      paymentInstruction.lastModifiedBy = 'SYSTEM';
      paymentInstruction.lastModifiedDateTime = timestamp;
      paymentInstruction.processingLog?.push({
        timestamp,
        status: paymentInstruction.paymentInstructionStatus,
        description: 'Payment instruction updated',
        performedBy: 'SYSTEM'
      });

      this.correlationService.trackOperation(correlationId, 'UPDATE', 'SUCCESS');

      const response: UpdatePaymentInstructionResponse = {
        paymentInstruction
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      this.correlationService.trackOperation(correlationId, 'UPDATE', 'ERROR');
      return this.handleError(error as Error, correlationId, timestamp);
    }
  }

  /**
   * Request Payment Instruction (BIAN Operation)
   */
  public async request(
    paymentType: PaymentType,
    paymentId: string,
    request: RequestPaymentInstructionRequest
  ): Promise<BianOperationResult<RequestPaymentInstructionResponse>> {
    const correlationId = this.correlationService.generateCorrelationId();
    const timestamp = new Date().toISOString();

    try {
      const paymentInstruction = this.paymentInstructions.get(paymentId);
      
      if (!paymentInstruction) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: `Payment instruction ${paymentId} not found`
          }],
          correlationId,
          timestamp
        };
      }

      // Process request based on type
      let newStatus = paymentInstruction.paymentInstructionStatus;
      let requestStatus: 'ACCEPTED' | 'REJECTED' | 'PENDING' = 'ACCEPTED';

      switch (request.requestType) {
        case 'SUBMIT':
          newStatus = PaymentStatus.PROCESSING;
          break;
        case 'AUTHORIZE':
          newStatus = PaymentStatus.AUTHORIZED;
          break;
        case 'PROCESS':
          // Apply test scenarios again to determine final status
          const testResult = TestScenariosService.evaluatePayment(paymentInstruction);
          if (testResult) {
            newStatus = testResult.status;
            if (testResult.requiresManualApproval) {
              newStatus = PaymentStatus.PENDING_AUTHORIZATION;
              requestStatus = 'PENDING';
            }
          } else {
            newStatus = PaymentStatus.COMPLETED;
          }
          break;
      }

      paymentInstruction.paymentInstructionStatus = newStatus;
      paymentInstruction.lastModifiedDateTime = timestamp;
      paymentInstruction.processingLog?.push({
        timestamp,
        status: newStatus,
        description: `Payment ${request.requestType.toLowerCase()} requested`,
        performedBy: 'SYSTEM'
      });

      this.correlationService.trackOperation(correlationId, 'REQUEST', 'SUCCESS');

      const response: RequestPaymentInstructionResponse = {
        paymentInstruction,
        requestStatus,
        requestProcessingResult: `Payment ${request.requestType.toLowerCase()} processed successfully`
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      this.correlationService.trackOperation(correlationId, 'REQUEST', 'ERROR');
      return this.handleError(error as Error, correlationId, timestamp);
    }
  }

  /**
   * Retrieve Payment Instruction (BIAN Operation)
   */
  public async retrieve(
    paymentType: PaymentType,
    paymentId: string
  ): Promise<BianOperationResult<RetrievePaymentInstructionResponse>> {
    const correlationId = this.correlationService.generateCorrelationId();
    const timestamp = new Date().toISOString();

    try {
      const paymentInstruction = this.paymentInstructions.get(paymentId);
      
      if (!paymentInstruction) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: `Payment instruction ${paymentId} not found`
          }],
          correlationId,
          timestamp
        };
      }

      this.correlationService.trackOperation(correlationId, 'RETRIEVE', 'SUCCESS');

      const response: RetrievePaymentInstructionResponse = {
        paymentInstruction,
        retrievalDateTime: timestamp
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      this.correlationService.trackOperation(correlationId, 'RETRIEVE', 'ERROR');
      return this.handleError(error as Error, correlationId, timestamp);
    }
  }

  /**
   * Control Payment Instruction (BIAN Operation)
   */
  public async control(
    paymentType: PaymentType,
    paymentId: string,
    request: ControlPaymentInstructionRequest
  ): Promise<BianOperationResult<ControlPaymentInstructionResponse>> {
    const correlationId = this.correlationService.generateCorrelationId();
    const timestamp = new Date().toISOString();

    try {
      const paymentInstruction = this.paymentInstructions.get(paymentId);
      
      if (!paymentInstruction) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: `Payment instruction ${paymentId} not found`
          }],
          correlationId,
          timestamp
        };
      }

      let controlActionResult: 'SUCCESS' | 'FAILED' | 'PENDING' = 'SUCCESS';
      let newStatus = paymentInstruction.paymentInstructionStatus;

      switch (request.controlActionType) {
        case 'CANCEL':
          newStatus = PaymentStatus.CANCELLED;
          break;
        case 'SUSPEND':
          // Keep current status but add suspend flag
          break;
        case 'RESUME':
          // Resume from suspended state
          break;
        case 'TERMINATE':
          newStatus = PaymentStatus.FAILED;
          break;
      }

      paymentInstruction.paymentInstructionStatus = newStatus;
      paymentInstruction.lastModifiedDateTime = timestamp;
      paymentInstruction.processingLog?.push({
        timestamp,
        status: newStatus,
        description: `Payment ${request.controlActionType.toLowerCase()} action performed`,
        performedBy: 'SYSTEM'
      });

      this.correlationService.trackOperation(correlationId, 'CONTROL', 'SUCCESS');

      const response: ControlPaymentInstructionResponse = {
        paymentInstruction,
        controlActionResult,
        controlActionDateTime: timestamp
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      this.correlationService.trackOperation(correlationId, 'CONTROL', 'ERROR');
      return this.handleError(error as Error, correlationId, timestamp);
    }
  }

  /**
   * Exchange Payment Instruction (BIAN Operation)
   */
  public async exchange(
    paymentType: PaymentType,
    paymentId: string,
    request: ExchangePaymentInstructionRequest
  ): Promise<BianOperationResult<ExchangePaymentInstructionResponse>> {
    const correlationId = this.correlationService.generateCorrelationId();
    const timestamp = new Date().toISOString();

    try {
      const paymentInstruction = this.paymentInstructions.get(paymentId);
      
      if (!paymentInstruction) {
        return {
          success: false,
          errors: [{
            errorCode: 'PAYMENT_NOT_FOUND',
            errorDescription: `Payment instruction ${paymentId} not found`
          }],
          correlationId,
          timestamp
        };
      }

      let exchangeActionResult: 'SUCCESS' | 'FAILED' | 'PENDING' = 'SUCCESS';

      // Handle exchange actions
      switch (request.exchangeActionType) {
        case 'ACCEPT':
          // External system accepted the payment
          break;
        case 'REJECT':
          paymentInstruction.paymentInstructionStatus = PaymentStatus.FAILED;
          break;
        case 'REQUEST':
          // Request for additional information
          exchangeActionResult = 'PENDING';
          break;
        case 'GRANT':
          // Grant approval or permission
          break;
      }

      paymentInstruction.lastModifiedDateTime = timestamp;
      paymentInstruction.processingLog?.push({
        timestamp,
        status: paymentInstruction.paymentInstructionStatus,
        description: `Exchange ${request.exchangeActionType.toLowerCase()} action performed`,
        performedBy: 'EXTERNAL_SYSTEM'
      });

      this.correlationService.trackOperation(correlationId, 'EXCHANGE', 'SUCCESS');

      const response: ExchangePaymentInstructionResponse = {
        paymentInstruction,
        exchangeActionResult,
        exchangeActionDateTime: timestamp
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      this.correlationService.trackOperation(correlationId, 'EXCHANGE', 'ERROR');
      return this.handleError(error as Error, correlationId, timestamp);
    }
  }

  /**
   * Query Payment Instructions (BIAN Operation)
   */
  public async query(
    paymentType: PaymentType,
    query: PaymentInstructionQuery
  ): Promise<BianOperationResult<PaymentInstructionList>> {
    const correlationId = this.correlationService.generateCorrelationId();
    const timestamp = new Date().toISOString();

    try {
      let filteredPayments = Array.from(this.paymentInstructions.values());

      // Apply filters
      if (query.paymentType) {
        filteredPayments = filteredPayments.filter(p => p.paymentInstructionType === query.paymentType);
      }
      if (query.paymentStatus) {
        filteredPayments = filteredPayments.filter(p => p.paymentInstructionStatus === query.paymentStatus);
      }
      if (query.debitAccount) {
        filteredPayments = filteredPayments.filter(p => p.debitAccount.accountIdentification === query.debitAccount);
      }
      if (query.creditAccount) {
        filteredPayments = filteredPayments.filter(p => p.creditAccount.accountIdentification === query.creditAccount);
      }

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 50;
      const paginatedPayments = filteredPayments.slice(offset, offset + limit);

      this.correlationService.trackOperation(correlationId, 'QUERY', 'SUCCESS');

      const response: PaymentInstructionList = {
        paymentInstructions: paginatedPayments,
        totalCount: filteredPayments.length,
        hasMore: filteredPayments.length > offset + limit,
        nextOffset: filteredPayments.length > offset + limit ? offset + limit : undefined
      };

      return {
        success: true,
        data: response,
        correlationId,
        timestamp
      };

    } catch (error) {
      this.correlationService.trackOperation(correlationId, 'QUERY', 'ERROR');
      return this.handleError(error as Error, correlationId, timestamp);
    }
  }

  // Helper methods

  private validateInitiateRequest(request: InitiatePaymentInstructionRequest): BianOperationResult<boolean> {
    const errors: ErrorDetail[] = [];

    if (!request.paymentInstructionAmount || !request.paymentInstructionAmount.amount) {
      errors.push({
        errorCode: 'MISSING_AMOUNT',
        errorDescription: 'Payment amount is required'
      });
    }

    if (!request.debitAccount || !request.debitAccount.accountIdentification) {
      errors.push({
        errorCode: 'MISSING_DEBIT_ACCOUNT',
        errorDescription: 'Debit account is required'
      });
    }

    if (!request.creditAccount || !request.creditAccount.accountIdentification) {
      errors.push({
        errorCode: 'MISSING_CREDIT_ACCOUNT',
        errorDescription: 'Credit account is required'
      });
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      correlationId: '',
      timestamp: new Date().toISOString()
    };
  }

  private canUpdatePayment(status: PaymentStatus): boolean {
    return [
      PaymentStatus.INITIATED,
      PaymentStatus.PENDING_VALIDATION,
      PaymentStatus.VALIDATED
    ].includes(status);
  }

  private generatePaymentReference(paymentType: PaymentType): string {
    const config = getBianConfig();
    const prefix = this.getPaymentTypePrefix(paymentType);
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${config.serviceInstanceId}-${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  private getPaymentTypePrefix(paymentType: PaymentType): string {
    switch (paymentType) {
      case PaymentType.NPP_INSTANT: return 'NPP';
      case PaymentType.NPP_PAYID: return 'PID';
      case PaymentType.BECS_DIRECT_ENTRY: return 'BEC';
      case PaymentType.BPAY_PAYMENT: return 'BPY';
      case PaymentType.DIRECT_DEBIT: return 'DDR';
      case PaymentType.DOMESTIC_WIRE: return 'DWI';
      case PaymentType.INTERNATIONAL_WIRE: return 'IWI';
      default: return 'PAY';
    }
  }

  private handleError(error: Error, correlationId: string, timestamp: string): BianOperationResult<any> {
    return {
      success: false,
      errors: [{
        errorCode: 'INTERNAL_ERROR',
        errorDescription: error.message
      }],
      correlationId,
      timestamp
    };
  }
}

/**
 * Simple Correlation Service Implementation
 */
export class CorrelationService implements IBianCorrelationService {
  private operationHistory: Map<string, any[]> = new Map();

  generateCorrelationId(): string {
    return uuidv4();
  }

  trackOperation(correlationId: string, operation: string, status: string): void {
    if (!this.operationHistory.has(correlationId)) {
      this.operationHistory.set(correlationId, []);
    }
    
    this.operationHistory.get(correlationId)?.push({
      operation,
      status,
      timestamp: new Date().toISOString()
    });
  }

  getOperationHistory(correlationId: string): any[] {
    return this.operationHistory.get(correlationId) || [];
  }
}