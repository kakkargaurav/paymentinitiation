/**
 * Direct Debit Payment Handler Tests
 * Test suite for Direct Debit payment functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DirectDebitPaymentHandler } from '../src/services/payment-handlers/direct-debit.handler';
import {
  InitiateDirectDebitPaymentRequest,
  DirectDebitType,
  DirectDebitFrequency,
  DirectDebitStatus
} from '../src/models/australian-payments/direct-debit.model';
import { PaymentType, PaymentMechanism, Currency } from '../src/models/bian/common-types.model';

describe('Direct Debit Payment Handler', () => {
  let directDebitHandler: DirectDebitPaymentHandler;

  beforeEach(() => {
    directDebitHandler = new DirectDebitPaymentHandler();
  });

  describe('validate', () => {
    const validRequest: InitiateDirectDebitPaymentRequest = {
      paymentInstructionType: PaymentType.DIRECT_DEBIT,
      paymentInstructionAmount: {
        amount: '29.99',
        currency: Currency.AUD
      },
      paymentMechanism: PaymentMechanism.DIRECT_DEBIT,
      debitAccount: {
        accountIdentification: '123456789',
        bankCode: '123-456',
        accountName: 'Customer Name'
      },
      creditAccount: {
        accountIdentification: '555666777',
        bankCode: '555-666',
        accountName: 'Subscription Service Pty Ltd'
      },
      remittanceInformation: 'Monthly subscription',
      directDebitData: {
        mandateReference: 'SUB_12345',
        directDebitType: DirectDebitType.RECURRING,
        frequency: DirectDebitFrequency.MONTHLY,
        firstDebitDate: '2025-12-15',
        numberOfPayments: 12,
        authorisationMethod: 'ONLINE',
        creditorReference: 'CRED_001',
        creditorName: 'Subscription Service Pty Ltd',
        debtorReference: 'DEBT_001',
        mandateDescription: 'Monthly subscription payment'
      }
    };

    it('should validate direct debit setup', async () => {
      const handler = new DirectDebitPaymentHandler();
      
      const result = await handler.validate(validRequest);
      
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject request with missing Direct Debit data', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).directDebitData;
      
      const result = await directDebitHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('MISSING_DIRECT_DEBIT_DATA');
    });

    it('should reject request with missing mandate reference', async () => {
      const invalidRequest = {
        ...validRequest,
        directDebitData: {
          ...validRequest.directDebitData,
          mandateReference: ''
        }
      };
      
      const result = await directDebitHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('MISSING_MANDATE_REFERENCE');
    });

    it('should reject request with missing creditor reference', async () => {
      const invalidRequest = {
        ...validRequest,
        directDebitData: {
          ...validRequest.directDebitData,
          creditorReference: ''
        }
      };
      
      const result = await directDebitHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('MISSING_CREDITOR_REFERENCE');
    });

    it('should reject request with missing creditor name', async () => {
      const invalidRequest = {
        ...validRequest,
        directDebitData: {
          ...validRequest.directDebitData,
          creditorName: ''
        }
      };
      
      const result = await directDebitHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('MISSING_CREDITOR_NAME');
    });

    it('should reject request with first debit date in the past', async () => {
      const invalidRequest = {
        ...validRequest,
        directDebitData: {
          ...validRequest.directDebitData,
          firstDebitDate: '2020-01-01' // Past date
        }
      };
      
      const result = await directDebitHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('INVALID_FIRST_DEBIT_DATE');
    });

    it('should validate payment amounts', async () => {
      const invalidRequest = {
        ...validRequest,
        paymentInstructionAmount: {
          amount: '1000000.00', // Over maximum
          currency: Currency.AUD
        }
      };
      
      const result = await directDebitHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('INVALID_PAYMENT_AMOUNT');
    });

    it('should validate bank account details', async () => {
      const invalidRequest = {
        ...validRequest,
        debitAccount: {
          ...validRequest.debitAccount,
          bankCode: '12345' // Invalid BSB format
        }
      };
      
      const result = await directDebitHandler.validate(invalidRequest);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].errorCode).toBe('INVALID_BANK_DETAILS');
    });
  });

  describe('initiate', () => {
    const validRequest: InitiateDirectDebitPaymentRequest = {
      paymentInstructionType: PaymentType.DIRECT_DEBIT,
      paymentInstructionAmount: {
        amount: '29.99',
        currency: Currency.AUD
      },
      paymentMechanism: PaymentMechanism.DIRECT_DEBIT,
      debitAccount: {
        accountIdentification: '123456789',
        bankCode: '123-456',
        accountName: 'Customer Name'
      },
      creditAccount: {
        accountIdentification: '555666777',
        bankCode: '555-666',
        accountName: 'Subscription Service Pty Ltd'
      },
      remittanceInformation: 'Monthly subscription',
      directDebitData: {
        mandateReference: 'SUB_12345',
        directDebitType: DirectDebitType.RECURRING,
        frequency: DirectDebitFrequency.MONTHLY,
        firstDebitDate: '2025-12-15',
        numberOfPayments: 12,
        authorisationMethod: 'ONLINE',
        creditorReference: 'CRED_001',
        creditorName: 'Subscription Service Pty Ltd',
        debtorReference: 'DEBT_001',
        mandateDescription: 'Monthly subscription payment'
      }
    };

    it('should successfully initiate a Direct Debit payment', async () => {
      // First validate the request
      const validationResult = await directDebitHandler.validate(validRequest);
      expect(validationResult.success).toBe(true);

      // Then initiate the payment
      const result = await directDebitHandler.initiate(validRequest);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.paymentInstructionReference).toBeDefined();
      expect(result.data!.paymentInstructionReference).toMatch(/^DD-/);
    });

    it('should generate mandate details', async () => {
      const result = await directDebitHandler.initiate(validRequest);
      
      expect(result.success).toBe(true);
      const ddInstruction = result.data!.directDebitPaymentInstruction;
      expect(ddInstruction.directDebitSpecificData.mandateDetails).toBeDefined();
      expect(ddInstruction.directDebitSpecificData.mandateDetails.mandateId).toBeDefined();
      expect(ddInstruction.directDebitSpecificData.mandateDetails.mandateStatus).toBe(DirectDebitStatus.PENDING_APPROVAL);
      expect(ddInstruction.directDebitSpecificData.mandateDetails.creditorName).toBe('Subscription Service Pty Ltd');
    });

    it('should set correct schedule details', async () => {
      const result = await directDebitHandler.initiate(validRequest);
      
      expect(result.success).toBe(true);
      const ddInstruction = result.data!.directDebitPaymentInstruction;
      expect(ddInstruction.directDebitSpecificData.scheduleDetails).toBeDefined();
      expect(ddInstruction.directDebitSpecificData.scheduleDetails.firstDebitDate).toBe('2025-12-15');
      expect(ddInstruction.directDebitSpecificData.scheduleDetails.frequency).toBe(DirectDebitFrequency.MONTHLY);
      expect(ddInstruction.directDebitSpecificData.scheduleDetails.numberOfPayments).toBe(12);
      expect(ddInstruction.directDebitSpecificData.scheduleDetails.remainingPayments).toBe(12);
    });

    it('should set notification settings', async () => {
      const result = await directDebitHandler.initiate(validRequest);
      
      expect(result.success).toBe(true);
      const ddInstruction = result.data!.directDebitPaymentInstruction;
      expect(ddInstruction.directDebitSpecificData.notificationSettings).toBeDefined();
      expect(ddInstruction.directDebitSpecificData.notificationSettings!.advanceNotificationRequired).toBe(true);
      expect(ddInstruction.directDebitSpecificData.notificationSettings!.dishonourNotificationRequired).toBe(true);
    });
  });

  describe('update', () => {
    it('should successfully update an existing Direct Debit payment', async () => {
      // First initiate a payment
      const initiateRequest: InitiateDirectDebitPaymentRequest = {
        paymentInstructionType: PaymentType.DIRECT_DEBIT,
        paymentInstructionAmount: {
          amount: '29.99',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.DIRECT_DEBIT,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Customer Name'
        },
        creditAccount: {
          accountIdentification: '555666777',
          bankCode: '555-666',
          accountName: 'Subscription Service Pty Ltd'
        },
        directDebitData: {
          mandateReference: 'SUB_12345',
          directDebitType: DirectDebitType.RECURRING,
          frequency: DirectDebitFrequency.MONTHLY,
          firstDebitDate: '2025-12-15',
          numberOfPayments: 12,
          authorisationMethod: 'ONLINE',
          creditorReference: 'CRED_001',
          creditorName: 'Subscription Service Pty Ltd',
          debtorReference: 'DEBT_001',
          mandateDescription: 'Monthly subscription payment'
        }
      };

      const initiateResult = await directDebitHandler.initiate(initiateRequest);
      expect(initiateResult.success).toBe(true);

      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now update the payment
      const updateRequest = {
        paymentInstructionAmount: {
          amount: '39.99',
          currency: Currency.AUD
        }
      };

      const updateResult = await directDebitHandler.update(paymentId, updateRequest);
      
      expect(updateResult.success).toBe(true);
      expect(updateResult.data!.directDebitPaymentInstruction.paymentInstructionAmount.amount).toBe('39.99');
    });

    it('should return error for non-existent payment', async () => {
      const updateResult = await directDebitHandler.update('non-existent-id', {});
      
      expect(updateResult.success).toBe(false);
      expect(updateResult.errors![0].errorCode).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('retrieve', () => {
    it('should successfully retrieve an existing Direct Debit payment', async () => {
      // First initiate a payment
      const initiateRequest: InitiateDirectDebitPaymentRequest = {
        paymentInstructionType: PaymentType.DIRECT_DEBIT,
        paymentInstructionAmount: {
          amount: '29.99',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.DIRECT_DEBIT,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Customer Name'
        },
        creditAccount: {
          accountIdentification: '555666777',
          bankCode: '555-666',
          accountName: 'Subscription Service Pty Ltd'
        },
        directDebitData: {
          mandateReference: 'SUB_12345',
          directDebitType: DirectDebitType.RECURRING,
          frequency: DirectDebitFrequency.MONTHLY,
          firstDebitDate: '2025-12-15',
          numberOfPayments: 12,
          authorisationMethod: 'ONLINE',
          creditorReference: 'CRED_001',
          creditorName: 'Subscription Service Pty Ltd',
          debtorReference: 'DEBT_001',
          mandateDescription: 'Monthly subscription payment'
        }
      };

      const initiateResult = await directDebitHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now retrieve the payment
      const retrieveResult = await directDebitHandler.retrieve(paymentId);
      
      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data!.paymentInstructionReference).toBe(paymentId);
      expect(retrieveResult.data!.directDebitPaymentInstruction).toBeDefined();
    });

    it('should return error for non-existent payment', async () => {
      const retrieveResult = await directDebitHandler.retrieve('non-existent-id');
      
      expect(retrieveResult.success).toBe(false);
      expect(retrieveResult.errors![0].errorCode).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('request', () => {
    it('should successfully submit Direct Debit payment for processing', async () => {
      // First initiate a payment
      const initiateRequest: InitiateDirectDebitPaymentRequest = {
        paymentInstructionType: PaymentType.DIRECT_DEBIT,
        paymentInstructionAmount: {
          amount: '29.99',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.DIRECT_DEBIT,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Customer Name'
        },
        creditAccount: {
          accountIdentification: '555666777',
          bankCode: '555-666',
          accountName: 'Subscription Service Pty Ltd'
        },
        directDebitData: {
          mandateReference: 'SUB_12345',
          directDebitType: DirectDebitType.RECURRING,
          frequency: DirectDebitFrequency.MONTHLY,
          firstDebitDate: '2025-12-15',
          numberOfPayments: 12,
          authorisationMethod: 'ONLINE',
          creditorReference: 'CRED_001',
          creditorName: 'Subscription Service Pty Ltd',
          debtorReference: 'DEBT_001',
          mandateDescription: 'Monthly subscription payment'
        }
      };

      const initiateResult = await directDebitHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now request processing
      const requestResult = await directDebitHandler.request(paymentId, {});
      
      expect(requestResult.success).toBe(true);
      expect(requestResult.data!.directDebitPaymentInstruction.processingLog!.length).toBeGreaterThan(1);
      expect(requestResult.data!.directDebitPaymentInstruction.directDebitSpecificData.mandateDetails.mandateStatus).toBe(DirectDebitStatus.ACTIVE);
    });
  });

  describe('control', () => {
    it('should successfully cancel Direct Debit payment', async () => {
      // First initiate a payment
      const initiateRequest: InitiateDirectDebitPaymentRequest = {
        paymentInstructionType: PaymentType.DIRECT_DEBIT,
        paymentInstructionAmount: {
          amount: '29.99',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.DIRECT_DEBIT,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Customer Name'
        },
        creditAccount: {
          accountIdentification: '555666777',
          bankCode: '555-666',
          accountName: 'Subscription Service Pty Ltd'
        },
        directDebitData: {
          mandateReference: 'SUB_12345',
          directDebitType: DirectDebitType.RECURRING,
          frequency: DirectDebitFrequency.MONTHLY,
          firstDebitDate: '2025-12-15',
          numberOfPayments: 12,
          authorisationMethod: 'ONLINE',
          creditorReference: 'CRED_001',
          creditorName: 'Subscription Service Pty Ltd',
          debtorReference: 'DEBT_001',
          mandateDescription: 'Monthly subscription payment'
        }
      };

      const initiateResult = await directDebitHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now cancel the payment
      const controlResult = await directDebitHandler.control(paymentId, { controlActionType: 'CANCEL' });
      
      expect(controlResult.success).toBe(true);
      expect(controlResult.data!.directDebitPaymentInstruction.paymentInstructionStatus).toBe('CANCELLED');
      expect(controlResult.data!.directDebitPaymentInstruction.directDebitSpecificData.mandateDetails.mandateStatus).toBe(DirectDebitStatus.CANCELLED);
    });

    it('should successfully suspend Direct Debit payment', async () => {
      // First initiate a payment
      const initiateRequest: InitiateDirectDebitPaymentRequest = {
        paymentInstructionType: PaymentType.DIRECT_DEBIT,
        paymentInstructionAmount: {
          amount: '29.99',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.DIRECT_DEBIT,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Customer Name'
        },
        creditAccount: {
          accountIdentification: '555666777',
          bankCode: '555-666',
          accountName: 'Subscription Service Pty Ltd'
        },
        directDebitData: {
          mandateReference: 'SUB_12345',
          directDebitType: DirectDebitType.RECURRING,
          frequency: DirectDebitFrequency.MONTHLY,
          firstDebitDate: '2025-12-15',
          numberOfPayments: 12,
          authorisationMethod: 'ONLINE',
          creditorReference: 'CRED_001',
          creditorName: 'Subscription Service Pty Ltd',
          debtorReference: 'DEBT_001',
          mandateDescription: 'Monthly subscription payment'
        }
      };

      const initiateResult = await directDebitHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now suspend the payment
      const controlResult = await directDebitHandler.control(paymentId, { controlActionType: 'SUSPEND' });
      
      expect(controlResult.success).toBe(true);
      expect(controlResult.data!.directDebitPaymentInstruction.directDebitSpecificData.mandateDetails.mandateStatus).toBe(DirectDebitStatus.SUSPENDED);
    });
  });

  describe('exchange', () => {
    it('should successfully handle payment dishonour', async () => {
      // First initiate a payment
      const initiateRequest: InitiateDirectDebitPaymentRequest = {
        paymentInstructionType: PaymentType.DIRECT_DEBIT,
        paymentInstructionAmount: {
          amount: '29.99',
          currency: Currency.AUD
        },
        paymentMechanism: PaymentMechanism.DIRECT_DEBIT,
        debitAccount: {
          accountIdentification: '123456789',
          bankCode: '123-456',
          accountName: 'Customer Name'
        },
        creditAccount: {
          accountIdentification: '555666777',
          bankCode: '555-666',
          accountName: 'Subscription Service Pty Ltd'
        },
        directDebitData: {
          mandateReference: 'SUB_12345',
          directDebitType: DirectDebitType.RECURRING,
          frequency: DirectDebitFrequency.MONTHLY,
          firstDebitDate: '2025-12-15',
          numberOfPayments: 12,
          authorisationMethod: 'ONLINE',
          creditorReference: 'CRED_001',
          creditorName: 'Subscription Service Pty Ltd',
          debtorReference: 'DEBT_001',
          mandateDescription: 'Monthly subscription payment'
        }
      };

      const initiateResult = await directDebitHandler.initiate(initiateRequest);
      const paymentId = initiateResult.data!.paymentInstructionReference;

      // Now reject the payment (dishonour)
      const exchangeResult = await directDebitHandler.exchange(paymentId, { 
        exchangeActionType: 'REJECT',
        directDebitExchangeData: {
          dishonourReason: 'INSUFFICIENT_FUNDS',
          dishonourCode: 'NSF'
        }
      });
      
      expect(exchangeResult.success).toBe(true);
      expect(exchangeResult.data!.directDebitPaymentInstruction.paymentInstructionStatus).toBe('FAILED');
      expect(exchangeResult.data!.directDebitPaymentInstruction.directDebitSpecificData.dishonourDetails).toBeDefined();
      expect(exchangeResult.data!.directDebitPaymentInstruction.directDebitSpecificData.dishonourDetails!.dishonourReason).toBe('INSUFFICIENT_FUNDS');
    });
  });
});