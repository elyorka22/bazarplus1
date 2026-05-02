/**
 * k6 load test — products catalog + optional authenticated orders.
 *
 * Install: https://k6.io/docs/get-started/installation/
 *
 * Public stress (no auth):
 *   k6 run load/k6/products-and-orders.js -e API_URL=https://api.domain.com
 *
 * With orders (set env from a real login / seed user):
 *   k6 run load/k6/products-and-orders.js \
 *     -e API_URL=https://api.domain.com \
 *     -e ACCESS_TOKEN=eyJ... \
 *     -e ADDRESS_ID=uuid \
 *     -e PRODUCT_ID=uuid
 *
 * Production validation targets (products flow):
 *   p95 < 1s, error rate < 2%. After the run, confirm Prometheus queue gauges do not spike.
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const productsLatency = new Trend("products_latency_ms");
const ordersLatency = new Trend("orders_latency_ms");

const BASE = __ENV.API_URL || "http://127.0.0.1:3000";
const TOKEN = __ENV.ACCESS_TOKEN || "";
const ADDRESS_ID = __ENV.ADDRESS_ID || "";
const PRODUCT_ID = __ENV.PRODUCT_ID || "";

export const options = {
  scenarios: {
    steady_100_vus: {
      executor: "constant-vus",
      vus: 100,
      duration: "3m",
      gracefulStop: "30s",
      exec: "productsScenario",
      tags: { scenario: "steady_100" },
    },
    spike_300_vus: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 300 },
        { duration: "2m", target: 300 },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
      startTime: "4m",
      exec: "productsScenario",
      tags: { scenario: "spike_300" },
    },
    order_flow: {
      executor: "constant-vus",
      vus: 30,
      duration: "2m",
      startTime: "8m",
      exec: "ordersScenario",
      tags: { scenario: "orders" },
    },
  },
  thresholds: {
    // Global: products scenarios should meet SLO; order_flow may be slower if enabled.
    errors: ["rate<0.02"],
    "http_req_duration{scenario:steady_100}": ["p(95)<1000"],
    "http_req_duration{scenario:spike_300}": ["p(95)<1000"],
    products_latency_ms: ["p(95)<1000"],
    orders_latency_ms: ["p(95)<2000"],
  },
};

export function productsScenario() {
  const res = http.get(`${BASE}/products?page=1&limit=20`);
  productsLatency.add(res.timings.duration);
  const ok = check(res, {
    "products 200": (r) => r.status === 200,
  });
  errorRate.add(!ok);
  sleep(0.3 + Math.random() * 0.4);
}

export function ordersScenario() {
  if (!TOKEN || !ADDRESS_ID || !PRODUCT_ID) {
    sleep(1);
    return;
  }
  const idem = `k6-${__VU}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload = JSON.stringify({
    addressId: ADDRESS_ID,
    items: [{ productId: PRODUCT_ID, quantity: 1 }],
  });
  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      "Idempotency-Key": idem,
    },
  };
  const res = http.post(`${BASE}/orders`, payload, params);
  ordersLatency.add(res.timings.duration);
  const ok = check(res, {
    "order 2xx": (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!ok);
  sleep(1);
}
