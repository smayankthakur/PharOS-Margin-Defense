# PharOS “Margin Defense” — V1 Lock Document

## Locked scope: PharOS “Margin Defense” V1

### V1 Promise (cannot change without a new version)
MAP/MRP breaches ? ? impact math ? tasks ? bulk enforcement batches ? execution feed ? post-run reports  
Everything else is V2+.

### Only workflows in V1
1) Dealer breach (MAP/MRP)  
2) Competitor undercut (only if snapshots already exist in DB) — optional  
3) Dead stock (90+ days) (only if inventory aging exists) — optional

### Roles (RBAC locked)
- Owner: everything  
- Ops: enforcement + dealer status + task ops  
- Sales: tasks + notes + close loop (no enforcement)  
- Viewer: read-only

### Demo dataset locked
- 1 tenant, 4 users (one per role)
- 3 SKUs, 2 dealers, 1 competitor
- ~12 alerts with evidence
- ~10 tasks
- 2 batches (1 completed, 1 running)

### Definition of Done (V1)
- Dashboard is DB-backed (not hardcoded)
- Alert drilldown shows rule + math + timeline + evidence
- Bulk enforcement creates batch + items + logs + tasks
- Execution screen shows live progress
- Reports show outcomes + deltas
- Tenant isolation + audit log + basic security

---

## Locked phases & steps (no drift)

### Phase 0 — Lock & Proof (documentation + tests)
- 0.1 Create PHASE0.md (this lock)
- 0.2 Create DoD.md (Definition of Done)
- 0.3 Create RBAC.md (permission matrix)
- 0.4 Create DEMO_DATA_SPEC.md (seed spec)
- 0.5 Create SMOKE_TESTS.md (curl + UI flows)

### Phase 1 — Repo Foundations
- 1.1 Monorepo or single repo chosen once (no flip-flop)
- 1.2 Next.js (App Router) + TypeScript + Tailwind (local)
- 1.3 Prisma + Postgres + migrations + seed
- 1.4 CI: lint + typecheck + prisma validate
- 1.5 /api/health endpoint

### Phase 2 — Data Model + Seed
- 2.1 Prisma schema (Tenant/User/RBAC + Alerts/Tasks/Batches/Evidence/Audit)
- 2.2 Seed script exactly matching demo dataset
- 2.3 Deterministic IDs in seed (so UI deep-links work)

### Phase 3 — Auth + Tenant Isolation + RBAC + Audit
- 3.1 Auth working (session user includes tenantId + role)
- 3.2 Tenant scoping enforced in every query
- 3.3 RBAC guard middleware for APIs
- 3.4 AuditLog auto-write on every mutation

### Phase 4 — API v1 (make screens real)
- 4.1 GET /api/dashboard/summary
- 4.2 Alerts: list + detail + evidence + timeline + patch
- 4.3 Tasks: list + create + patch
- 4.4 Dealers: list + detail summary + patch status
- 4.5 Search: GET /api/search?q=

### Phase 5 — Bulk Enforcement + Execution
- 5.1 Preview: POST /api/enforcement/preview
- 5.2 Create batch: POST /api/enforcement/batches
- 5.3 Start batch: POST /api/enforcement/batches/:id/start
- 5.4 Live feed: GET /api/execution/stream?batchId= (SSE)
- 5.5 Batch items + logs stored + shown

### Phase 6 — Reports
- 6.1 GET /api/reports/enforcement/:batchId
- 6.2 CSV export (optional V1)

### Phase 7 — Hardening
- 7.1 Zod validation for all inputs
- 7.2 Pagination/filtering everywhere
- 7.3 Error handling contract
- 7.4 Security headers + rate limit (optional Redis)

### Phase 8 — Deploy (Vercel + Render)
- 8.1 Env contract frozen (.env.example matches exactly)
- 8.2 Migration strategy locked (Render release command)
- 8.3 Smoke tests run on deploy

---

## Issue register (what can go wrong) + fixes (hard rules)

1) Scope creep  
- Fix: Any new workflow becomes V2 unless it directly supports DoD.

2) Stack ambiguity (switching frameworks midstream)  
- Fix: V1 uses Next.js route handlers for API. Workers added only in Phase 5.3+.

3) Data model drift (UI requires rule/math/evidence but DB can’t support)  
- Fix: Evidence tables are mandatory in Phase 2: EvidenceSaleRow + EvidenceSnapshot tied to Alert.

4) Hardcoded demo never replaced  
- Fix: By end of Phase 4, zero KPIs are hardcoded. Only branding constants remain static.

5) Multi-tenancy leaks  
- Fix: tenantId injected from session; every query enforces where: { tenantId }. Add 2-tenant test.

6) Enforcement runs not reproducible  
- Fix: Batch writes are append-only: EnforcementBatch, BatchItem, AuditLog. Store resultJson for actions.

7) Live execution too complex too early  
- Fix: V1 uses SSE + DB polling fallback.

8) Deploy failures (migrations/env mismatch)  
- Fix: One env contract + one migration contract:
  - .env.example is source of truth
  - Render release runs prisma migrate deploy
  - DATABASE_URL is never localhost in production

---

## Locked smoke tests (must pass at end of each phase)

### Phase 1
- /api/health returns { ok: true }
- routes render: /, /dealers, /bulk, /execution, /reports, /alert/[id]

### Phase 2
- prisma migrate dev works
- prisma db seed creates demo tenant + alerts + tasks

### Phase 4
- Dashboard loads from API
- Clicking a breach opens /alert/:id and shows evidence rows

### Phase 5
- Create a batch from bulk wizard
- Start it
- Execution feed shows progress until complete

### Phase 6
- Report for batch shows totals and deltas

---

## Output requirements
- Ensure the file name is exactly: "PharOS - Margin Defense V1.md"
- Ensure it is valid Markdown
- Commit-ready content (no placeholders)

## Now execute
1) Create the file at repo root.
2) Write the full content above into it.
3) Do not modify any other files.
