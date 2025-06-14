/**
 * BECS Payment Handler Tests
 * Test suite for BECS Direct Entry payment functionality
 */

import { BECSPaymentHandler } from '../src/services/payment-handlers/becs.handler';
import {
  InitiateBECSPaymentRequest,
  BECSTransactionCode,
  BECSProcessingDay
} from '../src/models/australian-payments/becs.model';
import { PaymentType, PaymentMechanism, Currency } from '../src/models/bian/common-types.model';

describe('BECS Payment Handler', () => {
  let becsHandler: BECSPaymentHandler;

  beforeEach(() => {
    becsHandler = new BECSPaymentHandler();
  });

  describe('validate', () => {
    const validRequest: InitiateBECSPaymentRequest = {
      paymentInstructionType: PaymentType.BECS_DIRECT_ENTRY,
      paymentInstructionAmount: {
        amount: '500.00',
        currency: Currency.AUD
      },
      paymentMechanism: PaymentMechanism.BECS,
      debitAccount: {
        accountIdentification: '123456789',
        bankCode: '123-456',
        accountName: 'Company Ltd'
      },
      creditAccount: {
        accountIdentification: '987654321',
        bankCode: '654-321',
        accountName: 'Employee Name'
      },
      remittanceInformation: 'Salary payment',
      becsData: {
        transactionCode: BECSTransactionCode.EXTERNALLY_INITIATED_CREDIT,
        processingDay: BECSProcessingDay.NEXT_DAY,
        lodgementReference: 'PAYROLL_2024',
        remitterName: 'Company Ltd',
        directEntryUserId: '123456',
        apcsNumber: '123456',
        userSuppliedDescription: 'Payroll payments'
      }
    };

    it('should validate a correct BECS payment request', async () => {
      const result = await becsHandler.validate(validRequest);
      
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject request with missing BECS data', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).becsData;
      
      const result = await becsHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('MISSING_BECS_DATA');
    });

    it('should reject request with invalid BSB format', async () => {
      const invalidRequest = {
        ...validRequest,
        debitAccount: {
          ...validRequest.debitAccount,
          bankCode: '12345' // Invalid BSB format
        }
      };
      
      const result = await becsHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('INVALID_DEBIT_BSB');
    });

    it('should reject request with invalid APCS number', async () => {
      const invalidRequest = {
        ...validRequest,
        becsData: {
          ...validRequest.becsData,
          apcsNumber: '12345' // Should be 6 digits
        }
      };
      
      const result = await becsHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('INVALID_APCS_NUMBER');
    });

    it('should reject request with invalid Direct Entry User ID', async () => {
      const invalidRequest = {
        ...validRequest,
        becsData: {
          ...validRequest.becsData,
          directEntryUserId: '12345' // Should be 6 characters
        }
      };
      
      const result = await becsHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('INVALID_USER_ID');
    });

    it('should reject request with amount exceeding limit', async () => {
      const invalidRequest = {
        ...validRequest,
        paymentInstructionAmount: {
          amount: '100000000.00', // Exceeds limit
          currency: Currency.AUD
        }
      };
      
      const result = await becsHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('AMOUNT_EXCEEDS_LIMIT');
    });
  });

  describe('initiate', () => {
    const validRequest: InitiateBECSPaymentRequest = {
      paymentInstructionType: PaymentType.BECS_DIRECT_ENTRY,
      paymentInstructionAmount: {
        amount: '500.00',
        currency: Currency.AUD
      },
      paymentMechanism: PaymentMechanism.BECS,
      debitAccount: {
        accountIdentification: '123456789',
        bankCode: '123-456',
        accountName: 'Company Ltd'
      },
      creditAccount: {
        accountIdentification: '987654321',
        bankCode: '654-321',
        accountName: 'Employee Name'
      },
      remittanceInformation: 'Salary payment',
      becsData: {
        transactionCode: BECSTransactionCode.EXTERNALLY_INITIATED_CREDIT,
        processingDay: BECSProcessingDay.NEXT_DAY,
        lodgementReference: 'PAYROLL_2024',
        remitterName: 'Company Ltd',
        directEntryUserId: '123456',
        apcsNumber: '123456',
        userSuppliedDescription: 'Payroll payments'
      }
    };

    it('should successfully initiate a BECS payment', async () => {
      const result = await becsHandler.initiate(validRequest);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.paymentInstructionReference).toBeDefined();
      expect(result.data!.paymentInstructionReference).toMatch(/^BECS-/);
      expect(result.data!.becsPaymentInstruction).toBeDefined();
    });

    it('should generate valid BECS file structure', async () => {
      const result = await becsHandler.initiate(validRequest);
      
      expect(result.success).toBe(true);
      const becsInstruction = result.data!.becsPaymentInstruction;
      expect(becsInstruction.becsSpecificData.batchDetails).toBeDefined();
      expect(becsInstruction.becsSpecificData.batchDetails.descriptiveRecord).toBeDefined();
      expect(becsInstruction.becsSpecificData.batchDetails.detailRecords).toHaveLength(1);
      expect(becsInstruction.becsSpecificData.batchDetails.detailRecords[0].recordType).toBe('1');
    });

    it('should set correct processing status', async () => {
      const result = await becsHandler.initiate(validRequest);
      
      expect(result.success).toBe(true);
      expect(result.data!.becsPaymentInstruction.paymentInstructionStatus).toBeDefined();
      expect(result.data!.becsPaymentInstruction.processingLog).toBeDefined();
      expect(result.data!.becsPaymentInstruction.processingLog!.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should successfully update an existing BECS payment', async () => {
      // First initiate a payment
      const initiateRequest: InitiateBECSPaymentRequest = {
        paymentInstructionType: PaymentType.BECS_DIRECT_ENTRY,
        paymentInstructionAmount: {
          amount: '500.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.BECS,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Company Ltd'
        },
        creditAccount: {
          accountIdentification: '987654321',
          bankCode: '654-321',
          accountName: 'Employee Name'
        },
        becsData: {
          transactionCode: BECSTransactionCode.EXTERNALLY_INITIATED_CREDIT,
          processingDay: BECSProcessingDay.NEXT_DAY,
          lodgementReference: 'PAYROLL_2024',
          remitterName: 'Company Ltd',
          directEntryUserId: '123456',
          apcsNumber: '123456',
          userSuppliedDescription: 'Payroll payments'
        }
      };

      const initiateResult = await becsHandler.initiate(initiateRequest);
      expect(initiateResult.success).toBe(true);

      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now update the payment
      const updateRequest = {
        paymentInstructionAmount: {
          amount: '750.00',
          currency: Currency.AUD
        }
      };

      const updateResult = await becsHandler.update(paymentId, updateRequest);
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data!.becsPaymentInstruction.paymentInstructionAmount.amount).toBe('750.00');
    });

    it('should return error for non-existent payment', async () => {
      const updateResult = await becsHandler.update('non-existent-id', {});
      
      expect(updateResult.success).toBe(false);
      expect(updateResult.errors![0].errorCode).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('retrieve', () => {
    it('should successfully retrieve an existing BECS payment', async () => {
      // First initiate a payment
      const initiateRequest: InitiateBECSPaymentRequest = {
        paymentInstructionType: PaymentType.BECS_DIRECT_ENTRY,
        paymentInstructionAmount: {
          amount: '500.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.BECS,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Company Ltd'
        },
        creditAccount: {
          accountIdentification: '987654321',
          bankCode: '654-321',
          accountName: 'Employee Name'
        },
        becsData: {
          transactionCode: BECSTransactionCode.EXTERNALLY_INITIATED_CREDIT,
          processingDay: BECSProcessingDay.NEXT_DAY,
          lodgementReference: 'PAYROLL_2024',
          remitterName: 'Company Ltd',
          directEntryUserId: '123456',
          apcsNumber: '123456',
          userSuppliedDescription: 'Payroll payments'
        }
      };

      const initiateResult = await becsHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now retrieve the payment
      const retrieveResult = await becsHandler.retrieve(paymentId);
      
      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data!.paymentInstructionReference).toBe(paymentId);
      expect(retrieveResult.data!.becsPaymentInstruction).toBeDefined();
    });

    it('should return error for non-existent payment', async () => {
      const retrieveResult = await becsHandler.retrieve('non-existent-id');
      
      expect(retrieveResult.success).toBe(false);
      expect(retrieveResult.errors![0].errorCode).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('request', () => {
    it('should successfully submit BECS payment for processing', async () => {
      // First initiate a payment
      const initiateRequest: InitiateBECSPaymentRequest = {
        paymentInstructionType: PaymentType.BECS_DIRECT_ENTRY,
        paymentInstructionAmount: {
          amount: '500.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.BECS,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Company Ltd'
        },
        creditAccount: {
          accountIdentification: '987654321',
          bankCode: '654-321',
          accountName: 'Employee Name'
        },
        becsData: {
          transactionCode: BECSTransactionCode.EXTERNALLY_INITIATED_CREDIT,
          processingDay: BECSProcessingDay.NEXT_DAY,
          lodgementReference: 'PAYROLL_2024',
          remitterName: 'Company Ltd',
          directEntryUserId: '123456',
          apcsNumber: '123456',
          userSuppliedDescription: 'Payroll payments'
        }
      };

      const initiateResult = await becsHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now request processing
      const requestResult = await becsHandler.request(paymentId, {});
      
      expect(requestResult.success).toBe(true);
      expect(requestResult.data!.becsPaymentInstruction.processingLog!.length).toBeGreaterThan(1);
    });
  });

  describe('control', () => {
    it('should successfully cancel BECS payment', async () => {
      // First initiate a payment
      const initiateRequest: InitiateBECSPaymentRequest = {
        paymentInstructionType: PaymentType.BECS_DIRECT_ENTRY,
        paymentInstructionAmount: {
          amount: '500.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.BECS,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Company Ltd'
        },
        creditAccount: {
          accountIdentification: '987654321',
          bankCode: '654-321',
          accountName: 'Employee Name'
        },
        becsData: {
          transactionCode: BECSTransactionCode.EXTERNALLY_INITIATED_CREDIT,
          processingDay: BECSProcessingDay.NEXT_DAY,
          lodgementReference: 'PAYROLL_2024',
          remitterName: 'Company Ltd',
          directEntryUserId: '123456',
          apcsNumber: '123456',
          userSuppliedDescription: 'Payroll payments'
        }
      };

      const initiateResult = await becsHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now cancel the payment
      const controlResult = await becsHandler.control(paymentId, { controlActionType: 'CANCEL' });
      
      expect(controlResult.success).toBe(true);
      expect(controlResult.data!.becsPaymentInstruction.paymentInstructionStatus).toBe('CANCELLED');
    });
  });
});