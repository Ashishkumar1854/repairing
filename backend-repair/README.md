# backend-repair

Production-grade Repair ERP / Repair SaaS backend.

## Runtime Modes

Use one backend runtime at a time.

### Recommended: Docker Runtime

Docker owns the public local API port.

```bash
npm run docker:up
```

API:

```text
http://localhost:8000
```

Health check:

```bash
curl http://localhost:8000/health
```

### Local Node Runtime

Use this only if the Docker API container is stopped, or run local Node on the alternate development port:

```bash
npm run dev:local
```

Local Node API:

```text
http://localhost:8001
```

The default `npm run dev` uses `PORT` from `.env`. If Docker API is already running on `8000`, use `npm run dev:local` to avoid `EADDRINUSE`.

## Local Infrastructure Ports

| Service | Host Port | Container Port |
| --- | ---: | ---: |
| API | 8000 | 8000 |
| PostgreSQL | 5433 | 5432 |
| Redis | 6380 | 6379 |

## Database Commands

```bash
npm run prisma:deploy
npm run prisma:generate
npm run db:seed
```

## Manual ERP QA Flow

Before starting a new domain phase, run the stabilization checks against a clean Docker stack:

```bash
npm run docker:up
npm run prisma:deploy
npm run prisma:generate
npm run db:seed
npm run db:validate
```

Then use `docs/postman/backend-repair.postman_collection.json` with
`docs/postman/backend-repair.postman_environment.json`.

Recommended Postman order:

1. `Auth / Login`
2. `Repair Tickets / Create Ticket`
3. `Assignments / Assign Technician`
4. `Handover & Custody / Reception to Technician`
5. `Repair Estimates / Create Estimate`
6. `Repair Estimates / Approve Estimate`
7. `Inventory / Create Inventory Item`
8. `Repair Parts Usage / Consume Parts`
9. `Repair Tickets / Update Status`
10. `Handover & Custody / Technician to Reception`
11. `Billing / Generate Invoice`
12. `Billing / Collect Partial Payment`
13. `Billing / Collect Final Payment`
14. `Handover & Custody / Reception to Customer`
15. `Analytics / Owner Dashboard`

The Postman collection includes collection-level checks for the standard API
envelope and automatic extraction of access tokens and common IDs.

## Stabilization Report

The current backend QA notes live in:

```text
docs/QA_REPORT.md
```
