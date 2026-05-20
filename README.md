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
