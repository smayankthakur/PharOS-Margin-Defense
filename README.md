# PharOS — Margin Defense

## Backend Engine (Step 2-5)

### Services
- `packages/db`: Prisma schema + client + migrations
- `packages/shared`: deterministic pricing engine + unit tests
- `apps/api`: NestJS Fastify API with RBAC + tenant guard
- `apps/worker`: BullMQ alert engine

### Required env
- `DATABASE_URL` (required by Prisma client)
- `REDIS_URL` (required by worker)
- `JWT_SECRET`
- `CORS_ORIGIN`
- `API_PORT`

Use:
- `apps/api/.env.example`
- `apps/worker/.env.example`

### Migration commands
```bash
corepack pnpm --filter @pharos/db db:generate
corepack pnpm --filter @pharos/db db:migrate
corepack pnpm --filter @pharos/db db:reset
```

### Run backend locally
```bash
docker compose up -d postgres redis
corepack pnpm --filter @pharos/api dev
corepack pnpm --filter @pharos/worker dev
```

### Worker behavior
- Repeat job every 15 minutes on BullMQ queue `alert-engine`
- Rules:
  - MAP/MRP scan over last 30 days `SaleRow`
  - UNDERCUT scan from latest snapshot per `skuId+competitorId`
  - DEAD_STOCK for SKUs with no sale in last 90 days
- Duplicate prevention via `Alert` unique key: `@@unique([tenantId, dedupeKey])`

### Manual test: trigger one MAP alert
1. Insert a tenant/user/sku/dealer/sale row in DB (where sale `soldPrice < sku.map`).
2. Login:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"owner@example.com","password":"password123"}'
```
3. Wait for worker run (or enqueue a job by restarting worker).
4. Fetch alerts:
```bash
curl http://localhost:4000/api/alerts \
  -H "authorization: Bearer <TOKEN_FROM_LOGIN>"
```

### Validation run executed
```bash
corepack pnpm --filter @pharos/shared test
corepack pnpm --filter @pharos/shared lint
corepack pnpm --filter @pharos/api lint
corepack pnpm --filter @pharos/api test
corepack pnpm --filter @pharos/worker lint
corepack pnpm --filter @pharos/db db:generate
```
