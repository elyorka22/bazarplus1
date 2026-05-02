# Observability, load testing, and chaos

This project exposes **Prometheus** metrics from the Nest API (`GET /metrics`) and from the **BullMQ worker** (`GET :9101/metrics` by default). Structured logs include **`requestId`** and **`userId`** (when JWT auth ran) via **nestjs-pino**.

---

## Production hardening (metrics & workers)

### Secure `/metrics` (API)

Never expose raw metrics to the public internet.

- **Preferred:** Nginx `location = /metrics` with `allow` for your **VPC CIDRs** and the **Prometheus** host, then `deny all;`. See `nginx/metrics-allow.example.conf` and comments in `nginx/nginx.production.example.conf`.
- **Fallback:** HTTP Basic auth (`nginx/metrics-basic-auth.example.conf`) and matching `basic_auth` in Prometheus `scrape_configs`.
- **Alternative:** Terminate TLS only on a **private** listener or scrape via **SSH tunnel / VPN** so `/metrics` never hits the public 443 server block.

### Worker metrics (`9101`)

- **Docker:** Root `docker-compose.yml` uses **`expose: ["9101"]` only** — no host port publish; Prometheus on the **same Compose network** scrapes `worker:9101`.
- **Bare metal / same host:** Set **`WORKER_METRICS_BIND=127.0.0.1`** so only local Prometheus reaches the listener (optional **iptables** / SG denying ingress on `9101`).
- Do **not** map `9101` on a public firewall.

### Alertmanager (grouping & cooldown)

Example config (`monitoring/alertmanager/alertmanager.example.yml`): **`group_interval: 5m`**, **`repeat_interval: 10m`**, grouped by `alertname`, `job`, `severity`. Switch `route.receiver` from **`noop`** to **`telegram`** or **`email`** after filling credentials.

### Grafana annotations

The dashboard supports tags **`deploy`**, **`restart`**, **`release`**. Add annotations via Grafana UI or HTTP API after deployments so incidents correlate with releases.

### Rate limiting observability

- Metric **`http_rate_limited_total`** increments on HTTP **429** (Nest `ThrottlerGuard`).
- **Per-IP abuse:** do **not** label Prometheus metrics by IP (cardinality). Use **Loki / ELK** on nginx access logs or Promtail JSON parsing (`monitoring/loki/promtail.docker.example.yml`) to find abusive clients.

### k6 validation checklist

After `k6 run load/k6/products-and-orders.js`:

1. Script thresholds: **p95 &lt; 1s**, **errors &lt; 2%** for steady + spike **products** scenarios.
2. In Grafana: **queue waiting** and **order queue deriv** should not explode during the test.
3. Alert **`ElevatedRateLimit429`** should stay green unless you intentionally hammer the API past throttle limits.

### Chaos: verify metrics & alerts

| Action | Check |
|--------|--------|
| Stop Redis | `dependency_redis_up` → 0; **`RedisDown`** fires; `/health` fails |
| Stop worker | `bullmq_queue_jobs_waiting{queue="order"}` grows; **`OrderQueueBacklog`** may fire after sustained delay |
| Restart API | Brief scrape gaps; **no** duplicate orders if clients retry idempotently |

---

## 1. Metrics (Prometheus)

### HTTP

- `http_request_duration_seconds` — histogram (`method`, `path`, `status_code`). Paths are normalized (UUIDs → `:uuid`) to limit cardinality.
- `http_requests_total` — counter.
- `http_responses_server_errors_total` — 5xx only.
- `http_rate_limited_total` — 429 responses (throttler / abuse).

### Database (optional)

Set `PRISMA_QUERY_METRICS=true` to emit Prisma query events into:

- `prisma_query_duration_seconds` — histogram (`kind`: select / insert / …).

**Trade-off:** query logging adds CPU overhead; enable when tuning DB, not necessarily 24/7.

### Business

- `orders_created_total` — incremented only when a **new** order is committed (not idempotent replay).

### Queues & Redis (API process)

Every ~15s the API updates:

- `bullmq_queue_jobs_{waiting,active,delayed,failed}` — labels `queue` ∈ `order`, `notification`, `dead-letter`.
- `redis_memory_used_bytes` — from `INFO memory`.
- `dependency_redis_up` — `1` if `PING` OK.

### Worker process

- `queue_job_duration_seconds` — histogram (`queue`, `job_name`).
- `queue_job_failures_total` — counter when a job handler throws.

Default Node/process metrics come from `prom-client` `collectDefaultMetrics()`.

---

## 2. Grafana

Import `monitoring/grafana/dashboards/bazarplus-api.json` and select your Prometheus data source. Panels cover throughput, p95 latency, 5xx ratio, orders/min, queue backlog, Redis memory, and job duration.

---

## 3. Alerting

Example rules live in `monitoring/prometheus/alerts.example.yml`:

| Alert | Condition |
|-------|-----------|
| `HighHttpLatencyP95` | p95 > 1s for 5m |
| `HighHttpErrorRate` | 5xx / total > 5% for 5m |
| `RedisDown` | `dependency_redis_up == 0` for 1m |
| `OrderQueueBacklog` | `order` queue waiting > 50 for 15m |
| `ElevatedRateLimit429` | Sustained &gt;5 throttled req/s (429) for 5m |

Wire **Alertmanager** (`monitoring/alertmanager/alertmanager.example.yml`) to **Telegram** or **SMTP** (set `route.receiver`, replace placeholders; do not commit secrets).

---

## 4. Load testing (k6)

See `load/k6/products-and-orders.js`.

- **100 VUs** steady + **300 VU spike** on `GET /products`.
- **Order scenario** runs only if `ACCESS_TOKEN`, `ADDRESS_ID`, and `PRODUCT_ID` are set.

Tune thresholds in `options.thresholds` to match your SLO.

---

## 5. Chaos & failure drill

Run on a **staging** stack with production-like data volume.

| Chaos | How | Expected |
|-------|-----|----------|
| **Redis down** | `docker stop redis` or block security group | `/health` fails; API unhealthy; throttler + queues stall — **no silent wrong answers** on writes |
| **Worker stopped** | `docker stop worker` | New orders may queue; no courier assignment until worker returns |
| **API restart** | `docker restart api` | Brief 502 from LB; clients retry; idempotent `POST /orders` stays safe |

**Data corruption check:** after Redis outage, confirm completed orders in Postgres still match payments and stock counts; replay webhooks only via provider idempotency.

---

## 6. Logging

Production JSON logs include:

- `requestId` — from `RequestIdMiddleware` / `x-request-id`.
- `userId` — JWT `sub` when the request was authenticated.

**Optional centralization:** `monitoring/docker-compose.logging.example.yml` (Loki + Promtail) and `monitoring/loki/promtail.docker.example.yml` for log aggregation; wire Grafana to Loki for search by `requestId` or 429 patterns.

---

## Related paths

| Path | Role |
|------|------|
| `api/src/infrastructure/metrics/prometheus-metrics.ts` | Metric definitions |
| `api/src/infrastructure/metrics/http-metrics.interceptor.ts` | HTTP instrumentation |
| `api/src/infrastructure/metrics/queue-redis-metrics.service.ts` | Queue + Redis gauges |
| `api/src/infrastructure/metrics/worker-metrics-server.ts` | Worker `/metrics` |
| `monitoring/README.md` | Docker compose for Prometheus / Grafana / Alertmanager |
| `nginx/metrics-allow.example.conf` | IP allowlist for `/metrics` |
| `nginx/metrics-basic-auth.example.conf` | Basic auth fallback for `/metrics` |
| `api/src/common/filters/http-exception.filter.ts` | `http_rate_limited_total` on 429 |
