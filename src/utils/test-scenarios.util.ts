/**
 * Test Scenarios Utility
 * Predefined test scenarios for payment processing simulation
 */

import { MonetaryAmount, PaymentStatus, Currency } from '../models/bian/common-types.model';

export interface TestScenario {
  condition: TestCondition;
  result: TestResult;
  description: string;
}

export interface TestCondition {
  type: 'AMOUNT' | 'ACCOUNT' | 'PAYID' | 'BILLER_CODE' | 'COUNTRY' | 'REFERENCE';
  operator: 'EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'ENDS_WITH' | 'STARTS_WITH' | 'CONTAINS';
  value: string | number;
}

export interface TestResult {
  status: PaymentStatus;
  errorCode?: string;
  errorMessage?: string;
  delay?: number; // milliseconds
  requiresManualApproval?: boolean;
}

// Predefined test scenarios
export const TEST_SCENARIOS: TestScenario[] = [
  // Success scenarios
  {
    condition: { type: 'AMOUNT', operator: 'LESS_THAN', value: 100 },
    result: { status: PaymentStatus.COMPLETED },
    description: 'Amounts under $100 - Instant success'
  },
  {
    condition: { type: 'ACCOUNT', operator: 'ENDS_WITH', value: '0000' },
    result: { status: PaymentStatus.COMPLETED },
    description: 'Accounts ending in 0000 - Always successful'
  },
  {
    condition: { type: 'PAYID', operator: 'ENDS_WITH', value: '@success.com' },
    result: { status: PaymentStatus.COMPLETED },
    description: 'PayID ending in @success.com - NPP success'
  },
  {
    condition: { type: 'BILLER_CODE', operator: 'STARTS_WITH', value: '12345' },
    result: { status: PaymentStatus.COMPLETED },
    description: 'BPAY biller codes starting with 12345 - Success'
  },

  // Failure scenarios
  {
    condition: { type: 'AMOUNT', operator: 'EQUALS', value: 999.99 },
    result: { 
      status: PaymentStatus.FAILED, 
      errorCode: 'INSUFFICIENT_FUNDS',
      errorMessage: 'Insufficient funds in account'
    },
    description: 'Amount equals $999.99 - Insufficient funds'
  },
  {
    condition: { type: 'ACCOUNT', operator: 'ENDS_WITH', value: '1111' },
    result: { 
      status: PaymentStatus.FAILED,
      errorCode: 'INVALID_ACCOUNT',
      errorMessage: 'Account number is invalid or closed'
    },
    description: 'Accounts ending in 1111 - Invalid account'
  },
  {
    condition: { type: 'AMOUNT', operator: 'GREATER_THAN', value: 10000 },
    result: { 
      status: PaymentStatus.PENDING_AUTHORIZATION,
      requiresManualApproval: true
    },
    description: 'Amounts over $10,000 - Requires additional authorization'
  },
  {
    condition: { type: 'COUNTRY', operator: 'EQUALS', value: 'BLOCKED' },
    result: { 
      status: PaymentStatus.FAILED,
      errorCode: 'COMPLIANCE_FAILURE',
      errorMessage: 'Transaction blocked due to compliance restrictions'
    },
    description: 'International transfers to blocked countries - Compliance failure'
  },
  {
    condition: { type: 'PAYID', operator: 'ENDS_WITH', value: '@fail.com' },
    result: { 
      status: PaymentStatus.FAILED,
      errorCode: 'PAYID_NOT_FOUND',
      errorMessage: 'PayID could not be resolved'
    },
    description: 'PayID ending in @fail.com - PayID resolution failure'
  },
  {
    condition: { type: 'REFERENCE', operator: 'EQUALS', value: 'TIMEOUT' },
    result: { 
      status: PaymentStatus.FAILED,
      errorCode: 'TIMEOUT',
      errorMessage: 'Payment processing timeout',
      delay: 30000
    },
    description: 'Reference "TIMEOUT" - Processing timeout'
  },
  {
    condition: { type: 'BILLER_CODE', operator: 'EQUALS', value: '999999' },
    result: { 
      status: PaymentStatus.FAILED,
      errorCode: 'INVALID_BILLER',
      errorMessage: 'Biller code not found or inactive'
    },
    description: 'BPAY biller code 999999 - Invalid biller'
  },
  {
    condition: { type: 'ACCOUNT', operator: 'CONTAINS', value: 'FREEZE' },
    result: { 
      status: PaymentStatus.FAILED,
      errorCode: 'ACCOUNT_FROZEN',
      errorMessage: 'Account is frozen due to security concerns'
    },
    description: 'Account containing "FREEZE" - Account frozen'
  }
];

export class TestScenariosService {
  /**
   * Evaluate payment against test scenarios
   */
  public static evaluatePayment(paymentData: any): TestResult | null {
    for (const scenario of TEST_SCENARIOS) {
      if (this.matchesCondition(paymentData, scenario.condition)) {
        return scenario.result;
      }
    }
    return null; // No matching scenario, use default behavior
  }

  /**
   * Check if payment data matches a test condition
   */
  private static matchesCondition(paymentData: any, condition: TestCondition): boolean {
    const value = this.extractValue(paymentData, condition.type);
    
    if (value === null || value === undefined) {
      return false;
    }

    switch (condition.operator) {
      case 'EQUALS':
        return value === condition.value;
      
      case 'GREATER_THAN':
        return Number(value) > Number(condition.value);
      
      case 'LESS_THAN':
        return Number(value) < Number(condition.value);
      
      case 'ENDS_WITH':
        return String(value).endsWith(String(condition.value));
      
      case 'STARTS_WITH':
        return String(value).startsWith(String(condition.value));
      
      case 'CONTAINS':
        return String(value).includes(String(condition.value));
      
      default:
        return false;
    }
  }

  /**
   * Extract value from payment data based on condition type
   */
  private static extractValue(paymentData: any, type: string): any {
    switch (type) {
      case 'AMOUNT':
        return paymentData.paymentInstructionAmount?.amount || 
               paymentData.amount?.amount ||
               paymentData.amount;
      
      case 'ACCOUNT':
        return paymentData.creditAccount?.accountIdentification ||
               paymentData.debitAccount?.accountIdentification ||
               paymentData.accountNumber;
      
      case 'PAYID':
        return paymentData.payIdDetails?.payIdValue ||
               paymentData.payId;
      
      case 'BILLER_CODE':
        return paymentData.bpayDetails?.billerCode ||
               paymentData.billerCode;
      
      case 'COUNTRY':
        return paymentData.creditAccount?.country ||
               paymentData.destinationCountry ||
               paymentData.country;
      
      case 'REFERENCE':
        return paymentData.remittanceInformation ||
               paymentData.reference ||
               paymentData.customerReference;
      
      default:
        return null;
    }
  }

  /**
   * Get all available test scenarios
   */
  public static getTestScenarios(): TestScenario[] {
    return TEST_SCENARIOS;
  }

  /**
   * Get test scenarios by type
   */
  public static getTestScenariosByType(type: string): TestScenario[] {
    return TEST_SCENARIOS.filter(scenario => scenario.condition.type === type);
  }

  /**
   * Get success scenarios
   */
  public static getSuccessScenarios(): TestScenario[] {
    return TEST_SCENARIOS.filter(scenario => 
      scenario.result.status === PaymentStatus.COMPLETED
    );
  }

  /**
   * Get failure scenarios
   */
  public static getFailureScenarios(): TestScenario[] {
    return TEST_SCENARIOS.filter(scenario => 
      scenario.result.status === PaymentStatus.FAILED
    );
  }

  /**
   * Generate test payment data for a specific scenario
   */
  public static generateTestData(scenarioIndex: number): any {
    if (scenarioIndex < 0 || scenarioIndex >= TEST_SCENARIOS.length) {
      throw new Error('Invalid scenario index');
    }

    const scenario = TEST_SCENARIOS[scenarioIndex];
    const testData: any = {
      paymentInstructionAmount: {
        amount: '100.00',
        currency: Currency.AUD
      },
      debitAccount: {
        accountIdentification: '123456789',
        bankCode: '123-456'
      },
      creditAccount: {
        accountIdentification: '987654321',
        bankCode: '654-321'
      }
    };

    // Modify test data to match scenario condition
    switch (scenario.condition.type) {
      case 'AMOUNT':
        if (scenario.condition.operator === 'EQUALS') {
          testData.paymentInstructionAmount.amount = String(scenario.condition.value);
        } else if (scenario.condition.operator === 'LESS_THAN') {
          testData.paymentInstructionAmount.amount = String(Number(scenario.condition.value) - 1);
        } else if (scenario.condition.operator === 'GREATER_THAN') {
          testData.paymentInstructionAmount.amount = String(Number(scenario.condition.value) + 1);
        }
        break;

      case 'ACCOUNT':
        if (scenario.condition.operator === 'ENDS_WITH') {
          testData.creditAccount.accountIdentification = '123' + scenario.condition.value;
        }
        break;

      case 'PAYID':
        if (scenario.condition.operator === 'ENDS_WITH') {
          testData.payIdDetails = {
            payIdType: 'EMAIL',
            payIdValue: 'test' + scenario.condition.value
          };
        }
        break;

      case 'BILLER_CODE':
        if (scenario.condition.operator === 'STARTS_WITH') {
          testData.bpayDetails = {
            billerCode: scenario.condition.value + '1',
            referenceNumber: '123456789'
          };
        }
        break;

      case 'REFERENCE':
        testData.remittanceInformation = String(scenario.condition.value);
        break;
    }

    return testData;
  }
}