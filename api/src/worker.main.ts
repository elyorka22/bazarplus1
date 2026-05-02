import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { startWorkerMetricsServer } from './infrastructure/metrics/worker-metrics-server';
import { WorkerModule } from './queues/worker.module';

async function bootstrap() {
  const metricsPort = parseInt(process.env.WORKER_METRICS_PORT ?? '9101', 10);
  const metricsBind = process.env.WORKER_METRICS_BIND ?? '0.0.0.0';
  startWorkerMetricsServer(metricsPort, metricsBind);

  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  await app.init();
  logger.log(
    `Queue workers started (metrics http://${metricsBind}:${metricsPort}/metrics)`,
  );
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
