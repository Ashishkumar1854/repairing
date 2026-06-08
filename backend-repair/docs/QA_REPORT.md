# ERP Stabilization QA Report

## 2026-06-01 Backend Readiness Sprint Update

This sprint completed the previously blocked runtime stabilization work.

### Completed

| Area | Result |
| --- | --- |
| Route hygiene refactor | Passed |
| Duplicate root route mounts removed | Passed |
| Scoped route loading | Passed |
| Prisma validation | Passed |
| Jest/Supertest integration suite | Passed, 8/8 |
| Docker build | Passed |
| Docker compose up/restart | Passed |
| API health check | Passed |
| PostgreSQL container health | Healthy |
| Redis container health | Healthy |

### Runtime Coverage Added

The automated integration suite now covers:

- Auth login, current user, refresh, and logout.
- Repair ticket creation.
- Technician assignment.
- Estimate creation and approval.
- Technician ownership enforcement.
- Parts consumption.
- Insufficient stock rollback verification.
- Invoice creation.
- Partial payment, final payment, and overpayment rejection.
- Customer ledger entry verification.
- Custody handover history and current custody.
- Vendor dispatch, vendor status update, and vendor receive.
- Tenant isolation across ticket, inventory, invoice, assignment, vendor job, and analytics boundaries.
- RBAC denial checks for technician, accountant, and front-desk restricted actions.

### Remaining Risks After This Sprint

- The integration suite is now present, but deeper concurrency tests for simultaneous stock deduction should still be added before public beta.
- Top-level placeholder modules remain intentionally unimplemented: `business`, `staff`, `notifications`, and `integrations`.
- The Postman collection is hardened at collection level; endpoint-specific scripts can still be expanded over time.

## Scope

This pass covers the backend foundation completed through Phase 10:

- Auth and RBAC
- Repair workflow engine
- Estimate and approval system
- Inventory and parts consumption
- Technician assignment ownership
- Billing, payments, and customer ledger
- Analytics and BI aggregation
- Handover and chain-of-custody ledger

The goal was stabilization, not feature expansion.

## Verification Performed

### Static And Structural Checks

| Area | Result |
| --- | --- |
| Prisma schema validation | Passed |
| Route tree loading | Passed |
| Module syntax checks | Passed |
| Postman collection JSON | Passed |
| Postman environment JSON | Passed |
| Repository/service/controller layering review | Passed with one fix |

### Runtime Verification Status

Full database-backed runtime QA was prepared but blocked because Docker was not
running in the local environment during this pass.

Observed blocker:

```text
Cannot connect to the Docker daemon at unix:///Users/ashishkumar/.docker/run/docker.sock.
```

Because PostgreSQL on `localhost:5433` was unavailable, the full ERP scenario
script could not complete in this session. The script path was exercised until
database connection, and should be rerun after Docker is started.

## Tested Flow Plan

The prepared full ERP flow covers:

1. Customer intake
2. Repair ticket creation
3. Technician assignment
4. Reception-to-technician custody handover
5. Diagnosis and estimate creation
6. Estimate approval
7. Parts consumption
8. Repair completion
9. Technician-to-reception custody handover
10. Invoice generation
11. Partial payment
12. Final payment
13. Customer delivery handover
14. Ledger verification
15. Analytics validation

Additional prepared scenarios:

- Estimate rejection flow
- Vendor handover preparation flow
- Insufficient stock rollback flow
- Unauthorized technician operation blocking
- Cross-tenant access blocking
- Overpayment blocking

## Issues Found And Fixed

### Inventory Opening Stock Bug

Issue:

`src/modules/inventory/repository.js` attempted to create a
`repairTechnicianActivityLog` during inventory item creation using undefined
variables:

- `ticketId`
- `part`
- `usage`
- `consumed`

Impact:

Creating an inventory item with opening stock would fail at runtime.

Fix:

Removed the incorrect technician activity write from inventory item creation.
Opening stock now creates only an immutable `inventory_stock_movements` row.
Repair technician activity remains tied to actual repair parts consumption.

## Tenant Isolation Verification

Repository review confirmed tenant scoping is consistently applied to the core
ERP modules:

- Repair tickets use `businessId` in reads and mutations.
- Estimates use `businessId` for ticket, estimate, status, and audit operations.
- Inventory item and consumption operations use `businessId`.
- Billing invoice, payment, and ledger operations use `businessId`.
- Assignment and technician queue operations use `businessId`.
- Handover operations use `businessId` for tickets, staff, vendors, and ledger reads.
- Analytics aggregation queries include `business_id` filters.

Runtime cross-tenant blocking remains to be rerun after Docker/PostgreSQL is
available.

## RBAC Verification

Route review confirmed role gates exist for:

- Authenticated repair operations
- Assignment management
- Inventory control and parts consumption
- Billing and payment operations
- Analytics visibility
- Handover management and read-only visibility

Operational ownership enforcement exists for technician-sensitive operations:

- Parts consumption
- Repair status updates
- Technician handovers

Runtime blocked-action checks remain to be rerun after Docker/PostgreSQL is
available.

## Financial Integrity Verification

Reviewed controls:

- Payment amount must be positive.
- Overpayment is blocked before and inside transactional collection.
- Invoice totals are calculated on the backend.
- Payments update invoice paid/due amounts transactionally.
- Customer ledger entries are append-only.
- Financial audit logs are append-only.

Runtime payment and ledger verification remains to be rerun after
Docker/PostgreSQL is available.

## Inventory Safety Verification

Reviewed controls:

- Stock deduction is transactional.
- Inventory item ownership is tenant-scoped.
- Inactive items are rejected.
- Negative stock is blocked.
- Deduction uses `updateMany` with `stockQuantity >= consumed` to reduce race risk.
- Movement logs are written inside the same transaction.

Runtime rollback verification remains to be rerun after Docker/PostgreSQL is
available.

## Workflow And Custody Verification

Reviewed controls:

- Repair status transitions use the workflow engine.
- Status logs are immutable.
- Assignment history is preserved.
- Handover history is append-only.
- Current custody is separated from historical custody.
- Technician handovers require assignment unless manager-level override applies.

Runtime custody and invalid-transfer checks remain to be rerun after
Docker/PostgreSQL is available.

## API Contract Verification

Postman was hardened with collection-level tests for:

- `success`
- `message`
- success boolean matching 2xx/4xx status class
- no unexpected 5xx during manual QA

The collection now also extracts:

- `accessToken`
- `refreshToken`
- `ticketId`
- `estimateId`
- `inventoryItemId`
- `invoiceId`
- `customerId`
- `vendorId`
- `staffId`

## Performance And Query Notes

Current observations:

- Tenant-first indexes exist across high-volume operational tables.
- Analytics uses read-only aggregation queries.
- Inventory low-stock filtering currently loads matching items then filters in application memory.
- Some dashboard analytics can become heavy as data grows.

Future optimizations:

- Redis caching for dashboard endpoints.
- Materialized views for profitability and SLA dashboards.
- Pagination for large handover and audit histories.
- Additional compound indexes based on production query plans.

## Unresolved Risks

- Runtime full-flow QA is blocked until Docker/PostgreSQL is running.
- No automated test harness exists yet.
- Concurrency tests for inventory deduction need repeatable automated coverage.
- Ledger balance verification should become an automated invariant test.
- Analytics correctness should be verified against seeded deterministic fixtures.
- Observability should be expanded with request metrics and business-event counters.

## Stabilization Status

The codebase passed static stabilization checks and one runtime defect was fixed.
Database-backed ERP verification is pending because local Docker was unavailable.

Recommendation:

- Start Docker.
- Rerun migration/seed.
- Execute the Postman QA sequence.
- Rerun the prepared service-level ERP smoke flow.
- Proceed to Phase 11 only after runtime QA passes.
