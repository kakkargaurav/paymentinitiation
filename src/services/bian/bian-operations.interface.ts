/**
 * BIAN Operations Interface
 * Standard BIAN service domain operations for Payment Initiation
 */

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
  PaymentType
} from '../../models/bian/common-types.model';

/**
 * BIAN Payment Initiation Service Domain Operations
 * Based on BIAN v12.0.0 specification
 */
export interface IBianPaymentInitiationService {
  /**
   * Initiate Payment Instruction
   * Creates a new payment instruction instance
   * 
   * @param paymentType - The type of payment to initiate
   * @param request - Payment initiation request data
   * @returns Promise<BianOperationResult<InitiatePaymentInstructionResponse>>
   */
  initiate(
    paymentType: PaymentType,
    request: InitiatePaymentInstructionRequest
  ): Promise<BianOperationResult<InitiatePaymentInstructionResponse>>;

  /**
   * Update Payment Instruction
   * Updates an existing payment instruction before processing
   * 
   * @param paymentType - The type of payment to update
   * @param paymentId - The payment instruction reference
   * @param request - Payment update request data
   * @returns Promise<BianOperationResult<UpdatePaymentInstructionResponse>>
   */
  update(
    paymentType: PaymentType,
    paymentId: string,
    request: UpdatePaymentInstructionRequest
  ): Promise<BianOperationResult<UpdatePaymentInstructionResponse>>;

  /**
   * Request Payment Instruction
   * Submits payment instruction for processing/authorization
   * 
   * @param paymentType - The type of payment to request
   * @param paymentId - The payment instruction reference
   * @param request - Payment request data
   * @returns Promise<BianOperationResult<RequestPaymentInstructionResponse>>
   */
  request(
    paymentType: PaymentType,
    paymentId: string,
    request: RequestPaymentInstructionRequest
  ): Promise<BianOperationResult<RequestPaymentInstructionResponse>>;

  /**
   * Retrieve Payment Instruction
   * Gets payment instruction details and status
   * 
   * @param paymentType - The type of payment to retrieve
   * @param paymentId - The payment instruction reference
   * @returns Promise<BianOperationResult<RetrievePaymentInstructionResponse>>
   */
  retrieve(
    paymentType: PaymentType,
    paymentId: string
  ): Promise<BianOperationResult<RetrievePaymentInstructionResponse>>;

  /**
   * Control Payment Instruction
   * Controls the execution of a payment instruction (cancel, suspend, etc.)
   * 
   * @param paymentType - The type of payment to control
   * @param paymentId - The payment instruction reference
   * @param request - Payment control request data
   * @returns Promise<BianOperationResult<ControlPaymentInstructionResponse>>
   */
  control(
    paymentType: PaymentType,
    paymentId: string,
    request: ControlPaymentInstructionRequest
  ): Promise<BianOperationResult<ControlPaymentInstructionResponse>>;

  /**
   * Exchange Payment Instruction
   * Handles external communications and status updates
   * 
   * @param paymentType - The type of payment to exchange
   * @param paymentId - The payment instruction reference
   * @param request - Payment exchange request data
   * @returns Promise<BianOperationResult<ExchangePaymentInstructionResponse>>
   */
  exchange(
    paymentType: PaymentType,
    paymentId: string,
    request: ExchangePaymentInstructionRequest
  ): Promise<BianOperationResult<ExchangePaymentInstructionResponse>>;

  /**
   * Query Payment Instructions
   * Searches and filters payment instructions
   * 
   * @param paymentType - The type of payment to query
   * @param query - Query parameters
   * @returns Promise<BianOperationResult<PaymentInstructionList>>
   */
  query(
    paymentType: PaymentType,
    query: PaymentInstructionQuery
  ): Promise<BianOperationResult<PaymentInstructionList>>;
}

/**
 * BIAN Service Domain Control Record Operations
 */
export interface IBianServiceDomainControl {
  /**
   * Activate Service Domain Instance
   */
  activate(): Promise<BianOperationResult<any>>;

  /**
   * Configure Service Domain Instance
   */
  configure(configuration: any): Promise<BianOperationResult<any>>;

  /**
   * Feedback on Service Domain Instance
   */
  feedback(feedback: any): Promise<BianOperationResult<any>>;
}

/**
 * Payment Type Specific Handler Interface
 */
export interface IPaymentTypeHandler<TRequest, TResponse> {
  /**
   * Validate payment specific data
   */
  validate(request: TRequest): Promise<BianOperationResult<boolean>>;

  /**
   * Process payment initiation
   */
  initiate(request: TRequest): Promise<BianOperationResult<TResponse>>;

  /**
   * Update payment details
   */
  update(paymentId: string, request: Partial<TRequest>): Promise<BianOperationResult<TResponse>>;

  /**
   * Submit payment for processing
   */
  request(paymentId: string, request: any): Promise<BianOperationResult<TResponse>>;

  /**
   * Retrieve payment status
   */
  retrieve(paymentId: string): Promise<BianOperationResult<TResponse>>;

  /**
   * Control payment execution
   */
  control(paymentId: string, request: any): Promise<BianOperationResult<TResponse>>;

  /**
   * Handle external exchanges
   */
  exchange(paymentId: string, request: any): Promise<BianOperationResult<TResponse>>;
}

/**
 * BIAN Error Handling Interface
 */
export interface IBianErrorHandler {
  /**
   * Handle and format BIAN compliant errors
   */
  handleError(error: Error, context: string): BianOperationResult<any>;

  /**
   * Validate BIAN operation prerequisites
   */
  validateOperation(operation: string, data: any): BianOperationResult<boolean>;
}

/**
 * BIAN Correlation and Tracking Interface
 */
export interface IBianCorrelationService {
  /**
   * Generate correlation ID
   */
  generateCorrelationId(): string;

  /**
   * Track operation progress
   */
  trackOperation(correlationId: string, operation: string, status: string): void;

  /**
   * Get operation history
   */
  getOperationHistory(correlationId: string): any[];
}

/**
 * BIAN Compliance Validator Interface
 */
export interface IBianComplianceValidator {
  /**
   * Validate BIAN data structure compliance
   */
  validateDataStructure(data: any, schema: string): BianOperationResult<boolean>;

  /**
   * Validate BIAN operation flow compliance
   */
  validateOperationFlow(fromStatus: string, toStatus: string, operation: string): BianOperationResult<boolean>;

  /**
   * Generate compliance report
   */
  generateComplianceReport(): any;
}