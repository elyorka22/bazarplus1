#!/usr/bin/env bash
# Smoke validation against deployed Vercel app origin + DigitalOcean API.
# Usage:
#   export APP_URL="https://app.domain.com"
#   export API_URL="https://api.domain.com"
#   bash scripts/production-validate.sh

set -euo pipefail

APP_URL="${APP_URL:-}"
API_URL="${API_URL:-}"

if [[ -z "$APP_URL" || -z "$API_URL" ]]; then
  echo "Error: set APP_URL and API_URL (https://app... and https://api...)" >&2
  exit 1
fi

echo "== Health: GET ${API_URL}/health"
result=$(curl -sS -o /tmp/bp-health.json -w "%{http_code}|%{time_total}" "$API_URL/health")
code=${result%|*}
time_s=${result#*|}
if [[ "$code" != "200" ]]; then
  echo "FAIL: expected HTTP 200, got $code" >&2
  cat /tmp/bp-health.json 2>/dev/null || true
  exit 1
fi
echo "OK (${time_s}s): $(head -c 200 /tmp/bp-health.json)"
awk -v t="$time_s" 'BEGIN { if (t+0 > 5.0) exit 1; exit 0 }' || echo "WARN: health slow (${time_s}s) — check DB/Redis/network" >&2

echo ""
echo "== CORS preflight: OPTIONS (simulate POST with credentials)"
opts=$(curl -sS -o /tmp/bp-cors.txt -w "%{http_code}" -X OPTIONS "$API_URL/auth/login" \
  -H "Origin: $APP_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization,idempotency-key" \
  -D /tmp/bp-cors-headers.txt) || true

if [[ "$opts" != "204" && "$opts" != "200" ]]; then
  echo "WARN: OPTIONS returned HTTP $opts (Nest often 204 for preflight)" >&2
fi

if ! grep -qi "access-control-allow-origin" /tmp/bp-cors-headers.txt; then
  echo "FAIL: missing Access-Control-Allow-Origin on preflight" >&2
  cat /tmp/bp-cors-headers.txt
  exit 1
fi

if ! grep -i "access-control-allow-origin: ${APP_URL}" /tmp/bp-cors-headers.txt; then
  echo "WARN: ACAO may not match APP_URL exactly — verify manually:" >&2
  grep -i "access-control-allow-origin" /tmp/bp-cors-headers.txt || true
fi

if ! grep -qi "access-control-allow-credentials: true" /tmp/bp-cors-headers.txt; then
  echo "FAIL: missing Access-Control-Allow-Credentials: true" >&2
  exit 1
fi

echo "OK: preflight allows credentials and exposes ACAO"

echo ""
echo "== Security headers: GET /health"
curl -sS -D /tmp/bp-sec-headers.txt -o /dev/null "$API_URL/health"
for h in "x-frame-options" "x-content-type-options" "referrer-policy"; do
  if ! grep -qi "^${h}:" /tmp/bp-sec-headers.txt; then
    echo "WARN: missing header $h (Helmet may use different casing)" >&2
  else
    echo "OK: $h present"
  fi
done

echo ""
echo "== Swagger disabled (production): GET /docs"
docscode=$(curl -sS -o /dev/null -w "%{http_code}" "$API_URL/docs") || true
if [[ "$docscode" == "200" ]]; then
  echo "WARN: /docs returned 200 — confirm ENABLE_SWAGGER is false in production" >&2
else
  echo "OK: /docs returned HTTP $docscode (expected non-200 when Swagger off)"
fi

echo ""
echo "Done. Complete browser and order/WebSocket checks in docs/PRODUCTION_VALIDATION.md"
