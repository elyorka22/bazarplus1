# Deploying BazarPlus API on DigitalOcean

> End-to-end checklist (DNS, Vercel cookies, WebSocket, verification): see **[`docs/PRODUCTION.md`](../../docs/PRODUCTION.md)** in the repo root.

The API is a NestJS app with **PostgreSQL**, **Redis**, **BullMQ workers**, and **Prisma migrations** at container start (`Dockerfile` runs `prisma migrate deploy` before `node dist/src/main.js`).

## Prerequisites

1. **Secrets** — generate strong values (≥16 characters where enforced):

   ```bash
   openssl rand -base64 32
   ```

2. **CORS** — set `CORS_ORIGINS` to every frontend origin that calls the API (comma-separated), e.g. `https://your-app.vercel.app`. Cookies / `Authorization` from the browser require correct origins and `credentials: true` on both API CORS and the frontend client.

3. **Health check** — load balancers should use **HTTP GET** `GET /health` (returns 200 when Postgres + Redis are reachable).

---

## Option A — Droplet + Docker Compose (single VM)

1. Create a **Droplet** (Ubuntu 22.04+, 2 GB RAM minimum recommended for API + Postgres + Redis + worker; or use **managed DB + managed Redis** and run only `api` + `worker` containers).

2. Install Docker + Docker Compose plugin.

3. Clone the repo, create `.env` in the project root with at least:

   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PAYMENT_WEBHOOK_SECRET`
   - For production compose overrides, set `CORS_ORIGINS` to your real site URLs.

4. Point `DATABASE_URL` / `REDIS_URL` at managed services or use the bundled `postgres` / `redis` services in `docker-compose.yml`.

5. Open firewall: **80** (nginx), **443** if terminating TLS on the droplet.

6. Deploy:

   ```bash
   docker compose up -d --build
   ```

7. Run **two** processes in production: **`api`** (HTTP) and **`worker`** (queues). The root `docker-compose.yml` includes both.

---

## Option B — App Platform (container)

1. Create an **App** from this repo; set **Dockerfile** path to `api/Dockerfile` (or build context `api`).

2. Add **managed PostgreSQL** and **managed Redis** in the same region; copy connection strings into component **Environment** variables.

3. Set **HTTP route** to port `3000` (or the `PORT` you configure). Add health check path `/health` (GET).

4. Add a **Worker** component using `api/Dockerfile.worker` with the same `DATABASE_URL`, `REDIS_URL`, and JWT secrets (no `PORT` / HTTP needed for the worker).

5. In **Environment**, set at minimum:

   - `NODE_ENV=production`
   - `CORS_ORIGINS` (required by validation in production)
   - `DATABASE_URL`, `REDIS_URL`
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PAYMENT_WEBHOOK_SECRET`

6. Optional: `ENABLE_SWAGGER=true` temporarily to open `/docs`; keep it off in public production.

---

---

## Notes

- **Migrations** run automatically on API container start. For zero-downtime, some teams run migrations as a one-off **Job** before rolling the new version; the current image uses the simpler “migrate on boot” model.
- **WebSockets / Socket.IO** — ensure your load balancer supports **sticky sessions** or use Redis adapter (already in the stack) for multi-instance.
- **Metrics** — `GET` metrics route (if enabled) can be scraped by DO monitoring or Prometheus; see `MetricsModule` in the codebase.
