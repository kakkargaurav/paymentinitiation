/**
 * BECS Payment Controller
 * Handles HTTP requests for BECS (Bulk Electronic Clearing System) payments
 */

import { Request, Response } from 'express';
import { BECSPaymentHandler } from '../services/payment-handlers/becs.handler';
import { BianPaymentInitiationService, CorrelationService } from '../services/bian/payment-initiation.service';
import {
  InitiateBECSPaymentRequest,
  UpdateBECSPaymentRequest,
  RequestBECSPaymentRequest,
  ControlBECSPaymentRequest,
  ExchangeBECSPaymentRequest
} from '../models/australian-payments/becs.model';
import { PaymentType } from '../models/bian/common-types.model';

export class BECSPaymentController {
  private becsHandler: BECSPaymentHandler;
  private bianService: BianPaymentInitiationService;

  constructor() {
    this.becsHandler = new BECSPaymentHandler();
    this.bianService = new BianPaymentInitiationService(new CorrelationService());
    
    // Register BECS handler with BIAN service
    this.bianService.registerPaymentHandler(PaymentType.BECS_DIRECT_ENTRY, this.becsHandler);
  }

  /**
   * POST /payment-initiation/becs-payments/initiate
   * Initiate a new BECS payment
   */
  public initiatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: InitiateBECSPaymentRequest = req.body;
      
      const result = await this.bianService.initiate(PaymentType.BECS_DIRECT_ENTRY, request);
      
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
          errorDescription: 'An unexpected error occurred while initiating BECS payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /payment-initiation/becs-payments/:paymentId/update
   * Update an existing BECS payment
   */
  public updatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: UpdateBECSPaymentRequest = req.body;
      
      const result = await this.bianService.update(PaymentType.BECS_DIRECT_ENTRY, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while updating BECS payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /payment-initiation/becs-payments/:paymentId/request
   * Submit BECS payment for processing
   */
  public requestPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: RequestBECSPaymentRequest = req.body;
      
      const result = await this.bianService.request(PaymentType.BECS_DIRECT_ENTRY, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while processing BECS payment request'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /payment-initiation/becs-payments/:paymentId/retrieve
   * Retrieve BECS payment details
   */
  public retrievePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      
      const result = await this.bianService.retrieve(PaymentType.BECS_DIRECT_ENTRY, paymentId);
      
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
          errorDescription: 'An unexpected error occurred while retrieving BECS payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /payment-initiation/becs-payments/:paymentId/control
   * Control BECS payment execution
   */
  public controlPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: ControlBECSPaymentRequest = req.body;
      
      const result = await this.bianService.control(PaymentType.BECS_DIRECT_ENTRY, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while controlling BECS payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /payment-initiation/becs-payments/:paymentId/exchange
   * Handle BECS payment exchanges
   */
  public exchangePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: ExchangeBECSPaymentRequest = req.body;
      
      const result = await this.bianService.exchange(PaymentType.BECS_DIRECT_ENTRY, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while handling BECS payment exchange'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /payment-initiation/becs-payments
   * Query BECS payments
   */
  public queryPayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = {
        paymentType: PaymentType.BECS_DIRECT_ENTRY,
        paymentStatus: req.query.status as any,
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
      
      const result = await this.bianService.query(PaymentType.BECS_DIRECT_ENTRY, query);
      
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
          errorDescription: 'An unexpected error occurred while querying BECS payments'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };
}