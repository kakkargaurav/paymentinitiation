/**
 * Direct Debit Payment Models
 * Australian direct debit system models for recurring payments
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
  AccountReference
} from '../bian/common-types.model';

// Direct Debit Specific Types
export enum DirectDebitType {
  RECURRING = 'RECURRING',
  ONE_OFF = 'ONE_OFF',
  VARIABLE = 'VARIABLE',
  INSTALMENT = 'INSTALMENT'
}

export enum DirectDebitFrequency {
  WEEKLY = 'WEEKLY',
  FORTNIGHTLY = 'FORTNIGHTLY', 
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUALLY = 'SEMI_ANNUALLY',
  ANNUALLY = 'ANNUALLY',
  AD_HOC = 'AD_HOC'
}

export enum DirectDebitStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PENDING_APPROVAL = 'PENDING_APPROVAL'
}

export enum DishonourReason {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  ACCOUNT_CLOSED = 'ACCOUNT_CLOSED',
  PAYMENT_STOPPED = 'PAYMENT_STOPPED',
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  INVALID_ACCOUNT = 'INVALID_ACCOUNT',
  CUSTOMER_DECEASED = 'CUSTOMER_DECEASED',
  REFER_TO_DRAWER = 'REFER_TO_DRAWER'
}

// Direct Debit Extended Payment Instruction
export interface DirectDebitPaymentInstruction extends PaymentInstruction {
  directDebitSpecificData: {
    mandateReference: string;
    directDebitType: DirectDebitType;
    frequency: DirectDebitFrequency;
    mandateDetails: DirectDebitMandateDetails;
    scheduleDetails: DirectDebitScheduleDetails;
    dishonourDetails?: DirectDebitDishonourDetails;
    notificationSettings?: DirectDebitNotificationSettings;
  };
}

export interface DirectDebitMandateDetails {
  mandateId: string;
  mandateReference: string;
  creditorReference: string;
  creditorName: string;
  creditorABN?: string;
  debtorReference: string;
  debtorName: string;
  mandateDescription: string;
  mandateStatus: DirectDebitStatus;
  mandateStartDate: string;
  mandateEndDate?: string;
  maximumAmount?: MonetaryAmount;
  authorisationMethod: 'ONLINE' | 'PAPER' | 'PHONE' | 'VERBAL';
  authorisationDate: string;
  authorisedBy: string;
  termsAndConditions?: string;
}

export interface DirectDebitScheduleDetails {
  firstDebitDate: string;
  nextDebitDate: string;
  lastDebitDate?: string;
  frequency: DirectDebitFrequency;
  numberOfPayments?: number;
  remainingPayments?: number;
  totalAmount?: MonetaryAmount;
  variableAmountAllowed: boolean;
  advanceNotificationDays: number;
  retryAttempts: number;
  retryInterval: number; // Days between retry attempts
}

export interface DirectDebitDishonourDetails {
  dishonourDate: string;
  dishonourReason: DishonourReason;
  dishonourCode: string;
  dishonourDescription: string;
  bankReturnCode?: string;
  retryScheduled: boolean;
  retryDate?: string;
  retryCount: number;
  feeCharged?: MonetaryAmount;
  notificationSent: boolean;
}

export interface DirectDebitNotificationSettings {
  advanceNotificationRequired: boolean;
  advanceNotificationDays: number;
  notificationMethod: 'EMAIL' | 'SMS' | 'POST' | 'PHONE';
  notificationAddress?: string;
  dishonourNotificationRequired: boolean;
  successNotificationRequired: boolean;
  changeNotificationRequired: boolean;
}

// Direct Debit Specific Request/Response Models
export interface InitiateDirectDebitPaymentRequest extends InitiatePaymentInstructionRequest {
  directDebitData: {
    mandateReference: string;
    directDebitType: DirectDebitType;
    frequency: DirectDebitFrequency;
    firstDebitDate: string;
    numberOfPayments?: number;
    maximumAmount?: MonetaryAmount;
    variableAmountAllowed?: boolean;
    advanceNotificationDays?: number;
    authorisationMethod: 'ONLINE' | 'PAPER' | 'PHONE' | 'VERBAL';
    creditorReference: string;
    creditorName: string;
    debtorReference: string;
    mandateDescription: string;
  };
}

export interface InitiateDirectDebitPaymentResponse extends InitiatePaymentInstructionResponse {
  directDebitPaymentInstruction: DirectDebitPaymentInstruction;
}

export interface UpdateDirectDebitPaymentRequest extends UpdatePaymentInstructionRequest {
  directDebitData?: {
    nextDebitDate?: string;
    maximumAmount?: MonetaryAmount;
    numberOfPayments?: number;
    advanceNotificationDays?: number;
    mandateDescription?: string;
  };
}

export interface UpdateDirectDebitPaymentResponse extends UpdatePaymentInstructionResponse {
  directDebitPaymentInstruction: DirectDebitPaymentInstruction;
}

export interface RequestDirectDebitPaymentRequest extends RequestPaymentInstructionRequest {
  directDebitRequestData?: {
    processImmediately?: boolean;
    skipAdvanceNotification?: boolean;
    overrideAmount?: MonetaryAmount;
    customDebitDate?: string;
  };
}

export interface RequestDirectDebitPaymentResponse extends RequestPaymentInstructionResponse {
  directDebitPaymentInstruction: DirectDebitPaymentInstruction;
  directDebitProcessingResult?: {
    debitScheduled: boolean;
    scheduledDebitDate: string;
    notificationSent: boolean;
    mandateValidated: boolean;
  };
}

export interface RetrieveDirectDebitPaymentResponse extends RetrievePaymentInstructionResponse {
  directDebitPaymentInstruction: DirectDebitPaymentInstruction;
}

export interface ControlDirectDebitPaymentRequest extends ControlPaymentInstructionRequest {
  directDebitControlData?: {
    suspendUntilDate?: string;
    cancellationReason?: string;
    notifyDebtor?: boolean;
    refundLastPayment?: boolean;
  };
}

export interface ControlDirectDebitPaymentResponse extends ControlPaymentInstructionResponse {
  directDebitPaymentInstruction: DirectDebitPaymentInstruction;
  directDebitControlResult?: {
    mandateStatusChanged: boolean;
    nextDebitCancelled: boolean;
    debtorNotified: boolean;
    refundProcessed: boolean;
  };
}

export interface ExchangeDirectDebitPaymentRequest extends ExchangePaymentInstructionRequest {
  directDebitExchangeData?: {
    dishonourCode?: string;
    dishonourReason?: DishonourReason;
    bankResponse?: string;
    retryRequired?: boolean;
  };
}

export interface ExchangeDirectDebitPaymentResponse extends ExchangePaymentInstructionResponse {
  directDebitPaymentInstruction: DirectDebitPaymentInstruction;
}

// Direct Debit Utility Models
export interface DirectDebitMandateSearch {
  mandateReference?: string;
  creditorReference?: string;
  debtorAccount?: string;
  mandateStatus?: DirectDebitStatus;
  activeOnly?: boolean;
}

export interface DirectDebitMandateSearchResponse {
  mandates: DirectDebitMandateDetails[];
  totalCount: number;
  searchDateTime: string;
}

export interface DirectDebitValidationRequest {
  mandateReference: string;
  debitAmount: MonetaryAmount;
  debitDate: string;
  validateMandateStatus?: boolean;
  validateAmountLimits?: boolean;
}

export interface DirectDebitValidationResponse {
  isValid: boolean;
  validationErrors: DirectDebitValidationError[];
  mandateDetails: DirectDebitMandateDetails;
  validationDateTime: string;
}

export interface DirectDebitValidationError {
  errorCode: string;
  errorDescription: string;
  field: string;
  severity: 'ERROR' | 'WARNING';
}

// Direct Debit Settlement Models
export interface DirectDebitSettlementDetails {
  settlementDate: string;
  settlementBatch: string;
  totalDebits: number;
  totalAmount: MonetaryAmount;
  successfulDebits: number;
  dishonourcedDebits: number;
  settlementStatus: 'PENDING' | 'SETTLED' | 'FAILED';
  settlementReference: string;
}

// Direct Debit Reporting Models
export interface DirectDebitReport {
  reportPeriod: {
    fromDate: string;
    toDate: string;
  };
  totalMandates: number;
  activeMandates: number;
  totalDebits: number;
  totalAmount: MonetaryAmount;
  successfulDebits: number;
  dishonourcedDebits: number;
  dishonourRate: number;
  averageDebitAmount: MonetaryAmount;
  topCreditors: DirectDebitCreditorStatistics[];
  dishonourReasons: DirectDebitDishonourStatistics[];
}

export interface DirectDebitCreditorStatistics {
  creditorReference: string;
  creditorName: string;
  mandateCount: number;
  debitCount: number;
  totalAmount: MonetaryAmount;
  dishonourRate: number;
}

export interface DirectDebitDishonourStatistics {
  dishonourReason: DishonourReason;
  occurrences: number;
  percentage: number;
  totalAmount: MonetaryAmount;
}

// Direct Debit Error Handling
export interface DirectDebitErrorResponse {
  errorCode: string;
  errorMessage: string;
  errorDetail?: string;
  mandateReference?: string;
  retryable: boolean;
  suggestedAction?: string;
}

// Direct Debit Mandate Management
export interface DirectDebitMandateUpdateRequest {
  mandateReference: string;
  updates: {
    maximumAmount?: MonetaryAmount;
    frequency?: DirectDebitFrequency;
    nextDebitDate?: string;
    mandateEndDate?: string;
    notificationSettings?: DirectDebitNotificationSettings;
  };
}

export interface DirectDebitMandateUpdateResponse {
  mandateReference: string;
  updateStatus: 'SUCCESS' | 'FAILED' | 'PENDING_APPROVAL';
  updatedFields: string[];
  effectiveDate: string;
  requiresCustomerApproval: boolean;
}