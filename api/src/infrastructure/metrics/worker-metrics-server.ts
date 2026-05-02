import http from 'node:http';
import {
  initPrometheusDefaultMetrics,
  metricsRegister,
} from './prometheus-metrics';

/**
 * Minimal `/metrics` scrape endpoint for the BullMQ worker process (separate from API).
 * Set `WORKER_METRICS_BIND=127.0.0.1` when only localhost scrapes may reach this port.
 */
export function startWorkerMetricsServer(
  port: number,
  bindHost = process.env.WORKER_METRICS_BIND ?? '0.0.0.0',
): http.Server {
  initPrometheusDefaultMetrics();
  const srv = http.createServer(async (req, res) => {
    if (req.url?.startsWith('/metrics')) {
      res.setHeader('Content-Type', metricsRegister.contentType);
      res.end(await metricsRegister.metrics());
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  srv.listen(port, bindHost);
  return srv;
}
