/**
 * NPP Payment Tests
 * Test scenarios for New Payments Platform functionality including PayID
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NPPPaymentHandler } from '../src/services/payment-handlers/npp.handler';
import { 
  InitiateNPPPaymentRequest,
  NPPPaymentCategory,
  NPPUrgency
} from '../src/models/australian-payments/npp.model';
import { PaymentType, PaymentMechanism, Currency } from '../src/models/bian/common-types.model';

describe('NPP Payment Handler', () => {
  let handler: NPPPaymentHandler;

  beforeEach(() => {
    handler = new NPPPaymentHandler();
  });

  describe('Validate Payment', () => {
    it('should successfully validate an NPP instant payment', async () => {
      const request: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_INSTANT,
        paymentInstructionAmount: {
          amount: '50.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Sender Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Test Recipient Account',
          bankCode: '654-321'
        },
        paymentPurpose: 'Personal transfer',
        paymentDescription: 'Instant payment transfer',
        remittanceInformation: 'Payment for goods',
        nppData: {
          paymentCategory: NPPPaymentCategory.INSTANT_PAYMENT,
          urgency: NPPUrgency.NORMAL,
          endToEndReference: 'E2E12345'
        }
      };

      const result = await handler.validate(request);

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should fail validation with invalid BSB format', async () => {
      const request: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_INSTANT,
        paymentInstructionAmount: {
          amount: '50.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Sender Account',
          bankCode: '123456' // Invalid BSB format
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Test Recipient Account',
          bankCode: '654-321'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.INSTANT_PAYMENT,
          urgency: NPPUrgency.NORMAL
        }
      };

      const result = await handler.validate(request);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('INVALID_BSB');
    });

    it('should fail validation with amount exceeding NPP limit', async () => {
      const request: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_INSTANT,
        paymentInstructionAmount: {
          amount: '1500000.00', // Exceeds $1M limit
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Sender Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Test Recipient Account',
          bankCode: '654-321'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.INSTANT_PAYMENT,
          urgency: NPPUrgency.NORMAL
        }
      };

      const result = await handler.validate(request);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('AMOUNT_EXCEEDS_LIMIT');
    });
  });

  describe('Initiate Payment', () => {
    it('should successfully initiate an NPP instant payment', async () => {
      const request: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_INSTANT,
        paymentInstructionAmount: {
          amount: '50.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Sender Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Test Recipient Account',
          bankCode: '654-321'
        },
        paymentPurpose: 'Personal transfer',
        paymentDescription: 'Instant payment transfer',
        remittanceInformation: 'Payment for goods',
        nppData: {
          paymentCategory: NPPPaymentCategory.INSTANT_PAYMENT,
          urgency: NPPUrgency.NORMAL,
          endToEndReference: 'E2E12345'
        }
      };

      const result = await handler.initiate(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.paymentInstructionReference).toMatch(/^NPP-/);
      expect(result.data!.paymentInstruction.paymentInstructionType).toBe(PaymentType.NPP_INSTANT);
      expect(result.data!.paymentInstruction.paymentMechanism).toBe(PaymentMechanism.NPP);
    });

    it('should successfully initiate an NPP PayID payment', async () => {
      const request: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_PAYID,
        paymentInstructionAmount: {
          amount: '100.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Sender Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: 'recipient@success.com',
          accountName: 'PayID Recipient'
        },
        paymentPurpose: 'PayID transfer',
        paymentDescription: 'Payment via PayID',
        remittanceInformation: 'Payment using email PayID',
        payIdDetails: {
          payIdType: 'EMAIL',
          payIdValue: 'recipient@success.com',
          payIdName: 'PayID Recipient'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.PAYID_PAYMENT,
          urgency: NPPUrgency.NORMAL,
          endToEndReference: 'E2E67890'
        }
      };

      const result = await handler.initiate(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.paymentInstructionReference).toMatch(/^NPP-/);
      expect(result.data!.paymentInstruction.paymentInstructionType).toBe(PaymentType.NPP_PAYID);
    });

    it('should handle PayID resolution failure (@fail.com)', async () => {
      const request: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_PAYID,
        paymentInstructionAmount: {
          amount: '100.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: 'user@fail.com',
          accountName: 'Failed PayID'
        },
        payIdDetails: {
          payIdType: 'EMAIL',
          payIdValue: 'user@fail.com',
          payIdName: 'Failed PayID'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.PAYID_PAYMENT,
          urgency: NPPUrgency.NORMAL
        }
      };

      const result = await handler.initiate(request);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('PAYID_RESOLUTION_FAILED');
    });
  });

  describe('Update Payment', () => {
    it('should successfully update an NPP payment', async () => {
      // First create a payment
      const initiateRequest: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_INSTANT,
        paymentInstructionAmount: {
          amount: '100.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654-321'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.INSTANT_PAYMENT,
          urgency: NPPUrgency.NORMAL
        }
      };

      const initResult = await handler.initiate(initiateRequest);
      expect(initResult.success).toBe(true);

      const paymentId = initResult.data!.paymentInstructionReference;

      // Now update the payment
      const updateRequest = {
        paymentInstructionAmount: {
          amount: '150.00',
          currency: Currency.AUD
        },
        remittanceInformation: 'Updated NPP payment remittance',
        nppData: {
          paymentCategory: NPPPaymentCategory.INSTANT_PAYMENT,
          urgency: NPPUrgency.HIGH
        }
      };

      const result = await handler.update(paymentId, updateRequest);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionAmount.amount).toBe('150.00');
      expect(result.data!.paymentInstruction.remittanceInformation).toBe('Updated NPP payment remittance');
    });

    it('should return error for non-existent payment ID', async () => {
      const updateRequest = {
        paymentInstructionAmount: {
          amount: '150.00',
          currency: Currency.AUD
        }
      };

      const result = await handler.update('NON_EXISTENT_ID', updateRequest);

      expect(result.success).toBe(false);
      expect(result.errors![0].errorCode).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('Request Payment', () => {
    it('should successfully process payment request', async () => {
      // First create a payment
      const initiateRequest: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_INSTANT,
        paymentInstructionAmount: {
          amount: '100.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654-321'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.INSTANT_PAYMENT,
          urgency: NPPUrgency.NORMAL
        }
      };

      const initResult = await handler.initiate(initiateRequest);
      const paymentId = initResult.data!.paymentInstructionReference;

      // Now request processing
      const requestPayment = {
        requestType: 'SUBMIT'
      };

      const result = await handler.request(paymentId, requestPayment);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('COMPLETED');
    });
  });

  describe('Retrieve Payment', () => {
    it('should successfully retrieve payment details', async () => {
      // First create a payment
      const initiateRequest: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_INSTANT,
        paymentInstructionAmount: {
          amount: '100.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654-321'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.INSTANT_PAYMENT,
          urgency: NPPUrgency.NORMAL
        }
      };

      const initResult = await handler.initiate(initiateRequest);
      const paymentId = initResult.data!.paymentInstructionReference;

      // Now retrieve the payment
      const result = await handler.retrieve(paymentId);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionReference).toBe(paymentId);
    });
  });

  describe('Control Payment', () => {
    it('should successfully control payment (cancel)', async () => {
      // First create a payment
      const initiateRequest: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_INSTANT,
        paymentInstructionAmount: {
          amount: '100.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654-321'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.INSTANT_PAYMENT,
          urgency: NPPUrgency.NORMAL
        }
      };

      const initResult = await handler.initiate(initiateRequest);
      const paymentId = initResult.data!.paymentInstructionReference;

      // Now cancel the payment
      const controlRequest = {
        controlActionType: 'CANCEL',
        controlActionDescription: 'Cancel payment for testing'
      };

      const result = await handler.control(paymentId, controlRequest);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('CANCELLED');
    });
  });

  describe('Exchange Payment', () => {
    it('should successfully process payment exchange', async () => {
      // First create a payment
      const initiateRequest: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_INSTANT,
        paymentInstructionAmount: {
          amount: '100.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654-321'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.INSTANT_PAYMENT,
          urgency: NPPUrgency.NORMAL
        }
      };

      const initResult = await handler.initiate(initiateRequest);
      const paymentId = initResult.data!.paymentInstructionReference;

      // Now exchange information
      const exchangeRequest = {
        exchangeActionType: 'ACCEPT',
        exchangeActionDescription: 'Accept NPP payment for processing'
      };

      const result = await handler.exchange(paymentId, exchangeRequest);

      expect(result.success).toBe(true);
    });
  });

  describe('NPP Processing Features', () => {
    it('should generate proper NPP references', async () => {
      const request: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_INSTANT,
        paymentInstructionAmount: {
          amount: '100.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654-321'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.INSTANT_PAYMENT,
          urgency: NPPUrgency.NORMAL
        }
      };

      const result = await handler.initiate(request);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstructionReference).toMatch(/^NPP-/);
      
      // Should contain both letters and numbers
      expect(result.data!.paymentInstructionReference).toMatch(/[A-Z]/);
      expect(result.data!.paymentInstructionReference).toMatch(/[0-9]/);
    });

    it('should handle different PayID types', async () => {
      const emailPayIDRequest: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_PAYID,
        paymentInstructionAmount: {
          amount: '100.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: 'test@success.com',
          accountName: 'Email PayID'
        },
        payIdDetails: {
          payIdType: 'EMAIL',
          payIdValue: 'test@success.com',
          payIdName: 'Email PayID'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.PAYID_PAYMENT,
          urgency: NPPUrgency.NORMAL
        }
      };

      const result = await handler.initiate(emailPayIDRequest);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionType).toBe(PaymentType.NPP_PAYID);
    });

    it('should handle mobile PayID', async () => {
      const mobilePayIDRequest: InitiateNPPPaymentRequest = {
        paymentInstructionType: PaymentType.NPP_PAYID,
        paymentInstructionAmount: {
          amount: '100.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.NPP,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account',
          bankCode: '123-456'
        },
        creditAccount: {
          accountIdentification: '+61412345678',
          accountName: 'Mobile PayID'
        },
        payIdDetails: {
          payIdType: 'MOBILE',
          payIdValue: '+61412345678',
          payIdName: 'Mobile PayID'
        },
        nppData: {
          paymentCategory: NPPPaymentCategory.PAYID_PAYMENT,
          urgency: NPPUrgency.NORMAL
        }
      };

      const result = await handler.initiate(mobilePayIDRequest);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionType).toBe(PaymentType.NPP_PAYID);
    });
  });
});