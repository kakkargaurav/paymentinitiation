/**
 * BPAY Payment Controller
 * Handles HTTP requests for BPAY (Bill Payment) payments
 */

import { Request, Response } from 'express';
import { BPAYPaymentHandler } from '../services/payment-handlers/bpay.handler';
import { BianPaymentInitiationService, CorrelationService } from '../services/bian/payment-initiation.service';
import {
  InitiateBPAYPaymentRequest,
  UpdateBPAYPaymentRequest,
  RequestBPAYPaymentRequest,
  ControlBPAYPaymentRequest,
  ExchangeBPAYPaymentRequest
} from '../models/australian-payments/bpay.model';
import { PaymentType } from '../models/bian/common-types.model';

export class BPAYPaymentController {
  private bpayHandler: BPAYPaymentHandler;
  private bianService: BianPaymentInitiationService;

  constructor() {
    this.bpayHandler = new BPAYPaymentHandler();
    this.bianService = new BianPaymentInitiationService(new CorrelationService());
    
    // Register BPAY handler with BIAN service
    this.bianService.registerPaymentHandler(PaymentType.BPAY_PAYMENT, this.bpayHandler);
  }

  /**
   * POST /payment-initiation/bpay-payments/initiate
   * Initiate a new BPAY payment
   */
  public initiatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: InitiateBPAYPaymentRequest = req.body;
      
      const result = await this.bianService.initiate(PaymentType.BPAY_PAYMENT, request);
      
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
          errorDescription: 'An unexpected error occurred while initiating BPAY payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /payment-initiation/bpay-payments/:paymentId/update
   * Update an existing BPAY payment
   */
  public updatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: UpdateBPAYPaymentRequest = req.body;
      
      const result = await this.bianService.update(PaymentType.BPAY_PAYMENT, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while updating BPAY payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /payment-initiation/bpay-payments/:paymentId/request
   * Submit BPAY payment for processing
   */
  public requestPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: RequestBPAYPaymentRequest = req.body;
      
      const result = await this.bianService.request(PaymentType.BPAY_PAYMENT, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while processing BPAY payment request'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /payment-initiation/bpay-payments/:paymentId/retrieve
   * Retrieve BPAY payment details
   */
  public retrievePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      
      const result = await this.bianService.retrieve(PaymentType.BPAY_PAYMENT, paymentId);
      
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
          errorDescription: 'An unexpected error occurred while retrieving BPAY payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /payment-initiation/bpay-payments/:paymentId/control
   * Control BPAY payment execution
   */
  public controlPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: ControlBPAYPaymentRequest = req.body;
      
      const result = await this.bianService.control(PaymentType.BPAY_PAYMENT, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while controlling BPAY payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /payment-initiation/bpay-payments/:paymentId/exchange
   * Handle BPAY payment exchanges
   */
  public exchangePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: ExchangeBPAYPaymentRequest = req.body;
      
      const result = await this.bianService.exchange(PaymentType.BPAY_PAYMENT, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while handling BPAY payment exchange'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /payment-initiation/bpay-payments
   * Query BPAY payments
   */
  public queryPayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = {
        paymentType: PaymentType.BPAY_PAYMENT,
        paymentStatus: req.query.status as any,
        debitAccount: req.query.debitAccount as string,
        creditAccount: req.query.creditAccount as string,
        billerCode: req.query.billerCode as string,
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
      
      const result = await this.bianService.query(PaymentType.BPAY_PAYMENT, query);
      
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
          errorDescription: 'An unexpected error occurred while querying BPAY payments'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };
}