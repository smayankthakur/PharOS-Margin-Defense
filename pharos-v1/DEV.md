# PharOS Local Development

## One-command startup

From repo root (`pharos-v1`):

```bash
corepack pnpm install
corepack pnpm dev
```

`pnpm dev` does all of the following:
- Starts Docker infra (`postgres`, `redis`)
- Starts API on `http://localhost:4000`
- Starts worker
- Starts web UI on `http://localhost:3000`

## Verify services

```bash
curl http://localhost:4000/health
```

Expected:

```json
{"ok":true}
```

Open:
- `http://localhost:3000/demo`

Then click:
1. `Reset Demo Data`
2. `Enter Demo`

## Demo API checks

```bash
curl -X POST http://localhost:4000/api/demo/seed
curl -X POST http://localhost:4000/api/demo/login -H "Content-Type: application/json" -d '{"email":"demo@pharos.local","password":"Demo@12345"}'
```

## Automated smoke

```bash
corepack pnpm smoke
```

## Required env files

Create these files before running:

- `apps/api/.env`
- `apps/web/.env.local`
- `apps/worker/.env`

Use each app's `.env.example` as the base.
For web local env, copy:
```bash
cp apps/web/.env.local.example apps/web/.env.local
```
Do not commit `apps/web/.env.local`.

Important local values:
- API must run on `http://localhost:4000`
- Web should use `NEXT_PUBLIC_API_URL=http://localhost:4000`
- `ADMIN_SEED_TOKEN` must match in web + api env

## Troubleshooting

### Docker not installed / not running

Symptoms:
- `pnpm dev` fails at `docker compose up`
- API later fails with DB/Redis connection errors

Fix:
1. Install Docker Desktop
2. Start Docker Desktop
3. Run:
   ```bash
   docker compose up -d postgres redis
   ```

### Port conflict on 3000 or 4000

Symptoms:
- Next.js fails on 3000
- API fails on 4000

Fix:
1. Find process using the port
2. Stop that process
3. Re-run `corepack pnpm dev`

### Missing env vars

Symptoms:
- Demo page shows seed/auth env errors
- Login fails

Fix:
1. Confirm `apps/web/.env.local` has:
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `API_URL`
   - `NEXT_PUBLIC_API_URL`
   - `ADMIN_SEED_TOKEN`
   - `DEMO_EMAIL`
   - `DEMO_PASSWORD`
2. Confirm `apps/api/.env` has:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `ADMIN_SEED_TOKEN`
3. Ensure seed token matches web + api.

### DB not reachable

Symptoms:
- API boot errors mentioning Postgres connection
- Seed endpoint fails with server error

Fix:
1. Run:
   ```bash
   docker compose ps
   ```
2. Ensure `postgres` is healthy/running
3. Check `DATABASE_URL` in `apps/api/.env` points to local Postgres (`localhost:5432`)
4. Run migrations:
   ```bash
   corepack pnpm db:migrate
   ```
