# PharOS V1

Margin Defense / Price Intelligence OS for B2B distributors.

## Architecture

- `apps/web`: Next.js App Router + NextAuth Credentials + Tailwind
- `apps/api`: NestJS + Fastify REST API
- `apps/worker`: BullMQ worker (15-minute alert scan)
- `packages/db`: Prisma schema/client
- `packages/shared`: shared zod + pricing math
- `packages/ui`: shared UI primitives/tokens

Auth flow:
- Web uses NextAuth Credentials.
- NextAuth server-side `authorize()` calls API (`/api/auth/login` or `/api/demo/login`).
- API returns JWT token + tenant/role claims.
- Web server calls API with bearer token from session.

## Local Setup

1. Install deps:
```bash
corepack pnpm install
```

2. Create env files:
```bash
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
```

3. Start full stack:
```bash
corepack pnpm dev
```

4. Run migrations (if needed):
```bash
corepack pnpm db:migrate
```

## Commands

```bash
corepack pnpm dev
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm smoke
corepack pnpm db:migrate
corepack pnpm db:seed
```

## Deployment Runbook

### Vercel (Web)

- Project root directory: `apps/web`
- Build command: `corepack pnpm --filter @pharos/web build`
- Install command: `corepack pnpm install --frozen-lockfile`
- Required env vars:
  - `NODE_ENV=production`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL=https://<vercel-domain>`
  - `API_URL=https://<render-api-domain>`
  - `NEXT_PUBLIC_API_URL=https://<render-api-domain>`
  - `ADMIN_SEED_TOKEN` (server-only)
  - `DEMO_EMAIL` (server-only)
  - `DEMO_PASSWORD` (server-only)

### Render (API Web Service)

- Use `render.yaml` service: `pharos-api`
- Health check: `/health`
- Build command:
  - `corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm --filter @pharos/db db:generate && corepack pnpm --filter @pharos/api build`
- Start command:
  - `corepack pnpm --filter @pharos/api start`
- Required env vars:
  - `NODE_ENV=production`
  - `PORT` (provided by Render)
  - `DATABASE_URL`
  - `REDIS_URL`
  - `CORS_ORIGIN=https://<vercel-domain>`
  - `ADMIN_SEED_TOKEN`
  - `RATE_LIMIT_BACKEND=redis`
  - `JWT_SECRET`
  - `API_URL=https://<render-api-domain>`
  - `LOG_LEVEL=info`

### Render (Worker Background Service)

- Use `render.yaml` service: `pharos-worker`
- Build command:
  - `corepack enable && corepack pnpm install --frozen-lockfile && corepack pnpm --filter @pharos/db db:generate && corepack pnpm --filter @pharos/worker build`
- Start command:
  - `corepack pnpm --filter @pharos/worker start`
- Required env vars:
  - `NODE_ENV=production`
  - `DATABASE_URL`
  - `REDIS_URL`
  - `RATE_LIMIT_BACKEND=redis`
  - `LOG_LEVEL=info`

## Database Migration Procedure

- Local/dev:
```bash
corepack pnpm db:migrate
```

- Production (Render release command or manual):
```bash
corepack pnpm --filter @pharos/db db:deploy
```

Migrations are forward-only.

## Smoke Test Checklist

- [ ] `GET /health` returns `{ ok: true }`
- [ ] `POST /api/admin/seed?demo=true` with `x-admin-seed-token` succeeds
- [ ] `POST /api/demo/login` succeeds with demo credentials
- [ ] `GET /api/alerts?status=OPEN&range=30d` succeeds with bearer token
- [ ] `GET /api/tasks?mine=true` succeeds with bearer token
- [ ] `corepack pnpm smoke` passes

## Demo Script (Client)

1. Open `/demo`
2. Click `Reset Demo Data`
3. Click `Enter Demo`
4. On dashboard, show KPI cards (Revenue Leak / MAP / MRP)
5. Open top breach row to `/app/alerts/[id]`
6. Create a task on the alert detail page
7. Change alert status to `ACK` or `RESOLVED`

## Rollback Plan

- Web rollback: redeploy previous Vercel build.
- API/Worker rollback: redeploy previous Render revision.
- Keep DB migrations forward-only; do not roll back migration files in production.
- If deploy fails after migration:
  - roll back app services first,
  - apply a corrective forward migration,
  - redeploy fixed services.
