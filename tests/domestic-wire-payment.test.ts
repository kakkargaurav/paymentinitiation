/**
 * Domestic Wire Payment Tests
 * Test scenarios for domestic wire transfer functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DomesticWireHandler } from '../src/services/payment-handlers/domestic-wire.handler';
import { 
  InitiatePaymentInstructionRequest,
  UpdatePaymentInstructionRequest,
  RequestPaymentInstructionRequest,
  ControlPaymentInstructionRequest,
  ExchangePaymentInstructionRequest
} from '../src/models/bian/payment-instruction.model';
import { PaymentType, PaymentMechanism, Currency } from '../src/models/bian/common-types.model';

describe('Domestic Wire Payment Handler', () => {
  let handler: DomesticWireHandler;

  beforeEach(() => {
    handler = new DomesticWireHandler();
  });

  describe('Initiate Payment', () => {
    it('should successfully initiate a domestic wire transfer payment', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.DOMESTIC_WIRE,
        paymentInstructionAmount: {
          amount: '1000.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.RTGS,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Business Account',
          bankCode: '123456'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654321',
          bankName: 'Recipient Bank'
        },
        paymentPurpose: 'Business payment',
        paymentDescription: 'Supplier payment',
        remittanceInformation: 'Invoice payment for services'
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.paymentInstructionReference).toMatch(/^AUS-BANK-PI-001-DWR-/);
      expect(result.data!.paymentInstruction.paymentInstructionType).toBe(PaymentType.DOMESTIC_WIRE);
      expect(result.data!.paymentInstruction.paymentMechanism).toBe(PaymentMechanism.RTGS);
    });

    it('should handle insufficient funds scenario (amount = 999.99)', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.DOMESTIC_WIRE,
        paymentInstructionAmount: {
          amount: '999.99',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.RTGS,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654321'
        }
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('FAILED');
    });

    it('should handle invalid account scenario (account ending in 1111)', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.DOMESTIC_WIRE,
        paymentInstructionAmount: {
          amount: '1000.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.RTGS,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987651111',
          accountName: 'Invalid Account',
          bankCode: '654321'
        }
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('FAILED');
    });

    it('should handle high value transfer requiring compliance approval (amount > 10000)', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.DOMESTIC_WIRE,
        paymentInstructionAmount: {
          amount: '15000.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.RTGS,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654321'
        }
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('PROCESSING');
    });

    it('should handle timeout scenario (reference = TIMEOUT)', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.DOMESTIC_WIRE,
        paymentInstructionAmount: {
          amount: '1000.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.RTGS,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654321'
        },
        remittanceInformation: 'TIMEOUT'
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('FAILED');
    });

    it('should reject payment with missing required fields', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.DOMESTIC_WIRE,
        paymentInstructionAmount: {
          amount: '1000.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.RTGS,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '',
          accountName: '',
          bankCode: ''
        }
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('Update Payment', () => {
    it('should successfully update a domestic wire transfer payment', async () => {
      // First create a payment
      const initiateRequest: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.DOMESTIC_WIRE,
        paymentInstructionAmount: {
          amount: '1000.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.RTGS,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654321'
        }
      };

      const initResult = await handler.initiatePayment(initiateRequest);
      expect(initResult.success).toBe(true);

      const paymentId = initResult.data!.paymentInstructionReference;

      // Now update the payment
      const updateRequest: UpdatePaymentInstructionRequest = {
        paymentInstructionAmount: {
          amount: '1500.00',
          currency: Currency.AUD
        },
        remittanceInformation: 'Updated remittance information'
      };

      const result = await handler.updatePayment(paymentId, updateRequest);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionAmount.amount).toBe('1500.00');
      expect(result.data!.paymentInstruction.remittanceInformation).toBe('Updated remittance information');
    });

    it('should return error for non-existent payment ID', async () => {
      const updateRequest: UpdatePaymentInstructionRequest = {
        paymentInstructionAmount: {
          amount: '1500.00',
          currency: Currency.AUD
        }
      };

      const result = await handler.updatePayment('NON_EXISTENT_ID', updateRequest);

      expect(result.success).toBe(false);
      expect(result.errors![0].errorCode).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('Request Payment', () => {
    it('should successfully process payment request', async () => {
      // First create a payment
      const initiateRequest: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.DOMESTIC_WIRE,
        paymentInstructionAmount: {
          amount: '1000.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.RTGS,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654321'
        }
      };

      const initResult = await handler.initiatePayment(initiateRequest);
      const paymentId = initResult.data!.paymentInstructionReference;

      // Now request processing
      const requestPayment: RequestPaymentInstructionRequest = {
        requestType: 'SUBMIT'
      };

      const result = await handler.requestPayment(paymentId, requestPayment);

      expect(result.success).toBe(true);
      expect(result.data!.requestStatus).toBe('ACCEPTED');
    });
  });

  describe('Retrieve Payment', () => {
    it('should successfully retrieve payment details', async () => {
      // First create a payment
      const initiateRequest: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.DOMESTIC_WIRE,
        paymentInstructionAmount: {
          amount: '1000.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.RTGS,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654321'
        }
      };

      const initResult = await handler.initiatePayment(initiateRequest);
      const paymentId = initResult.data!.paymentInstructionReference;

      // Now retrieve the payment
      const result = await handler.retrievePayment(paymentId);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionReference).toBe(paymentId);
      expect(result.data!.retrievalDateTime).toBeDefined();
    });
  });

  describe('Control Payment', () => {
    it('should successfully control payment (suspend)', async () => {
      // First create a payment
      const initiateRequest: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.DOMESTIC_WIRE,
        paymentInstructionAmount: {
          amount: '1000.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.RTGS,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654321'
        }
      };

      const initResult = await handler.initiatePayment(initiateRequest);
      const paymentId = initResult.data!.paymentInstructionReference;

      // Now suspend the payment
      const controlRequest: ControlPaymentInstructionRequest = {
        controlActionType: 'SUSPEND',
        controlActionDescription: 'Temporary suspension for review'
      };

      const result = await handler.controlPayment(paymentId, controlRequest);

      expect(result.success).toBe(true);
      expect(result.data!.controlActionResult).toBe('SUCCESS');
    });
  });

  describe('Exchange Payment', () => {
    it('should successfully process payment exchange', async () => {
      // First create a payment
      const initiateRequest: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.DOMESTIC_WIRE,
        paymentInstructionAmount: {
          amount: '1000.00',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.RTGS,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Recipient Account',
          bankCode: '654321'
        }
      };

      const initResult = await handler.initiatePayment(initiateRequest);
      const paymentId = initResult.data!.paymentInstructionReference;

      // Now exchange information
      const exchangeRequest: ExchangePaymentInstructionRequest = {
        exchangeActionType: 'ACCEPT',
        exchangeActionDescription: 'Accept payment for processing'
      };

      const result = await handler.exchangePayment(paymentId, exchangeRequest);

      expect(result.success).toBe(true);
      expect(result.data!.exchangeActionResult).toBe('SUCCESS');
    });
  });

  describe('Query Payments', () => {
    it('should successfully query all payments', async () => {
      const result = await handler.queryPayments();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});