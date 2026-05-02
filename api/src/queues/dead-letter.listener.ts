import { InjectQueue } from '@nestjs/bullmq';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import {
  QUEUE_DEAD_LETTER,
  QUEUE_NOTIFICATION,
  QUEUE_ORDER,
} from '../common/constants';
import { REDIS_CLIENT } from '../infrastructure/redis/redis.tokens';

@Injectable()
export class DeadLetterListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeadLetterListener.name);
  private orderEvents?: QueueEvents;
  private notifEvents?: QueueEvents;

  constructor(
    @Inject(REDIS_CLIENT) private readonly connection: Redis,
    @InjectQueue(QUEUE_ORDER) private readonly orderQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICATION) private readonly notifQueue: Queue,
    @InjectQueue(QUEUE_DEAD_LETTER) private readonly dlq: Queue,
  ) {}

  onModuleInit(): void {
    this.orderEvents = new QueueEvents(QUEUE_ORDER, {
      connection: this.connection,
    });
    this.notifEvents = new QueueEvents(QUEUE_NOTIFICATION, {
      connection: this.connection,
    });

    this.orderEvents.on('failed', (args) => {
      void this.onJobFailed(QUEUE_ORDER, this.orderQueue, args);
    });
    this.notifEvents.on('failed', (args) => {
      void this.onJobFailed(QUEUE_NOTIFICATION, this.notifQueue, args);
    });
  }

  private async onJobFailed(
    source: string,
    sourceQueue: Queue,
    args: { jobId: string; failedReason: string },
  ): Promise<void> {
    const job = await sourceQueue.getJob(args.jobId);
    if (!job) {
      return;
    }
    const max = job.opts.attempts ?? 1;
    if (job.attemptsMade < max) {
      return;
    }
    const data: Record<string, unknown> = {
      sourceQueue: source,
      jobId: args.jobId,
      failedReason: args.failedReason,
      name: job.name,
      data: job.data as Record<string, unknown>,
    };
    await this.dlq.add('failed', data, {
      removeOnComplete: false,
      removeOnFail: false,
    });
    this.logger.error(
      JSON.stringify({
        component: 'queue.dlq',
        sourceQueue: source,
        jobId: args.jobId,
        failedReason: args.failedReason,
        attempts: job.attemptsMade,
      }),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.orderEvents?.close();
    await this.notifEvents?.close();
  }
}
