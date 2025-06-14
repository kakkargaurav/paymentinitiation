/**
 * Application Configuration
 * Central configuration management for the payment API
 */

export interface AppConfig {
  server: ServerConfig;
  api: ApiConfig;
  logging: LoggingConfig;
  cors: CorsConfig;
  security: SecurityConfig;
  payments: PaymentConfig;
  bian: BianConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  nodeEnv: string;
  healthCheckPath: string;
  shutdownTimeoutMs: number;
}

export interface ApiConfig {
  version: string;
  basePath: string;
  title: string;
  description: string;
  docsPath: string;
  rateLimiting: RateLimitConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

export interface LoggingConfig {
  level: string;
  format: string;
  colorize: boolean;
  timestamp: boolean;
  maxsize: number;
  maxFiles: number;
  dirname: string;
  filename: string;
}

export interface CorsConfig {
  origin: string | string[] | boolean;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
}

export interface SecurityConfig {
  helmet: {
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean;
    xssFilter: boolean;
  };
}

export interface PaymentConfig {
  limits: PaymentLimitsConfig;
  timeout: PaymentTimeoutConfig;
  retry: PaymentRetryConfig;
  validation: PaymentValidationConfig;
}

export interface PaymentLimitsConfig {
  npp: {
    maxAmount: number;
    minAmount: number;
    dailyLimit: number;
    monthlyLimit: number;
  };
  becs: {
    maxAmount: number;
    minAmount: number;
    maxBatchSize: number;
    dailyLimit: number;
  };
  bpay: {
    maxAmount: number;
    minAmount: number;
    dailyLimit: number;
  };
  directDebit: {
    maxAmount: number;
    minAmount: number;
    monthlyLimit: number;
  };
  domesticWire: {
    maxAmount: number;
    minAmount: number;
    dailyLimit: number;
  };
  internationalWire: {
    maxAmount: number;
    minAmount: number;
    dailyLimit: number;
    requiresManualApproval: number;
  };
}

export interface PaymentTimeoutConfig {
  npp: number;
  becs: number;
  bpay: number;
  directDebit: number;
  domesticWire: number;
  internationalWire: number;
}

export interface PaymentRetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface PaymentValidationConfig {
  validateBsb: boolean;
  validatePayId: boolean;
  validateBpayReference: boolean;
  validateInternationalCodes: boolean;
  strictValidation: boolean;
}

export interface BianConfig {
  serviceInstanceId: string;
  serviceDomainVersion: string;
  standardVersion: string;
  complianceLevel: string;
  correlationIdHeader: string;
  timestampFormat: string;
}

// Default configuration
const defaultConfig: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '3232', 10),
    host: process.env.HOST || (process.env.NODE_ENV === 'production' ? 'paymentinitiation.codecrushers.club' : 'localhost'),
    nodeEnv: process.env.NODE_ENV || 'development',
    healthCheckPath: '/health',
    shutdownTimeoutMs: 10000,
  },
  api: {
    version: process.env.API_VERSION || 'v1',
    basePath: '/payment-initiation',
    title: 'Australian Bank Payment Initiation API',
    description: 'BIAN-compliant payment initiation API for Australian banking systems',
    docsPath: '/api-docs',
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    colorize: process.env.NODE_ENV === 'development',
    timestamp: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    dirname: './logs',
    filename: 'payment-api.log',
  },
  cors: {
    origin: process.env.CORS_ORIGIN === '*' ? true : (process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://paymentinitiation.codecrushers.club' : 'http://localhost:3232')),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Correlation-ID',
      'X-Request-ID',
      'X-API-Version',
    ],
    exposedHeaders: [
      'X-Correlation-ID',
      'X-Request-ID',
      'X-Rate-Limit-Remaining',
      'X-Rate-Limit-Reset',
    ],
    maxAge: 86400, // 24 hours
  },
  security: {
    helmet: {
      contentSecurityPolicy: false, // Disabled for API
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      dnsPrefetchControl: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: true,
      xssFilter: true,
    },
  },
  payments: {
    limits: {
      npp: {
        maxAmount: 1000000, // $1M AUD
        minAmount: 0.01,
        dailyLimit: 10000000, // $10M AUD
        monthlyLimit: 100000000, // $100M AUD
      },
      becs: {
        maxAmount: 99999999.99,
        minAmount: 0.01,
        maxBatchSize: 10000,
        dailyLimit: 999999999.99,
      },
      bpay: {
        maxAmount: 999999.99,
        minAmount: 0.01,
        dailyLimit: 50000000, // $50M AUD
      },
      directDebit: {
        maxAmount: 999999.99,
        minAmount: 0.01,
        monthlyLimit: 50000000, // $50M AUD
      },
      domesticWire: {
        maxAmount: 999999999.99,
        minAmount: 1.00,
        dailyLimit: 999999999.99,
      },
      internationalWire: {
        maxAmount: 999999999.99,
        minAmount: 1.00,
        dailyLimit: 999999999.99,
        requiresManualApproval: 1000000, // $1M AUD
      },
    },
    timeout: {
      npp: 30000, // 30 seconds
      becs: 60000, // 1 minute
      bpay: 45000, // 45 seconds
      directDebit: 60000, // 1 minute
      domesticWire: 120000, // 2 minutes
      internationalWire: 300000, // 5 minutes
    },
    retry: {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
    },
    validation: {
      validateBsb: true,
      validatePayId: true,
      validateBpayReference: true,
      validateInternationalCodes: true,
      strictValidation: process.env.NODE_ENV === 'production',
    },
  },
  bian: {
    serviceInstanceId: process.env.BIAN_SERVICE_INSTANCE_ID || 'AUS-BANK-PI-001',
    serviceDomainVersion: '12.0.0',
    standardVersion: 'v12.0.0',
    complianceLevel: 'FULL',
    correlationIdHeader: 'X-Correlation-ID',
    timestampFormat: 'ISO8601',
  },
};

export const getConfig = (): AppConfig => {
  return defaultConfig;
};

export const getServerConfig = (): ServerConfig => {
  return defaultConfig.server;
};

export const getApiConfig = (): ApiConfig => {
  return defaultConfig.api;
};

export const getPaymentConfig = (): PaymentConfig => {
  return defaultConfig.payments;
};

export const getBianConfig = (): BianConfig => {
  return defaultConfig.bian;
};

export default defaultConfig;