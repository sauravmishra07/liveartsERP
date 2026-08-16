# Live Arts ERP

Full-stack ERP for a multi-branch performing-arts academy (Dance, Fitness, Vocal, Guitar, etc.).
Reverse-engineered from the existing Zoho Creator app — see [`Requirements.md`](./Requirements.md), the **source of truth** for all business logic.

- **Backend:** NestJS · MongoDB (Mongoose) · Redis · BullMQ · JWT (access + refresh) · Swagger
- **Frontend:** React (web) · Vite · JSX · react-router · TanStack Query · feature-based architecture

## Structure

npm **workspaces** — install once at the root and both packages are wired up.

```
live-arts-erp/  (this folder)
├── package.json            workspace root (build/dev/test scripts)
├── backend/                NestJS API              ← workspace
├── web/                    React (Vite) web app    ← workspace
├── netlify/functions/      api.js + scheduled jobs (Netlify deploy)
├── netlify.toml            build, redirects, cron schedules
├── frontend-expo-archive/  deprecated Expo app (safe to delete)
├── docs/                   architecture, api, business-rules, deploy, user guide
├── docker-compose.yml      local Redis
├── Requirements.md         business spec (source of truth)
└── README.md
```

## Deployment

Frontend and API deploy together as one Netlify site — the whole Nest app runs as a
single function behind an `/api/*` rewrite, so there is no CORS and one URL serves
everything. See **[docs/DEPLOY-NETLIFY.md](./docs/DEPLOY-NETLIFY.md)** — it covers the
env vars, the Atlas IP allowlist, and the two serverless caveats (scheduled jobs are
replaced by Netlify Scheduled Functions; refresh tokens need a hosted Redis).

## Prerequisites

- Node.js ≥ 20 (tested on 22)
- A MongoDB connection string (Atlas or local)
- Redis (via `docker compose up -d redis`) — required for BullMQ jobs; the API also
  runs without it in dev (refresh tokens fall back to in-memory, jobs disabled).

## Quick start

**0. Install (once, at the repo root — installs both workspaces)**
```bash
npm install
```

**1. Backend**
```bash
cp backend/.env.example backend/.env   # fill MONGO_URI + JWT secrets
npm run seed                  # branches (NIT 5, Jawahar Colony) + super admin + SAMPLE dataset
npm run dev:backend           # http://localhost:3000/api/v1  · docs: /api/docs
npm test                      # unit tests (fee math, IST date utils)
```

**2. Redis (for jobs / real refresh store)**
```bash
docker compose up -d redis    # then set ENABLE_QUEUES=true in backend/.env
```

**3. Frontend (React web)**
```bash
cp web/.env.example web/.env  # VITE_API_URL defaults to http://localhost:3000/api/v1
npm run dev:web               # http://localhost:5173
```
Open http://localhost:5173 in your browser. `localhost` works because the browser
runs on the same machine as the API.

## Default login (after seed)

```
email:    admin@livearts.local
password: Admin@12345
```

## Security

- **No secrets in source.** `MONGO_URI`, JWT secrets, WhatsApp tokens live only in `.env` (gitignored).
- The Mongo/Zoho credentials shared during setup were exposed in plaintext — **rotate them.**
- Branch authorization is enforced **server-side**; the client's `branchId` is never trusted.

## Seed / sample data

`npm run seed` is idempotent. It always ensures the two real `.ds` branches + the
super admin, and — on an empty DB — loads a **realistic sample dataset** (5 employees,
7 batches, 36 students, fee payments, attendance, enquiries, expenses) run through the
real engines so every derived field (overdue tiers, student status, payroll, batch
financials) is correct. The dashboards/reports are fully populated out of the box.

The sample records are clearly synthetic and meant to be **replaced by a real Zoho CSV
export** later. To wipe and reseed:

```bash
npx ts-node -r tsconfig-paths/register src/reset-data.ts   # clears operational data, keeps branches + users
npm run seed
```

## Implementation status (per Requirements §41 phases) — all complete

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Monorepo, Nest bootstrap, config, health, Swagger, Redis, docker | ✅ done & verified |
| 2 | Auth: users, login/refresh/logout/me, RBAC, branch guard, seed | ✅ done & verified |
| 3 | Branches, batches, employees, students (CRUD, filters, detail) | ✅ done & verified |
| 4 | Attendance (mark, batch roster, 7-day strip §6.4) | ✅ done & verified |
| 5 | Fee engine: point-of-collection calc, due dates, overdue tiers (§6.1–6.2) | ✅ done & verified |
| 6 | Student-status state machine (§6.3) | ✅ done & verified |
| 7 | Payroll (Fixed/Class-wise/Percentage §6.7) + expenses, recurring (§6.8) | ✅ done & verified |
| 8 | CRM: enquiries, demos, follow-ups, convert-to-student (§6.x) | ✅ done & verified |
| 9 | WhatsApp: provider abstraction, templates, fee-confirmation hook | ✅ done & verified |
| 10 | Dashboards (KPIs, status chart, batch financials §6.9) + Reports | ✅ done & verified |
| 11 | Scheduled jobs: BullMQ daily/monthly + manual admin triggers (§7) | ✅ done (BullMQ dormant until Redis) |
| 12 | Tests (fee math, dates), security (helmet/CORS/throttle/body-limit), code-splitting, docs | ✅ done & verified |

**Not yet done:** live BullMQ schedules require Redis (`docker compose up -d redis` +
`ENABLE_QUEUES=true`); a CSV importer to replace the sample data with real Zoho records.

See [`docs/architecture.md`](./docs/architecture.md) and [`backend/README.md`](./backend/README.md).
