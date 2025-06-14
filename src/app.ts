/**
 * Main Application
 * Express.js application for Australian Bank Payment Initiation API
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import paymentRoutes from './routes/payment-initiation.routes';
import { getConfig } from './config/app.config';
import { getEnvVar, getEnvVarAsNumber } from './utils/env.util';

// Initialize configuration
const config = getConfig();

// Create Express application
const app: Application = express();

// Trust proxy for proper IP handling behind load balancers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet(config.security.helmet));

// CORS middleware
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.server.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Request correlation ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] as string || 
                       req.headers['x-request-id'] as string ||
                       generateCorrelationId();
  
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-API-Version', config.api.version);
  
  next();
});

// API version middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Add API version to all responses
  res.setHeader('X-API-Version', config.api.version);
  next();
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: config.api.title,
      description: config.api.description,
      version: config.api.version,
      bianCompliant: true,
      serviceDomain: 'Payment Initiation',
      endpoints: {
        health: '/health',
        serviceInfo: `${config.api.basePath}/service-info`,
        documentation: config.api.docsPath,
        nppPayments: `${config.api.basePath}/npp-payments`,
        becsPayments: `${config.api.basePath}/becs-payments`,
        bpayPayments: `${config.api.basePath}/bpay-payments`,
        directDebit: `${config.api.basePath}/direct-debit`,
        domesticWires: `${config.api.basePath}/domestic-wires`,
        internationalWires: `${config.api.basePath}/international-wires`
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const healthCheck = {
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: config.server.nodeEnv,
      version: config.api.version,
      serviceDomain: 'Payment Initiation',
      bianCompliance: {
        version: config.bian.serviceDomainVersion,
        standardVersion: config.bian.standardVersion,
        complianceLevel: config.bian.complianceLevel
      },
      checks: {
        database: 'healthy', // In-memory store is always healthy
        paymentSystems: {
          npp: 'available',
          becs: 'simulated',
          bpay: 'simulated',
          directDebit: 'simulated',
          domesticWire: 'simulated',
          internationalWire: 'simulated'
        }
      }
    },
    correlationId: req.correlationId,
    timestamp: new Date().toISOString()
  };

  res.status(200).json(healthCheck);
});

// API Documentation
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../docs/api-specification.yaml'));
  app.use(config.api.docsPath, swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'Australian Bank Payment API',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      tryItOutEnabled: true
    }
  }));
} catch (error) {
  console.warn('API documentation not available. Create docs/api-specification.yaml for Swagger UI.');
  
  // Fallback documentation endpoint
  app.get(config.api.docsPath, (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        message: 'API documentation is not available',
        suggestion: 'Create docs/api-specification.yaml for detailed API documentation',
        availableEndpoints: {
          health: '/health',
          serviceInfo: `${config.api.basePath}/service-info`,
          nppPayments: `${config.api.basePath}/npp-payments`,
          testScenarios: `${config.api.basePath}/npp-payments/test-scenarios`
        }
      },
      timestamp: new Date().toISOString()
    });
  });
}

// Mount payment routes
app.use(config.api.basePath, paymentRoutes);

// 404 handler for unknown routes
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    errors: [{
      errorCode: 'ROUTE_NOT_FOUND',
      errorDescription: `Route ${req.originalUrl} not found`,
      errorPath: req.originalUrl
    }],
    correlationId: req.correlationId,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Unhandled error:', error);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      errors: [{
        errorCode: 'VALIDATION_ERROR',
        errorDescription: error.message
      }],
      correlationId: req.correlationId,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (error.name === 'SyntaxError' && 'body' in error) {
    res.status(400).json({
      success: false,
      errors: [{
        errorCode: 'INVALID_JSON',
        errorDescription: 'Invalid JSON in request body'
      }],
      correlationId: req.correlationId,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Generic error response
  res.status(500).json({
    success: false,
    errors: [{
      errorCode: 'INTERNAL_SERVER_ERROR',
      errorDescription: config.server.nodeEnv === 'production' 
        ? 'An internal server error occurred' 
        : error.message
    }],
    correlationId: req.correlationId,
    timestamp: new Date().toISOString()
  });
});

// Helper function to generate correlation ID
function generateCorrelationId(): string {
  return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server if this file is executed directly
if (require.main === module) {
  const port = config.server.port;
  const host = config.server.host;

  const server = app.listen(port, host, () => {
    console.log(`🚀 Australian Bank Payment API is running`);
    console.log(`📍 Server: http://${host}:${port}`);
    console.log(`📚 API Docs: http://${host}:${port}${config.api.docsPath}`);
    console.log(`💳 Payment Endpoints: http://${host}:${port}${config.api.basePath}`);
    console.log(`🏥 Health Check: http://${host}:${port}/health`);
    console.log(`🌍 Environment: ${config.server.nodeEnv}`);
    console.log(`📋 BIAN Version: ${config.bian.serviceDomainVersion}`);
    console.log(`🇦🇺 Australian Payment Systems: NPP, BECS, BPAY, Direct Debit, Wire Transfers`);
  });

  // Handle server errors
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use`);
    } else {
      console.error(`❌ Server error:`, error);
    }
    process.exit(1);
  });
}

// Extend Express Request interface to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export default app;