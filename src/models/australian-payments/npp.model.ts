/**
 * NPP (New Payments Platform) Payment Models
 * Australian instant payment system models with PayID support
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
  PayIDReference
} from '../bian/common-types.model';

// NPP Specific Types
export enum NPPMessageType {
  PACS_008 = 'pacs.008.001.08', // Customer Credit Transfer Initiation
  PACS_002 = 'pacs.002.001.10', // Payment Status Report
  PACS_004 = 'pacs.004.001.09', // Payment Return
  CAMT_056 = 'camt.056.001.08'  // Cancellation Request
}

export enum NPPPaymentCategory {
  INSTANT_PAYMENT = 'INSTANT_PAYMENT',
  PAYID_PAYMENT = 'PAYID_PAYMENT',
  REQUEST_TO_PAY = 'REQUEST_TO_PAY'
}

export enum NPPUrgency {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL'
}

// NPP Extended Payment Instruction
export interface NPPPaymentInstruction extends PaymentInstruction {
  nppSpecificData: {
    messageType: NPPMessageType;
    paymentCategory: NPPPaymentCategory;
    urgency: NPPUrgency;
    endToEndReference: string;
    ofiReference?: string; // Originating Financial Institution Reference
    rfiReference?: string; // Receiving Financial Institution Reference
    payIdResolutionResult?: PayIDResolutionResult;
    overlayServices?: NPPOverlayService[];
    extendedRemittanceInfo?: NPPExtendedRemittanceInfo;
  };
}

export interface PayIDResolutionResult {
  payIdType: 'EMAIL' | 'MOBILE' | 'ABN' | 'ORG_ID';
  payIdValue: string;
  resolvedAccount: AccountReference;
  payIdName: string;
  resolutionDateTime: string;
  resolutionStatus: 'SUCCESS' | 'FAILED' | 'NOT_FOUND' | 'MULTIPLE_MATCHES';
  resolutionError?: string;
}

export interface NPPOverlayService {
  serviceType: 'PAYTO' | 'REQUEST_TO_PAY' | 'CONFIRMATION_OF_PAYEE';
  serviceData: any;
  serviceStatus: 'ENABLED' | 'DISABLED';
}

export interface NPPExtendedRemittanceInfo {
  structuredRemittanceInfo?: StructuredRemittanceInfo;
  unstructuredRemittanceInfo?: string[];
  invoiceDetails?: InvoiceDetails;
}

export interface StructuredRemittanceInfo {
  referredDocumentInformation?: ReferredDocumentInfo[];
  additionalRemittanceInformation?: string;
}

export interface ReferredDocumentInfo {
  type: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'RECEIPT';
  number: string;
  relatedDate?: string;
  lineDetails?: DocumentLineDetail[];
}

export interface DocumentLineDetail {
  lineIdentification?: string;
  lineAmount?: MonetaryAmount;
  lineDescription?: string;
}

export interface InvoiceDetails {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: MonetaryAmount;
  dueDate?: string;
  supplierReference?: string;
  purchaseOrderNumber?: string;
}

// NPP Specific Request/Response Models
export interface InitiateNPPPaymentRequest extends InitiatePaymentInstructionRequest {
  nppData: {
    paymentCategory: NPPPaymentCategory;
    urgency?: NPPUrgency;
    endToEndReference?: string;
    overlayServices?: NPPOverlayService[];
    extendedRemittanceInfo?: NPPExtendedRemittanceInfo;
  };
}

export interface InitiateNPPPaymentResponse extends InitiatePaymentInstructionResponse {
  nppPaymentInstruction: NPPPaymentInstruction;
}

export interface UpdateNPPPaymentRequest extends UpdatePaymentInstructionRequest {
  nppData?: {
    urgency?: NPPUrgency;
    extendedRemittanceInfo?: NPPExtendedRemittanceInfo;
    overlayServices?: NPPOverlayService[];
  };
}

export interface UpdateNPPPaymentResponse extends UpdatePaymentInstructionResponse {
  nppPaymentInstruction: NPPPaymentInstruction;
}

export interface RequestNPPPaymentRequest extends RequestPaymentInstructionRequest {
  nppRequestData?: {
    forceRealTimeProcessing?: boolean;
    priorityIndicator?: 'HIGH' | 'NORMAL';
  };
}

export interface RequestNPPPaymentResponse extends RequestPaymentInstructionResponse {
  nppPaymentInstruction: NPPPaymentInstruction;
  nppProcessingResult?: {
    messageId: string;
    clearingSystemReference: string;
    settlementMethod: 'RTGS' | 'BATCH';
    expectedSettlementDateTime: string;
  };
}

export interface RetrieveNPPPaymentResponse extends RetrievePaymentInstructionResponse {
  nppPaymentInstruction: NPPPaymentInstruction;
}

export interface ControlNPPPaymentRequest extends ControlPaymentInstructionRequest {
  nppControlData?: {
    cancellationReason?: NPPCancellationReason;
    originalMessageId?: string;
  };
}

export interface ControlNPPPaymentResponse extends ControlPaymentInstructionResponse {
  nppPaymentInstruction: NPPPaymentInstruction;
  nppControlResult?: {
    cancellationRequestId?: string;
    cancellationStatus?: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  };
}

export interface ExchangeNPPPaymentRequest extends ExchangePaymentInstructionRequest {
  nppExchangeData?: {
    returnReason?: NPPReturnReason;
    originalEndToEndReference?: string;
  };
}

export interface ExchangeNPPPaymentResponse extends ExchangePaymentInstructionResponse {
  nppPaymentInstruction: NPPPaymentInstruction;
}

// NPP Specific Enums
export enum NPPCancellationReason {
  DUPLICATE_SENDING = 'DUPL',
  TECHNICAL_PROBLEMS = 'TECH',
  FRAUDULENT_ORIGIN = 'FRAD',
  CANCELLED_BY_CUSTOMER = 'CUST',
  OPERATIONAL_ERROR = 'OPER'
}

export enum NPPReturnReason {
  ACCOUNT_CLOSED = 'AC04',
  INVALID_ACCOUNT = 'AC01',
  ACCOUNT_BLOCKED = 'AC06',
  INSUFFICIENT_FUNDS = 'AM04',
  INVALID_AMOUNT = 'AM01',
  INVALID_CURRENCY = 'AM02',
  BENEFICIARY_DECEASED = 'BE05',
  INVALID_AGENT = 'AG01',
  REGULATORY_REASON = 'RR01',
  REQUESTED_BY_CUSTOMER = 'CUST',
  TECHNICAL_ERROR = 'TECH'
}

// PayID Resolution Models
export interface PayIDLookupRequest {
  payIdType: 'EMAIL' | 'MOBILE' | 'ABN' | 'ORG_ID';
  payIdValue: string;
  payerAccountReference?: string;
}

export interface PayIDLookupResponse {
  resolutionResult: PayIDResolutionResult;
  allowedPaymentMethods?: string[];
  maximumPaymentAmount?: MonetaryAmount;
  minimumPaymentAmount?: MonetaryAmount;
}

// NPP Settlement Models
export interface NPPSettlementDetails {
  settlementMethod: 'RTGS' | 'MULTILATERAL';
  settlementDateTime: string;
  clearingSystemSettlementReference: string;
  exchangeSettlementReference?: string;
  settlementAmount: MonetaryAmount;
  settlementStatus: 'PENDING' | 'SETTLED' | 'FAILED';
}