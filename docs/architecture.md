# Architecture

```
┌──────────────────────┐        REST / JSON        ┌───────────────────────────┐
│  Expo React Native   │  ───────────────────────► │       NestJS Backend      │
│  (Expo Go, TS)       │   Bearer access token     │   /api/v1  + Swagger      │
│  feature-based       │  ◄─────────────────────── │                           │
└──────────────────────┘   refresh-token rotation  └───────────┬───────────────┘
                                                                │
                        ┌───────────────────────────────────────┼───────────────────────┐
                        ▼                    ▼                    ▼                       ▼
                  ┌───────────┐        ┌───────────┐       ┌───────────┐         ┌──────────────┐
                  │  MongoDB  │        │   Redis   │       │  BullMQ   │         │   WhatsApp   │
                  │ (Mongoose)│        │ sessions/ │       │  jobs     │         │  provider    │
                  │           │        │  cache    │       │ (workers) │         │ (mock/meta)  │
                  └───────────┘        └───────────┘       └───────────┘         └──────────────┘
```

The frontend **never** connects to MongoDB. All data access is via the REST API.

## Backend layers

- **Controllers** — validate (DTO), authorize (guards), delegate to services. No business logic.
- **Services** — domain logic (fee engine, status engine, payroll, etc.), reusable by controllers,
  jobs, and tests.
- **Schemas** — Mongoose models, one per Zoho form (Requirements §6).
- **Jobs** — BullMQ workers running the daily/monthly recompute (Requirements §7), branch-parameterized.
- **Common** — enums (single source), guards, filters, interceptors, Redis, IST date utils.

## Cross-cutting

- **Auth:** global `JwtAuthGuard` (skip via `@Public`), stateless access token + rotated refresh token
  (Redis whitelist).
- **RBAC + branch scope:** `RolesGuard` + `branch-scope.util` — enforced server-side; the client's
  `branchId` is never trusted for authorization (Requirements Rule 6).
- **Responses:** uniform `{ success, data }` / `{ success:false, message, errors }`.
- **Timezone:** all business date math in `Asia/Kolkata` via `common/utils/date.util.ts` (Requirements §31).

## Key design rules (Requirements §40)

- One implementation parameterized by `branchId` — never `updateFeeNIT()` / `updateFeeJC()`.
- Computed fields (`Latest_Due_Date`, `Latest_Payment_Status`, `Overdue_This_Month`,
  `Expected_Amount_This_Month`, attendance strip) are system-managed — not editable via ordinary forms.
- Zoho field names (e.g. `Ne`, `Save_Detail`, `Attendence Based`) map to idiomatic names but retain parity.
