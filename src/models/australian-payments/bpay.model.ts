/**
 * BPAY Payment Models
 * Australian bill payment system models
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
  ExchangePaymentInstructionResponse
} from '../bian/payment-instruction.model';

import {
  MonetaryAmount,
  AccountReference,
  BPayReference
} from '../bian/common-types.model';

// BPAY Specific Types
export enum BPAYTransactionType {
  BILL_PAYMENT = 'BILL_PAYMENT',
  REFUND = 'REFUND',
  REVERSAL = 'REVERSAL',
  ADJUSTMENT = 'ADJUSTMENT'
}

export enum BPAYPaymentMethod {
  INTERNET_BANKING = 'INTERNET_BANKING',
  PHONE_BANKING = 'PHONE_BANKING',
  ATM = 'ATM',
  BRANCH = 'BRANCH',
  MOBILE_APP = 'MOBILE_APP'
}

export enum BPAYProcessingCode {
  REAL_TIME = 'RT',
  BATCH = 'BA',
  EXPRESS = 'EX'
}

export enum BPAYReturnCode {
  INVALID_BILLER_CODE = '01',
  INVALID_REFERENCE_NUMBER = '02',
  PAYMENT_NOT_ACCEPTED = '03',
  BILLER_NOT_AVAILABLE = '04',
  SYSTEM_ERROR = '05',
  DUPLICATE_PAYMENT = '06',
  PAYMENT_LIMIT_EXCEEDED = '07',
  INSUFFICIENT_FUNDS = '08'
}

// BPAY Extended Payment Instruction
export interface BPAYPaymentInstruction extends PaymentInstruction {
  bpaySpecificData: {
    transactionType: BPAYTransactionType;
    paymentMethod: BPAYPaymentMethod;
    processingCode: BPAYProcessingCode;
    billerDetails: BPAYBillerDetails;
    paymentDetails: BPAYPaymentDetails;
    validationResult?: BPAYValidationResult;
    receiptDetails?: BPAYReceiptDetails;
    returnDetails?: BPAYReturnDetails;
  };
}

export interface BPAYBillerDetails {
  billerCode: string; // 6-digit BPAY biller code
  billerName: string;
  billerShortName?: string;
  billerABN?: string;
  billerContactNumber?: string;
  billerCategory?: BPAYBillerCategory;
  acceptsPartialPayments: boolean;
  minimumPaymentAmount?: MonetaryAmount;
  maximumPaymentAmount?: MonetaryAmount;
  paymentDueDays?: number;
}

export enum BPAYBillerCategory {
  UTILITIES = 'UTILITIES',
  TELECOMMUNICATIONS = 'TELECOMMUNICATIONS',
  INSURANCE = 'INSURANCE',
  GOVERNMENT = 'GOVERNMENT',
  EDUCATION = 'EDUCATION',
  HEALTHCARE = 'HEALTHCARE',
  RETAIL = 'RETAIL',
  FINANCE = 'FINANCE',
  OTHER = 'OTHER'
}

export interface BPAYPaymentDetails {
  customerReferenceNumber: string; // Customer's reference for the bill
  billerReferenceNumber?: string; // Biller's internal reference
  invoiceNumber?: string;
  accountNumber?: string;
  paymentDueDate?: string;
  originalBillAmount?: MonetaryAmount;
  outstandingAmount?: MonetaryAmount;
  partialPaymentAllowed: boolean;
  paymentNarrative?: string;
}

export interface BPAYValidationResult {
  isValid: boolean;
  validationDateTime: string;
  billerCodeValid: boolean;
  referenceNumberValid: boolean;
  amountValid: boolean;
  validationErrors: BPAYValidationError[];
  validationWarnings: BPAYValidationWarning[];
}

export interface BPAYValidationError {
  errorCode: string;
  errorDescription: string;
  field: string;
  severity: 'ERROR' | 'WARNING';
}

export interface BPAYValidationWarning {
  warningCode: string;
  warningDescription: string;
  field: string;
}

export interface BPAYReceiptDetails {
  receiptNumber: string;
  receiptDateTime: string;
  confirmationNumber?: string;
  transactionId: string;
  paymentReference: string;
  receiptText: string[];
}

export interface BPAYReturnDetails {
  returnCode: BPAYReturnCode;
  returnDescription: string;
  returnDateTime: string;
  originalTransactionId: string;
  returnReason?: string;
  canRetry: boolean;
}

// BPAY Specific Request/Response Models
export interface InitiateBPAYPaymentRequest extends InitiatePaymentInstructionRequest {
  bpayData: {
    transactionType: BPAYTransactionType;
    paymentMethod: BPAYPaymentMethod;
    processingCode?: BPAYProcessingCode;
    customerReferenceNumber: string;
    invoiceNumber?: string;
    accountNumber?: string;
    paymentDueDate?: string;
    paymentNarrative?: string;
  };
  bpayReference: BPayReference; // This comes from common types
}

export interface InitiateBPAYPaymentResponse extends InitiatePaymentInstructionResponse {
  bpayPaymentInstruction: BPAYPaymentInstruction;
  bpayValidationResult: BPAYValidationResult;
}

export interface UpdateBPAYPaymentRequest extends UpdatePaymentInstructionRequest {
  bpayData?: {
    customerReferenceNumber?: string;
    paymentDueDate?: string;
    paymentNarrative?: string;
    accountNumber?: string;
  };
}

export interface UpdateBPAYPaymentResponse extends UpdatePaymentInstructionResponse {
  bpayPaymentInstruction: BPAYPaymentInstruction;
}

export interface RequestBPAYPaymentRequest extends RequestPaymentInstructionRequest {
  bpayRequestData?: {
    forceRealTimeProcessing?: boolean;
    generateReceipt?: boolean;
    sendConfirmationSMS?: boolean;
    confirmationMobileNumber?: string;
  };
}

export interface RequestBPAYPaymentResponse extends RequestPaymentInstructionResponse {
  bpayPaymentInstruction: BPAYPaymentInstruction;
  bpayProcessingResult?: {
    transactionId: string;
    confirmationNumber: string;
    expectedSettlementDate: string;
    receiptGenerated: boolean;
    smsConfirmationSent: boolean;
  };
}

export interface RetrieveBPAYPaymentResponse extends RetrievePaymentInstructionResponse {
  bpayPaymentInstruction: BPAYPaymentInstruction;
}

export interface ControlBPAYPaymentRequest extends ControlPaymentInstructionRequest {
  bpayControlData?: {
    cancellationReason?: string;
    notifyBiller?: boolean;
    refundRequired?: boolean;
  };
}

export interface ControlBPAYPaymentResponse extends ControlPaymentInstructionResponse {
  bpayPaymentInstruction: BPAYPaymentInstruction;
  bpayControlResult?: {
    cancellationConfirmed: boolean;
    billerNotified: boolean;
    refundInitiated: boolean;
    refundAmount?: MonetaryAmount;
  };
}

export interface ExchangeBPAYPaymentRequest extends ExchangePaymentInstructionRequest {
  bpayExchangeData?: {
    returnCode?: BPAYReturnCode;
    returnReason?: string;
    billerResponse?: string;
  };
}

export interface ExchangeBPAYPaymentResponse extends ExchangePaymentInstructionResponse {
  bpayPaymentInstruction: BPAYPaymentInstruction;
}

// BPAY Utility Models
export interface BPAYBillerLookupRequest {
  billerCode?: string;
  billerName?: string;
  category?: BPAYBillerCategory;
  activeOnly?: boolean;
}

export interface BPAYBillerLookupResponse {
  billers: BPAYBillerDetails[];
  totalCount: number;
  searchDateTime: string;
}

export interface BPAYReferenceValidationRequest {
  billerCode: string;
  customerReferenceNumber: string;
  validateCheckDigit?: boolean;
}

export interface BPAYReferenceValidationResponse {
  isValid: boolean;
  validationResult: BPAYValidationResult;
  billerDetails: BPAYBillerDetails;
  accountDetails?: BPAYAccountDetails;
}

export interface BPAYAccountDetails {
  accountNumber: string;
  accountName: string;
  accountStatus: 'ACTIVE' | 'CLOSED' | 'SUSPENDED';
  currentBalance?: MonetaryAmount;
  lastPaymentDate?: string;
  lastPaymentAmount?: MonetaryAmount;
}

// BPAY Settlement Models
export interface BPAYSettlementDetails {
  settlementDate: string;
  settlementBatch: string;
  billerSettlementReference: string;
  bankSettlementReference: string;
  settlementAmount: MonetaryAmount;
  settlementFee?: MonetaryAmount;
  settlementStatus: 'PENDING' | 'SETTLED' | 'FAILED';
  expectedSettlementTime?: string;
}

// BPAY Reporting Models
export interface BPAYTransactionReport {
  reportPeriod: {
    fromDate: string;
    toDate: string;
  };
  totalTransactions: number;
  totalAmount: MonetaryAmount;
  successfulTransactions: number;
  failedTransactions: number;
  returnedTransactions: number;
  averageTransactionAmount: MonetaryAmount;
  topBillers: BPAYBillerStatistics[];
  paymentMethodBreakdown: BPAYPaymentMethodStatistics[];
}

export interface BPAYBillerStatistics {
  billerCode: string;
  billerName: string;
  transactionCount: number;
  totalAmount: MonetaryAmount;
  percentageOfTotal: number;
}

export interface BPAYPaymentMethodStatistics {
  paymentMethod: BPAYPaymentMethod;
  transactionCount: number;
  totalAmount: MonetaryAmount;
  percentageOfTotal: number;
}

// BPAY Error Handling
export interface BPAYErrorResponse {
  errorCode: string;
  errorMessage: string;
  errorDetail?: string;
  billerCode?: string;
  referenceNumber?: string;
  retryable: boolean;
  suggestedAction?: string;
}

// BPAY Crn (Customer Reference Number) Models
export interface BPAYCrnValidation {
  crnFormat: 'NUMERIC' | 'ALPHANUMERIC' | 'CUSTOM';
  minLength: number;
  maxLength: number;
  checkDigitRequired: boolean;
  checkDigitAlgorithm?: 'MOD10' | 'MOD97' | 'CUSTOM';
  allowedCharacters?: string;
  validationPattern?: string;
}