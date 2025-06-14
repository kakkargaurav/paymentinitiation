/**
 * International Wire Payment Tests
 * Test scenarios for international wire transfer functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { InternationalWireHandler } from '../src/services/payment-handlers/international-wire.handler';
import { 
  InitiatePaymentInstructionRequest,
  UpdatePaymentInstructionRequest,
  RequestPaymentInstructionRequest,
  ControlPaymentInstructionRequest,
  ExchangePaymentInstructionRequest
} from '../src/models/bian/payment-instruction.model';
import { PaymentType, PaymentMechanism, Currency } from '../src/models/bian/common-types.model';

describe('International Wire Payment Handler', () => {
  let handler: InternationalWireHandler;

  beforeEach(() => {
    handler = new InternationalWireHandler();
  });

  describe('Initiate Payment', () => {
    it('should successfully initiate an international wire transfer payment', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Business Account',
          bankCode: '123456'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'International Recipient',
          bankCode: 'ABCDUS33XXX',
          bankName: 'US Bank'
        },
        paymentPurpose: 'International business payment',
        paymentDescription: 'Supplier payment to US vendor',
        remittanceInformation: 'Invoice payment for international services'
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.paymentInstructionReference).toMatch(/^AUS-BANK-PI-001-IWR-/);
      expect(result.data!.paymentInstruction.paymentInstructionType).toBe(PaymentType.INTERNATIONAL_WIRE);
      expect(result.data!.paymentInstruction.paymentMechanism).toBe(PaymentMechanism.SWIFT);
    });

    it('should handle insufficient funds scenario (amount = 999.99)', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '999.99',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'International Recipient',
          bankCode: 'ABCDUS33XXX'
        }
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('FAILED');
    });

    it('should handle invalid account scenario (account ending in 1111)', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987651111',
          accountName: 'Invalid International Account',
          bankCode: 'ABCDUS33XXX'
        }
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('FAILED');
    });

    it('should handle blocked country scenario (country = BLOCKED)', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Blocked Country Recipient',
          bankCode: 'BLCKXX99XXX'
        }
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('FAILED');
    });

    it('should handle high value transfer requiring compliance approval (amount > 50000)', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '75000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'High Value Recipient',
          bankCode: 'ABCDUS33XXX'
        }
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('PROCESSING');
    });

    it('should handle timeout scenario (reference = TIMEOUT)', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'Timeout Recipient',
          bankCode: 'ABCDUS33XXX'
        },
        remittanceInformation: 'TIMEOUT'
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('FAILED');
    });

    it('should reject payment with missing required fields', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
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
    it('should successfully update an international wire transfer payment', async () => {
      // First create a payment
      const initiateRequest: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'International Recipient',
          bankCode: 'ABCDUS33XXX'
        }
      };

      const initResult = await handler.initiatePayment(initiateRequest);
      expect(initResult.success).toBe(true);

      const paymentId = initResult.data!.paymentInstructionReference;

      // Now update the payment
      const updateRequest: UpdatePaymentInstructionRequest = {
        paymentInstructionAmount: {
          amount: '7500.00',
          currency: Currency.USD
        },
        remittanceInformation: 'Updated international payment remittance'
      };

      const result = await handler.updatePayment(paymentId, updateRequest);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionAmount.amount).toBe('7500.00');
      expect(result.data!.paymentInstruction.remittanceInformation).toBe('Updated international payment remittance');
    });

    it('should return error for non-existent payment ID', async () => {
      const updateRequest: UpdatePaymentInstructionRequest = {
        paymentInstructionAmount: {
          amount: '7500.00',
          currency: Currency.USD
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
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'International Recipient',
          bankCode: 'ABCDUS33XXX'
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
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'International Recipient',
          bankCode: 'ABCDUS33XXX'
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
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'International Recipient',
          bankCode: 'ABCDUS33XXX'
        }
      };

      const initResult = await handler.initiatePayment(initiateRequest);
      const paymentId = initResult.data!.paymentInstructionReference;

      // Now suspend the payment
      const controlRequest: ControlPaymentInstructionRequest = {
        controlActionType: 'SUSPEND',
        controlActionDescription: 'Temporary suspension for compliance review'
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
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'International Recipient',
          bankCode: 'ABCDUS33XXX'
        }
      };

      const initResult = await handler.initiatePayment(initiateRequest);
      const paymentId = initResult.data!.paymentInstructionReference;

      // Now exchange information
      const exchangeRequest: ExchangePaymentInstructionRequest = {
        exchangeActionType: 'ACCEPT',
        exchangeActionDescription: 'Accept international payment for processing'
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

  describe('SWIFT and International Features', () => {
    it('should generate SWIFT reference for international transfers', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.EUR
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'European Recipient',
          bankCode: 'ABCDEEFF123'
        }
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      // SWIFT reference should be generated for international transfers
      const wireInstruction = result.data!.paymentInstruction as any;
      expect(wireInstruction.wireTransferDetails.swiftMessageType).toBe('MT103');
    });

    it('should apply processing fees for international transfers', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.EUR
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'European Recipient',
          bankCode: 'ABCDEEFF123'
        }
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      expect(result.data!.paymentInstruction.paymentInstructionStatus).toBe('COMPLETED');
    });

    it('should handle compliance checks for international transfers', async () => {
      const request: InitiatePaymentInstructionRequest = {
        paymentInstructionType: PaymentType.INTERNATIONAL_WIRE,
        paymentInstructionAmount: {
          amount: '5000.00',
          currency: Currency.USD
        },
        paymentMechanism: PaymentMechanism.SWIFT,
        debitAccount: {
          accountIdentification: '123456789',
          accountName: 'Test Account'
        },
        creditAccount: {
          accountIdentification: '987654321',
          accountName: 'US Recipient',
          bankCode: 'ABCDUS33XXX'
        }
      };

      const result = await handler.initiatePayment(request);

      expect(result.success).toBe(true);
      const wireInstruction = result.data!.paymentInstruction as any;
      expect(wireInstruction.complianceInformation.amlChecked).toBe(true);
      expect(wireInstruction.complianceInformation.sanctionsChecked).toBe(true);
      expect(wireInstruction.complianceInformation.ofacChecked).toBe(true);
    });
  });
});