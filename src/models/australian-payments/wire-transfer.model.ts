/**
 * Wire Transfer Models
 * Australian domestic and international wire transfer data models
 * Following BIAN v12.0.0 and Australian banking standards
 */

import {
  PaymentInstruction,
  PaymentProcessingLogEntry
} from '../bian/payment-instruction.model';

import {
  MonetaryAmount,
  BianServiceDomainControlRecord,
  AccountReference
} from '../bian/common-types.model';

// ========== DOMESTIC WIRE TRANSFER MODELS ==========

/**
 * Domestic Wire Transfer Priority Levels
 * RTGS: Real-time Gross Settlement (immediate)
 * HIGH: Same day settlement
 * NORMAL: Next business day settlement
 */
export type DomesticWirePriority = 'RTGS' | 'HIGH' | 'NORMAL';

/**
 * Settlement Network Types for Domestic Wires
 */
export type DomesticSettlementNetwork = 'RTGS' | 'AUSTRACLEAR' | 'RITS';

/**
 * Domestic Wire Transfer Purpose Codes
 */
export type DomesticWirePurpose = 
  | 'BUSINESS_PAYMENT' 
  | 'SALARY_PAYMENT' 
  | 'SUPPLIER_PAYMENT' 
  | 'TAX_PAYMENT' 
  | 'PROPERTY_SETTLEMENT' 
  | 'INVESTMENT' 
  | 'OTHER';

/**
 * Domestic Wire Transfer Details
 */
export interface DomesticWireTransferDetails {
  /** BSB (Bank State Branch) of receiving institution */
  receivingBSB: string;
  
  /** Account number at receiving institution */
  receivingAccountNumber: string;
  
  /** Account name at receiving institution */
  receivingAccountName: string;
  
  /** Receiving institution name */
  receivingInstitutionName: string;
  
  /** APCS (Australian Paper Clearing System) number of receiving institution */
  receivingAPCSNumber?: string;
  
  /** Payment priority level */
  priority: DomesticWirePriority;
  
  /** Settlement network to use */
  settlementNetwork: DomesticSettlementNetwork;
  
  /** Purpose of payment */
  purpose: DomesticWirePurpose;
  
  /** Detailed purpose description */
  purposeDescription?: string;
  
  /** Remittance information for recipient */
  remittanceInformation: string;
  
  /** Sender reference number */
  senderReference: string;
  
  /** Expected settlement date */
  requestedExecutionDate?: string;
  
  /** Cut-off time considerations */
  cutOffTimeApplies: boolean;
  
  /** Regulatory reporting code if applicable */
  reportingCode?: string;
}

/**
 * Domestic Wire Transfer Instruction
 */
export interface DomesticWireTransferInstruction extends PaymentInstruction {
  /** Wire transfer specific details */
  wireTransferDetails: DomesticWireTransferDetails;
  
  /** Additional compliance information */
  complianceInformation?: {
    amlChecked: boolean;
    sanctionsChecked: boolean;
    taxReportingRequired: boolean;
  };
}

// ========== INTERNATIONAL WIRE TRANSFER MODELS ==========

/**
 * SWIFT Message Types for International Wires
 */
export type SWIFTMessageType = 'MT103' | 'MT202' | 'MT202COV';

/**
 * International Wire Transfer Priority
 */
export type InternationalWirePriority = 'URGENT' | 'NORMAL' | 'EXPRESS';

/**
 * Correspondent Banking Charges
 */
export type ChargeBearer = 'OUR' | 'BEN' | 'SHA';

/**
 * International Wire Purpose Codes (ISO 20022)
 */
export type InternationalWirePurpose = 
  | 'TRADE_SETTLEMENT' 
  | 'FOREIGN_EXCHANGE' 
  | 'INVESTMENT' 
  | 'PERSONAL_TRANSFER' 
  | 'BUSINESS_PAYMENT' 
  | 'PROPERTY_PURCHASE' 
  | 'EDUCATION_FEES' 
  | 'FAMILY_SUPPORT' 
  | 'OTHER';

/**
 * Correspondent Bank Details
 */
export interface CorrespondentBankDetails {
  /** SWIFT BIC of correspondent bank */
  swiftBIC: string;
  
  /** Correspondent bank name */
  bankName: string;
  
  /** Correspondent bank address */
  bankAddress: string;
  
  /** Account number at correspondent bank */
  nostroAccountNumber?: string;
  
  /** Additional correspondent bank details */
  additionalDetails?: string;
}

/**
 * International Wire Transfer Details
 */
export interface InternationalWireTransferDetails {
  /** Receiving bank SWIFT BIC */
  receivingBankSwiftBIC: string;
  
  /** Receiving bank name */
  receivingBankName: string;
  
  /** Receiving bank address */
  receivingBankAddress: string;
  
  /** Account number at receiving bank */
  receivingAccountNumber: string;
  
  /** IBAN if applicable */
  receivingIBAN?: string;
  
  /** Account holder name */
  receivingAccountName: string;
  
  /** Beneficiary address */
  beneficiaryAddress: string;
  
  /** Correspondent/intermediary bank details */
  correspondentBank?: CorrespondentBankDetails;
  
  /** SWIFT message type to use */
  swiftMessageType: SWIFTMessageType;
  
  /** Priority level */
  priority: InternationalWirePriority;
  
  /** Who bears the charges */
  chargeBearer: ChargeBearer;
  
  /** Purpose of payment */
  purpose: InternationalWirePurpose;
  
  /** Detailed purpose description */
  purposeDescription: string;
  
  /** Remittance information */
  remittanceInformation: string;
  
  /** Sender reference */
  senderReference: string;
  
  /** Regulatory reference if required */
  regulatoryReference?: string;
  
  /** Country of destination */
  destinationCountry: string;
  
  /** Currency of transfer */
  transferCurrency: string;
  
  /** Exchange rate if currency conversion required */
  exchangeRate?: number;
  
  /** Foreign exchange contract reference */
  fxContractReference?: string;
}

/**
 * International Wire Transfer Instruction
 */
export interface InternationalWireTransferInstruction extends PaymentInstruction {
  /** International wire transfer specific details */
  wireTransferDetails: InternationalWireTransferDetails;
  
  /** Compliance and regulatory information */
  complianceInformation: {
    amlChecked: boolean;
    sanctionsChecked: boolean;
    ofacChecked: boolean;
    fatcaApplicable: boolean;
    crsReportingRequired: boolean;
    austracReportingRequired: boolean;
    sourceOfFunds: string;
    purposeVerified: boolean;
  };
  
  /** Foreign exchange information if applicable */
  foreignExchangeInformation?: {
    spotRate: number;
    forwardRate?: number;
    valueDate: string;
    dealReference: string;
  };
}

// ========== COMMON WIRE TRANSFER MODELS ==========

/**
 * Wire Transfer Status States
 */
export type WireTransferStatus = 
  | 'INITIATED'
  | 'PENDING_COMPLIANCE'
  | 'COMPLIANCE_APPROVED'
  | 'COMPLIANCE_REJECTED'
  | 'PENDING_SETTLEMENT'
  | 'SENT_TO_NETWORK'
  | 'SETTLED'
  | 'FAILED'
  | 'RETURNED'
  | 'CANCELLED';

/**
 * Wire Transfer Processing Result
 */
export interface WireTransferProcessingResult {
  /** Processing status */
  status: WireTransferStatus;
  
  /** Payment reference number */
  paymentReference: string;
  
  /** Network reference if available */
  networkReference?: string;
  
  /** SWIFT message reference for international wires */
  swiftReference?: string;
  
  /** Settlement date */
  settlementDate?: string;
  
  /** Processing fees applied */
  processingFees?: MonetaryAmount[];
  
  /** Exchange rate applied for international transfers */
  appliedExchangeRate?: number;
  
  /** Compliance check results */
  complianceResults?: {
    amlStatus: 'PASS' | 'FAIL' | 'PENDING';
    sanctionsStatus: 'PASS' | 'FAIL' | 'PENDING';
    additionalChecks?: Record<string, 'PASS' | 'FAIL' | 'PENDING'>;
  };
  
  /** Processing timestamps */
  timestamps: {
    initiated: string;
    complianceCompleted?: string;
    sentToNetwork?: string;
    settled?: string;
  };
  
  /** Error information if failed */
  errorInformation?: {
    errorCode: string;
    errorDescription: string;
    networkErrorCode?: string;
  };
}

/**
 * Wire Transfer Control Record
 */
export interface WireTransferControlRecord {
  /** Wire transfer processing result */
  processingResult: WireTransferProcessingResult;
  
  /** Network-specific tracking information */
  networkTrackingInfo?: {
    networkType: 'RTGS' | 'SWIFT' | 'AUSTRACLEAR';
    trackingReference: string;
    networkStatus: string;
    lastStatusUpdate: string;
  };
}

/**
 * Wire Transfer Service Domain Control Record
 */
export interface WireTransferServiceDomainControlRecord extends BianServiceDomainControlRecord {
  /** Service domain specific configuration */
  serviceDomainConfiguration: {
    /** Daily wire transfer limits */
    dailyLimits: {
      domestic: MonetaryAmount;
      international: MonetaryAmount;
    };
    
    /** Cut-off times for different priority levels */
    cutOffTimes: {
      rtgs: string; // HH:MM format
      high: string;
      normal: string;
      international: string;
    };
    
    /** Supported settlement networks */
    supportedNetworks: string[];
    
    /** Compliance check configuration */
    complianceConfig: {
      amlThreshold: MonetaryAmount;
      sanctionsCheckEnabled: boolean;
      automaticApprovalLimit: MonetaryAmount;
    };
  };
}