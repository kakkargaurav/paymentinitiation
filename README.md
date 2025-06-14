# Australian Bank Payment Initiation API

A BIAN-compliant payment initiation API for Australian banking systems, supporting all major Australian payment types including NPP, BECS, BPAY, Direct Debit, and Wire Transfers.

## 🏗️ Architecture

Built following **Banking Industry Architecture Network (BIAN)** standards v12.0.0, implementing the **Payment Initiation** service domain with full compliance.

### Supported Payment Types

- **NPP (New Payments Platform)** - Real-time instant payments with PayID support
- **BECS (Bulk Electronic Clearing System)** - Batch direct entry payments
- **BPAY** - Australian bill payment system
- **Direct Debit** - Recurring payment collections
- **Domestic Wire Transfers** - High-value same-day settlements
- **International Wire Transfers** - Cross-border SWIFT payments

### BIAN Operations

Each payment type supports the full BIAN operation set:

- **Initiate** - Create new payment instructions
- **Update** - Modify payment details before processing
- **Request** - Submit payments for processing/authorization
- **Retrieve** - Get payment status and details
- **Control** - Cancel, suspend, or resume payments
- **Exchange** - Handle external system communications

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker (optional)
- TypeScript knowledge

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd tsapi
npm install
```

2. **Development mode:**
```bash
npm run dev
```

3. **Production build:**
```bash
npm run build
npm start
```

4. **Docker deployment:**
```bash
# Production
docker-compose up payment-api

# Development with hot reload
docker-compose --profile dev up payment-api-dev
```

## 📡 API Endpoints

### Base URL
```
http://localhost:3232/payment-initiation
```

### NPP Payments

#### Initiate NPP Payment
```http
POST /npp-payments/initiate
Content-Type: application/json

{
  "paymentInstructionType": "NPP_INSTANT",
  "paymentInstructionAmount": {
    "amount": "100.00",
    "currency": "AUD"
  },
  "paymentMechanism": "NPP",
  "debitAccount": {
    "accountIdentification": "123456789",
    "bankCode": "123-456",
    "accountName": "John Doe"
  },
  "creditAccount": {
    "accountIdentification": "987654321",
    "bankCode": "654-321",
    "accountName": "Jane Smith"
  },
  "paymentPurpose": "Payment for services",
  "remittanceInformation": "Invoice #12345",
  "nppData": {
    "paymentCategory": "INSTANT_PAYMENT",
    "urgency": "NORMAL"
  }
}
```

#### Initiate NPP PayID Payment
```http
POST /npp-payments/initiate
Content-Type: application/json

{
  "paymentInstructionType": "NPP_PAYID",
  "paymentInstructionAmount": {
    "amount": "50.00",
    "currency": "AUD"
  },
  "paymentMechanism": "NPP",
  "debitAccount": {
    "accountIdentification": "123456789",
    "bankCode": "123-456"
  },
  "creditAccount": {
    "accountIdentification": "",
    "accountName": ""
  },
  "payIdDetails": {
    "payIdType": "EMAIL",
    "payIdValue": "recipient@example.com"
  },
  "remittanceInformation": "Coffee payment",
  "nppData": {
    "paymentCategory": "PAYID_PAYMENT",
    "urgency": "HIGH"
  }
}
```

#### Update Payment
```http
PUT /npp-payments/{paymentId}/update
Content-Type: application/json

{
  "paymentInstructionAmount": {
    "amount": "150.00",
    "currency": "AUD"
  },
  "remittanceInformation": "Updated payment reference"
}
```

#### Submit for Processing
```http
POST /npp-payments/{paymentId}/request
Content-Type: application/json

{
  "requestType": "PROCESS",
  "requestDescription": "Submit payment for immediate processing"
}
```

#### Retrieve Payment Status
```http
GET /npp-payments/{paymentId}/retrieve
```

#### Control Payment
```http
PUT /npp-payments/{paymentId}/control
Content-Type: application/json

{
  "controlActionType": "CANCEL",
  "controlActionDescription": "Customer requested cancellation",
  "controlActionReason": "Duplicate payment"
}
```

#### Query Payments
```http
GET /npp-payments?status=COMPLETED&limit=10&offset=0
```

### Other Payment Types

The following payment types follow the same BIAN operation pattern but are currently returning `501 Not Implemented`:

- `/becs-payments/*` - BECS Direct Entry payments
- `/bpay-payments/*` - BPAY bill payments  
- `/direct-debit/*` - Direct debit collections
- `/domestic-wires/*` - Domestic wire transfers
- `/international-wires/*` - International wire transfers

## 🧪 Test Scenarios

The API includes predefined test scenarios for demonstrating various payment outcomes:

### Get Available Test Scenarios
```http
GET /npp-payments/test-scenarios
```

### Generate Test Data
```http
POST /npp-payments/test-scenarios/0/generate
```

### Predefined Test Conditions

| Condition | Expected Result |
|-----------|----------------|
| Amount < $100 | ✅ Instant success |
| Account ending in `0000` | ✅ Always successful |
| PayID ending in `@success.com` | ✅ NPP success |
| Amount = $999.99 | ❌ Insufficient funds |
| Account ending in `1111` | ❌ Invalid account |
| Amount > $10,000 | ⏳ Requires manual approval |
| PayID ending in `@fail.com` | ❌ PayID resolution failure |
| Country = `BLOCKED` | ❌ Compliance failure |

## 🔒 Response Format

All API responses follow a consistent BIAN-compliant format:

### Success Response
```json
{
  "success": true,
  "data": {
    "paymentInstructionReference": "AUS-BANK-PI-001-NPP-...",
    "paymentInstructionInstanceReference": "uuid-v4",
    "paymentInstruction": { ... }
  },
  "correlationId": "req_abc123",
  "timestamp": "2023-12-06T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "errors": [
    {
      "errorCode": "INSUFFICIENT_FUNDS",
      "errorDescription": "Insufficient funds in account",
      "errorPath": "paymentInstructionAmount"
    }
  ],
  "correlationId": "req_abc123",
  "timestamp": "2023-12-06T10:30:00.000Z"
}
```

## 🏥 Health & Monitoring

### Health Check
```http
GET /health
```

### Service Information
```http
GET /payment-initiation/service-info
```

### API Documentation
```http
GET /api-docs
```

## 🐳 Docker Usage

### Build and Run
```bash
# Build image
docker build -t australian-payment-api .

# Run container
docker run -p 3232:3232 australian-payment-api

# Using Docker Compose
docker-compose up
```

### Development with Docker
```bash
# Run with hot reload
docker-compose --profile dev up payment-api-dev
```

## 🛠️ Development

### Project Structure
```
src/
├── models/
│   ├── bian/                 # BIAN standard models
│   └── australian-payments/  # Australian payment specific models
├── services/
│   ├── bian/                 # BIAN service implementations
│   └── payment-handlers/     # Payment type handlers
├── controllers/              # Express route controllers
├── routes/                   # API route definitions
├── middleware/              # Express middleware
├── utils/                   # Utility functions
├── config/                  # Configuration management
└── app.ts                   # Main application
```

### Environment Variables
```bash
NODE_ENV=development
PORT=3232
HOST=localhost
API_VERSION=v1
LOG_LEVEL=info
CORS_ORIGIN=*
BIAN_SERVICE_INSTANCE_ID=AUS-BANK-PI-001
```

### Scripts
```bash
npm run dev        # Development with hot reload
npm run build      # Build TypeScript
npm start          # Start production server
npm test           # Run tests
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
```

## 🌏 Australian Banking Context

### NPP (New Payments Platform)
- Real-time payments 24/7/365
- PayID alias resolution (email, mobile, ABN)
- ISO 20022 messaging
- Maximum $1M per transaction

### BECS (Bulk Electronic Clearing System)
- Batch processing for direct entry
- Same-day and next-day settlement
- CEMTEX and Direct Entry file formats
- Bulk file processing

### BPAY
- Australia's bill payment system
- 6-digit biller codes
- Customer reference number validation
- Real-time and batch processing

### BSB (Bank State Branch) Validation
- Format: `XXX-XXX` (6 digits with hyphen)
- Bank identification for Australian accounts
- Required for domestic transfers

## 🏛️ BIAN Compliance

This API is fully compliant with BIAN v12.0.0 standards:

- **Service Domain**: Payment Initiation
- **Behavioral Qualification**: Initiate, Update, Request, Retrieve, Control, Exchange
- **Business Object Model**: Payment Instruction
- **Data Architecture**: ISO 20022 compatible
- **Error Handling**: Standardized error codes and messages

## 📚 API Testing Collections

Ready-to-import collections for comprehensive API testing:

### Postman Collection
- **File**: `postman-collection.json`
- **Features**:
  - Complete collection with all payment types (NPP, BECS, BPAY, Direct Debit, Wire Transfers)
  - Pre-configured environment variables (`baseUrl`, `apiBasePath`)
  - Automatic correlation ID generation using `{{$randomUUID}}`
  - Built-in test scripts for response validation
  - Success/failure scenario examples

### Insomnia Collection
- **File**: `insomnia-collection.json`
- **Features**:
  - Full endpoint coverage for Insomnia REST client
  - Organized folder structure by payment type
  - Environment setup with base configuration
  - UUID generation for correlation IDs

### HTTP Test File
- **File**: `test-api.http`
- **Features**:
  - Visual Studio Code REST Client format
  - Quick testing scenarios
  - Pre-defined test data

### Import Instructions

**Postman:**
1. Open Postman
2. Click "Import" → "Upload Files"
3. Select `postman-collection.json`
4. Collection will be imported with environment variables

**Insomnia:**
1. Open Insomnia
2. Go to Application → Import Data
3. Select `insomnia-collection.json`
4. Workspace will be created with all requests

**VS Code:**
1. Install "REST Client" extension
2. Open `test-api.http`
3. Click "Send Request" above any request

## 🔗 Integration Examples

### cURL Examples

**Initiate NPP Payment:**
```bash
curl -X POST http://localhost:3232/payment-initiation/npp-payments/initiate \
  -H "Content-Type: application/json" \
  -H "X-Correlation-ID: test-001" \
  -d '{
    "paymentInstructionType": "NPP_INSTANT",
    "paymentInstructionAmount": {"amount": "100.00", "currency": "AUD"},
    "paymentMechanism": "NPP",
    "debitAccount": {"accountIdentification": "123456789", "bankCode": "123-456"},
    "creditAccount": {"accountIdentification": "987654321", "bankCode": "654-321"},
    "remittanceInformation": "Test payment"
  }'
```

**Check Payment Status:**
```bash
curl -X GET http://localhost:3232/payment-initiation/npp-payments/{paymentId}/retrieve \
  -H "X-Correlation-ID: test-002"
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 🆘 Support

For questions or issues:
- Check the API documentation at `/api-docs`
- Review test scenarios at `/npp-payments/test-scenarios`
- Check health status at `/health`
- Review service info at `/payment-initiation/service-info`