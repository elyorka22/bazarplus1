# Monitoring stack (Prometheus + Grafana + Alertmanager)

Intended to run on a small VM or as part of an internal network with access to:

- `https://api.domain.com/metrics` (Nest API)
- `http://worker:9101/metrics` (BullMQ worker, private network)

## Quick start (Docker)

```bash
cd monitoring
docker compose -f docker-compose.monitoring.example.yml up -d
```

Open Grafana on `http://localhost:3333` (default admin / set in compose), import `grafana/dashboards/bazarplus-api.json`, set the Prometheus data source to your scrape target.

## Files

| File | Purpose |
|------|---------|
| `prometheus/prometheus.example.yml` | Scrape API + worker; adjust targets for your network |
| `prometheus/alerts.example.yml` | Latency, error rate, Redis, queue backlog |
| `grafana/dashboards/bazarplus-api.json` | Importable dashboard (API + queue + Redis gauges) |
| `alertmanager/alertmanager.example.yml` | Email + Telegram wiring (fill secrets) |

## Security (read first)

- **API `/metrics`:** restrict with Nginx `allow` / VPC CIDRs (`../nginx/metrics-allow.example.conf`) or Basic auth (`../nginx/metrics-basic-auth.example.conf`). Do not leave metrics on the public internet.
- **Worker `9101`:** in root `docker-compose.yml` the worker only **`expose`s** the port to the Compose network; add **no** public `ports:` mapping in production. Use `WORKER_METRICS_BIND=127.0.0.1` only when Prometheus scrapes on the same host.
- **Alertmanager:** start with `noop` receiver, then switch to **Telegram** or **email** in `alertmanager.example.yml` (10m `repeat_interval` for ongoing fires).

## Application env (see `api/.env.production.example`)

- `PRISMA_QUERY_METRICS=true` — optional, enables `prisma_query_duration_seconds` (adds DB query event overhead).
- `WORKER_METRICS_PORT=9101` — worker-only; expose only on private network or via VPN.

## Alert delivery

1. **Telegram:** create a bot with [@BotFather](https://t.me/BotFather), get `bot_token` and your `chat_id`, set in `alertmanager.example.yml` under `telegram_configs`.
2. **Email:** configure `smtp_smarthost` and `auth_password` in the same file.

Point Alertmanager to this config and load `alertmanager.example.yml` rules from Prometheus `alerting` section (see `docker-compose.monitoring.example.yml`).

---

More context: `docs/OBSERVABILITY.md` in the repo root.
