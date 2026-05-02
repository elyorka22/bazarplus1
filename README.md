# BazarPlus

Full-stack grocery / delivery platform: **NestJS API** (Prisma, PostgreSQL, Redis, BullMQ, Socket.IO), **Next.js 14** (App Router, admin & courier panels), Docker Compose for VPS deployment, optional Prometheus/Grafana monitoring.

## Tech stack

| Layer | Stack |
|--------|--------|
| API | NestJS 11, Prisma 7, PostgreSQL, Redis, BullMQ, JWT, Socket.IO |
| Web | Next.js 14, React 18, TanStack Query, Tailwind, Leaflet (admin map) |
| Ops | Docker Compose, nginx reverse proxy, health checks, `prisma migrate deploy` on API startup |

## Quick start (Docker on a VPS)

**Prerequisites:** Docker & Docker Compose v2, Git.

```bash
git clone <your-repo-url> bazarplus
cd bazarplus

cp api/.env.production.example api/.env.production
# Edit api/.env.production: set secrets, CORS_ORIGINS, and for Compose use DATABASE_URL/REDIS_URL
# pointing at the postgres/redis services (see comments in the example file).

docker compose up -d --build
```

- **API (direct):** `http://<host>:3000` — `GET /health` should return JSON `status: "ok"`.
- **Through nginx:** `http://<host>:80` — same routes; WebSocket upgrades on `/socket.io/`.
- **Worker:** runs as separate container (no public port); BullMQ jobs + internal metrics on `9101` (Docker network only).

### Makefile shortcuts

```bash
make up      # docker compose up -d --build
make down    # docker compose down
make logs    # docker compose logs -f api worker
```

## Ports & services

| Service | Port (default) | Notes |
|---------|----------------|--------|
| **API** | `3000` | HTTP + REST + Socket.IO namespace `/tracking` |
| **nginx** | `80` | Reverse proxy to API + WebSocket |
| **PostgreSQL** | `5432` | Published for local/dev; restrict in production firewall |
| **Redis** | `6379` | Same as above |
| **Worker** | *(internal)* | Queue consumer; metrics `9101` exposed only on Docker network |

## Environment variables (API)

Create **`api/.env.production`** from **`api/.env.production.example`**. Required for a real deployment:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Strong random secret (access tokens) |
| `JWT_REFRESH_SECRET` | Strong random secret (refresh tokens) |
| `PAYMENT_WEBHOOK_SECRET` | Secret for payment webhooks |
| `CORS_ORIGINS` | Comma-separated allowed browser origins (must include your Next.js origin in production) |

Optional / defaults (see example file): `PORT`, `ENABLE_SWAGGER`, throttle/cache TTLs, `WORKER_METRICS_PORT`, JWT expiry.

**Security:** In production, Swagger is **disabled** unless `ENABLE_SWAGGER=true`. CORS is driven by `CORS_ORIGINS` (empty in production disables open CORS — set real origins).

## Frontend (Next.js)

Build and run locally or host on Vercel / Node:

```bash
cd web
cp .env.local.example .env.local   # or use web/.env.vercel.production.example for Vercel UI
# Set NEXT_PUBLIC_API_URL to your public API URL (https://api.yourdomain.com)

npm ci
npm run build
npm run start
```

Production build: `npm run build`. Start: `npm run start` (default port 3000 — change if it conflicts with API).

## Backend scripts (without Docker)

```bash
cd api
npm ci
npx prisma migrate deploy
npm run build
npm run start:prod
```

- **`start:prod`:** `node dist/src/main.js`
- **Worker (separate process):** `npm run start:worker` after build

## Health check

```http
GET /health
```

Returns `200` with Postgres + Redis checks. Docker **HEALTHCHECK** on the API image uses this endpoint.

## Monitoring (optional)

See `monitoring/` for Prometheus/Grafana compose examples — not required for core deployment.

## Repository hygiene

- **Do not commit** `.env`, `api/.env.production`, or secrets — only `*.example` files.
- Ignored paths include `node_modules/`, `dist/`, `.next/`, `coverage/`, `logs/`.

## Licence

Private / UNLICENSED (see package metadata).
