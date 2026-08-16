# Deploying Live Arts ERP to Netlify

Frontend and API ship as **one Netlify site**:

```
web/dist                    → static site (the React app)
backend/dist  ──wrapped──►  /.netlify/functions/api      (the whole NestJS app, one Lambda)
/api/*        ──rewrite──►  that function                (same origin ⇒ no CORS)
```

---

## Read this first — what changes on serverless

Netlify runs **short-lived functions**, not a long-running server. Three things behave
differently from `npm run start:dev`, and two of them need action:

| Area | On a normal server | On Netlify | Action |
|---|---|---|---|
| **Scheduled jobs** | BullMQ worker runs daily 01:30 / monthly | ❌ no long-lived process — BullMQ never fires | ✅ **Already handled** — replaced by Netlify Scheduled Functions (`netlify/functions/daily-jobs.js`, `monthly-jobs.js`) calling the same `JobsService`. Keep `ENABLE_QUEUES=false`. |
| **Refresh tokens** | Redis, or in-memory fallback | ⚠️ in-memory dies with each container → users randomly logged out | ⚠️ **Set `REDIS_URL`** to a hosted Redis (Upstash has a free tier). Without it, logins still work but sessions drop unpredictably. |
| **Cold start** | n/a | first request after idle takes ~2–5s (Nest boot + Atlas connect) | Accepted. Warm invocations are fast; the app caches the Nest instance and the Mongo connection. |

Also note the **function timeout**: 10s on Netlify Free, 26s on Pro. A full recompute over
a few thousand students can exceed that — see [If jobs time out](#if-jobs-time-out).

---

## 1. Prerequisites

- The repo pushed to GitHub/GitLab/Bitbucket (Netlify builds from git)
- A MongoDB Atlas cluster
- *(Recommended)* a Redis URL — e.g. [Upstash](https://upstash.com) free tier

### MongoDB Atlas must allow Netlify's IPs
Lambda IPs are dynamic, so pin-holing does not work:

**Atlas → Network Access → Add IP Address → `0.0.0.0/0` (Allow access from anywhere)**

The database stays protected by its user/password — but keep that password strong.

---

## 2. Create the site

```bash
git init && git add . && git commit -m "Live Arts ERP"
git remote add origin <your-repo-url> && git push -u origin main
```

In Netlify: **Add new site → Import an existing project → pick the repo.**

`netlify.toml` already sets the build, so leave the defaults:

| Setting | Value (auto-detected) |
|---|---|
| Base directory | *(empty — repo root)* |
| Build command | `npm run build` |
| Publish directory | `web/dist` |
| Functions directory | `netlify/functions` |

---

## 3. Environment variables

**Site configuration → Environment variables.** These are the secrets — never commit them.

| Variable | Value | Notes |
|---|---|---|
| `MONGO_URI` | `mongodb+srv://…/live_arts_erp` | **Required.** Rotate the password if it was ever shared in plaintext. |
| `JWT_ACCESS_SECRET` | long random string | **Required.** `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | long random string | **Required**, different from the access secret |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | |
| `REDIS_URL` | `rediss://…` | Strongly recommended — see the table above |
| `ENABLE_QUEUES` | `false` | Must stay false; scheduled functions replace BullMQ |
| `CORS_ORIGINS` | `https://your-site.netlify.app` | Same-origin already, but keep it tight |
| `NODE_ENV` | `production` | |
| `SEED_ADMIN_EMAIL` | `admin@livearts.local` | Only used by the seed script |
| `SEED_ADMIN_PASSWORD` | *(strong password)* | **Change this before going live** |
| `PAYROLL_FLOOR_NEGATIVE_LEAVE_DEDUCTION` | `false` | Business rule flag |

`VITE_API_URL` is already set to `/api/v1` in `netlify.toml` — don't override it.

> The API validates config at boot. If a required variable is missing the function
> returns 500 and the log says exactly which one.

---

## 4. Deploy and verify

Netlify builds on push. Then check, in order:

```bash
curl https://<your-site>.netlify.app/api/v1/health
# → {"success":true,"data":{"status":"ok","mongo":"connected", …}}
```

1. **`/api/v1/health`** → `mongo: connected`
2. **Open the site** → login page renders
3. **Log in** → dashboard loads with real numbers
4. **`/docs`** → Swagger UI
5. **Functions tab** → `api`, `daily-jobs`, `monthly-jobs` all listed

### Seeding the database
Run it **locally against the production `MONGO_URI`** (there is no shell on Netlify):

```bash
cd backend
MONGO_URI="<prod-uri>" SEED_ADMIN_PASSWORD="<strong>" npm run seed
```

---

## 5. Local development is unchanged

Workspaces only changed where dependencies live, not how you work:

```bash
npm install          # once, at the repo root — installs both workspaces
npm run dev:backend  # http://localhost:3000
npm run dev:web      # http://localhost:5173
npm test             # backend unit tests
```

To rehearse the real deployment locally:

```bash
npm i -g netlify-cli
netlify dev          # serves web + functions together on one port
```

---

## Troubleshooting

**Function returns 500 "Config validation error"**
A required env var is missing. The log names it.

**`Cannot find module '@nestjs/core'`**
Dependencies did not hoist. Run `npm install` at the **repo root** (not inside `backend/`)
and confirm `node_modules/@nestjs/core` exists at the root. The function bundler resolves
`external_node_modules` from there.

**`bcrypt` fails to load in the function**
It is a native binding. If Netlify's build produces an incompatible binary, swap to the
pure-JS drop-in — the hash format is identical, so existing passwords keep working:

```bash
npm uninstall bcrypt --workspace backend && npm install bcryptjs --workspace backend
```
then change the two imports in `backend/src/users/users.service.ts` and
`backend/src/auth/auth.service.ts` to `from 'bcryptjs'`, and swap `bcrypt` for `bcryptjs`
in `netlify.toml` → `external_node_modules`.

**Users get logged out at random**
`REDIS_URL` is not set, so refresh tokens live in a container's memory and vanish when it
recycles. Add a hosted Redis.

**Client-side routes 404 on refresh**
The SPA fallback in `netlify.toml` handles this. If you edited the redirects, make sure
the `/api/*` rule still comes **before** the `/*` catch-all.

### If jobs time out
The recompute walks every student. If you outgrow the function timeout:

1. Pass a `branchId` and run one branch per invocation, or
2. Move the schedule to an external cron (GitHub Actions, cron-job.org) hitting
   `POST /api/v1/jobs/run/daily-recompute` with an admin token, or
3. Run the jobs from any always-on box:
   `curl -X POST https://<site>/api/v1/jobs/run/daily-recompute -H "Authorization: Bearer <token>"`

---

## Is Netlify the right host for this API?

It works, and this setup is production-usable. But a NestJS ERP with scheduled jobs is a
better fit for an always-on host — **Render, Railway or Fly.io** — where BullMQ, Redis and
long-running recomputes work as designed, with no cold starts.

A common middle ground: keep the **frontend on Netlify** (it is excellent at static
hosting) and point `VITE_API_URL` at a backend on Render. To switch, set `VITE_API_URL` to
the full API URL, add that Netlify domain to `CORS_ORIGINS`, and delete the `/api/*`
redirect — nothing else changes.
