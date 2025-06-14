/**
 * Direct Debit Payment Controller
 * Handles HTTP requests for Direct Debit payments
 */

import { Request, Response } from 'express';
import { DirectDebitPaymentHandler } from '../services/payment-handlers/direct-debit.handler';
import { BianPaymentInitiationService, CorrelationService } from '../services/bian/payment-initiation.service';
import {
  InitiateDirectDebitPaymentRequest,
  UpdateDirectDebitPaymentRequest,
  RequestDirectDebitPaymentRequest,
  ControlDirectDebitPaymentRequest,
  ExchangeDirectDebitPaymentRequest
} from '../models/australian-payments/direct-debit.model';
import { PaymentType } from '../models/bian/common-types.model';

export class DirectDebitPaymentController {
  private directDebitHandler: DirectDebitPaymentHandler;
  private bianService: BianPaymentInitiationService;

  constructor() {
    this.directDebitHandler = new DirectDebitPaymentHandler();
    this.bianService = new BianPaymentInitiationService(new CorrelationService());
    
    // Register Direct Debit handler with BIAN service
    this.bianService.registerPaymentHandler(PaymentType.DIRECT_DEBIT, this.directDebitHandler);
  }

  /**
   * POST /payment-initiation/direct-debit/initiate
   * Initiate a new Direct Debit payment
   */
  public initiatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: InitiateDirectDebitPaymentRequest = req.body;
      
      const result = await this.bianService.initiate(PaymentType.DIRECT_DEBIT, request);
      
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
          errorDescription: 'An unexpected error occurred while initiating Direct Debit payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /payment-initiation/direct-debit/:paymentId/update
   * Update an existing Direct Debit payment
   */
  public updatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: UpdateDirectDebitPaymentRequest = req.body;
      
      const result = await this.bianService.update(PaymentType.DIRECT_DEBIT, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while updating Direct Debit payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /payment-initiation/direct-debit/:paymentId/request
   * Submit Direct Debit payment for processing
   */
  public requestPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: RequestDirectDebitPaymentRequest = req.body;
      
      const result = await this.bianService.request(PaymentType.DIRECT_DEBIT, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while processing Direct Debit payment request'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /payment-initiation/direct-debit/:paymentId/retrieve
   * Retrieve Direct Debit payment details
   */
  public retrievePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      
      const result = await this.bianService.retrieve(PaymentType.DIRECT_DEBIT, paymentId);
      
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
          errorDescription: 'An unexpected error occurred while retrieving Direct Debit payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /payment-initiation/direct-debit/:paymentId/control
   * Control Direct Debit payment execution
   */
  public controlPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: ControlDirectDebitPaymentRequest = req.body;
      
      const result = await this.bianService.control(PaymentType.DIRECT_DEBIT, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while controlling Direct Debit payment'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /payment-initiation/direct-debit/:paymentId/exchange
   * Handle Direct Debit payment exchanges
   */
  public exchangePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: ExchangeDirectDebitPaymentRequest = req.body;
      
      const result = await this.bianService.exchange(PaymentType.DIRECT_DEBIT, paymentId, request);
      
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
          errorDescription: 'An unexpected error occurred while handling Direct Debit payment exchange'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /payment-initiation/direct-debit
   * Query Direct Debit payments
   */
  public queryPayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const query = {
        paymentType: PaymentType.DIRECT_DEBIT,
        paymentStatus: req.query.status as any,
        debitAccount: req.query.debitAccount as string,
        creditAccount: req.query.creditAccount as string,
        mandateReference: req.query.mandateReference as string,
        creditorReference: req.query.creditorReference as string,
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
      
      const result = await this.bianService.query(PaymentType.DIRECT_DEBIT, query);
      
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
          errorDescription: 'An unexpected error occurred while querying Direct Debit payments'
        }],
        timestamp: new Date().toISOString()
      });
    }
  };
}