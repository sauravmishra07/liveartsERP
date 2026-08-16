# API

Base URL: `http://<host>:3000/api/v1`
Interactive docs (Swagger): `http://<host>:3000/api/docs`

All responses are wrapped:

```jsonc
// success
{ "success": true, "data": { /* ... */ } }
// error
{ "success": false, "statusCode": 400, "message": "Validation failed", "errors": [], "path": "...", "timestamp": "..." }
```

Authenticated requests send `Authorization: Bearer <accessToken>`.

## Auth

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/auth/login` | public | `{ email, password }` |
| POST | `/auth/refresh` | public | `{ refreshToken }` → new access + refresh (rotated) |
| POST | `/auth/logout` | bearer | `{ refreshToken? }` |
| GET | `/auth/me` | bearer | — |

`login` / `refresh` → `{ accessToken, refreshToken, user }`.

## Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | public | → `{ status, mongo, redis, uptime }` |

## Branches

| Method | Path | Role |
|--------|------|------|
| GET | `/branches` | any (scoped: super-admin all, others own) |
| GET | `/branches/:id` | any (own branch) |
| POST | `/branches` | SUPER_ADMIN |
| PATCH | `/branches/:id` | SUPER_ADMIN |

## Planned (later phases — see Requirements §9–§21)

`/students`, `/fees`, `/attendance`, `/batches`, `/employees`, `/employee-attendance`,
`/payroll`, `/expenses`, `/enquiries`, `/demos`, `/follow-ups`, `/enquiry-activity`,
`/whatsapp`, `/dashboards`, `/reports`, `/audit`, `/jobs/run/*`.

The full, always-current contract is generated at `/api/docs`.
