import * as client from 'prom-client';

/** Shared registry (single process). */
export const metricsRegister = client.register;

let defaultMetricsInitialized = false;

export function initPrometheusDefaultMetrics(): void {
  if (defaultMetricsInitialized) return;
  client.collectDefaultMetrics();
  defaultMetricsInitialized = true;
}

const labelNamesHttp = ['method', 'path', 'status_code'] as const;

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: labelNamesHttp,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: labelNamesHttp,
});

export const httpResponsesServerErrorsTotal = new client.Counter({
  name: 'http_responses_server_errors_total',
  help: 'HTTP 5xx responses',
  labelNames: ['method', 'path'],
});

/** Incremented when Nest Throttler returns 429 Too Many Requests. */
export const httpRateLimitedTotal = new client.Counter({
  name: 'http_rate_limited_total',
  help: 'Responses with HTTP 429 (rate limit / abuse throttle)',
});

export const prismaQueryDurationSeconds = new client.Histogram({
  name: 'prisma_query_duration_seconds',
  help: 'Prisma query duration (from engine query events)',
  labelNames: ['kind'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

export const ordersCreatedTotal = new client.Counter({
  name: 'orders_created_total',
  help: 'New orders successfully created (excludes idempotent cache hits)',
});

const labelNamesQueue = ['queue', 'job_name'] as const;

export const queueJobDurationSeconds = new client.Histogram({
  name: 'queue_job_duration_seconds',
  help: 'BullMQ job processing duration in seconds',
  labelNames: labelNamesQueue,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 15, 60],
});

export const queueJobFailuresTotal = new client.Counter({
  name: 'queue_job_failures_total',
  help: 'BullMQ job failures (observed in worker when process throws)',
  labelNames: labelNamesQueue,
});

export const bullmqQueueJobsWaiting = new client.Gauge({
  name: 'bullmq_queue_jobs_waiting',
  help: 'Jobs in waiting state',
  labelNames: ['queue'],
});

export const bullmqQueueJobsActive = new client.Gauge({
  name: 'bullmq_queue_jobs_active',
  help: 'Jobs currently active',
  labelNames: ['queue'],
});

export const bullmqQueueJobsDelayed = new client.Gauge({
  name: 'bullmq_queue_jobs_delayed',
  help: 'Jobs scheduled for later',
  labelNames: ['queue'],
});

export const bullmqQueueJobsFailed = new client.Gauge({
  name: 'bullmq_queue_jobs_failed',
  help: 'Failed jobs in queue (retained)',
  labelNames: ['queue'],
});

export const redisMemoryUsedBytes = new client.Gauge({
  name: 'redis_memory_used_bytes',
  help: 'Redis used_memory from INFO (API process view)',
});

export const dependencyRedisUp = new client.Gauge({
  name: 'dependency_redis_up',
  help: '1 if Redis PING succeeded, 0 otherwise',
});

/**
 * Reduces path cardinality: UUIDs and numeric segments become placeholders.
 */
export function normalizeHttpPath(path: string): string {
  if (!path || path === '') return '/';
  return path
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':uuid',
    )
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

function sqlKindFromQuery(q: string): string {
  const t = q.trim().split(/\s+/)[0]?.toLowerCase() ?? 'other';
  if (t === 'select') return 'select';
  if (t === 'insert') return 'insert';
  if (t === 'update') return 'update';
  if (t === 'delete') return 'delete';
  return 'other';
}

export function recordPrismaQueryEvent(event: {
  query: string;
  duration: number;
}): void {
  const kind = sqlKindFromQuery(event.query);
  prismaQueryDurationSeconds.observe({ kind }, event.duration / 1000);
}

export function recordOrderCreated(): void {
  ordersCreatedTotal.inc();
}

export function recordQueueJobDuration(
  queue: string,
  jobName: string,
  seconds: number,
): void {
  queueJobDurationSeconds.observe({ queue, job_name: jobName }, seconds);
}

export function recordQueueJobFailure(
  queue: string,
  jobName: string,
): void {
  queueJobFailuresTotal.inc({ queue, job_name: jobName });
}
