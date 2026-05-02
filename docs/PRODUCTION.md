# Production: Vercel (Next.js) + DigitalOcean (NestJS)

## 1. DNS

| Host | Type | Value |
|------|------|--------|
| `app.domain.com` | CNAME | `cname.vercel-dns.com` (or the target Vercel shows) |
| `api.domain.com` | A | Droplet public IPv4 (or managed LB IP) |

Add Vercel’s **apex** / **www** records per Vercel dashboard if needed.

---

## 2. Backend (api.domain.com)

### Environment (required in production)

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `CORS_ORIGINS` | `https://app.domain.com` (comma-separated if multiple frontends) |
| `DATABASE_URL` | Managed Postgres URL (often `?sslmode=require`) |
| `REDIS_URL` | Managed Redis (`rediss://` if TLS) |
| `JWT_ACCESS_SECRET` | ≥32 random bytes |
| `JWT_REFRESH_SECRET` | ≥32 random bytes |
| `PAYMENT_WEBHOOK_SECRET` | ≥16 chars |

Joi **fails fast** if `CORS_ORIGINS` is missing when `NODE_ENV=production`.

### CORS (Nest)

- `credentials: true`
- `origin`: explicit list (no `*`)
- `allowedHeaders`: `Content-Type`, `Authorization`, `Idempotency-Key`, `X-Request-Id`

### WebSocket (Socket.IO)

- Gateway uses the **same** `CORS_ORIGINS` as HTTP (not `*`).
- Client: `wss://api.domain.com` with `path: /socket.io` and namespace `/tracking` (see `web/src/lib/socket.ts`).
- Nginx: proxy `/socket.io/` with `Upgrade` and `Connection: upgrade` (see `nginx/nginx.production.example.conf`).

### Deploy

- **Droplet**: `docker compose up -d` (root `docker-compose.yml`: `api`, `worker`, `postgres`, `redis`, `nginx`) or use managed DB/Redis and only run `api` + `worker` + TLS proxy.
- **Nginx + Let’s Encrypt**: use the example config; point upstream to the published API port (e.g. `127.0.0.1:3000` if publishing host port).

### Health

- `GET https://api.domain.com/health` — use for load balancer / App Platform checks.
- Docker `HEALTHCHECK` in `api/Dockerfile` hits the same path.

---

## 3. Frontend (app.domain.com on Vercel)

### Environment (Vercel → Project → Settings → Environment Variables)

| Variable | Production value |
|----------|------------------|
| `NEXT_PUBLIC_API_URL` | `https://api.domain.com` (no trailing slash) |
| `AUTH_COOKIE_SAMESITE` | `none` |
| `AUTH_COOKIE_DOMAIN` | `.domain.com` (leading dot; same registrable domain as `app` and `api`) |
| `NODE_ENV` | Set automatically by Vercel |

Optional: `NEXT_PUBLIC_DEMO_DATA` = `false` or unset.

### Why these cookies settings?

- Refresh token is set by **Next.js Route Handlers** (`/api/auth/*`) on the **Vercel host**, not by Nest.
- `SameSite=None` + `Secure` + `Domain=.domain.com` allows the cookie to be sent to **all subdomains** of `domain.com` (including `api.domain.com` when the browser calls the API with `withCredentials: true`).
- `httpOnly` is set in code (`web/src/lib/auth-cookie.ts`).

### Build

- `npm run build` in `web/` must pass.
- No server-only modules imported from client components.

---

## 4. Auth flow checklist

1. **Login** (`POST /api/auth/login` on Vercel) → upstream Nest `/auth/login` → Set-Cookie `refresh_token` on `app.domain.com` with domain `.domain.com`.
2. **API calls** from browser → `https://api.domain.com/...` with `Authorization: Bearer` + cookies per browser rules.
3. **Refresh** (`POST /api/auth/refresh` on Vercel) reads cookie (same site host), proxies to Nest.
4. **Logout** clears cookie with the **same** `domain` / `path` / `sameSite` as set.

Test in browser DevTools → Application → Cookies and Network (CORS / Set-Cookie).

---

## 5. Final verification

Full browser + order + WebSocket + failure runbook: **`docs/PRODUCTION_VALIDATION.md`**. Automated smoke: `scripts/production-validate.sh` with `APP_URL` and `API_URL`.

- [ ] No CORS console errors for `https://api.domain.com`
- [ ] `Access-Control-Allow-Origin` is the Vercel app origin, not `*`, with `Access-Control-Allow-Credentials: true`
- [ ] Login sets `refresh_token`; logout removes it
- [ ] `POST /orders` idempotency header respected
- [ ] Socket connects to `wss://api.domain.com` / reconnect works (see order tracking)
- [ ] `GET /health` returns 200
- [ ] Rate limiting still sensible behind nginx (optional zone in nginx config)

---

## 6. Observability & load testing

See **`docs/OBSERVABILITY.md`** — Prometheus `/metrics`, Grafana dashboard import, Alertmanager, k6 scenarios, chaos drills.

---

## 7. Related files

- API cookies: **not** used for refresh (Nest returns tokens in JSON; Next sets cookies).  
- `web/src/lib/auth-cookie.ts` — cookie attributes.  
- `web/src/lib/api.ts` — `withCredentials: true`.  
- `api/src/main.ts` — HTTP CORS.  
- `api/src/config/socket-io-cors.ts` — Socket.IO CORS.  
- `api/src/modules/tracking/tracking.gateway.ts` — `/tracking` namespace.  
- `nginx/nginx.production.example.conf` — TLS + WebSocket proxy.  
- `api/deploy/DIGITALOCEAN.md` — Droplet / App Platform detail.  
- `monitoring/` — Prometheus / Grafana / Alertmanager examples.
