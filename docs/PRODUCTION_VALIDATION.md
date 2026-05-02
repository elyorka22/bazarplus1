# Production validation (Vercel + DigitalOcean)

Use this after DNS, TLS, and env vars are set. Replace **`domain.com`** with your registrable domain.

**Prerequisites:** `APP_URL=https://app.domain.com`, `API_URL=https://api.domain.com`

Automated smoke (health, CORS preflight, latency, security headers, Swagger off):

```bash
export APP_URL="https://app.domain.com"
export API_URL="https://api.domain.com"
bash scripts/production-validate.sh
```

---

## 1. Auth and cookies (browser — critical)

**Tools:** Chrome DevTools → **Application** → Cookies; **Network** (preserve log, disable cache).

### Login

1. Open `APP_URL`, register or log in.
2. **Application → Cookies →** your app host:
   - Name: **`refresh_token`**
   - **HttpOnly:** ✓ (you cannot read it from `document.cookie`)
   - **Secure:** ✓ (HTTPS)
   - **SameSite:** **None** (requires `AUTH_COOKIE_SAMESITE=none` + HTTPS on Vercel)
   - **Domain:** **`.domain.com`** if `AUTH_COOKIE_DOMAIN` is set (cookie visible for `api.domain.com` requests with credentials)

### Refresh (no infinite loop)

1. **Network:** trigger a call that returns **401** on the API (e.g. wait for access JWT expiry, or temporarily break the in-memory token in DevTools Application → Local Storage if your app stores it there — this project keeps access token in memory via `auth-tokens`).
2. Watch **one** `POST /api/auth/refresh` to your **Vercel** origin, then the retried API call with a new `Authorization` header.
3. Confirm you do **not** see a loop of refresh calls (interceptor uses a single shared `refreshing` promise and `_retry` on the original request — see `web/src/lib/api.ts`).

### Logout

1. Log out from the UI.
2. **Cookies:** `refresh_token` should be **removed** or **cleared** (max-age 0).
3. Visit a protected route → should redirect to login or show unauthenticated state.

---

## 2. CORS and cross-domain

### Browser console

- No **`blocked by CORS policy`** for `API_URL`.
- On an API request, **Response Headers** should include:
  - `Access-Control-Allow-Origin: https://app.domain.com` (your exact app origin, **not** `*`)
  - `Access-Control-Allow-Credentials: true`

### Idempotency header

1. **Checkout** (`/checkout`): submit once; in Network, confirm **`Idempotency-Key`** on `POST .../orders`.
2. **Double submit:** rapid double-click → still **one** order id (same key reused until success; see `checkout/page.tsx` + `submittingRef`).
3. **New attempt after stock error:** trigger out-of-stock → UI shows error; on retry the client **regenerates** the key when message matches out-of-stock (`idempotencyKeyRef.current = uuidv4()`).

---

## 3. Order flow (real)

| Step | Expected |
|------|----------|
| Place order once | `201` / success, single order id |
| Double-click quickly | Same order id returned (idempotent), not two orders |
| Out of stock | Clear error; new idempotency key for next try |

Verify in DB or admin: **one** row per successful idempotency key per user.

---

## 4. WebSocket (tracking)

**Client:** `socket.io-client` → `io(\`${base}/tracking\`, { path: '/socket.io', auth: { token } })` (`web/src/lib/socket.ts`).

**URL:** `wss://api.domain.com/socket.io/?EIO=4&transport=websocket` (namespace `/tracking`).

### Manual checks

1. Open order tracking page with a valid access token.
2. **Network → WS:** connection **101**, messages flowing.
3. **Join room:** server handles `join` with `{ orderId }` (`tracking.gateway.ts`).
4. **Reconnect:** DevTools → **Offline**, wait a few seconds → **Online**; Socket.IO should reconnect (`reconnectionAttempts: Infinity`).

---

## 5. Performance smoke (mobile / desktop)

- Open `APP_URL` on a phone; load **Products**, scroll, add to cart.
- **Network** tab: document API timings; typical JSON responses should be **&lt; 500 ms** on good networks (not a hard SLA — use RUM or APM for real percentiles).

---

## 6. Queue and worker

On the Droplet (or orchestrator):

```bash
docker compose logs -f worker api
```

**Look for:**

- Order jobs **processed once** (no duplicate charge / duplicate assignment for the same order id).
- **Retries** only on transient failures; **DLQ** or dead-letter behavior if implemented.
- No unbounded error spam.

---

## 7. Health and monitoring

| Check | Command / expectation |
|-------|------------------------|
| API liveness | `GET /health` → JSON `status: "ok"`, Postgres + Redis **up** |
| Docker | Container **healthy** (image `HEALTHCHECK` → `/health`) |
| Logs | Structured logs (e.g. pino), rotation or centralized logging |

**Note:** If Redis is down, **`/health` fails** by design (strict dependency). That is correct for “can this instance serve traffic?” — document incident runbooks separately if you need a “degraded” mode.

---

## 8. Security

```bash
curl -sI "$API_URL/health"
```

**Expect (Helmet defaults plus project tweaks):**

- `cross-origin-resource-policy` / CORP aligned with CORS setup
- Typical Helmet: **`x-frame-options`**, **`x-content-type-options: nosniff`**, **`referrer-policy`**

**Swagger in production:** With `NODE_ENV=production` and **`ENABLE_SWAGGER` unset/false**, **`GET /docs`** should **not** serve Swagger UI (often **404**). Confirm in browser and avoid exposing `/docs` publicly.

---

## 9. Failure scenarios

| Scenario | Expected UX / behavior |
|----------|-------------------------|
| **API unreachable** | Axios / fetch errors → user-facing message (e.g. timeout / offline copy from `parseApiError` in `web/src/lib/api.ts`) |
| **Redis down** | `/health` fails; load balancer should drain/unhealthy; workers may stall — **not** silent corruption |
| **Refresh invalid** | Refresh route clears cookie; user must log in again |

---

## 10. Final sign-off checklist

- [ ] Cookies: `refresh_token` flags correct on **HTTPS** prod
- [ ] CORS: no browser errors; credentials + correct ACAO
- [ ] Orders: idempotent double-submit; new key after stock error
- [ ] WebSocket: `wss://`, join room, events, reconnect after offline
- [ ] `/health` **200**; Docker healthy
- [ ] Security headers present; Swagger **off** in prod
- [ ] Worker logs: single processing, sane retries
- [ ] **Prometheus:** `GET /metrics` on API; worker `:9101/metrics` (see `docs/OBSERVABILITY.md`)
- [ ] **Logs:** JSON lines include `requestId`; authenticated routes include `userId`
