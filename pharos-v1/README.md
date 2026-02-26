# PharOS V1

Margin Defense / Price Intelligence OS for B2B distributors.

## Architecture

Monorepo (pnpm + turbo):
- `apps/web`: Next.js App Router + NextAuth Credentials + Tailwind
- `apps/api`: NestJS (Fastify) REST API
- `apps/worker`: BullMQ worker for alert generation
- `packages/db`: Prisma schema/client
- `packages/shared`: zod schemas + pricing math
- `packages/ui`: shared UI tokens

Data flow:
1. Web authenticates via `POST /api/auth/login` through NextAuth Credentials.
2. API issues JWT with `{ userId, tenantId, role }` claims.
3. Web calls API only (no direct DB access).
4. Worker runs every 15 minutes to generate MAP/MRP/UNDERCUT/DEAD_STOCK alerts.

## Local Run

1. Install dependencies:
```bash
corepack pnpm install
```

2. Start infra:
```bash
docker compose up -d
```

3. Copy envs:
- Copy app env examples:
```bash
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
```
- `.env.local` is gitignored; do not commit secrets.

4. Generate/migrate DB:
```bash
corepack pnpm --filter @pharos/db db:generate
corepack pnpm db:migrate
```

5. Start all apps:
```bash
corepack pnpm dev
```

6. Seed deterministic demo tenant:
```bash
corepack pnpm db:seed
```

## Scripts

```bash
corepack pnpm dev
corepack pnpm build
corepack pnpm lint
corepack pnpm test
corepack pnpm typecheck
corepack pnpm db:migrate
corepack pnpm db:seed
```

## Smoke Test Checklist

- [ ] `GET /api/health` returns `{ ok: true }`
- [ ] Login works for seeded users (`owner@demo.pharos`, etc)
- [ ] `/app/dashboard` loads KPI cards and breach trend
- [ ] `/app/alerts` filters by status/type/severity/range/search
- [ ] `/app/alerts/:id` shows rule + math + timeline + evidence
- [ ] `/app/tasks` shows mine/all and status updates
- [ ] Worker creates deduped alerts on seeded data (>=10)
- [ ] Tenant isolation: user from tenant A cannot read tenant B records

## Demo Script (Client)

1. Open `/demo`.
2. Click **Reset Demo Data**.
3. Click **Enter Demo**.
4. On dashboard:
- Show Revenue Leak, MAP, and MRP KPI cards.
- Show undercut and dead stock risk cards.
- Show breach trend and top breaches list.
5. Click a top breach row to open `/app/alerts/:id`.
6. On alert detail, show rule, evidence, create a task, and update alert status.
7. Open `/app/tasks`, switch My/All (Owner/Ops), and update task status.

## Deployment Notes

### Vercel (`apps/web`)
- Root Directory: `apps/web`
- Install Command: `corepack pnpm install --frozen-lockfile`
- Build Command: `corepack pnpm --filter @pharos/web build`
- Start Command: `corepack pnpm --filter @pharos/web start`
- Env vars: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `API_URL`

### Render API (Web Service)
- Root Directory: repo root
- Build Command: `corepack pnpm install --frozen-lockfile && corepack pnpm --filter @pharos/api build`
- Start Command: `corepack pnpm --filter @pharos/api start`
- Env vars: `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGIN`, `JWT_SECRET`, `ADMIN_SEED_TOKEN`, `RATE_LIMIT_BACKEND`, `API_PORT`, `LOG_LEVEL`

### Render Worker (Background Worker)
- Root Directory: repo root
- Build Command: `corepack pnpm install --frozen-lockfile && corepack pnpm --filter @pharos/worker build`
- Start Command: `corepack pnpm --filter @pharos/worker start`
- Env vars: `DATABASE_URL`, `REDIS_URL`, `LOG_LEVEL`

## Required Env Vars

- `DATABASE_URL`
- `REDIS_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `API_URL`
- `CORS_ORIGIN`
- `ADMIN_SEED_TOKEN`
- `DEMO_EMAIL`
- `DEMO_PASSWORD`
- `RATE_LIMIT_BACKEND=redis|memory`
