# Time Off Microservice

NestJS microservice that supports time-off request submission with idempotency, SQLite persistence, HCM sync endpoints, and real-time HCM balance validation.

## Prerequisites

- Node.js 18+
- npm

## Install

```bash
npm ci
```

## Run

```bash
npm run start:dev
```

Default base URL: http://localhost:3000

## Test

```bash
npm test
npm run test:e2e
npm run test:cov
```

## Environment Variables

- DB_PATH: SQLite database file path (default: data.sqlite)
- HCM_BASE_URL: mock or real HCM base URL (default: http://localhost:4100)
- HCM_TIMEOUT_MS: HCM request timeout in ms (default: 1500)
- HCM_MAX_RETRIES: retry count for transient HCM failures (default: 3)

## API Endpoints

### Time Off

- POST /time-off/requests
- GET /time-off/balances?employeeId=EMP_ID

POST /time-off/requests example body:

```json
{
  "employeeId": "emp-1",
  "locationId": "loc-1",
  "daysRequested": 2,
  "idempotencyKey": "request-123"
}
```

Behavior:

- idempotencyKey is required
- repeated employeeId + idempotencyKey returns same request
- validates balance against HCM in real-time
- returns 409 if insufficient balance
- returns 503 if HCM validation is unavailable

### Sync

- POST /sync/hcm/balances
- POST /webhook/hcm-update

POST /sync/hcm/balances example body:

```json
{
  "balances": [
    { "employeeId": "emp-1", "locationId": "loc-1", "availableDays": 8 },
    { "employeeId": "emp-1", "locationId": "loc-2", "availableDays": 4 }
  ]
}
```

POST /webhook/hcm-update example body:

```json
{
  "employeeId": "emp-1",
  "locationId": "loc-1",
  "availableDays": 9
}
```

## Documentation

- Technical design: TRD-Time-Off-Microservice.md
- ERD: ERD.md
