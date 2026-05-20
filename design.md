# backend-repair Engineering Design

## 1. Project Overview

`backend-repair` is the backend service for a production-grade Repair ERP / Repair SaaS platform. It manages the complete operational lifecycle of repair jobs for businesses that receive, diagnose, estimate, repair, outsource, bill, and hand over customer devices or assets.

The platform is designed as a multi-tenant SaaS backend where each repair business operates in an isolated business context while sharing the same infrastructure, codebase, and operational platform. The long-term vision is to support repair shops, service centers, refurbishing teams, vendor repair networks, and B2B repair workflows from a single extensible backend.

### Repair ERP Vision

The Repair ERP is not only a ticketing system. It is intended to become the operational system of record for repair businesses, covering:

| Capability | Purpose |
| --- | --- |
| Repair intake | Register devices, customer issues, accessories, condition, and ownership context |
| Diagnosis | Capture technician findings, media, checklists, and issue categorization |
| Estimate workflow | Separate quoted cost from actual repair consumption |
| Repair execution | Track assignments, status transitions, parts usage, notes, and internal work |
| Outsource/vendor repair | Move jobs outside the business with accountability and traceability |
| Handover | Maintain audit-safe transfer of custody between staff, vendors, and customers |
| Payments | Track repair-specific billing, advances, balances, and settlement state |
| Audit trail | Preserve lifecycle history for disputes, compliance, and operational review |

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

| Candidate Service | Reason for Possible Extraction |
| --- | --- |
| Notifications | High-volume asynchronous delivery and provider-specific scaling |
| Integrations | External API instability, retries, rate limits, and provider isolation |
| Inventory | Separate ledger consistency, stock reconciliation, and warehouse workflows |
| Vendor network | Cross-business interactions and marketplace-style workflows |
| Queue workers | Independent scaling for background jobs and long-running tasks |

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

| Goal | Description |
| --- | --- |
| Internal repair workflow | Track jobs from intake through diagnosis, estimate, assignment, repair, payment, and handover. |
| Outsource repair | Allow repair jobs to be sent outside the business while preserving job state, cost, and custody history. |
| Vendor repair | Support vendor assignment, vendor estimates, vendor status, external job references, and return handling. |
| Future B2B repair transfer | Enable one business to transfer repair work to another business in a controlled network. |
| Audit-safe lifecycle | Preserve immutable event history for status changes, handovers, estimates, usage, and ownership transitions. |

The system must support operational confidence. A business should be able to answer who had the item, what changed, who approved it, what was quoted, what was actually used, and why the final bill differs from the original estimate.

## 4. Tech Stack

| Technology | Role | Selection Rationale |
| --- | --- | --- |
| Node.js | Runtime | Provides high-throughput I/O, a large ecosystem, strong JSON/API ergonomics, and excellent fit for SaaS backends with asynchronous workflows. |
| Express.js | HTTP framework | Lightweight, mature, predictable, and easy to structure around explicit routing, middleware, controllers, and services. |
| PostgreSQL | Primary database | Strong relational consistency, transactions, constraints, indexing, JSON support, and mature operational tooling. Ideal for audit-safe ERP workflows. |
| Prisma ORM | Data access | Type-safe database client, migration support, clear schema modeling, and improved developer productivity for a Node.js/PostgreSQL stack. |
| Redis | Cache and queue backend | Supports caching, rate limiting, session-adjacent use cases, idempotency keys, distributed locks, and BullMQ job processing. |
| Docker | Runtime packaging | Provides repeatable local development, predictable deployment artifacts, and environment parity across development, staging, and production. |
| JWT | Authentication token format | Stateless API authentication, easy propagation across services, and compatibility with future frontend and mobile clients. |
| Zod | Validation | Runtime-safe request validation with composable schemas and TypeScript-ready inference for future type-safe development. |
| BullMQ | Background jobs | Reliable Redis-backed queue processing for notifications, webhooks, reminders, SLA jobs, reports, and external integration retries. |

## 5. Database Design Summary

The database model is centered on tenant-safe repair operations. Tables are designed to preserve business ownership, customer ownership, job lifecycle, financial expectations, actual consumption, custody transfers, and audit history.

### Key Tables

| Table | Purpose |
| --- | --- |
| `businesses` | Represents each tenant/business using the platform. Owns configuration, business identity, and subscription-level context. |
| `customers` | Stores customer profiles scoped to a business, including contact and ownership context for repair jobs. |
| `repair_tickets` | Primary repair job record. Tracks customer, business, job number, device/item context, current status, priority, source, and lifecycle metadata. |
| `repair_estimates` | Stores quoted repair costs, labor, expected parts, customer approval state, and estimate validity. |
| `repair_parts_usage` | Records actual parts consumed during repair execution, linked to inventory where applicable. |
| `repair_handover_logs` | Records custody movement between customer, staff, vendors, departments, or external parties. |
| `repair_status_logs` | Immutable history of repair status transitions, including actor, timestamp, old status, new status, and reason/context. |
| `repair_ticket_links` | Links related repair tickets, split jobs, repeat repairs, warranty claims, rework, or transferred jobs. |

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

| Layer | Responsibility |
| --- | --- |
| Route | Maps HTTP methods and paths to controller handlers. |
| Middleware | Handles authentication, tenant context, authorization, request metadata, and rate limiting. |
| Validation | Validates request body, params, and query payloads before business logic runs. |
| Controller | Translates HTTP input/output and delegates use cases to services. |
| Service | Owns business rules, transactions, workflow decisions, and orchestration. |
| Repository | Encapsulates Prisma queries and tenant-safe data access. |

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

| Error Type | Example |
| --- | --- |
| Validation error | Invalid status transition payload |
| Authentication error | Missing or expired JWT |
| Authorization error | Staff member lacks repair approval permission |
| Tenant access error | Ticket does not belong to authenticated business |
| Conflict error | Estimate already approved or ticket already closed |
| Not found error | Customer or ticket not found within tenant |
| External dependency error | Vendor API or notification provider failure |

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

| Roadmap Item | Description |
| --- | --- |
| AI diagnosis | Suggest likely issues from symptoms, device model, history, media, and technician notes. |
| AI estimate suggestions | Recommend labor, parts, price ranges, and confidence levels based on historical repairs. |
| Predictive repair time | Estimate turnaround time using repair type, technician capacity, part availability, and vendor SLA. |
| Vendor network | Build a verified network of repair vendors with pricing, SLA, ratings, and service categories. |
| Repair marketplace | Allow businesses to outsource jobs, accept jobs, quote services, and settle B2B repair work. |

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
