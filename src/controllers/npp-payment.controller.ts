/**
 * NPP Payment Controller
 * Handles HTTP requests for NPP (New Payments Platform) payments
 */

import { Request, Response } from 'express';
import { NPPPaymentHandler } from '../services/payment-handlers/npp.handler';
import { BianPaymentInitiationService, CorrelationService } from '../services/bian/payment-initiation.service';
import {
  InitiateNPPPaymentRequest,
  UpdateNPPPaymentRequest,
  RequestNPPPaymentRequest,
  ControlNPPPaymentRequest,
  ExchangeNPPPaymentRequest
} from '../models/australian-payments/npp.model';
import { PaymentType } from '../models/bian/common-types.model';

export class NPPPaymentController {
  private nppHandler: NPPPaymentHandler;
  private bianService: BianPaymentInitiationService;

  constructor() {
    this.nppHandler = new NPPPaymentHandler();
    this.bianService = new BianPaymentInitiationService(new CorrelationService());
    
    // Register NPP handler with BIAN service
    this.bianService.registerPaymentHandler(PaymentType.NPP_INSTANT, this.nppHandler);
    this.bianService.registerPaymentHandler(PaymentType.NPP_PAYID, this.nppHandler);
  }

  /**
   * POST /payment-initiation/npp-payments/initiate
   * Initiate a new NPP payment
   */
  public initiatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: InitiateNPPPaymentRequest = req.body;
      
      // Determine payment type based on PayID presence
      const paymentType = request.payIdDetails ? PaymentType.NPP_PAYID : PaymentType.NPP_INSTANT;
      
      const result = await this.bianService.initiate(paymentType, request);
      
      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: 'An unexpected error occurred while initiating NPP payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /payment-initiation/npp-payments/:paymentId/update
   * Update an existing NPP payment
   */
  public updatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: UpdateNPPPaymentRequest = req.body;
      
      // Determine payment type
      const paymentType = request.payIdDetails ? PaymentType.NPP_PAYID : PaymentType.NPP_INSTANT;
      
      const result = await this.bianService.update(paymentType, paymentId, request);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: 'An unexpected error occurred while updating NPP payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /payment-initiation/npp-payments/:paymentId/request
   * Submit NPP payment for processing
   */
  public requestPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: RequestNPPPaymentRequest = req.body;
      
      // Default to NPP_INSTANT if not specified
      const paymentType = PaymentType.NPP_INSTANT;
      
      const result = await this.bianService.request(paymentType, paymentId, request);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: 'An unexpected error occurred while processing NPP payment request'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /payment-initiation/npp-payments/:paymentId/retrieve
   * Retrieve NPP payment details
   */
  public retrievePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      
      // Default to NPP_INSTANT
      const paymentType = PaymentType.NPP_INSTANT;
      
      const result = await this.bianService.retrieve(paymentType, paymentId);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      } else {
        res.status(404).json({
          success: false,
          errors: result.errors,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: 'An unexpected error occurred while retrieving NPP payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /payment-initiation/npp-payments/:paymentId/control
   * Control NPP payment execution
   */
  public controlPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: ControlNPPPaymentRequest = req.body;
      
      const paymentType = PaymentType.NPP_INSTANT;
      
      const result = await this.bianService.control(paymentType, paymentId, request);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: 'An unexpected error occurred while controlling NPP payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /payment-initiation/npp-payments/:paymentId/exchange
   * Handle NPP payment exchanges
   */
  public exchangePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: ExchangeNPPPaymentRequest = req.body;
      
      const paymentType = PaymentType.NPP_INSTANT;
      
      const result = await this.bianService.exchange(paymentType, paymentId, request);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: 'An unexpected error occurred while handling NPP payment exchange'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /payment-initiation/npp-payments
   * Query NPP payments
   */
  public queryPayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = {
        paymentType: PaymentType.NPP_INSTANT,
        paymentStatus: req.query.status as any, // Cast to PaymentStatus enum
        debitAccount: req.query.debitAccount as string,
        creditAccount: req.query.creditAccount as string,
        amountRange: req.query.minAmount || req.query.maxAmount ? {
          min: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
          max: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined
        } : undefined,
        dateRange: req.query.fromDate || req.query.toDate ? {
          fromDateTime: req.query.fromDate as string,
          toDateTime: req.query.toDate as string
        } : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0
      };
      
      const result = await this.bianService.query(PaymentType.NPP_INSTANT, query);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      } else {
        res.status(400).json({
          success: false,
          errors: result.errors,
          correlationId: result.correlationId,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: 'An unexpected error occurred while querying NPP payments'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /payment-initiation/npp-payments/test-scenarios
   * Get available test scenarios for NPP payments
   */
  public getTestScenarios = async (req: Request, res: Response): Promise<void> => {
    try {
      const { TestScenariosService } = await import('../utils/test-scenarios.util');
      const scenarios = TestScenariosService.getTestScenarios();
      
      res.status(200).json({
        success: true,
        data: {
          scenarios: scenarios.map((scenario, index) => ({
            index,
            description: scenario.description,
            condition: scenario.condition,
            expectedResult: scenario.result
          }))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: 'An unexpected error occurred while retrieving test scenarios'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /payment-initiation/npp-payments/test-scenarios/:scenarioIndex/generate
   * Generate test data for a specific scenario
   */
  public generateTestData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { scenarioIndex } = req.params;
      const index = parseInt(scenarioIndex, 10);
      
      const { TestScenariosService } = await import('../utils/test-scenarios.util');
      const testData = TestScenariosService.generateTestData(index);
      
      res.status(200).json({
        success: true,
        data: {
          scenarioIndex: index,
          testPaymentData: testData
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        errors: [{
          errorCode: 'INVALID_SCENARIO_INDEX',
          errorDescription: 'Invalid scenario index provided'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };
}