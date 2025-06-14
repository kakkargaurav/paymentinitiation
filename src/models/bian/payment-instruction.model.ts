/**
 * BIAN Payment Instruction Model
 * Based on BIAN Semantic API for Payment Initiation v12.0.0
 */

import {
  PaymentType,
  PaymentStatus,
  PaymentMechanism,
  MonetaryAmount,
  AccountReference,
  PayIDReference,
  BPayReference,
  DateTimeRange,
  ContactDetails,
  BianServiceDomainControlRecord,
  BianServiceDomainFeedbackRecord,
  AustralianBankDetails,
  AustralianPaymentLimits
} from './common-types.model';

export interface PaymentInstruction {
  // Core BIAN fields
  paymentInstructionReference: string;
  paymentInstructionInstanceReference?: string;
  paymentInstructionType: PaymentType;
  paymentInstructionStatus: PaymentStatus;
  paymentInstructionDateTime: string;
  paymentInstructionAmount: MonetaryAmount;
  paymentMechanism: PaymentMechanism;
  
  // Account details
  debitAccount: AccountReference;
  creditAccount: AccountReference;
  
  // Payment purpose and description
  paymentPurpose?: string;
  paymentDescription?: string;
  remittanceInformation?: string;
  
  // Scheduling
  requestedExecutionDate?: string;
  requestedCollectionDate?: string;
  
  // Australian specific fields
  payIdDetails?: PayIDReference;
  bpayDetails?: BPayReference;
  australianBankingDetails?: {
    debitBsb?: string;
    creditBsb?: string;
  };
  
  // BIAN Control Record
  serviceDomainControlRecord?: BianServiceDomainControlRecord;
  
  // Audit and tracking
  createdBy?: string;
  createdDateTime?: string;
  lastModifiedBy?: string;
  lastModifiedDateTime?: string;
  
  // Compliance and risk
  riskAssessmentResult?: string;
  complianceCheckResult?: string;
  amlScreeningResult?: string;
  
  // Processing details
  processingLog?: PaymentProcessingLogEntry[];
  fees?: PaymentFee[];
  exchangeRate?: ExchangeRateDetails;
}

export interface PaymentProcessingLogEntry {
  timestamp: string;
  status: PaymentStatus;
  description: string;
  performedBy?: string;
  errorCode?: string;
  errorDescription?: string;
}

export interface PaymentFee {
  feeType: string;
  feeAmount: MonetaryAmount;
  feeDescription?: string;
  feeCalculationMethod?: string;
}

export interface ExchangeRateDetails {
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  rateDate: string;
  rateSource?: string;
}

// BIAN Standard Operations Request/Response Models

export interface InitiatePaymentInstructionRequest {
  paymentInstructionType: PaymentType;
  paymentInstructionAmount: MonetaryAmount;
  paymentMechanism: PaymentMechanism;
  debitAccount: AccountReference;
  creditAccount: AccountReference;
  paymentPurpose?: string;
  paymentDescription?: string;
  remittanceInformation?: string;
  requestedExecutionDate?: string;
  payIdDetails?: PayIDReference;
  bpayDetails?: BPayReference;
  serviceDomainControlRecord?: BianServiceDomainControlRecord;
}

export interface InitiatePaymentInstructionResponse {
  paymentInstructionReference: string;
  paymentInstructionInstanceReference: string;
  paymentInstruction: PaymentInstruction;
}

export interface UpdatePaymentInstructionRequest {
  paymentInstructionAmount?: MonetaryAmount;
  requestedExecutionDate?: string;
  paymentPurpose?: string;
  paymentDescription?: string;
  remittanceInformation?: string;
  payIdDetails?: PayIDReference;
  bpayDetails?: BPayReference;
}

export interface UpdatePaymentInstructionResponse {
  paymentInstruction: PaymentInstruction;
}

export interface RequestPaymentInstructionRequest {
  requestType: 'SUBMIT' | 'AUTHORIZE' | 'PROCESS';
  requestDescription?: string;
  authorizationDetails?: AuthorizationDetails;
}

export interface RequestPaymentInstructionResponse {
  paymentInstruction: PaymentInstruction;
  requestStatus: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  requestProcessingResult?: string;
}

export interface RetrievePaymentInstructionResponse {
  paymentInstruction: PaymentInstruction;
  retrievalDateTime: string;
}

export interface ControlPaymentInstructionRequest {
  controlActionType: 'SUSPEND' | 'RESUME' | 'CANCEL' | 'TERMINATE';
  controlActionDescription?: string;
  controlActionReason?: string;
}

export interface ControlPaymentInstructionResponse {
  paymentInstruction: PaymentInstruction;
  controlActionResult: 'SUCCESS' | 'FAILED' | 'PENDING';
  controlActionDateTime: string;
}

export interface ExchangePaymentInstructionRequest {
  exchangeActionType: 'ACCEPT' | 'REJECT' | 'REQUEST' | 'GRANT';
  exchangeActionDescription?: string;
  exchangeActionReason?: string;
  feedbackRecord?: BianServiceDomainFeedbackRecord;
}

export interface ExchangePaymentInstructionResponse {
  paymentInstruction: PaymentInstruction;
  exchangeActionResult: 'SUCCESS' | 'FAILED' | 'PENDING';
  exchangeActionDateTime: string;
}

export interface AuthorizationDetails {
  authorizationMethod: 'DUAL_CONTROL' | 'SINGLE_CONTROL' | 'AUTOMATIC';
  authorizerReference?: string;
  authorizationDateTime?: string;
  authorizationCode?: string;
  authorizationLimit?: MonetaryAmount;
}

// Query and Filter Models
export interface PaymentInstructionQuery {
  paymentInstructionReference?: string;
  paymentType?: PaymentType;
  paymentStatus?: PaymentStatus;
  debitAccount?: string;
  creditAccount?: string;
  amountRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: DateTimeRange;
  paymentMechanism?: PaymentMechanism;
  limit?: number;
  offset?: number;
}

export interface PaymentInstructionList {
  paymentInstructions: PaymentInstruction[];
  totalCount: number;
  hasMore: boolean;
  nextOffset?: number;
}