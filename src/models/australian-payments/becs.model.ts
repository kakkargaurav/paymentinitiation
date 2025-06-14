/**
 * BECS (Bulk Electronic Clearing System) Payment Models
 * Australian direct entry system for batch payments
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

// BECS Specific Types
export enum BECSTransactionCode {
  EXTERNALLY_INITIATED_DEBIT = '13',
  EXTERNALLY_INITIATED_CREDIT = '50',
  AUSTRALIAN_GOVERNMENT_PENSION = '51',
  FAMILY_ALLOWANCE = '52',
  PAY = '53',
  PENSION = '54',
  ALLOTMENT = '55',
  DIVIDEND = '56',
  DEBENTURE_INTEREST = '57'
}

export enum BECSFileFormat {
  CEMTEX = 'CEMTEX',
  DIRECT_ENTRY = 'DIRECT_ENTRY'
}

export enum BECSProcessingDay {
  SAME_DAY = 'SAME_DAY',
  NEXT_DAY = 'NEXT_DAY',
  SPECIFIED_DATE = 'SPECIFIED_DATE'
}

export enum BECSRecordType {
  DESCRIPTIVE_RECORD = '0',
  DETAIL_RECORD = '1',
  FILE_TOTAL_RECORD = '7'
}

export enum BECSReturnCode {
  REFER_TO_DRAWER = '01',
  INSUFFICIENT_FUNDS = '02',
  ACCOUNT_CLOSED = '03',
  CUSTOMER_DECEASED = '04',
  BANK_UNABLE_TO_LOCATE_ACCOUNT = '05',
  PAYMENT_STOPPED = '06',
  CUSTOMER_HAS_ADVISED_BANK_INCORRECTLY = '07',
  AMOUNT_DIFFERS = '08'
}

// BECS Extended Payment Instruction
export interface BECSPaymentInstruction extends PaymentInstruction {
  becsSpecificData: {
    transactionCode: BECSTransactionCode;
    fileFormat: BECSFileFormat;
    processingDay: BECSProcessingDay;
    lodgementReference: string;
    remitterName: string;
    directEntryUserId: string;
    apcsNumber: string; // Australian Paper Clearing System number
    batchDetails: BECSBatchDetails;
    fileSequenceNumber?: number;
    recordSequenceNumber?: number;
    returnDetails?: BECSReturnDetails;
  };
}

export interface BECSBatchDetails {
  batchNumber: number;
  descriptiveRecord: BECSDescriptiveRecord;
  detailRecords: BECSDetailRecord[];
  fileTotalRecord?: BECSFileTotalRecord;
  totalCreditAmount: MonetaryAmount;
  totalDebitAmount: MonetaryAmount;
  totalRecordCount: number;
}

export interface BECSDescriptiveRecord {
  recordType: '0';
  reel: string; // 01-99
  sequence: string; // 01-999999
  financialInstitution: string; // 3 characters
  userId: string; // Direct Entry User ID
  userSuppliedDescription: string;
  processingDate: string; // DDMMYY
  processingTime?: string; // HHMM
}

export interface BECSDetailRecord {
  recordType: '1';
  bsb: string; // 6 digits
  accountNumber: string; // 9 digits
  indicator: ' ' | 'N' | 'W' | 'X' | 'Y';
  transactionCode: BECSTransactionCode;
  amount: number; // In cents
  accountName: string; // 32 characters
  lodgementReference: string; // 18 characters
  traceRecordNumber: string; // 7 digits
  remitterName: string; // 16 characters
  witholdingTaxAmount?: number; // In cents
}

export interface BECSFileTotalRecord {
  recordType: '7';
  bsb: '999-999';
  filler: string; // 12 spaces
  netTotalAmount: number; // In cents
  creditTotalAmount: number; // In cents
  debitTotalAmount: number; // In cents
  filler2: string; // 24 spaces
  countOfRecordsType1: number; // 8 digits
  filler3: string; // 40 spaces
}

export interface BECSReturnDetails {
  returnCode: BECSReturnCode;
  returnDescription: string;
  returnDate: string;
  originalTraceNumber: string;
  returnReason?: string;
}

// BECS Specific Request/Response Models
export interface InitiateBECSPaymentRequest extends InitiatePaymentInstructionRequest {
  becsData: {
    transactionCode: BECSTransactionCode;
    processingDay: BECSProcessingDay;
    lodgementReference: string;
    remitterName: string;
    directEntryUserId: string;
    apcsNumber: string;
    userSuppliedDescription: string;
    processingDate?: string;
  };
}

export interface InitiateBECSPaymentResponse extends InitiatePaymentInstructionResponse {
  becsPaymentInstruction: BECSPaymentInstruction;
}

export interface UpdateBECSPaymentRequest extends UpdatePaymentInstructionRequest {
  becsData?: {
    processingDay?: BECSProcessingDay;
    lodgementReference?: string;
    userSuppliedDescription?: string;
    processingDate?: string;
  };
}

export interface UpdateBECSPaymentResponse extends UpdatePaymentInstructionResponse {
  becsPaymentInstruction: BECSPaymentInstruction;
}

export interface RequestBECSPaymentRequest extends RequestPaymentInstructionRequest {
  becsRequestData?: {
    generateFile?: boolean;
    fileFormat?: BECSFileFormat;
    includeTotals?: boolean;
  };
}

export interface RequestBECSPaymentResponse extends RequestPaymentInstructionResponse {
  becsPaymentInstruction: BECSPaymentInstruction;
  becsProcessingResult?: {
    fileGenerated: boolean;
    fileName?: string;
    fileSize?: number;
    recordCount?: number;
    expectedProcessingDate: string;
  };
}

export interface RetrieveBECSPaymentResponse extends RetrievePaymentInstructionResponse {
  becsPaymentInstruction: BECSPaymentInstruction;
}

export interface ControlBECSPaymentRequest extends ControlPaymentInstructionRequest {
  becsControlData?: {
    stopProcessingDate?: string;
    cancellationReason?: string;
  };
}

export interface ControlBECSPaymentResponse extends ControlPaymentInstructionResponse {
  becsPaymentInstruction: BECSPaymentInstruction;
}

export interface ExchangeBECSPaymentRequest extends ExchangePaymentInstructionRequest {
  becsExchangeData?: {
    returnCode?: BECSReturnCode;
    returnReason?: string;
    dishonourDate?: string;
  };
}

export interface ExchangeBECSPaymentResponse extends ExchangePaymentInstructionResponse {
  becsPaymentInstruction: BECSPaymentInstruction;
}

// BECS File Generation Models
export interface BECSFileGenerationRequest {
  paymentInstructionReferences: string[];
  fileFormat: BECSFileFormat;
  processingDate: string;
  userSuppliedDescription: string;
  includeHeader: boolean;
  includeFooter: boolean;
}

export interface BECSFileGenerationResponse {
  fileName: string;
  fileContent: string;
  fileSize: number;
  recordCount: number;
  totalAmount: MonetaryAmount;
  checksum: string;
  generatedDateTime: string;
}

// BECS Validation Models
export interface BECSValidationRule {
  ruleId: string;
  ruleDescription: string;
  fieldName: string;
  validationType: 'MANDATORY' | 'FORMAT' | 'LENGTH' | 'RANGE' | 'CUSTOM';
  validationCriteria: any;
  errorMessage: string;
}

export interface BECSValidationResult {
  isValid: boolean;
  errors: BECSValidationError[];
  warnings: BECSValidationWarning[];
}

export interface BECSValidationError {
  errorCode: string;
  errorMessage: string;
  fieldName: string;
  fieldValue?: string;
  recordNumber?: number;
}

export interface BECSValidationWarning {
  warningCode: string;
  warningMessage: string;
  fieldName: string;
  fieldValue?: string;
  recordNumber?: number;
}

// BECS Settlement Models
export interface BECSSettlementDetails {
  settlementDate: string;
  exchangeSettlementFile: string;
  totalCreditAmount: MonetaryAmount;
  totalDebitAmount: MonetaryAmount;
  netSettlementAmount: MonetaryAmount;
  settlementStatus: 'PENDING' | 'SETTLED' | 'FAILED';
  settlementReference: string;
}

// BECS Report Models
export interface BECSProcessingReport {
  reportDate: string;
  totalFilesProcessed: number;
  totalTransactionsProcessed: number;
  totalAmount: MonetaryAmount;
  successfulTransactions: number;
  failedTransactions: number;
  returnedTransactions: number;
  processingErrors: BECSProcessingError[];
}

export interface BECSProcessingError {
  errorCode: string;
  errorDescription: string;
  fileName: string;
  recordNumber?: number;
  transactionReference?: string;
  errorDateTime: string;
}