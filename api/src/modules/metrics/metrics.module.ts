import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpMetricsInterceptor } from '../../infrastructure/metrics/http-metrics.interceptor';
import { QueueRedisMetricsService } from '../../infrastructure/metrics/queue-redis-metrics.service';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [MetricsController],
  providers: [
    QueueRedisMetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],
})
export class MetricsModule {}
