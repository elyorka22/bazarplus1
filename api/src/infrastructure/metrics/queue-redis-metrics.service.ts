import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  QUEUE_DEAD_LETTER,
  QUEUE_NOTIFICATION,
  QUEUE_ORDER,
} from '../../common/constants';
import { RedisService } from '../redis/redis.service';
import {
  bullmqQueueJobsActive,
  bullmqQueueJobsDelayed,
  bullmqQueueJobsFailed,
  bullmqQueueJobsWaiting,
  dependencyRedisUp,
  redisMemoryUsedBytes,
} from './prometheus-metrics';

const INTERVAL_MS = 15_000;

@Injectable()
export class QueueRedisMetricsService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(QueueRedisMetricsService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectQueue(QUEUE_ORDER) private readonly orderQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATION) private readonly notifQueue: Queue,
    @InjectQueue(QUEUE_DEAD_LETTER) private readonly dlq: Queue,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    void this.collect();
    this.timer = setInterval(() => {
      void this.collect();
    }, INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async collect(): Promise<void> {
    try {
      await this.redis.client.ping();
      dependencyRedisUp.set(1);
    } catch {
      dependencyRedisUp.set(0);
    }

    try {
      const info = await this.redis.client.info('memory');
      const m = /used_memory:(\d+)/.exec(info);
      if (m) {
        redisMemoryUsedBytes.set(parseInt(m[1], 10));
      }
    } catch (e) {
      this.logger.debug(
        e instanceof Error ? e.message : 'redis info memory failed',
      );
    }

    const queues: Array<{ name: string; q: Queue }> = [
      { name: 'order', q: this.orderQueue },
      { name: 'notification', q: this.notifQueue },
      { name: 'dead-letter', q: this.dlq },
    ];

    for (const { name, q } of queues) {
      try {
        const c = await q.getJobCounts(
          'waiting',
          'active',
          'delayed',
          'failed',
        );
        bullmqQueueJobsWaiting.set({ queue: name }, c.waiting ?? 0);
        bullmqQueueJobsActive.set({ queue: name }, c.active ?? 0);
        bullmqQueueJobsDelayed.set({ queue: name }, c.delayed ?? 0);
        bullmqQueueJobsFailed.set({ queue: name }, c.failed ?? 0);
      } catch (e) {
        this.logger.warn(
          `queue counts failed for ${name}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
  }
}
