/**
 * International Wire Payment Controller
 * Handles HTTP requests for international wire transfer operations
 * Following BIAN v12.0.0 patterns and Express.js best practices
 */

import { Request, Response } from 'express';
import { InternationalWireHandler } from '../services/payment-handlers/international-wire.handler';
import { 
  InitiatePaymentInstructionRequest,
  UpdatePaymentInstructionRequest,
  RequestPaymentInstructionRequest,
  ControlPaymentInstructionRequest,
  ExchangePaymentInstructionRequest
} from '../models/bian/payment-instruction.model';

export class InternationalWirePaymentController {
  private internationalWireHandler: InternationalWireHandler;

  constructor() {
    this.internationalWireHandler = new InternationalWireHandler();
  }

  /**
   * POST /international-wires/initiate
   * Initiate a new international wire transfer payment
   */
  initiatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const request: InitiatePaymentInstructionRequest = req.body;
      
      // Validate required fields
      if (!request.paymentInstructionAmount || !request.debitAccount || !request.creditAccount) {
        res.status(400).json({
          success: false,
          errors: [{
            errorCode: 'MISSING_REQUIRED_FIELDS',
            errorDescription: 'Payment amount, debit account, and credit account are required'
          }],
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.internationalWireHandler.initiatePayment(request);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: `Failed to initiate international wire payment: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /international-wires/:paymentId/update
   * Update an existing international wire transfer payment
   */
  updatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: UpdatePaymentInstructionRequest = req.body;

      if (!paymentId) {
        res.status(400).json({
          success: false,
          errors: [{
            errorCode: 'MISSING_PAYMENT_ID',
            errorDescription: 'Payment ID is required'
          }],
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.internationalWireHandler.updatePayment(paymentId, request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: `Failed to update international wire payment: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /international-wires/:paymentId/request
   * Request processing action on international wire transfer payment
   */
  requestPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: RequestPaymentInstructionRequest = req.body;

      if (!paymentId) {
        res.status(400).json({
          success: false,
          errors: [{
            errorCode: 'MISSING_PAYMENT_ID',
            errorDescription: 'Payment ID is required'
          }],
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!request.requestType) {
        res.status(400).json({
          success: false,
          errors: [{
            errorCode: 'MISSING_REQUEST_TYPE',
            errorDescription: 'Request type is required'
          }],
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.internationalWireHandler.requestPayment(paymentId, request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: `Failed to process international wire payment request: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /international-wires/:paymentId/retrieve
   * Retrieve international wire transfer payment details
   */
  retrievePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;

      if (!paymentId) {
        res.status(400).json({
          success: false,
          errors: [{
            errorCode: 'MISSING_PAYMENT_ID',
            errorDescription: 'Payment ID is required'
          }],
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.internationalWireHandler.retrievePayment(paymentId);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: `Failed to retrieve international wire payment: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * PUT /international-wires/:paymentId/control
   * Control international wire transfer payment (suspend, resume, cancel, terminate)
   */
  controlPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: ControlPaymentInstructionRequest = req.body;

      if (!paymentId) {
        res.status(400).json({
          success: false,
          errors: [{
            errorCode: 'MISSING_PAYMENT_ID',
            errorDescription: 'Payment ID is required'
          }],
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!request.controlActionType) {
        res.status(400).json({
          success: false,
          errors: [{
            errorCode: 'MISSING_CONTROL_ACTION',
            errorDescription: 'Control action type is required'
          }],
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.internationalWireHandler.controlPayment(paymentId, request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: `Failed to control international wire payment: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * POST /international-wires/:paymentId/exchange
   * Exchange information with external parties for international wire transfer
   */
  exchangePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;
      const request: ExchangePaymentInstructionRequest = req.body;

      if (!paymentId) {
        res.status(400).json({
          success: false,
          errors: [{
            errorCode: 'MISSING_PAYMENT_ID',
            errorDescription: 'Payment ID is required'
          }],
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!request.exchangeActionType) {
        res.status(400).json({
          success: false,
          errors: [{
            errorCode: 'MISSING_EXCHANGE_ACTION',
            errorDescription: 'Exchange action type is required'
          }],
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await this.internationalWireHandler.exchangePayment(paymentId, request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: `Failed to exchange international wire payment information: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * GET /international-wires/
   * Query international wire transfer payments
   */
  queryPayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = req.query;
      const result = await this.internationalWireHandler.queryPayments(filters);
      
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        errors: [{
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorDescription: `Failed to query international wire payments: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        timestamp: new Date().toISOString()
      });
    }
  };
}