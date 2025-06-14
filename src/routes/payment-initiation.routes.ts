/**
 * Payment Initiation Routes
 * Express routes for all payment types following BIAN patterns
 */

import { Router } from 'express';
import { NPPPaymentController } from '../controllers/npp-payment.controller';
import { BECSPaymentController } from '../controllers/becs-payment.controller';
import { BPAYPaymentController } from '../controllers/bpay-payment.controller';
import { DirectDebitPaymentController } from '../controllers/direct-debit-payment.controller';
import { DomesticWirePaymentController } from '../controllers/domestic-wire-payment.controller';
import { InternationalWirePaymentController } from '../controllers/international-wire-payment.controller';

const router = Router();

// Initialize controllers
const nppController = new NPPPaymentController();
const becsController = new BECSPaymentController();
const bpayController = new BPAYPaymentController();
const directDebitController = new DirectDebitPaymentController();
const domesticWireController = new DomesticWirePaymentController();
const internationalWireController = new InternationalWirePaymentController();

// NPP Payment Routes
const nppRoutes = Router();

// BIAN Standard Operations for NPP Payments
nppRoutes.post('/initiate', nppController.initiatePayment);
nppRoutes.put('/:paymentId/update', nppController.updatePayment);
nppRoutes.post('/:paymentId/request', nppController.requestPayment);
nppRoutes.get('/:paymentId/retrieve', nppController.retrievePayment);
nppRoutes.put('/:paymentId/control', nppController.controlPayment);
nppRoutes.post('/:paymentId/exchange', nppController.exchangePayment);

// Query and utility endpoints
nppRoutes.get('/', nppController.queryPayments);
nppRoutes.get('/test-scenarios', nppController.getTestScenarios);
nppRoutes.post('/test-scenarios/:scenarioIndex/generate', nppController.generateTestData);

// Mount NPP routes
router.use('/npp-payments', nppRoutes);

// BECS Payment Routes
const becsRoutes = Router();

// BIAN Standard Operations for BECS Payments
becsRoutes.post('/initiate', becsController.initiatePayment);
becsRoutes.put('/:paymentId/update', becsController.updatePayment);
becsRoutes.post('/:paymentId/request', becsController.requestPayment);
becsRoutes.get('/:paymentId/retrieve', becsController.retrievePayment);
becsRoutes.put('/:paymentId/control', becsController.controlPayment);
becsRoutes.post('/:paymentId/exchange', becsController.exchangePayment);

// Query endpoints
becsRoutes.get('/', becsController.queryPayments);

router.use('/becs-payments', becsRoutes);

// BPAY Payment Routes
const bpayRoutes = Router();

// BIAN Standard Operations for BPAY Payments
bpayRoutes.post('/initiate', bpayController.initiatePayment);
bpayRoutes.put('/:paymentId/update', bpayController.updatePayment);
bpayRoutes.post('/:paymentId/request', bpayController.requestPayment);
bpayRoutes.get('/:paymentId/retrieve', bpayController.retrievePayment);
bpayRoutes.put('/:paymentId/control', bpayController.controlPayment);
bpayRoutes.post('/:paymentId/exchange', bpayController.exchangePayment);

// Query endpoints
bpayRoutes.get('/', bpayController.queryPayments);

router.use('/bpay-payments', bpayRoutes);

// Direct Debit Payment Routes
const directDebitRoutes = Router();

// BIAN Standard Operations for Direct Debit Payments
directDebitRoutes.post('/initiate', directDebitController.initiatePayment);
directDebitRoutes.put('/:paymentId/update', directDebitController.updatePayment);
directDebitRoutes.post('/:paymentId/request', directDebitController.requestPayment);
directDebitRoutes.get('/:paymentId/retrieve', directDebitController.retrievePayment);
directDebitRoutes.put('/:paymentId/control', directDebitController.controlPayment);
directDebitRoutes.post('/:paymentId/exchange', directDebitController.exchangePayment);

// Query endpoints
directDebitRoutes.get('/', directDebitController.queryPayments);

router.use('/direct-debit', directDebitRoutes);

// Domestic Wire Transfer Routes
const domesticWireRoutes = Router();

// BIAN Standard Operations for Domestic Wire Transfers
domesticWireRoutes.post('/initiate', domesticWireController.initiatePayment);
domesticWireRoutes.put('/:paymentId/update', domesticWireController.updatePayment);
domesticWireRoutes.post('/:paymentId/request', domesticWireController.requestPayment);
domesticWireRoutes.get('/:paymentId/retrieve', domesticWireController.retrievePayment);
domesticWireRoutes.put('/:paymentId/control', domesticWireController.controlPayment);
domesticWireRoutes.post('/:paymentId/exchange', domesticWireController.exchangePayment);

// Query endpoints
domesticWireRoutes.get('/', domesticWireController.queryPayments);

router.use('/domestic-wires', domesticWireRoutes);

// International Wire Transfer Routes
const internationalWireRoutes = Router();

// BIAN Standard Operations for International Wire Transfers
internationalWireRoutes.post('/initiate', internationalWireController.initiatePayment);
internationalWireRoutes.put('/:paymentId/update', internationalWireController.updatePayment);
internationalWireRoutes.post('/:paymentId/request', internationalWireController.requestPayment);
internationalWireRoutes.get('/:paymentId/retrieve', internationalWireController.retrievePayment);
internationalWireRoutes.put('/:paymentId/control', internationalWireController.controlPayment);
internationalWireRoutes.post('/:paymentId/exchange', internationalWireController.exchangePayment);

// Query endpoints
internationalWireRoutes.get('/', internationalWireController.queryPayments);

router.use('/international-wires', internationalWireRoutes);

// Health check and service information endpoints
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      serviceDomain: 'Payment Initiation',
      version: '1.0.0',
      bianCompliant: true,
      supportedPaymentTypes: [
        'NPP_INSTANT',
        'NPP_PAYID',
        'BECS_DIRECT_ENTRY',
        'BPAY_PAYMENT',
        'DIRECT_DEBIT',
        'DOMESTIC_WIRE',
        'INTERNATIONAL_WIRE'
      ],
      implementedPaymentTypes: [
        'NPP_INSTANT',
        'NPP_PAYID',
        'BECS_DIRECT_ENTRY',
        'BPAY_PAYMENT',
        'DIRECT_DEBIT',
        'DOMESTIC_WIRE',
        'INTERNATIONAL_WIRE'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

router.get('/service-info', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      serviceInstanceId: 'AUS-BANK-PI-001',
      serviceDomainVersion: '12.0.0',
      bianStandardVersion: 'v12.0.0',
      complianceLevel: 'FULL',
      supportedOperations: [
        'INITIATE',
        'UPDATE',
        'REQUEST',
        'RETRIEVE',
        'CONTROL',
        'EXCHANGE'
      ],
      australianPaymentSystems: {
        npp: 'New Payments Platform - Real-time payments',
        becs: 'Bulk Electronic Clearing System - Batch payments',
        bpay: 'BPAY - Bill payment system',
        directDebit: 'Direct Debit - Recurring payments',
        domesticWire: 'Domestic Wire Transfers - High value payments',
        internationalWire: 'International Wire Transfers - Cross-border payments'
      }
    },
    timestamp: new Date().toISOString()
  });
});

export default router;