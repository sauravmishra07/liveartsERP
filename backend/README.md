# Live Arts ERP — Backend (NestJS)

## Setup

```bash
cp .env.example .env     # set MONGO_URI + JWT secrets
npm install
npm run seed             # branches + super admin (idempotent)
npm run start:dev        # http://localhost:3000/api/v1
```

Swagger UI: **http://localhost:3000/api/docs**

## Scripts

| Command | What |
|---------|------|
| `npm run start:dev` | watch-mode dev server |
| `npm run build` | compile to `dist/` |
| `npm run start:prod` | run compiled build |
| `npm run seed` | seed branches + super admin |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | eslint --fix |
| `npm test` | unit tests |

## Environment

See [`.env.example`](./.env.example). Required: `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
`ENABLE_QUEUES=true` needs a reachable Redis (`REDIS_URL`). Validated at boot via Joi — the app
refuses to start if misconfigured.

## Architecture

NestJS modular structure (Requirements §5):

```
src/
├── main.ts                 bootstrap: helmet, CORS, global prefix /api/v1, ValidationPipe, Swagger
├── app.module.ts           wires config, Mongoose, Throttler, Redis, feature modules + global guards/filters/interceptors
├── config/                 configuration.ts + Joi env.validation.ts
├── common/
│   ├── enums/              single source of truth for all domain enums
│   ├── decorators/         @Public, @Roles, @CurrentUser
│   ├── guards/             JwtAuthGuard (global), RolesGuard (global)
│   ├── filters/            AllExceptionsFilter (uniform safe errors)
│   ├── interceptors/       Transform (success envelope) + Logging
│   ├── dto/                pagination
│   ├── redis/              resilient ioredis wrapper (degrades if down)
│   └── utils/              IST date utils, server-side branch scoping
├── health/                 GET /health (mongo + redis status)
├── users/                  User schema + service
├── branches/               Branch schema + CRUD (RBAC)
└── auth/                   login/refresh/logout/me, JWT strategy, Redis refresh store
```

## Auth model

- **Access token** (15m) — `{ sub, email, role, branchId }`, signed with `JWT_ACCESS_SECRET`.
- **Refresh token** (7d) — `{ sub, jti }`, whitelisted in Redis; **rotated** on every refresh.
- Redis down in dev → in-memory refresh store (logged loudly). Production requires Redis.
- Roles: `SUPER_ADMIN, BRANCH_ADMIN, STAFF, TEACHER, EMPLOYEE, STUDENT, PARENT`.
- Branch scope enforced server-side (`common/utils/branch-scope.util.ts`) — client `branchId` never trusted.

## Endpoints (Phase 1–2)

```
GET  /api/v1/health
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
GET  /api/v1/branches          (super-admin: all; others: own)
GET  /api/v1/branches/:id
POST /api/v1/branches          (SUPER_ADMIN)
PATCH /api/v1/branches/:id      (SUPER_ADMIN)
```

## Verified

Against MongoDB Atlas: build ✅ · seed ✅ · health ✅ (`mongo: connected`) · login ✅ ·
`/me` ✅ · 401 without token ✅ · refresh rotation ✅ (reused token rejected) · branch RBAC ✅.

## Notes / limitations

- **Redis/BullMQ:** wired for Phase 9/11; queues gated by `ENABLE_QUEUES`. Bring up Redis with the
  root `docker compose up -d redis` (Docker was unavailable in the build sandbox, so live Redis
  wasn't exercised here — the graceful-degradation path was).
- Tests land in Phase 12 (fee/attendance/status/payroll are the priority per Requirements §33).
