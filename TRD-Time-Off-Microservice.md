# TRD - Time Off Microservice

## Goal

Provide a resilient microservice for time-off requests with:

- idempotent request creation
- real-time HCM balance validation
- SQLite persistence for take-home simplicity
- sync and webhook ingestion for HCM balance updates

## Architecture

- Framework: NestJS
- Persistence: SQLite via TypeORM
- HTTP client: Nest HttpModule (axios)
- Test strategy:
  - Unit tests for core service behavior
  - E2E tests with SQLite and an in-process mock HCM server

## Modules

### TimeOff module

Endpoints:

- POST /time-off/requests
- GET /time-off/balances?employeeId=...

Responsibilities:

- enforce idempotency via unique constraint on employeeId + idempotencyKey
- validate requested days against HCM real-time balance
- return 409 on insufficient balance
- return 503 when HCM is unavailable

### Sync module

Endpoints:

- POST /sync/hcm/balances
- POST /webhook/hcm-update

Responsibilities:

- batch upsert balance corpus
- single-record webhook upsert

### HCM client module

Responsibilities:

- call GET /hcm/balances?employeeId=...&locationId=...
- apply basic exponential backoff retries for transient errors
- enforce timeout
- surface unavailability as a domain error mapped to HTTP 503

## Data Model

Core entities:

- Employee
- Location
- TimeOffBalance
- TimeOffRequest

Constraints:

- TimeOffBalance unique(employeeId, locationId)
- TimeOffRequest unique(employeeId, idempotencyKey)

## Idempotency

For POST /time-off/requests:

1. Require idempotencyKey
2. Query existing request by employeeId + idempotencyKey
3. If found, return existing request unchanged
4. Otherwise validate against HCM and create request

This guarantees safe retries from callers without duplicate writes.

## Error Handling

- 409 Conflict: requested days exceed available HCM balance
- 503 Service Unavailable: HCM validation cannot be completed
- 400 Bad Request: missing idempotency key

## Test Design

Unit tests cover:

- idempotency behavior
- happy path submission
- insufficient balance path
- HCM unavailable path

E2E tests cover:

- happy path request creation
- insufficient balance 409
- idempotency returns same request
- webhook update path
- batch sync upsert path
- HCM error and timeout leading to 503

The mock HCM server supports:

- GET /hcm/balances
- POST /hcm/admin/set-balance
- POST /hcm/admin/set-mode
- POST /hcm/admin/reset

## Runtime Notes

Environment variables:

- DB_PATH (default data.sqlite)
- HCM_BASE_URL (default http://localhost:4100)
- HCM_TIMEOUT_MS (default 1500)
- HCM_MAX_RETRIES (default 3)

SQLite file is excluded from source control through .gitignore.
