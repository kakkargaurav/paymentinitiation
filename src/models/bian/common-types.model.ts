/**
 * BIAN Common Types for Payment Initiation Service Domain
 * Based on BIAN Semantic API for Payment Initiation v12.0.0
 */

export enum PaymentType {
  NPP_INSTANT = 'NPP_INSTANT',
  NPP_PAYID = 'NPP_PAYID',
  BECS_DIRECT_ENTRY = 'BECS_DIRECT_ENTRY',
  BPAY_PAYMENT = 'BPAY_PAYMENT',
  DIRECT_DEBIT = 'DIRECT_DEBIT',
  DOMESTIC_WIRE = 'DOMESTIC_WIRE',
  INTERNATIONAL_WIRE = 'INTERNATIONAL_WIRE'
}

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  VALIDATED = 'VALIDATED',
  PENDING_AUTHORIZATION = 'PENDING_AUTHORIZATION',
  AUTHORIZED = 'AUTHORIZED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED'
}

export enum PaymentMechanism {
  NPP = 'NPP',
  BECS = 'BECS',
  BPAY = 'BPAY',
  RTGS = 'RTGS',
  SWIFT = 'SWIFT',
  DIRECT_DEBIT = 'DIRECT_DEBIT'
}

export enum Currency {
  AUD = 'AUD',
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  NZD = 'NZD'
}

export enum ControlAction {
  SUSPEND = 'SUSPEND',
  RESUME = 'RESUME',
  CANCEL = 'CANCEL',
  TERMINATE = 'TERMINATE'
}

export enum ExchangeAction {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
  REQUEST = 'REQUEST',
  GRANT = 'GRANT'
}

export interface MonetaryAmount {
  amount: string; // Using string to avoid floating point precision issues
  currency: Currency;
}

export interface AccountReference {
  accountIdentification: string;
  accountName?: string;
  bankCode?: string; // BSB for Australian accounts
  bankName?: string;
  branchCode?: string;
  accountType?: string;
}

export interface PayIDReference {
  payIdType: 'EMAIL' | 'MOBILE' | 'ABN' | 'ORG_ID';
  payIdValue: string;
  payIdName?: string;
}

export interface BPayReference {
  billerCode: string;
  referenceNumber: string;
  billerName?: string;
}

export interface DateTimeRange {
  fromDateTime?: string; // ISO 8601 format
  toDateTime?: string; // ISO 8601 format
}

export interface ContactDetails {
  contactType?: string;
  contactIdentification?: string;
  contactName?: string;
  telephoneNumber?: string;
  emailAddress?: string;
}

export interface ErrorDetail {
  errorCode: string;
  errorDescription: string;
  errorPath?: string;
  errorValue?: string;
}

export interface BianServiceDomainControlRecord {
  configurationParameterType?: string;
  configurationParameterDescription?: string;
  configurationParameterSetting?: any;
  serviceProviderReference?: string;
  serviceUserReference?: string;
  serviceType?: string;
  serviceDescription?: string;
  serviceDate?: string;
  serviceTime?: string;
}

export interface BianServiceDomainFeedbackRecord {
  feedbackRecordType?: string;
  feedbackRecord?: any;
}

// Australian specific validations
export interface AustralianBankDetails {
  bsb: string; // 6 digit BSB number
  accountNumber: string;
  accountName: string;
  bankName?: string;
}

export interface AustralianPaymentLimits {
  dailyLimit?: MonetaryAmount;
  transactionLimit?: MonetaryAmount;
  monthlyLimit?: MonetaryAmount;
}

// BIAN Operation Result wrapper
export interface BianOperationResult<T> {
  success: boolean;
  data?: T;
  errors?: ErrorDetail[];
  warnings?: string[];
  correlationId: string;
  timestamp: string;
}