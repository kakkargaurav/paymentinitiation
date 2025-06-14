/**
 * BPAY Payment Handler Tests
 * Test suite for BPAY bill payment functionality
 */

import { BPAYPaymentHandler } from '../src/services/payment-handlers/bpay.handler';
import {
  InitiateBPAYPaymentRequest,
  BPAYTransactionType,
  BPAYPaymentMethod
} from '../src/models/australian-payments/bpay.model';
import { PaymentType, PaymentMechanism, Currency } from '../src/models/bian/common-types.model';

describe('BPAY Payment Handler', () => {
  let bpayHandler: BPAYPaymentHandler;

  beforeEach(() => {
    bpayHandler = new BPAYPaymentHandler();
  });

  describe('validate', () => {
    const validRequest: InitiateBPAYPaymentRequest = {
      paymentInstructionType: PaymentType.BPAY_PAYMENT,
      paymentInstructionAmount: {
        amount: '75.50',
        currency: Currency.AUD
      },
      paymentMechanism: PaymentMechanism.BPAY,
      debitAccount: {
        accountIdentification: '123456789',
        bankCode: '123-456',
        accountName: 'Customer Name'
      },
      creditAccount: {
        accountIdentification: '123456',
        accountName: 'Energy Australia'
      },
      remittanceInformation: 'Electricity bill payment',
      bpayData: {
        transactionType: BPAYTransactionType.BILL_PAYMENT,
        paymentMethod: BPAYPaymentMethod.INTERNET_BANKING,
        customerReferenceNumber: '987654321098'
      },
      bpayReference: {
        billerCode: '123456',
        referenceNumber: '987654321098',
        billerName: 'Energy Australia'
      }
    };

    it('should validate a correct BPAY payment request', async () => {
      const result = await bpayHandler.validate(validRequest);
      
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject request with missing BPAY data', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).bpayData;
      
      const result = await bpayHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('MISSING_BPAY_DATA');
    });

    it('should reject request with missing BPAY reference', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).bpayReference;
      
      const result = await bpayHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('MISSING_BPAY_REFERENCE');
    });

    it('should reject request with invalid biller code format', async () => {
      const invalidRequest = {
        ...validRequest,
        bpayReference: {
          ...validRequest.bpayReference,
          billerCode: '12345' // Should be 6 digits
        }
      };
      
      const result = await bpayHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('INVALID_BILLER_CODE');
    });

    it('should reject request with missing customer reference number', async () => {
      const invalidRequest = {
        ...validRequest,
        bpayData: {
          ...validRequest.bpayData,
          customerReferenceNumber: ''
        }
      };
      
      const result = await bpayHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('MISSING_CUSTOMER_REFERENCE');
    });

    it('should reject request with amount exceeding limit', async () => {
      const invalidRequest = {
        ...validRequest,
        paymentInstructionAmount: {
          amount: '1000000.00', // Exceeds BPAY limit
          currency: Currency.AUD
        }
      };
      
      const result = await bpayHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('AMOUNT_EXCEEDS_LIMIT');
    });

    it('should reject request with zero amount', async () => {
      const invalidRequest = {
        ...validRequest,
        paymentInstructionAmount: {
          amount: '0.00',
          currency: Currency.AUD
        }
      };
      
      const result = await bpayHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('INVALID_AMOUNT');
    });

    it('should reject request with invalid BSB format', async () => {
      const invalidRequest = {
        ...validRequest,
        debitAccount: {
          ...validRequest.debitAccount,
          bankCode: '12345' // Invalid BSB format
        }
      };
      
      const result = await bpayHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('INVALID_BSB');
    });
  });

  describe('initiate', () => {
    const validRequest: InitiateBPAYPaymentRequest = {
      paymentInstructionType: PaymentType.BPAY_PAYMENT,
      paymentInstructionAmount: {
        amount: '75.50',
        currency: Currency.AUD
      },
      paymentMechanism: PaymentMechanism.BPAY,
      debitAccount: {
        accountIdentification: '123456789',
        bankCode: '123-456',
        accountName: 'Customer Name'
      },
      creditAccount: {
        accountIdentification: '123456',
        accountName: 'Energy Australia'
      },
      remittanceInformation: 'Electricity bill payment',
      bpayData: {
        transactionType: BPAYTransactionType.BILL_PAYMENT,
        paymentMethod: BPAYPaymentMethod.INTERNET_BANKING,
        customerReferenceNumber: '987654321098'
      },
      bpayReference: {
        billerCode: '123456',
        referenceNumber: '987654321098',
        billerName: 'Energy Australia'
      }
    };

    it('should successfully initiate a BPAY payment', async () => {
      const result = await bpayHandler.initiate(validRequest);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.paymentInstructionReference).toBeDefined();
      expect(result.data!.paymentInstructionReference).toMatch(/^BPAY-/);
      expect(result.data!.bpayPaymentInstruction).toBeDefined();
      expect(result.data!.bpayValidationResult).toBeDefined();
    });

    it('should generate receipt details', async () => {
      const result = await bpayHandler.initiate(validRequest);
      
      expect(result.success).toBe(true);
      const bpayInstruction = result.data!.bpayPaymentInstruction;
      expect(bpayInstruction.bpaySpecificData.receiptDetails).toBeDefined();
      expect(bpayInstruction.bpaySpecificData.receiptDetails!.receiptNumber).toBeDefined();
      expect(bpayInstruction.bpaySpecificData.receiptDetails!.receiptText).toBeDefined();
      expect(bpayInstruction.bpaySpecificData.receiptDetails!.receiptText!.length).toBeGreaterThan(0);
    });

    it('should set correct biller category', async () => {
      const result = await bpayHandler.initiate(validRequest);
      
      expect(result.success).toBe(true);
      const bpayInstruction = result.data!.bpayPaymentInstruction;
      expect(bpayInstruction.bpaySpecificData.billerDetails.billerCategory).toBeDefined();
    });

    it('should fail with invalid biller code (test scenario)', async () => {
      const invalidRequest = {
        ...validRequest,
        bpayReference: {
          ...validRequest.bpayReference,
          billerCode: '999999' // Test failure scenario
        }
      };

      const result = await bpayHandler.initiate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('INVALID_BILLER_CODE');
    });
  });

  describe('update', () => {
    it('should successfully update an existing BPAY payment', async () => {
      // First initiate a payment
      const initiateRequest: InitiateBPAYPaymentRequest = {
        paymentInstructionType: PaymentType.BPAY_PAYMENT,
        paymentInstructionAmount: {
          amount: '75.50',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.BPAY,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Customer Name'
        },
        creditAccount: {
          accountIdentification: '123456',
          accountName: 'Energy Australia'
        },
        bpayData: {
          transactionType: BPAYTransactionType.BILL_PAYMENT,
          paymentMethod: BPAYPaymentMethod.INTERNET_BANKING,
          customerReferenceNumber: '987654321098'
        },
        bpayReference: {
          billerCode: '123456',
          referenceNumber: '987654321098',
          billerName: 'Energy Australia'
        }
      };

      const initiateResult = await bpayHandler.initiate(initiateRequest);
      expect(initiateResult.success).toBe(true);

      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now update the payment
      const updateRequest = {
        paymentInstructionAmount: {
          amount: '125.75',
          currency: Currency.AUD
        }
      };

      const updateResult = await bpayHandler.update(paymentId, updateRequest);
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data!.bpayPaymentInstruction.paymentInstructionAmount.amount).toBe('125.75');
    });

    it('should return error for non-existent payment', async () => {
      const updateResult = await bpayHandler.update('non-existent-id', {});
      
      expect(updateResult.success).toBe(false);
      expect(updateResult.errors![0].errorCode).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('retrieve', () => {
    it('should successfully retrieve an existing BPAY payment', async () => {
      // First initiate a payment
      const initiateRequest: InitiateBPAYPaymentRequest = {
        paymentInstructionType: PaymentType.BPAY_PAYMENT,
        paymentInstructionAmount: {
          amount: '75.50',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.BPAY,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Customer Name'
        },
        creditAccount: {
          accountIdentification: '123456',
          accountName: 'Energy Australia'
        },
        bpayData: {
          transactionType: BPAYTransactionType.BILL_PAYMENT,
          paymentMethod: BPAYPaymentMethod.INTERNET_BANKING,
          customerReferenceNumber: '987654321098'
        },
        bpayReference: {
          billerCode: '123456',
          referenceNumber: '987654321098',
          billerName: 'Energy Australia'
        }
      };

      const initiateResult = await bpayHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now retrieve the payment
      const retrieveResult = await bpayHandler.retrieve(paymentId);
      
      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data!.paymentInstructionReference).toBe(paymentId);
      expect(retrieveResult.data!.bpayPaymentInstruction).toBeDefined();
      expect(retrieveResult.data!.bpayValidationResult).toBeDefined();
    });

    it('should return error for non-existent payment', async () => {
      const retrieveResult = await bpayHandler.retrieve('non-existent-id');
      
      expect(retrieveResult.success).toBe(false);
      expect(retrieveResult.errors![0].errorCode).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('request', () => {
    it('should successfully submit BPAY payment for processing', async () => {
      // First initiate a payment
      const initiateRequest: InitiateBPAYPaymentRequest = {
        paymentInstructionType: PaymentType.BPAY_PAYMENT,
        paymentInstructionAmount: {
          amount: '75.50',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.BPAY,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Customer Name'
        },
        creditAccount: {
          accountIdentification: '123456',
          accountName: 'Energy Australia'
        },
        bpayData: {
          transactionType: BPAYTransactionType.BILL_PAYMENT,
          paymentMethod: BPAYPaymentMethod.INTERNET_BANKING,
          customerReferenceNumber: '987654321098'
        },
        bpayReference: {
          billerCode: '123456',
          referenceNumber: '987654321098',
          billerName: 'Energy Australia'
        }
      };

      const initiateResult = await bpayHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now request processing
      const requestResult = await bpayHandler.request(paymentId, {});
      
      expect(requestResult.success).toBe(true);
      expect(requestResult.data!.bpayPaymentInstruction.processingLog!.length).toBeGreaterThan(1);
      expect(requestResult.data!.bpayPaymentInstruction.bpaySpecificData.paymentDetails.billerReferenceNumber).toBeDefined();
    });
  });

  describe('control', () => {
    it('should successfully cancel BPAY payment', async () => {
      // First initiate a payment
      const initiateRequest: InitiateBPAYPaymentRequest = {
        paymentInstructionType: PaymentType.BPAY_PAYMENT,
        paymentInstructionAmount: {
          amount: '75.50',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.BPAY,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Customer Name'
        },
        creditAccount: {
          accountIdentification: '123456',
          accountName: 'Energy Australia'
        },
        bpayData: {
          transactionType: BPAYTransactionType.BILL_PAYMENT,
          paymentMethod: BPAYPaymentMethod.INTERNET_BANKING,
          customerReferenceNumber: '987654321098'
        },
        bpayReference: {
          billerCode: '123456',
          referenceNumber: '987654321098',
          billerName: 'Energy Australia'
        }
      };

      const initiateResult = await bpayHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now cancel the payment
      const controlResult = await bpayHandler.control(paymentId, { controlActionType: 'CANCEL' });
      
      expect(controlResult.success).toBe(true);
      expect(controlResult.data!.bpayPaymentInstruction.paymentInstructionStatus).toBe('CANCELLED');
    });
  });

  describe('exchange', () => {
    it('should successfully handle payment rejection', async () => {
      // First initiate a payment
      const initiateRequest: InitiateBPAYPaymentRequest = {
        paymentInstructionType: PaymentType.BPAY_PAYMENT,
        paymentInstructionAmount: {
          amount: '75.50',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.BPAY,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Customer Name'
        },
        creditAccount: {
          accountIdentification: '123456',
          accountName: 'Energy Australia'
        },
        bpayData: {
          transactionType: BPAYTransactionType.BILL_PAYMENT,
          paymentMethod: BPAYPaymentMethod.INTERNET_BANKING,
          customerReferenceNumber: '987654321098'
        },
        bpayReference: {
          billerCode: '123456',
          referenceNumber: '987654321098',
          billerName: 'Energy Australia'
        }
      };

      const initiateResult = await bpayHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now reject the payment
      const exchangeResult = await bpayHandler.exchange(paymentId, { exchangeActionType: 'REJECT' });
      
      expect(exchangeResult.success).toBe(true);
      expect(exchangeResult.data!.bpayPaymentInstruction.paymentInstructionStatus).toBe('FAILED');
    });
  });
});