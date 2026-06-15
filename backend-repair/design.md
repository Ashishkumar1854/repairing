# backend-repair Engineering Design

## 1. Project Overview

`backend-repair` is the backend service for a production-grade Repair ERP / Repair SaaS platform. It manages the complete operational lifecycle of repair jobs for businesses that receive, diagnose, estimate, repair, outsource, bill, and hand over customer devices or assets.

The platform is designed as a multi-tenant SaaS backend where each repair business operates in an isolated business context while sharing the same infrastructure, codebase, and operational platform. The long-term vision is to support repair shops, service centers, refurbishing teams, vendor repair networks, and B2B repair workflows from a single extensible backend.

### Repair ERP Vision

The Repair ERP is not only a ticketing system. It is intended to become the operational system of record for repair businesses, covering:

| Capability              | Purpose                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| Repair intake           | Register devices, customer issues, accessories, condition, and ownership context |
| Diagnosis               | Capture technician findings, media, checklists, and issue categorization         |
| Estimate workflow       | Separate quoted cost from actual repair consumption                              |
| Repair execution        | Track assignments, status transitions, parts usage, notes, and internal work     |
| Outsource/vendor repair | Move jobs outside the business with accountability and traceability              |
| Handover                | Maintain audit-safe transfer of custody between staff, vendors, and customers    |
| Payments                | Track repair-specific billing, advances, balances, and settlement state          |
| Audit trail             | Preserve lifecycle history for disputes, compliance, and operational review      |

### Why Repair Is Separated From Inventory

Repair and inventory are related but not the same domain.

Inventory is a stock-control system. It answers questions such as how many parts exist, where they are stored, what their cost is, and how stock moves in or out.

Repair is a workflow and custody system. It answers questions such as who owns the job, what was diagnosed, what was estimated, what was actually used, who handled the item, what status changed, and when the customer received the repaired item.

Keeping repair separate from inventory provides stronger domain boundaries:

- Repair tickets can exist before any stock is consumed.
- Estimates can include labor, vendor charges, optional parts, and customer approval state without affecting stock.
- Actual parts usage can be recorded only when parts are consumed.
- Vendor repair and external repair jobs can progress even when no internal stock is involved.
- Audit history remains focused on the repair lifecycle rather than inventory ledger mechanics.

Inventory will integrate with repair through explicit parts usage and stock reservation workflows, but it should not own the repair lifecycle.

## 2. Core Architecture

`backend-repair` follows a modular monolith architecture. The system is deployed as a single backend application while internally structured around clear domain modules, service boundaries, and repository contracts.

### Modular Monolith

A modular monolith is the correct starting architecture for this platform because it provides production discipline without premature distributed-system complexity. It enables:

- Strong domain separation inside one deployable unit.
- Shared transaction boundaries for workflows such as ticket creation, estimates, status logs, and handover logs.
- Faster development velocity during early product phases.
- Simpler local development, observability, deployment, and debugging.
- A clean path toward service extraction when business scale justifies it.

### Future Microservice Readiness

The module layout is intentionally designed to support future extraction. Domains such as notifications, integrations, vendor repair, queue processing, payments, and inventory can become independent services later if scale or organizational ownership requires it.

Future extraction candidates:

| Candidate Service | Reason for Possible Extraction                                             |
| ----------------- | -------------------------------------------------------------------------- |
| Notifications     | High-volume asynchronous delivery and provider-specific scaling            |
| Integrations      | External API instability, retries, rate limits, and provider isolation     |
| Inventory         | Separate ledger consistency, stock reconciliation, and warehouse workflows |
| Vendor network    | Cross-business interactions and marketplace-style workflows                |
| Queue workers     | Independent scaling for background jobs and long-running tasks             |

### Multi-Tenant Architecture

The platform uses business-level tenancy. Each tenant is represented by a `business_id`, and operational records are scoped to that business. All tenant-owned tables must include `business_id` either directly or through a strict parent relationship that enforces tenant context.

Tenant isolation is a first-class architectural rule, not a UI concern. Authentication, authorization, repository queries, logs, and audit records must all preserve business context.

### Domain-Driven Module Separation

The backend is organized by business domain rather than technical layer alone. Each module owns its route definitions, validation schemas, controller logic, service use cases, and repository access.

Core domains include:

- Authentication and authorization.
- Business/tenant management.
- Customers.
- Staff and permissions.
- Vendors.
- Repair tickets and repair subdomains.
- Inventory integration.
- External integrations.
- Notifications.

## 3. Business Goals

The platform is designed to support real repair operations where custody, accountability, estimation, actual consumption, and customer communication matter.

| Goal                       | Description                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Internal repair workflow   | Track jobs from intake through diagnosis, estimate, assignment, repair, payment, and handover.               |
| Outsource repair           | Allow repair jobs to be sent outside the business while preserving job state, cost, and custody history.     |
| Vendor repair              | Support vendor assignment, vendor estimates, vendor status, external job references, and return handling.    |
| Future B2B repair transfer | Enable one business to transfer repair work to another business in a controlled network.                     |
| Audit-safe lifecycle       | Preserve immutable event history for status changes, handovers, estimates, usage, and ownership transitions. |

The system must support operational confidence. A business should be able to answer who had the item, what changed, who approved it, what was quoted, what was actually used, and why the final bill differs from the original estimate.

## 4. Tech Stack

| Technology | Role                        | Selection Rationale                                                                                                                                   |
| ---------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js    | Runtime                     | Provides high-throughput I/O, a large ecosystem, strong JSON/API ergonomics, and excellent fit for SaaS backends with asynchronous workflows.         |
| Express.js | HTTP framework              | Lightweight, mature, predictable, and easy to structure around explicit routing, middleware, controllers, and services.                               |
| PostgreSQL | Primary database            | Strong relational consistency, transactions, constraints, indexing, JSON support, and mature operational tooling. Ideal for audit-safe ERP workflows. |
| Prisma ORM | Data access                 | Type-safe database client, migration support, clear schema modeling, and improved developer productivity for a Node.js/PostgreSQL stack.              |
| Redis      | Cache and queue backend     | Supports caching, rate limiting, session-adjacent use cases, idempotency keys, distributed locks, and BullMQ job processing.                          |
| Docker     | Runtime packaging           | Provides repeatable local development, predictable deployment artifacts, and environment parity across development, staging, and production.          |
| JWT        | Authentication token format | Stateless API authentication, easy propagation across services, and compatibility with future frontend and mobile clients.                            |
| Zod        | Validation                  | Runtime-safe request validation with composable schemas and TypeScript-ready inference for future type-safe development.                              |
| BullMQ     | Background jobs             | Reliable Redis-backed queue processing for notifications, webhooks, reminders, SLA jobs, reports, and external integration retries.                   |

## 5. Database Design Summary

The database model is centered on tenant-safe repair operations. Tables are designed to preserve business ownership, customer ownership, job lifecycle, financial expectations, actual consumption, custody transfers, and audit history.

### Key Tables

| Table                  | Purpose                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `businesses`           | Represents each tenant/business using the platform. Owns configuration, business identity, and subscription-level context.                       |
| `customers`            | Stores customer profiles scoped to a business, including contact and ownership context for repair jobs.                                          |
| `repair_tickets`       | Primary repair job record. Tracks customer, business, job number, device/item context, current status, priority, source, and lifecycle metadata. |
| `repair_estimates`     | Stores quoted repair costs, labor, expected parts, customer approval state, and estimate validity.                                               |
| `repair_parts_usage`   | Records actual parts consumed during repair execution, linked to inventory where applicable.                                                     |
| `repair_handover_logs` | Records custody movement between customer, staff, vendors, departments, or external parties.                                                     |
| `repair_status_logs`   | Immutable history of repair status transitions, including actor, timestamp, old status, new status, and reason/context.                          |
| `repair_ticket_links`  | Links related repair tickets, split jobs, repeat repairs, warranty claims, rework, or transferred jobs.                                          |

### Estimate Is Not Actual Usage

`repair_estimates` and `repair_parts_usage` must remain separate.

An estimate is a commercial and approval artifact. It represents what the business expects to charge or request approval for before work is completed. It may include labor, expected parts, optional repair paths, vendor charges, taxes, discounts, and customer approval metadata.

Actual usage is an operational and inventory artifact. It records what was truly consumed during execution. It may differ from the estimate because diagnosis changes, parts are unavailable, the customer approves partial work, the technician uses an alternative part, or the vendor changes the repair plan.

This separation allows the platform to support variance reporting:

- Estimated cost vs actual cost.
- Estimated parts vs consumed parts.
- Approved work vs performed work.
- Technician/vendor efficiency.
- Margin analysis per ticket.

### Status Logs Are Separated

The current status on `repair_tickets` is optimized for fast reads and operational filtering. The full lifecycle belongs in `repair_status_logs`.

Separating status logs provides:

- Immutable status history.
- Clear accountability for every transition.
- Better auditability during customer disputes.
- SLA and turnaround-time calculations.
- Workflow analytics without overloading the ticket row.

### Handover Logs Are Mandatory

Repair operations involve physical custody. A repair job can move from customer to front desk, front desk to technician, technician to vendor, vendor back to store, and store back to customer.

`repair_handover_logs` are mandatory because they establish chain of custody. They protect the business and customer by recording:

- Who gave the item.
- Who received the item.
- When the handover occurred.
- What condition/accessories were acknowledged.
- Whether the handover was internal, external, vendor-based, or customer-facing.

No production repair system should rely only on status changes to infer custody.

## 6. Multi-Tenant Design

The platform uses `business_id` as the primary tenant boundary. Every tenant-owned operation must be executed inside an authenticated business context.

### Business ID Isolation

Tenant-owned records must include `business_id` or be reachable through a parent record that includes `business_id`. Repository methods must require business context and include it in query filters.

Examples:

- A customer lookup must filter by `business_id`.
- A repair ticket update must filter by both `id` and `business_id`.
- A status log insert must inherit the ticket's business context.
- A vendor repair job must not be visible across businesses unless explicitly modeled as a future B2B transfer.

### Tenant-Safe Queries

Tenant-safe queries are enforced through repository conventions and service-level guardrails:

- All repository methods accept tenant context.
- Controllers derive tenant context from authenticated identity, not request body.
- Cross-tenant IDs from clients are treated as untrusted input.
- Bulk operations must include tenant filters.
- Background jobs must carry validated tenant context in job payloads.

### Scalability

The initial model supports shared-database multi-tenancy. This is appropriate for early and mid-stage SaaS scale because it simplifies operations and allows efficient shared infrastructure.

Future scaling options include:

- Tenant-based indexes on high-volume tables.
- Read replicas for reporting and dashboards.
- Table partitioning for logs and high-volume repair history.
- Business-tier-based data retention policies.
- Enterprise tenant isolation through dedicated database or schema if required.

## 7. Folder Structure

```text
backend-repair/
├── src/
│   ├── core/
│   │   ├── config/
│   │   ├── database/
│   │   ├── redis/
│   │   ├── queue/
│   │   ├── logger/
│   │   ├── middleware/
│   │   └── utils/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── business/
│   │   ├── customers/
│   │   ├── staff/
│   │   ├── vendors/
│   │   │
│   │   ├── repair/
│   │   │   ├── tickets/
│   │   │   ├── ticket-items/
│   │   │   ├── issues/
│   │   │   ├── status/
│   │   │   ├── assignments/
│   │   │   ├── handovers/
│   │   │   ├── estimates/
│   │   │   ├── parts-usage/
│   │   │   ├── payments/
│   │   │   ├── external-jobs/
│   │   │   ├── transfers/
│   │   │   ├── media/
│   │   │   ├── notes/
│   │   │   └── checklists/
│   │   │
│   │   ├── inventory/
│   │   ├── integrations/
│   │   │   └── phoneo/
│   │   └── notifications/
│   │
│   ├── shared/
│   │   ├── constants/
│   │   ├── helpers/
│   │   ├── errors/
│   │   └── types/
│   │
│   ├── routes/
│   ├── app.js
│   └── server.js
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
├── docker/
├── docs/
├── .env
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

The structure separates platform concerns under `src/core`, business capabilities under `src/modules`, and reusable cross-domain utilities under `src/shared`.

## 8. Backend Design Patterns

### Controller -> Service -> Repository

The backend uses a layered request flow:

```text
HTTP Request
  -> Route
  -> Middleware
  -> Validation
  -> Controller
  -> Service
  -> Repository
  -> Database
```

| Layer      | Responsibility                                                                              |
| ---------- | ------------------------------------------------------------------------------------------- |
| Route      | Maps HTTP methods and paths to controller handlers.                                         |
| Middleware | Handles authentication, tenant context, authorization, request metadata, and rate limiting. |
| Validation | Validates request body, params, and query payloads before business logic runs.              |
| Controller | Translates HTTP input/output and delegates use cases to services.                           |
| Service    | Owns business rules, transactions, workflow decisions, and orchestration.                   |
| Repository | Encapsulates Prisma queries and tenant-safe data access.                                    |

### Validation Layer

Zod schemas should be defined per module and applied before controller logic. Validation must reject malformed payloads, unknown enum states, invalid identifiers, unsafe pagination values, and missing workflow-specific fields.

Validation should not replace authorization. A valid payload can still be unauthorized.

### Middleware Layer

Core middleware responsibilities:

- JWT authentication.
- Tenant context extraction.
- RBAC permission checks.
- Request ID assignment.
- Error boundary handling.
- Rate limiting for sensitive endpoints.
- Structured request logging.

### Error Handling Strategy

The application should use a centralized error handling strategy with typed operational errors.

Expected error categories:

| Error Type                | Example                                            |
| ------------------------- | -------------------------------------------------- |
| Validation error          | Invalid status transition payload                  |
| Authentication error      | Missing or expired JWT                             |
| Authorization error       | Staff member lacks repair approval permission      |
| Tenant access error       | Ticket does not belong to authenticated business   |
| Conflict error            | Estimate already approved or ticket already closed |
| Not found error           | Customer or ticket not found within tenant         |
| External dependency error | Vendor API or notification provider failure        |

Errors returned to clients should be consistent, structured, and safe. Internal stack traces and database details must not be exposed in production responses.

### Logging Strategy

Logging must be structured and production-oriented. Logs should include request ID, business ID where available, user/staff ID where available, module, operation, latency, and error metadata.

Audit events and operational logs are not the same:

- Operational logs help engineers debug the system.
- Audit logs preserve business events and user actions.

Repair lifecycle events should be persisted in database logs, not only application logs.

## 9. Security Design

Security is built around authentication, authorization, tenant isolation, validation, and auditability.

### JWT Authentication

JWTs authenticate API clients and carry identity claims such as user ID, staff ID, business ID, role, and token metadata. Access tokens should be short-lived. Refresh token strategy can be added based on frontend and mobile client requirements.

### RBAC

Role-based access control governs what staff can do inside a business.

Example permissions:

- Create repair ticket.
- Assign technician.
- Approve estimate.
- Mark parts as used.
- Send to vendor.
- Close repair.
- Process payment.
- Handover to customer.
- View reports.

RBAC checks should happen before service execution for endpoint-level permissions and inside services for workflow-sensitive decisions.

### Input Validation

All external input must be validated with Zod. This includes request bodies, query parameters, route parameters, webhook payloads, and queue job payloads.

Validation rules must be strict around:

- Status transitions.
- Monetary values.
- Quantity values.
- IDs and tenant-scoped references.
- Customer contact fields.
- Vendor and external job references.

### Tenant Isolation

Tenant isolation is enforced across:

- Repository query filters.
- Authenticated request context.
- Background job payloads.
- Audit logs.
- File/media ownership metadata.
- Integrations and webhook routing.

Client-provided `business_id` should never be trusted for authorization. Business context must come from the authenticated session or a verified internal system context.

### Audit Logging

Audit logging is mandatory for repair lifecycle events and sensitive administrative actions.

Audit-worthy events include:

- Ticket creation and closure.
- Status transitions.
- Estimate creation, update, approval, and rejection.
- Parts usage.
- Assignment changes.
- Vendor handover and return.
- Customer handover.
- Payment changes.
- Role or permission changes.

Audit records should capture actor, business, entity, action, timestamp, previous state where relevant, new state where relevant, and request metadata.

## 10. Future Roadmap

The architecture leaves room for advanced repair intelligence and network-driven workflows.

| Roadmap Item            | Description                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| AI diagnosis            | Suggest likely issues from symptoms, device model, history, media, and technician notes.            |
| AI estimate suggestions | Recommend labor, parts, price ranges, and confidence levels based on historical repairs.            |
| Predictive repair time  | Estimate turnaround time using repair type, technician capacity, part availability, and vendor SLA. |
| Vendor network          | Build a verified network of repair vendors with pricing, SLA, ratings, and service categories.      |
| Repair marketplace      | Allow businesses to outsource jobs, accept jobs, quote services, and settle B2B repair work.        |

## 11. Current Completed Phase

The current phase establishes the product and engineering foundation.

Completed work:

- Architecture planning for a production Repair ERP backend.
- Multi-tenant architecture finalized around `business_id` isolation.
- Repair workflow architecture finalized, including internal repair, outsource repair, vendor repair, and future transfer flows.
- Database schema designed in dbdiagram.io.
- Production-grade folder structure initialized.
- Module planning completed for auth, business, customers, staff, vendors, repair subdomains, inventory, integrations, and notifications.

This phase creates the foundation needed before writing core business logic.

## 12. Next Implementation Steps

Implementation should proceed in controlled phases so that infrastructure, tenancy, authentication, and repair lifecycle rules are stable before adding advanced workflows.

### Phase 1: Dependency Installation

- Initialize and verify `package.json`.
- Install Express, Prisma, PostgreSQL client, Redis client, BullMQ, JWT libraries, Zod, logging library, security middleware, and test tooling.
- Add development scripts for server startup, Prisma, linting, testing, and Docker workflows.

### Phase 2: Prisma Setup

- Create `prisma/schema.prisma`.
- Convert the finalized dbdiagram.io schema into Prisma models.
- Define relations, indexes, enums, timestamps, and tenant-owned constraints.
- Generate the Prisma client.
- Create the first migration.

### Phase 3: PostgreSQL Connection

- Configure database connection through environment variables.
- Add Prisma client initialization under `src/core/database`.
- Add health checks for database readiness.
- Validate Docker-based local PostgreSQL setup.

### Phase 4: Express Bootstrap

- Implement `src/app.js` for middleware, routes, error handling, and health checks.
- Implement `src/server.js` for process startup and graceful shutdown.
- Add centralized config loading.
- Add structured logging and request IDs.

### Phase 5: Auth Module

- Implement login and token issuance.
- Add JWT authentication middleware.
- Add RBAC middleware.
- Attach business and staff context to each authenticated request.
- Create seed/admin flow for first business setup.

### Phase 6: Ticket Module

- Implement repair ticket creation.
- Add customer association.
- Add ticket number generation.
- Add tenant-safe ticket listing, detail, update, and filtering.
- Create initial status log at ticket creation.

### Phase 7: Estimate Workflow

- Implement repair estimate creation and update.
- Add approval/rejection states.
- Prevent unsafe edits after approval unless versioning rules are introduced.
- Track estimate history and customer approval metadata.

### Phase 8: Parts Usage

- Implement actual parts usage recording.
- Integrate with inventory stock movement when inventory is available.
- Support manual usage records for external/vendor-supplied parts.
- Add variance reporting between estimate and actual usage.

### Phase 9: Audit Logs

- Persist status logs, handover logs, and sensitive action logs.
- Add audit metadata to workflow operations.
- Ensure logs are immutable from normal application paths.
- Add reporting-ready indexes for repair lifecycle analysis.

The recommended development order is infrastructure first, auth and tenancy second, ticket lifecycle third, and advanced repair workflows afterward.

# Engineering Change Log & Production Learnings

This section records implementation discoveries, production bugs, workflow corrections, integration findings, and deployment lessons that were identified after the original architecture plan was written. It does not replace the architecture decisions above; it documents how the implemented system behaved under real integration and runtime validation.

## Handover Workflow Runtime Bug

### Original Design

`RECEPTION_TO_CUSTOMER` was expected to move a repair from active repair work into the delivery workflow while preserving custody history, handover records, and repair status logs.

### Actual Implementation

The current backend source supports direct customer delivery from an active repair state through a multi-step workflow transition:

```text
IN_REPAIR -> READY_FOR_DELIVERY -> DELIVERED
```

The handover service builds these transitions as `workflowTransitions`, and the handover repository applies each transition inside the same database transaction that records custody movement.

### Problem Observed

During runtime validation, `POST /repair/tickets/:id/handover` with `type = RECEPTION_TO_CUSTOMER` returned `success = true`. Custody moved to `CUSTOMER`, but the repair ticket status remained `IN_REPAIR`.

### Root Cause

The API container serving runtime traffic was an old Docker image. The container was not bind-mounted to the workspace source, and `docker inspect` showed:

```text
Mounts: []
```

The old image only supported:

```text
READY_FOR_DELIVERY -> DELIVERED
```

It did not include the later source-code correction for:

```text
IN_REPAIR + RECEPTION_TO_CUSTOMER
```

Because the old runtime service returned `workflowTransition = null`, the repository skipped the status update block, then continued to write the handover row and update custody fields. This is why custody changed successfully while the status remained `IN_REPAIR`.

### Fix Applied

No source-code change was required in the current workspace because the correct implementation was already present in `src/modules/handover/service.js` and `src/modules/handover/repository.js`.

The deployment correction was to rebuild and recreate the backend API container from current source:

```bash
docker compose down
docker compose build --no-cache api
docker compose up -d
```

### Validation

The workflow was revalidated with `RECEPTION_TO_CUSTOMER` from a ticket in `IN_REPAIR`. After rebuilding the container, the handover response returned `DELIVERED`, and `GET /repair/tickets/:id` returned `status = DELIVERED`.

The integration suite also contains a regression test asserting that customer delivery from `IN_REPAIR` writes both `READY_FOR_DELIVERY` and `DELIVERED` repair status log entries.

### Future Warning

Always verify the runtime container matches the source tree before debugging business logic. Source-code correctness does not guarantee deployment correctness when the running service uses an image-based deployment without bind mounts.

---

## Docker Deployment Runtime Drift

### Original Design

The local Docker deployment was expected to provide a stable way to run the backend API, PostgreSQL, and Redis together for development and workflow validation.

### Actual Implementation

The backend API container is image-based. The Docker Compose service builds the API image from the backend source and runs `node src/server.js` inside the container.

### Problem Observed

The API container continued serving stale handover logic even though the workspace source already contained the corrected multi-transition implementation.

### Root Cause

The container was created earlier and had no source bind mount. Rebuilding source files on disk did not affect the already-running container image.

### Fix Applied

Rebuild the backend image and recreate the API container after backend source changes:

```bash
docker compose build --no-cache api
docker compose up -d
```

For cases where container state may also be stale, recreate the stack with:

```bash
docker compose down
docker compose up -d --build
```

### Validation

After the image was rebuilt and the container recreated, the runtime API behavior matched the current source code and the `RECEPTION_TO_CUSTOMER` delivery workflow returned the expected ticket status.

### Future Warning

When runtime behavior differs from source code, check these before deeper code debugging:

1. Container mounts.
2. Container image age.
3. Container command and entrypoint.
4. Whether the service was rebuilt after the latest source change.

---

## Frontend API Contract Alignment

### Original Design

The frontend was expected to represent backend capabilities accurately and submit payloads matching backend route contracts.

### Actual Implementation

Several frontend screens were integrated with real backend modules, but some payloads and query parameters had drifted from the backend Postman collection and DTO validation contracts.

### Problem Observed

The audit found contract mismatches in customer search, billing, vendor dispatch, and parts usage workflows:

- Customer search used `search`, while the backend expected `query`.
- Billing payloads did not fully match invoice generation fields.
- Vendor dispatch payloads did not fully match the backend vendor dispatch schema.
- Parts usage submitted notes outside the `parts[]` item structure expected by the backend.

### Root Cause

Frontend implementation had been built from workflow assumptions rather than being continuously checked against the mounted backend routes and validation schemas.

### Fix Applied

Frontend requests were aligned to backend contracts:

- Customers use `query`.
- Billing uses `includeApprovedEstimate`, `includeActualUsage`, `manualItems`, `taxRate`, and `discountAmount`.
- Vendor dispatch uses `dispatchNotes`, `issueDescription`, `expectedReturnAt`, `estimatedCost`, and `currentLocation`.
- Parts usage sends notes inside each consumed part:

```json
{
  "parts": [
    {
      "inventoryItemId": "...",
      "quantity": 1,
      "notes": "..."
    }
  ]
}
```

### Validation

Real API calls completed successfully across repair ticket creation, assignment, handover, estimate approval, parts usage, invoice generation, payment collection, and delivery workflows.

### Future Warning

Frontend implementation must be verified against mounted backend routes, DTO schemas, and Postman collection contracts. UI assumptions should not be treated as API truth.

---

## Backend Reality vs Planned Architecture

### Original Design

The architecture document planned a broader ERP platform including operational modules such as business management, staff, notifications, settings, and integrations.

### Actual Implementation

The mounted production-ready API surface currently exposes these modules:

- Auth
- Customers
- Repair Tickets
- Repair Estimates
- Assignments
- Inventory
- Billing
- Vendors
- Handover
- Analytics

The following domains remain planned but are not currently exposed as complete mounted API modules:

- Business
- Staff
- Notifications
- Settings
- Integrations

### Problem Observed

Frontend and workflow planning risked treating planned modules as available backend capabilities.

### Root Cause

The architecture document includes future-state modules, while the current backend runtime only exposes the modules that have been implemented and mounted.

### Fix Applied

Frontend navigation and workflow assumptions were constrained to APIs that exist in the backend collection and mounted backend routes. Missing planned modules were treated as blockers rather than mocked or invented.

### Validation

The backend route inventory and Postman collection were compared against frontend usage. Screens depending on absent backend modules were identified as not production-ready until APIs exist.

### Future Warning

Design documentation may describe the intended platform direction. Production frontend workflows must only expose capabilities backed by mounted APIs and verified contracts.

---

## ERP Workflow Validation

### Original Design

The repair ERP lifecycle was designed to move a customer repair through intake, assignment, diagnosis, estimate, approval, repair execution, billing, custody handover, delivery, and closure.

### Actual Implementation

The backend supports the following validated workflow:

```text
Customer
-> Repair Ticket
-> Assignment
-> Handover To Technician
-> Estimate
-> Approval
-> Parts Usage
-> Invoice
-> Payment
-> Handover
-> Delivered
-> Closed
```

### Problem Observed

Isolated endpoint checks were not enough to prove the ERP lifecycle. The `RECEPTION_TO_CUSTOMER` runtime issue only became obvious during end-to-end workflow validation.

### Root Cause

Workflow bugs can hide between modules because each individual endpoint may return success while the overall lifecycle state remains incorrect.

### Fix Applied

The validation approach was expanded from endpoint-level checks to full lifecycle execution using real API calls and seeded users.

### Validation

The workflow was executed against the backend API from login through repair creation, technician assignment, handover, estimate approval, parts consumption, invoice generation, payment collection, customer handover, delivery, and closure.

### Future Warning

Every major backend release should include complete ERP lifecycle validation. Passing isolated endpoint tests is not enough for workflow-heavy business software.

---

## Frontend Fix Log

### Issue

Repair detail exposed every known ticket status in the manual status update dropdown, which allowed users to attempt backend-invalid transitions and did not expose the backend-supported `CLOSED` transition.

### Root Cause

The frontend had a flat status list instead of the backend repair workflow transition graph.

### Before

Users could select impossible transitions such as `RECEIVED -> DELIVERED`, while `DELIVERED -> CLOSED` was not available.

### Fix Applied

Added a frontend workflow helper mirroring the backend repair transition table and updated Repair detail to show only valid next statuses from the current ticket status.

### After

Repair status actions are transition-aware. `CLOSED` is available only through backend-valid paths such as `DELIVERED -> CLOSED` or `CANCELLED -> CLOSED`.

### Files Modified

- `frontend-repair/src/utils/workflow.js`
- `frontend-repair/src/pages/Repair.jsx`

### Backend Contract Reference

`PATCH /api/v1/repair/tickets/:id/status`; backend workflow in `backend-repair/src/modules/repair/workflow.js`.

### Verification

`npm run build` completed successfully. Local frontend routes returned HTTP 200, and admin-authenticated repair API smoke checks returned success.

---

## Frontend Fix Log

### Issue

Billing allowed invoice generation for any repair ticket and payment collection for invoices with no remaining due amount.

### Root Cause

The Billing page used raw ticket and invoice lists without applying frontend guards based on backend billing rules.

### Before

Users could attempt invoice generation for already invoiced or non-billable tickets and attempt payments against fully paid invoices.

### Fix Applied

Added billing eligibility and payable invoice helpers. The Billing page now filters invoice candidates to billable, not-yet-invoiced tickets and filters payment candidates to invoices with positive due amounts.

### After

Invoice and payment forms disable submission when no backend-valid candidates exist, reducing avoidable backend rejections.

### Files Modified

- `frontend-repair/src/utils/workflow.js`
- `frontend-repair/src/pages/Billing.jsx`

### Backend Contract Reference

`POST /api/v1/repair/tickets/:id/invoice`, `GET /api/v1/billing/invoices`, and `POST /api/v1/billing/invoices/:id/payments`.

### Verification

`npm run build` completed successfully. Local admin smoke checks verified billing invoice listing returns success.

---

## Frontend Fix Log

### Issue

Handover UI exposed every handover type for every ticket regardless of ticket status and current custody holder.

### Root Cause

The frontend rendered a static handover type list instead of deriving valid actions from backend custody and workflow rules.

### Before

Users could attempt impossible handovers such as vendor handover when the ticket was not in technician custody or customer delivery from an unsupported custody state.

### Fix Applied

Added frontend handover action gating based on ticket status and current holder. The Handover form now displays only backend-valid handover types and conditionally requires vendor or technician fields.

### After

Handover actions are constrained to valid custody states. `RECEPTION_TO_CUSTOMER` remains available only from supported reception-held delivery states.

### Files Modified

- `frontend-repair/src/utils/workflow.js`
- `frontend-repair/src/pages/Handover.jsx`

### Backend Contract Reference

`POST /api/v1/repair/tickets/:id/handover`; backend handover workflow in `backend-repair/src/modules/handover/service.js`.

### Verification

`npm run build` completed successfully. Local admin smoke checks verified repair ticket and vendor list APIs return success for the Handover screen dependencies.

---

## Frontend Fix Log

### Issue

Custody timeline assumed the first handover returned by the backend was the latest event.

### Root Cause

The frontend did not explicitly sort handover records before selecting the latest event.

### Before

If backend ordering changed or returned chronological rows, the UI could label an older handover as the latest transition.

### Fix Applied

Sorted handovers by `handedOverAt` or `createdAt` descending before rendering and before selecting the latest transition.

### After

The newest custody event is consistently shown first and used for the latest transition label.

### Files Modified

- `frontend-repair/src/features/handover/CustodyTimeline.jsx`

### Backend Contract Reference

`GET /api/v1/repair/tickets/:id/handovers`.

### Verification

`npm run build` completed successfully.

---

## Frontend Fix Log

### Issue

The shop workflow screens were too technical for day-to-day staff use. Ticket numbers appeared as long identifiers, Customers and Repair screens showed duplicate search boxes, and users had to manually know the next page after creating a repair or assigning a technician.

### Root Cause

The frontend mirrored backend module boundaries closely, but did not provide enough guided navigation between operational steps. Data tables also included their own local search even when the screen already had a backend/API search.

### Before

After creating a repair, staff had no direct next-step button. Assignment and estimate dropdowns displayed long ticket numbers without customer context. Estimate creation used separate diagnosis, repair note, and notes fields, which made a simple shop estimate feel heavy.

### Fix Applied

Added readable ticket labels using the last four ticket characters plus customer name, hid duplicate table search on Customers and Repair, added a repair-ticket section inside Customers, added Go to Assignment after repair creation, added Go to Estimate after assignment success, and simplified estimate creation to one combined diagnosis/estimate/customer note field while preserving the backend payload contract.

### After

Staff can move through Create Repair -> Assignment -> Estimate with clear buttons and readable repair labels, and Customers/Repair no longer show duplicate search inputs.

### Files Modified

- `frontend-repair/src/components/ui/DataTable.jsx`
- `frontend-repair/src/pages/Customers.jsx`
- `frontend-repair/src/pages/Repair.jsx`
- `frontend-repair/src/pages/Assignments.jsx`
- `frontend-repair/src/pages/Estimates.jsx`
- `frontend-repair/src/utils/ticketLabel.js`
- `backend-repair/design.md`

### Backend Contract Reference

Existing mounted APIs only: `GET /api/v1/repair/tickets`, `POST /api/v1/repair/tickets`, `POST /api/v1/repair/tickets/:id/assign`, `GET /api/v1/repair/tickets/:id/assignments`, and `POST /api/v1/repair/tickets/:id/estimate`.

### Verification

`npm run build` completed successfully. Local Vite route smoke checks returned HTTP 200 for `/customers`, `/repair`, `/assignments?ticketId=test`, and `/repair/estimates?ticketId=test`.

---

## Frontend Fix Log

### Issue

Parts Usage had a real route and backend-backed API calls but was not discoverable from ERP navigation.

### Root Cause

The route existed under `/repair/parts-usage`, but the sidebar navigation omitted it.

### Before

Users needed to know the direct route to access actual parts consumption.

### Fix Applied

Added a Parts Usage navigation item using the existing route and existing repair/inventory API-backed screen.

### After

Parts Usage is discoverable from the main ERP navigation for operational roles.

### Files Modified

- `frontend-repair/src/layouts/navigation.js`

### Backend Contract Reference

`POST /api/v1/repair/tickets/:id/consume-parts`, `GET /api/v1/repair/tickets/:id/parts-usage`, `GET /api/v1/inventory/items`, and `GET /api/v1/repair/tickets`.

### Verification

`npm run build` completed successfully. Local frontend route `/repair/parts-usage` returned HTTP 200.

---

## Frontend Fix Log

### Issue

Assignments exposed assignment actions against tickets that could not accept them, including terminal or already-assigned tickets.

### Root Cause

The frontend fed all repair tickets into both assignment forms and only disabled technician selection when no technician IDs were discoverable from backend-returned data.

### Before

Users could try assigning already-assigned tickets or reassigning tickets without an active assignment.

### Fix Applied

Filtered assignment candidates to unassigned, non-terminal tickets and reassignment candidates to assigned, non-terminal tickets. Technician options still come only from backend-returned queue, history, and assignment records.

### After

Assignment forms expose only backend-plausible actions without fabricating staff records or using unmounted staff APIs.

### Files Modified

- `frontend-repair/src/pages/Assignments.jsx`
- `frontend-repair/src/utils/workflow.js`

### Backend Contract Reference

`POST /api/v1/repair/tickets/:id/assign`, `POST /api/v1/repair/tickets/:id/reassign`, `GET /api/v1/repair/tickets/:id/assignments`, and `GET /api/v1/technicians/me/queue`.

### Verification

`npm run build` completed successfully. Seeded admin login and protected assignment queue API smoke checks returned success.

---

## Frontend Fix Log

### Issue

Repair and Handover screens displayed default `RECEPTION` custody when the repair ticket list response did not include current custody fields.

### Root Cause

`GET /api/v1/repair/tickets` returns ticket workflow fields but not the canonical custody snapshot. The frontend treated missing `currentHolderType` as `RECEPTION`, which could show stale or incorrect custody and expose invalid handover actions.

### Before

Tickets already delivered to customer or held by technician/vendor could still render as `RECEPTION` on list screens, and handover action gating could be calculated from the fallback instead of the backend custody state.

### Fix Applied

Repair, Handover, and Vendor dispatch screens now hydrate listed tickets with `GET /api/v1/repair/tickets/:id/current-custody` before rendering custody fields or calculating custody-dependent actions.

### After

Custody holder, location, handover options, and vendor dispatch eligibility are based on the backend custody snapshot instead of a frontend fallback.

### Files Modified

- `frontend-repair/src/pages/Repair.jsx`
- `frontend-repair/src/pages/Handover.jsx`
- `frontend-repair/src/pages/Vendors.jsx`

### Backend Contract Reference

`GET /api/v1/repair/tickets/:id/current-custody`, `POST /api/v1/repair/tickets/:id/handover`, and `POST /api/v1/repair/tickets/:id/vendor-dispatch`.

### Verification

`npm run build` completed successfully. Live admin-authenticated checks confirmed a ticket with `status=IN_REPAIR` and `currentHolderType=CUSTOMER` hydrates from `current-custody`, and frontend workflow helper returns no valid handover actions for that state.

---

## Frontend Fix Log

### Issue

Assignments history displayed `UNKNOWN` for backend assignment records and assignment filtering could treat already-assigned tickets as assignable.

### Root Cause

The backend assignment history uses `type` values such as `ASSIGNED`, while the frontend only checked `status`. The repair ticket list also does not include assignment history records.

### Before

Assignment history could show `UNKNOWN`, and tickets with active assignment history could still appear in the Assign Technician form.

### Fix Applied

Assignment logic now recognizes backend `type` values and hydrates assignment candidate state through `GET /api/v1/repair/tickets/:id/assignments` for listed tickets.

### After

Active assignments are detected from real backend assignment history, assigned tickets move to reassignment candidates, and assignment history renders backend assignment type correctly.

### Files Modified

- `frontend-repair/src/pages/Assignments.jsx`
- `frontend-repair/src/utils/workflow.js`

### Backend Contract Reference

`GET /api/v1/repair/tickets/:id/assignments`, `POST /api/v1/repair/tickets/:id/assign`, and `POST /api/v1/repair/tickets/:id/reassign`.

### Verification

`npm run build` completed successfully. Live admin-authenticated checks confirmed a backend assignment record with `type=ASSIGNED` is detected as active by the frontend workflow helper.

---

## Frontend Fix Log

### Issue

Parts Usage table showed raw repair ticket UUIDs when the parts usage response did not include an embedded ticket number.

### Root Cause

`GET /api/v1/repair/tickets/:id/parts-usage` returns `repairTicketId` but not always an embedded `ticket.ticketNumber`. The frontend did not map that ID back to the selected ticket list.

### Before

The Repair Ticket column could render a UUID, making the operational usage table harder to scan.

### Fix Applied

Parts Usage now maps `repairTicketId` and the selected ticket ID back to the ticket list before falling back to raw IDs.

### After

Parts Usage displays the human-readable ticket number when it is available from the backend ticket list.

### Files Modified

- `frontend-repair/src/pages/PartsUsage.jsx`

### Backend Contract Reference

`GET /api/v1/repair/tickets`, `GET /api/v1/repair/tickets/:id/parts-usage`, and `POST /api/v1/repair/tickets/:id/consume-parts`.

### Verification

`npm run build` completed successfully. Live admin-authenticated checks confirmed the selected in-repair ticket has parts usage rows and the frontend can resolve the ticket number from the ticket list.

---

## Frontend Fix Log

### Issue

Estimate creation could remain visually stale after a successful create action, and tickets already waiting for customer approval were still shown in the create form.

### Root Cause

The Estimates page did not invalidate the estimate candidate query after creation and used the same ticket set for both estimate visibility and estimate creation.

### Before

After creating an estimate, the UI could keep the same ticket in the create form until a manual refresh. Tickets in `WAITING_APPROVAL` could be selected for another estimate even though the correct workflow is approval or rejection.

### Fix Applied

Estimate creation now invalidates the candidate query after success. The create form only lists `DIAGNOSING` and `ESTIMATE_PENDING` tickets, while `WAITING_APPROVAL` tickets remain visible for estimate history and approval workflow.

### After

Successful estimate creation refreshes candidates, and the create form no longer encourages duplicate estimates for tickets already awaiting approval.

### Files Modified

- `frontend-repair/src/pages/Estimates.jsx`

### Backend Contract Reference

`GET /api/v1/repair/tickets`, `POST /api/v1/repair/tickets/:id/estimate`, `POST /api/v1/repair/estimates/:id/approve`, and `POST /api/v1/repair/estimates/:id/reject`.

### Verification

`npm run build` completed successfully. Live admin-authenticated API check confirmed ticket `REP-20260608-061557-E24FF4` moved to `WAITING_APPROVAL` after estimate creation.

---

## Frontend Fix Log

### Issue

The Handover form disabled submission for tickets with no valid handover action but still allowed users to edit location and notes fields.

### Root Cause

Only the submit button and handover type select were gated by valid handover actions; ancillary fields did not inherit the invalid workflow state.

### Before

Users could type location and notes for an impossible handover, creating confusion even though submission was blocked.

### Fix Applied

Location and notes fields are disabled whenever no backend-valid handover action exists for the selected ticket.

### After

The entire handover form reflects workflow availability consistently.

### Files Modified

- `frontend-repair/src/pages/Handover.jsx`

### Backend Contract Reference

`GET /api/v1/repair/tickets/:id/current-custody` and `POST /api/v1/repair/tickets/:id/handover`.

### Verification

`npm run build` completed successfully. Local Handover route returned HTTP 200, and live workflow helper checks confirmed invalid custody/status combinations produce no handover action.

---

## Frontend Fix Log

### Issue

Customers page appeared empty until the user manually searched.

### Root Cause

The backend only mounts `GET /api/v1/customers/search` and customer ticket/ledger endpoints; there is no standalone customer list API. The frontend therefore disabled customer fetching until search input existed.

### Before

The Customers screen showed a search-only empty state even though real customers existed through repair tickets.

### Fix Applied

The Customers page now uses real backend repair tickets as the default customer source and deduplicates ticket customers. Search still uses the mounted `GET /api/v1/customers/search` endpoint.

### After

Customers are visible by default from real backend repair data, and search continues to return backend customer search results.

### Files Modified

- `frontend-repair/src/pages/Customers.jsx`

### Backend Contract Reference

`GET /api/v1/repair/tickets`, `GET /api/v1/customers/search`, `GET /api/v1/customers/:id/tickets`, and `GET /api/v1/customers/:id/ledger`.

### Verification

`npm run build` completed successfully. Live admin-authenticated API checks found 14 unique customers from repair tickets and confirmed searching `Ashish` returns `Ashish Kumar`.

---

## Frontend Fix Log

### Issue

Analytics metric tables displayed technical keys such as `summary.total`.

### Root Cause

The generic analytics row normalizer exposed nested object paths directly as UI labels.

### Before

Users saw backend-oriented metric labels instead of readable report labels.

### Fix Applied

Analytics metric names are humanized by replacing dotted/camelCase keys with title-cased labels.

### After

Analytics tables render readable labels such as `Summary Total` instead of `summary.total`.

### Files Modified

- `frontend-repair/src/utils/data.js`

### Backend Contract Reference

`GET /api/v1/analytics/*` mounted analytics endpoints.

### Verification

`npm run build` completed successfully. Local Analytics route returned HTTP 200.

---

## Frontend Fix Log

### Issue

Shop staff needed a clear first-login explanation of the internal ERP repair workflow.

### Root Cause

The dashboard showed operational KPIs but did not explain that this frontend is a shop-admin ERP, where staff creates and processes repair tickets after the customer visits or contacts the shop.

### Before

New shop users could land on the dashboard without knowing the correct sequence for repair intake, diagnosis, estimate, parts usage, billing, handover, delivery, and closure.

### Fix Applied

Added a dashboard workflow note that lists the real shop-side sequence and clarifies that customers provide device and issue details to the shop while staff operates the ERP.

### After

Admin users see the recommended repair workflow immediately after login and can follow the ERP modules in the correct operational order.

### Files Modified

- `frontend-repair/src/pages/Dashboard.jsx`
- `backend-repair/design.md`

### Backend Contract Reference

Existing mounted ERP workflow APIs: `POST /api/v1/repair/tickets`, assignment routes, estimate routes, parts usage routes, billing routes, handover routes, and repair status update routes.

### Verification

`npm run build` completed successfully for this dashboard-only frontend change.

---

## Frontend Fix Log

### Issue

The dashboard workflow note did not explicitly mention vendor outsourcing or analytics review.

### Root Cause

The first version summarized the common in-shop repair flow but left optional vendor handling and post-workflow reporting implicit.

### Before

Shop users could understand ticket, estimate, parts, billing, and handover order, but the guide did not explain when to use Vendors or Analytics.

### Fix Applied

Expanded the dashboard workflow note to list the module names and include vendor dispatch/status/cost/receive steps plus analytics review for revenue, dues, technician workload, repair KPIs, and inventory consumption.

### After

The dashboard guide now explains the complete shop-admin operating sequence, including optional vendor repair and final analytics review.

### Files Modified

- `frontend-repair/src/pages/Dashboard.jsx`
- `backend-repair/design.md`

### Backend Contract Reference

Existing mounted ERP workflow APIs: repair ticket routes, assignment routes, estimate routes, vendor repair routes, inventory/parts usage routes, billing routes, handover routes, and analytics routes.

### Verification

`npm run build` completed successfully.

## Frontend Fix Log

### Issue

The repair intake form was too detailed for shop counter usage and exposed separate technical fields such as email, repair title, device condition, issue title, ticket description, serial number, and IMEI.

### Root Cause

The frontend mirrored the backend repair ticket payload too directly instead of presenting a simple intake workflow for staff.

### Before

Staff had to fill many separate fields before creating a repair, including duplicate issue/title/description style inputs and separate serial/IMEI fields.

### Fix Applied

Simplified the Create Repair form to customer name, phone, item name, priority, one optional `IMEI / Serial Number` field, and one required `Issue Description` field. The frontend maps these simple fields into the existing backend contract without changing APIs.

### After

Staff can create a repair ticket with the minimum practical intake details, while the backend still receives valid `customer`, `title`, `description`, `items`, and `issues` payload data.

### Files Modified

- `frontend-repair/src/pages/Repair.jsx`
- `backend-repair/design.md`

### Backend Contract Reference

`POST /api/v1/repair/tickets` requires customer name/phone or customer id, ticket title, at least one item, and at least one issue. The simplified form maps `Item Name` to the ticket item and maps `Issue Description` to the ticket and issue description fields.

### Verification

`npm run build` is run after this change to confirm the frontend compiles successfully.

## SaaS Phase 3 — Multi Branch Architecture

### Why Branch Isolation Was Added

Phase 2 made the ERP SaaS-ready at the business level by using `business_id` as the tenant boundary. Phase 3 adds `branch_id` so a single repair business can run multiple shops, counters, or service centers while keeping each branch's operational data isolated.

### Previous Architecture

The platform previously isolated data by business only. Owners, admins, technicians, repairs, customers, stock, invoices, handovers, and vendor jobs were all scoped to a business, but there was no operational boundary inside that business.

### New Architecture

The ERP now uses `business_id + branch_id` for operational data. `business_id` remains the SaaS tenant boundary, while `branch_id` scopes day-to-day ERP records such as customers, repair tickets, assignments, inventory, invoices, payments, handovers, and vendor repair jobs.

### Role Hierarchy

`SUPER_ADMIN` can inspect the platform across businesses and branches. `OWNER` controls the full business and can view or manage every branch. `ADMIN` belongs to one branch and is restricted to that branch's ERP data. `TECHNICIAN` belongs to one branch and is restricted to assigned work inside that branch.

### Branch Security Model

Owners may create, edit, activate, deactivate, and view branches within their business. Admins and technicians receive a `branchId` in their authenticated user context. Backend services resolve the allowed branch scope from the authenticated role, not from frontend trust alone.

### Query Isolation Strategy

ERP services call the branch scope utility before repository access. Owners can request a specific branch or all branches in their business. Admins and technicians are forced to their assigned branch, and cross-branch requests are rejected. Super admins can access platform-level branch data where supported.

### Database Changes

A `branches` table was added with business relation, branch code, contact data, main-branch marker, status, and timestamps. Operational records received `branch_id` where branch-level isolation is required. SaaS-level records such as businesses and subscriptions remain business-level only.

### Migration Strategy

The migration creates a default `MAIN` branch for each existing business, backfills existing operational records to that branch, and then enforces branch foreign keys and branch-aware uniqueness such as customer phone and inventory SKU per branch.

### Before

An admin or technician could be business-scoped without a branch assignment, which made multi-location deployments unsafe because branch data could be mixed inside the same business.

### After

Owners can operate across branches, while admins and technicians are branch-scoped. Repair, customer, inventory, billing, vendor, handover, assignment, and analytics access is filtered by backend branch rules.

### Verification

`npm run db:validate`, `npm run prisma:generate`, and frontend `npm run build` pass. Database-backed migration/test execution requires the local PostgreSQL service configured in `.env` to be running.

## SaaS Phase 2 Credential And Role Alignment

### Issue

The SaaS role model needed to expose `SUPER_ADMIN`, `OWNER`, `ADMIN`, and `TECHNICIAN`, while keeping the mandatory platform owner and super-admin credentials outside application code.

### Root Cause

Earlier seed and configuration paths still mixed demo credentials with role setup. This made it too easy for seeded owner/admin credentials to drift from `.env` and made `ADMIN` less explicit in the SaaS UI.

### Before

Owner credentials were seeded from hardcoded/default values, demo admin setup reused old seed password behavior, and Staff Management was technician-focused. Frontend navigation did not clearly treat `ADMIN` as an ERP operator role.

### Fix Applied

Configuration now requires `SUPER_ADMIN_EMAILS`, `SUPER_ADMIN_PASSWORD`, `OWNER_EMAIL`, and `OWNER_PASSWORD` from environment variables. Optional demo admin seeding uses `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Staff Management now lets an Owner create either `ADMIN` or `TECHNICIAN`, while `ADMIN` gets ERP operator navigation and remains excluded from owner-only SaaS settings.

### After

Super-admin and owner credentials are env-driven and mandatory. Owner is the only role that manages Staff. Owner-created Admin users can operate ERP workflow screens without getting Business Profile, Staff, Subscription, or Super Admin access.

### Files Modified

- `backend-repair/.env.example`
- `backend-repair/.env`
- `backend-repair/src/core/config/env.js`
- `backend-repair/prisma/seed.js`
- `backend-repair/src/modules/staff/controller.js`
- `backend-repair/src/modules/staff/repository.js`
- `backend-repair/src/modules/staff/routes.js`
- `backend-repair/src/modules/staff/service.js`
- `backend-repair/src/modules/staff/validation.js`
- `frontend-repair/src/services/modules.js`
- `frontend-repair/src/layouts/navigation.js`
- `frontend-repair/src/routes/AppRoutes.jsx`
- `frontend-repair/src/pages/StaffManagement.jsx`
- `backend-repair/design.md`

### Backend Contract Reference

Uses existing auth and staff-management contracts plus the SaaS staff routes: `GET /api/v1/staff`, `POST /api/v1/staff`, `POST /api/v1/staff/admins`, `POST /api/v1/staff/technicians`, `POST /api/v1/staff/:id/disable`, `POST /api/v1/staff/:id/enable`, and `POST /api/v1/staff/:id/reset-password`.

### Verification

`node -c prisma/seed.js`, `npm run db:validate`, and environment config loading were verified. Backend Jest commands were attempted, but the local PostgreSQL server at `localhost:5433` was not reachable. Frontend production build is run after this change.

### Migration Notes

Branch-level tenant operations are intentionally not partially implemented in this pass. The current tenant boundary remains shared database, shared schema, and `business_id` isolation. Full branch architecture needs its own migration and query-isolation pass before it is safe to expose in production.

## SaaS Phase 2

### Why This Layer Was Added

The repair ERP workflow is now stable for a single shop. SaaS Phase 2 adds the management layer needed to run the same ERP for multiple repair businesses without changing the operational repair lifecycle.

The existing workflow remains unchanged:

Customer -> Repair Ticket -> Assignment -> Estimate -> Approval -> Parts Usage -> Invoice -> Payment -> Handover -> Delivered -> Closed.

### Tenant Boundary

The platform continues to use a shared database and shared schema. `business_id` remains the tenant boundary for operational data, staff records, inventory, invoices, vendors, handovers, and analytics.

This keeps deployment simple and avoids separate databases, separate schemas, or separate deployments per shop. Backend authorization and repository filters must continue to enforce `business_id` isolation for tenant-scoped APIs.

### SaaS Roles

The SaaS UI now exposes only:

- `SUPER_ADMIN`: platform operator role for tenant administration.
- `OWNER`: shop owner role for business profile, staff, subscription visibility, and full ERP operations.
- `TECHNICIAN`: shop technician role for assigned repairs, estimates, parts usage, and handover tasks.

Legacy roles remain in code and data for future compatibility, but they are not exposed in the SaaS navigation.

### Business Profile

Business Profile stores the shop source-of-truth details:

- Business name, slug, description.
- Logo and banner URLs.
- Phone, email, website.
- Country, state, city, address.
- GST number.

Owner users can read and update their own business profile through `GET /api/v1/business/profile` and `PATCH /api/v1/business/profile`.

### Staff Management

Staff Management lets an owner manage technicians only. Owners can create technician accounts, disable or enable them, and reset technician passwords. Technician-created password recovery is intentionally not exposed.

Backend routes added:

- `GET /api/v1/staff`
- `POST /api/v1/staff/technicians`
- `POST /api/v1/staff/:id/disable`
- `POST /api/v1/staff/:id/enable`
- `POST /api/v1/staff/:id/reset-password`

### Password Policy

Owners can use forgot password, reset password, and authenticated password change. Technicians do not receive a forgot-password workflow; owner reset is the supported technician recovery path.

Backend auth routes added:

- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/change-password`

### Subscription System

Subscription support is management-only in this phase. It records the current plan, status, start date, and expiry date for a business. No payment gateway or automated billing is included.

Owner users can view their current subscription through `GET /api/v1/subscription/current`.

### Super Admin Foundation

`SUPER_ADMIN` can list businesses, view a business snapshot, suspend a tenant, and activate a tenant. Delete, payment management, and advanced SaaS analytics are intentionally excluded from Phase 2.

Backend routes added:

- `GET /api/v1/super-admin/businesses`
- `GET /api/v1/super-admin/businesses/:id`
- `PATCH /api/v1/super-admin/businesses/:id/suspend`
- `PATCH /api/v1/super-admin/businesses/:id/activate`

### Frontend Screens

Frontend screens added:

- Business Profile at `/business`.
- Staff Management at `/staff`.
- Subscription at `/subscription`.
- Super Admin Businesses at `/super-admin/businesses`.
- Technician Assigned Repairs at `/technician/repairs`.

Navigation is role-aware:

- Owner: ERP modules plus Business Profile, Staff, Subscription.
- Technician: Dashboard, Assigned Repairs, Estimates, Parts Usage, Handover.
- Super Admin: Businesses.

### Migration Notes

The SaaS migration adds business profile columns, business status, subscription enums, password reset token fields, and subscriptions.

Seed data now creates:

- Demo Repair as an active business.
- An `OWNER` login for Demo Repair.
- Demo technicians using `TECHNICIAN`.
- A platform business for super admin users.
- Super admin accounts from `SUPER_ADMIN_EMAILS` in environment configuration.

Default super admin emails are documented in `.env.example` as:

- `super_admin1@repair-erp.local`
- `super_admin2@repair-erp.local`

The default super admin password comes from `SUPER_ADMIN_PASSWORD`, falling back to the seed admin password for local development.

## Frontend Fix Log

### Issue

After invoice generation, staff only saw a success toast and could not easily understand where the newly generated invoice went.

### Root Cause

The Billing page invalidated invoice queries after creation but did not render the mutation response or provide a direct next action from the generated invoice.

### Before

Staff generated an invoice, saw a popup, and then had to manually find the new invoice in the list or payment form.

### Fix Applied

Updated Billing to show a generated invoice summary below the invoice form with invoice number, total, due amount, status, and direct Open Invoice / Collect Payment actions. Billing also refreshes both invoice and repair queries after invoice creation.

### After

After creating an invoice, the result remains visible on the Billing page and staff can immediately open the invoice or collect payment.

### Files Modified

- `frontend-repair/src/pages/Billing.jsx`
- `backend-repair/design.md`

### Backend Contract Reference

`POST /api/v1/repair/tickets/:id/invoice` returns the generated invoice object used by the frontend summary.

### Verification

`npm run build` is run after this change to confirm the frontend compiles successfully.

## Frontend Fix Log

### Issue

Older tickets in `WAITING_APPROVAL` could not be approved from the frontend after a page reload.

### Root Cause

The repair ticket list and detail responses did not expose the latest estimate id. The frontend can approve a newly created estimate while the create response is still in memory, but after reload it only had the ticket status and no mounted API to list estimates by ticket.

### Before

Staff could see that a repair was waiting for estimate approval, but the UI could not reliably call `POST /api/v1/repair/estimates/:id/approve` because it did not know the estimate id.

### Fix Applied

Added latest estimate summary data to repair ticket list/detail repository responses as `latestEstimate`, keeping the latest estimate in the `estimates` array for existing frontend compatibility. Updated the Estimates page to use `latestEstimate.id` and show an `Approve Estimate` action for existing `WAITING_APPROVAL` tickets.

### After

Reloaded waiting-approval tickets can now expose a real approve action when the backend returns the latest estimate summary. After approval, the repair queries are invalidated so Billing can pick up the approved/billable ticket.

### Files Modified

- `backend-repair/src/modules/repair/repository.js`
- `frontend-repair/src/pages/Estimates.jsx`
- `backend-repair/design.md`

### Backend Contract Reference

Existing workflow API: `POST /api/v1/repair/estimates/:id/approve`. The response addition supports that existing route by exposing the latest estimate id on `GET /api/v1/repair/tickets` and `GET /api/v1/repair/tickets/:id`.

### Verification

`node --check backend-repair/src/modules/repair/repository.js` completed successfully. `npm run build` completed successfully for `frontend-repair`. Backend integration tests could not run locally because the Postgres test database at `localhost:5433` was not reachable and Docker daemon was not running.

## Frontend Fix Log

### Issue

Assignments showed a separate `Technician Workload` block and separate assign/reassign cards, while Billing did not provide a direct row action for invoices with pending dues.

### Root Cause

The UI exposed backend modules independently instead of grouping related staff actions around the immediate workflow decision.

### Before

Staff saw assign and reassign as separate panels, the workload heading was confusing when the goal was simply to assign a repair, and pending invoices required users to discover the payment form separately.

### Fix Applied

Renamed the workload table to `Active Technician Queue`, hid it when empty, merged assign and reassign into one `Technician Assignment` panel with an action dropdown, and added a `Pay` button beside invoices with a due amount.

### After

Staff can choose `Assign Technician` or `Reassign Technician` from one action panel, and Billing rows with pending/partial dues have a clear payment path.

### Files Modified

- `frontend-repair/src/pages/Assignments.jsx`
- `frontend-repair/src/pages/Billing.jsx`
- `backend-repair/design.md`

### Backend Contract Reference

Assignment uses existing `POST /api/v1/repair/tickets/:id/assign` and `POST /api/v1/repair/tickets/:id/reassign`. Billing payment uses existing invoice detail and payment collection routes.

### Verification

`npm run build` is run after this change to confirm the frontend compiles successfully.

## Frontend Fix Log

### Issue

After estimate creation, staff could see `WAITING_APPROVAL` but the next step was unclear, and Billing hid invoice candidates because repair list responses do not include estimate detail records.

### Root Cause

The frontend required local `ticket.estimates[].status === APPROVED` before showing invoice candidates, but the mounted repair ticket list API only returns ticket summary fields. The estimate approval step also required staff to discover estimate details manually.

### Before

A newly estimated repair could remain in `WAITING_APPROVAL`, would not appear in Billing, and the Billing form showed a generic no-eligible-ticket message.

### Fix Applied

Added immediate `Approve Estimate` and `Go to Billing` actions after estimate creation, relaxed Billing candidate filtering for backend-billable statuses when estimate detail data is absent, made invoice candidate labels readable, simplified invoice table columns, and added a Billing hint for tickets still waiting for approval.

### After

Staff can create an estimate, approve it immediately, continue to Billing, and generate an invoice from approved/billable repairs. Billing now explains why waiting-approval repairs are not ready for invoice.

### Files Modified

- `frontend-repair/src/pages/Estimates.jsx`
- `frontend-repair/src/pages/Billing.jsx`
- `frontend-repair/src/utils/workflow.js`
- `backend-repair/design.md`

### Backend Contract Reference

`POST /api/v1/repair/tickets/:id/estimate`, `POST /api/v1/repair/estimates/:id/approve`, and `POST /api/v1/repair/tickets/:id/invoice`.

### Verification

`npm run build` is run after this change to confirm the frontend compiles successfully.

## Frontend Fix Log

### Issue

The browser workflow could approve an estimate and send staff to Parts Usage, but an approved ticket still needed to enter the repair state before operational parts consumption.

### Root Cause

The backend workflow separates estimate approval from repair execution. The frontend showed approved tickets on Parts Usage, but did not explicitly perform the `APPROVED` to `IN_REPAIR` transition before consuming stock.

### Before

Staff could select an approved repair on Parts Usage and attempt to consume inventory without a clear repair-start step.

### Fix Applied

Updated Parts Usage so an `APPROVED` repair is moved to `IN_REPAIR` through the existing ticket status API before calling the parts consumption API.

### After

The frontend flow now moves from Estimate Approval to Parts Usage cleanly: approved tickets are started as in-repair automatically when parts are consumed, then staff can continue to Billing.

### Files Modified

- `frontend-repair/src/pages/PartsUsage.jsx`
- `backend-repair/design.md`

### Backend Contract Reference

Uses existing `PATCH /api/v1/repair/tickets/:id/status` with `status: "IN_REPAIR"` followed by existing `POST /api/v1/repair/tickets/:id/consume-parts`.

### Verification

`npm run build` is run after this change. A live API workflow check is run with the same transition order used by the frontend.

## Frontend Fix Log

### Issue

The dashboard workflow note still read like a module summary, and Logout was placed in the top header instead of the sidebar where staff expects persistent account actions.

### Root Cause

The layout kept account controls in the header while the dashboard note described all modules with similar weight, making the main repair path less obvious.

### Before

Staff saw Logout in the top-right header. The dashboard workflow mixed the normal repair lifecycle with optional vendor and analytics tasks without clearly showing the day-to-day order.

### Fix Applied

Moved Logout to the bottom of the sidebar and rewrote the dashboard workflow as the final shop operating sequence: Repairs, Assignments, Estimates, Parts Usage, Billing, Handover, optional Vendors, and Analytics review.

### After

The first dashboard card now explains the full shop workflow in order, and Logout stays available at the bottom of the sidebar.

### Files Modified

- `frontend-repair/src/layouts/AppLayout.jsx`
- `frontend-repair/src/pages/Dashboard.jsx`
- `backend-repair/design.md`

### Backend Contract Reference

No API contract changed. This is a frontend layout and onboarding-copy alignment using the existing ERP workflow screens.

### Verification

`npm run build` is run after this change to confirm the frontend compiles successfully.

---

## SaaS Phase 3 – Multi-Branch Data Isolation & Validation Schemas

### Problem

Owner users were unable to query data scoped to a specific branch, and write actions (such as ticket creation) performed by owners defaulted to the `MAIN` branch, rendering branch isolation ineffective at the owner level. 

Additionally, the Staff module list endpoint allowed owners to retrieve staff across the entire business but did not support filtering by branch.

### Root Cause

The frontend Axios request interceptor correctly appends the active `branchId` to query params (for GET) or request bodies (for POST/PATCH/PUT). However:
1. Zod validation schemas across key tenant-scoped modules (`repair`, `estimates`, `handover`, `billing`, `inventory`, `assignments`, and `vendors`) did not specify `branchId` in their shape. Consequently, Zod's `parse` method silently stripped `branchId` from validated data before reaching the controllers and service layer.
2. The Staff module list endpoint in `staffService.list` performed a hardcoded check restricting branch querying to `ADMIN` roles and lacked integration with the standard `resolveBranchFilter` utility.

### Before

- Zod schemas stripped `branchId` for tickets, estimates, billing, inventory, assignments, and handovers. Owner users selecting a branch on the frontend would see all records in list views, and created tickets were backfilled to the `MAIN` branch.
- The Staff list request (`GET /api/v1/staff`) for owners always returned all staff members of the business without branch isolation or branch-scoped filtering.

### After

- `branchId` validation has been added to all Zod schemas that receive inputs scoped by branch:
  - `createTicketSchema`, `listTicketsSchema`, `getTicketSchema`, `updateTicketStatusSchema`
  - `createEstimateSchema`, `getEstimateSchema`, `approvalActionSchema`
  - `handoverSchema`, `ticketCustodySchema`
  - `generateInvoiceSchema`, `listInvoicesSchema`, `getInvoiceSchema`, `collectPaymentSchema`, `customerLedgerSchema`
  - `consumePartsSchema`, `partsUsageHistorySchema`
  - `assignTechnicianSchema`, `reassignTechnicianSchema`, `getAssignmentHistorySchema`
  - `getVendorRepairJobSchema`
- Staff listing is validated via a new `listStaffSchema` query validator, and the controller passes query filters to `staffService.list`.
- `staffService.list` resolved the branch filter dynamically using the `resolveBranchFilter` utility, restricting admins to their branch and allowing owners to filter staff by `branchId`.

### Files Modified

- `backend-repair/src/modules/repair/validation.js`
- `backend-repair/src/modules/repair/estimates/validation.js`
- `backend-repair/src/modules/handover/validation.js`
- `backend-repair/src/modules/billing/validation.js`
- `backend-repair/src/modules/inventory/validation.js`
- `backend-repair/src/modules/assignments/validation.js`
- `backend-repair/src/modules/vendors/validation.js`
- `backend-repair/src/modules/staff/validation.js`
- `backend-repair/src/modules/staff/routes.js`
- `backend-repair/src/modules/staff/controller.js`
- `backend-repair/src/modules/staff/service.js`

### Verification

All modified files compile successfully. Syntax checks were verified with `node --check` across the entire codebase.

---

## SaaS Phase 3 – Admin Dashboard Simplification & Staff Management Scoping

### Problem

The `ADMIN` dashboard was previously identical to the `OWNER` dashboard, presenting high-level business analytics, utilization graphs, and KPI metrics that were irrelevant to branch-scoped administrators. In addition, the branch `ADMIN` had no direct way on their dashboard to add, disable, or reset passwords for technicians, and the standalone `Analytics` navigation was unnecessarily exposed to them.

### Root Cause

Admin users shared the generic dashboard template and routing configs with Owners under the broad `operator` role umbrella. The backend staff routes and service assertions also lacked checks allowing `ADMIN` users to perform activation adjustments or reset technician passwords within their assigned branch.

### Before

- Admins saw the analytics-heavy Owner dashboard including utilization graphs and financial KPI metrics.
- Admins could see the `Analytics` navigation link in the sidebar.
- Admins were blocked on the backend when attempting to disable, enable, or reset passwords of technician staff members.

### After

- A streamlined `AdminDashboard` was introduced for the `ADMIN` role. Heavy charts, KPIs, and graphs are replaced by a branch welcome section, quick action cards (Intake, Customers, Estimates, Billing), and a **Branch Staff Management** console.
- The dashboard-level staff console allows branch Admins to list, add, disable/enable, and reset passwords for branch technicians directly on the dashboard.
- The backend staff endpoints (`disable`, `enable`, `reset-password`) are updated to authorize `ADMIN` users.
- The `assertManagedStaff` helper enforces strict branch isolation: `ADMIN` users can only adjust active flags or reset passwords for technicians belonging to their own branch.
- The `Analytics` sidebar navigation link is restricted to the `OWNER` role, while the `Staff` link is exposed to both `OWNER` and `ADMIN` roles.

### Files Modified

- [routes.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/staff/routes.js)
- [service.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/staff/service.js)
- [navigation.js](file:///Users/company%20Project/Reparing/frontend-repair/src/layouts/navigation.js)
- [Dashboard.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Dashboard.jsx)

### Verification

All modified backend files pass integration test suites via `npm run test:integration` including auth and RBAC boundaries. The frontend compiles successfully via `npm run build`.

---

## Phase 4: Admin ↔ Technician Operational Workflow

### Problem

The operational lifecycle between branch `ADMIN` and `TECHNICIAN` was incomplete. Technicians did not have a status group to submit finished work for quality review before delivery, and the database lacked separate fields to track repair costs (labor, parts, vendor) and estimate profit margin. The Technician Repairs page was basic and lacked diagnostic entry inputs, actual parts consumption, and a unified execution panel.

### Root Cause

The initial design lacked the intermediate state `READY_FOR_REVIEW` and the corresponding roles boundaries where technicians request review and admin reviews/approves it. The financial costs were not automatically aggregated on the `RepairTicket` model.

### After

- **Database & Model:** Added `READY_FOR_REVIEW` to `TicketStatus` enum. Introduced separate cost tracking fields (`laborCost`, `partsCost`, `vendorCost`, `totalRepairCost`, `finalInvoiceAmount`, `profitEstimate`) and execution notes fields to `RepairTicket`.
- **Workflow & Rules:** Defined transitions from `IN_REPAIR`/`SENT_TO_VENDOR` to `READY_FOR_REVIEW` (triggered by technician) and then to `READY_FOR_DELIVERY` (triggered by admin).
- **Backend Linkages:** Parts consumption recalculates ticket `partsCost`, vendor jobs recalculate `vendorCost`, and invoicing updates `finalInvoiceAmount` - all dynamically updating `totalRepairCost` and `profitEstimate` inside transaction blocks.
- **Technician Workspace Redesign:** Redesigned `/technician/repairs` into a tabbed workspace (Assigned, Active, Pending Review, Completed) with a split panel showing execution details, form inputs (Diagnosis, Labor Cost, Est. Completion Time, Repair Notes), and an inline parts consumption console with live cumulative cost snapshot.
- **Admin Dashboard review queue:** Displays Completed Repairs Review Queue with actions to Approve, Return for rework, or Send to vendor, plus technician workload stats.
- **Integration Tests:** Updated `erp.integration.test.js` to assert the updated status lifecycle path.

### Files Modified

- [schema.prisma](file:///Users/company%20Project/Reparing/backend-repair/prisma/schema.prisma)
- [constants.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/repair/constants.js)
- [workflow.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/repair/workflow.js)
- [routes.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/repair/routes.js)
- [validation.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/repair/validation.js)
- [repository.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/repair/repository.js)
- [service.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/repair/service.js)
- [repository.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/inventory/repository.js)
- [repository.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/vendors/repository.js)
- [repository.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/billing/repository.js)
- [validation.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/assignments/validation.js)
- [repository.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/assignments/repository.js)
- [routes.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/analytics/routes.js)
- [controller.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/analytics/controller.js)
- [service.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/analytics/service.js)
- [repository.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/analytics/repository.js)
- [AssignedRepairs.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/AssignedRepairs.jsx)
- [Dashboard.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Dashboard.jsx)
- [erp.integration.test.js](file:///Users/company%20Project/Reparing/backend-repair/tests/integration/erp.integration.test.js)

### Verification

All backend tests pass via `npm run test:integration`. The frontend builds successfully via `npm run build`.

---

## Phase 4 Completion Audit & Screen Simplification

### Problem

An audit of the Phase 4 implementation identified fields on the billing (invoice generation), estimate, and handover screens that were overcomplicated and not optimized for real repair business operations.

- The billing / invoice form included internal options (`includeApprovedEstimate`, `includeActualUsage`) and manual extra item insertions that were confusing.
- The handover form included complex custody holders (technician, vendor, etc.) and routes not necessary for front-desk/admin delivery.
- The estimate detail screen was basic, and lacked variance analysis metrics, ticket condition details, and problem description.

### Root Cause

The frontend layouts exposed complex technical switches and parameters directly to the user rather than consolidating them to a single flow.

### After

- **Billing & Invoice Simplification:** Updated the invoice generation panel on [Billing.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Billing.jsx) to select candidate tickets and dynamically fetch details. Removed manual charge and source switches. Exposed read-only labor, parts, and vendor costs alongside inputs for Tax and Discount, calculating the Final Invoice Amount dynamically in the UI. Compile actual cost variables to manual items on submit.
- **Handover Simplification:** Streamlined the record handover panel on [Handover.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Handover.jsx) to only show Ticket selection, read-only Customer and Technician names, Delivery Date, and Notes, automatically routing it to a `RECEPTION_TO_CUSTOMER` custody transfer.
- **Estimate Detail Redesign:** Expanded [Estimates.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Estimates.jsx) to query related ticket details, displaying Customer Name/Phone/Email, Device Brand/Model/Serial/Condition, Problem description, Technician diagnosis notes, and Admin notes. Rendered an admin cost variance panel showing Estimated Cost, Approved Cost, Actual Cost, and Variance.
- **Workflow alignment:** Added `READY_FOR_REVIEW` to frontend status constants and transitions in [workflow.js](file:///Users/company%20Project/Reparing/frontend-repair/src/utils/workflow.js).

### Files Modified

- [workflow.js](file:///Users/company%20Project/Reparing/frontend-repair/src/utils/workflow.js)
- [Billing.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Billing.jsx)
- [Estimates.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Estimates.jsx)
- [Handover.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Handover.jsx)

### Verification

All database validations (`npm run db:validate`), integration tests (`npm run test:integration`), and production builds (`npm run build`) completed successfully.

---

## Phase 5: SaaS RBAC & Branch Workflow Refactor

### 1. SaaS Role Hierarchy & Isolation

#### Staff Creation & Role Assignments
* **Before / Problem:** Owners could create technicians directly and select arbitrary roles from dropdown menus when creating staff. Admins could see the staff menu but received an unauthorized error screen when accessing it.
* **After / Fix:**
  - Removed the role selection dropdown from both backend validations and frontend staff creation forms.
  - Creator roles now implicitly enforce the target role:
    - `OWNER` creates `ADMIN` members only.
    - `ADMIN` creates `TECHNICIAN` members only.
  - Updated frontend route guards in [AppRoutes.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/routes/AppRoutes.jsx) to grant `ADMIN` access to `/staff`, removing the unauthorized screen bug.

#### Staff & Branch Management Scope
* **Before / Problem:** Owners could manage and modify technician settings directly, violating SaaS branch boundaries where branch admins own the operational staff. Admins were not strictly isolated to managing technicians within their own branch.
* **After / Fix:**
  - In `staffService.assertManagedStaff`, enforced that Owners can only manage `ADMIN` members, and Admins can only manage `TECHNICIAN` members in their assigned `branchId`.
  - Staff listing in `staffService.list` dynamically limits visibility: Owners see only `ADMIN` members; Admins see only `TECHNICIAN` members belonging to their branch.
  - Modified staff creation to hide the branch selection dropdown for Admins, pre-selecting their branch automatically.

---

### 2. Login Branch Enforcement

#### Login branchName Validation
* **Before / Problem:** Branch staff (Admins and Technicians) could log in without specifying which branch they belonged to, which caused ambiguity in branch isolation and UI tracking.
* **After / Fix:**
  - Modified `loginSchema` in [validation.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/auth/validation.js) to accept `branchName`.
  - Updated `authService.login` to require `branchName` for `ADMIN` and `TECHNICIAN` accounts, validating it (case-insensitive) against the staff's assigned branch name.
  - Modified [Login.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Login.jsx) to include a "Branch Name" field in the form.

---

### 3. Operational Admin Dashboard

#### Analytics Dependency Removal
* **Before / Problem:** The Admin Dashboard was attempting to fetch metrics via the `/analytics/dashboard/admin` endpoint, which was failing with a "Route not found" error and crashing the dashboard query state.
* **After / Fix:**
  - Removed all code related to the `/dashboard/admin` route/controller/service on the backend.
  - Updated the active ticket listing query to select active assignments.
  - Redesigned [Dashboard.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Dashboard.jsx) to query `repairApi.list({ limit: 100 })` and `staffApi.list()` on the client side, then calculate Pending Tickets, Assigned Tickets, Ready For Review, Pending Billing, Pending Handover, and Technician Workloads dynamically.

---

### 4. Branch Creation Refactor

#### Optional Branch Code
* **Before / Problem:** Branch creation forced the Owner to input a branch code, which is typically something that can be auto-generated for simplicity.
* **After / Fix:**
  - Made the `code` field optional in the branch creation validator and form.
  - Added auto-generation logic in `branchService.create` to derive a unique code (uppercase prefix of name + random 3-digit suffix) if none is provided.

---

### Files Modified
- [validation.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/auth/validation.js)
- [repository.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/auth/repository.js)
- [service.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/auth/service.js)
- [routes.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/staff/routes.js) (Cleaned up redundant endpoints)
- [validation.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/staff/validation.js) (Made role optional and nullable in Zod schema)
- [service.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/staff/service.js) (Implemented role override and branch validation checks)
- [validation.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/branches/validation.js)
- [service.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/branches/service.js)
- [repository.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/repair/repository.js)
- [routes.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/analytics/routes.js)
- [controller.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/analytics/controller.js)
- [service.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/analytics/service.js)
- [repository.js](file:///Users/company%20Project/Reparing/backend-repair/src/modules/analytics/repository.js)
- [Login.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Login.jsx)
- [AppRoutes.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/routes/AppRoutes.jsx)
- [navigation.js](file:///Users/company%20Project/Reparing/frontend-repair/src/layouts/navigation.js)
- [StaffManagement.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/StaffManagement.jsx)
- [Dashboard.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/Dashboard.jsx)
- [BranchManagement.jsx](file:///Users/company%20Project/Reparing/frontend-repair/src/pages/BranchManagement.jsx)
- [modules.js](file:///Users/company%20Project/Reparing/frontend-repair/src/services/modules.js) (Cleaned up redundant createAdmin and createTechnician api calls)
- [erp.integration.test.js](file:///Users/company%20Project/Reparing/backend-repair/tests/integration/erp.integration.test.js) (Added Staff Creation Role & Branch Enforcement tests)

---

### Bug Fix: Owner Creating Technician instead of Admin
* **Problem:** In StaffManagement, Owner creates staff without role parameter since role selector is hidden. The Zod validator defaulted role to "TECHNICIAN" which was spread into database creation payload.
* **Fix:**
  - Removed default value for `role` in backend Zod schema.
  - Hardcoded target role inside `staffService.createStaff` (Owner -> ADMIN, Admin -> TECHNICIAN) and strictly mapped creation object keys instead of spreading payload.
  - Rejected any invalid role options provided in request body with `INVALID_ROLE_COMBINATION` error code.
  - Enforced that Admins can only assign staff to their own branch, throwing `STAFF_BRANCH_ACCESS_DENIED` / `BRANCH_ACCESS_DENIED`.
  - Added new integration tests proving these validations function correctly.





