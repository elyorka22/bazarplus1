import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import configuration from '../src/config/configuration';
import { envValidationSchema } from '../src/config/env.validation';
import { RedisInfraModule } from '../src/infrastructure/redis/redis.module';
import { QueuesFeatureModule } from '../src/queues/queues-feature.module';
import { DeadLetterListener } from '../src/queues/dead-letter.listener';
import {
  JOB_FULFILL_ORDER,
  QUEUE_DEAD_LETTER,
  QUEUE_ORDER,
} from '../src/common/constants';

/**
 * BullMQ + Redis only — validates retry/backoff behaviour without the HTTP stack.
 */
describe('BullMQ retries until success (integration)', () => {
  const queueName = 'bullmq-test-retry-queue';

  it('retries and completes after transient failures (3+ attempts)', async () => {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL missing');
    }
    const connection = new Redis(url, { maxRetriesPerRequest: null });
    const q = new Queue(queueName, { connection });

    await q.obliterate({ force: true });

    let attempts = 0;
    const worker = new Worker(
      queueName,
      () => {
        attempts += 1;
        if (attempts < 4) {
          throw new Error('transient');
        }
      },
      { connection },
    );

    await q.add(
      'test-job',
      { x: 1 },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 50 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('job timeout')), 30000);
      worker.on('completed', () => {
        clearTimeout(t);
        resolve();
      });
    });

    expect(attempts).toBeGreaterThanOrEqual(3);

    await worker.close();
    await q.close();
    await connection.quit();
  }, 35000);
});

/**
 * DeadLetterListener (Nest) + failing worker — job lands on DLQ after exhausting retries.
 */
describe('Dead-letter queue (integration)', () => {
  it('moves exhausted jobs to the dead-letter queue', async () => {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL missing');
    }

    const rawConnection = new Redis(url, { maxRetriesPerRequest: null });

    const orderQueue = new Queue(QUEUE_ORDER, { connection: rawConnection });
    const dlqSide = new Queue(QUEUE_DEAD_LETTER, { connection: rawConnection });

    await orderQueue.obliterate({ force: true });
    await dlqSide.obliterate({ force: true });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validationSchema: envValidationSchema,
        }),
        RedisInfraModule,
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            connection: new Redis(config.getOrThrow<string>('redisUrl'), {
              maxRetriesPerRequest: null,
            }),
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential' as const, delay: 50 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          }),
        }),
        QueuesFeatureModule,
      ],
      providers: [DeadLetterListener],
    }).compile();

    await moduleRef.init();

    const worker = new Worker(
      QUEUE_ORDER,
      () => {
        throw new Error('always fail');
      },
      { connection: rawConnection },
    );

    await orderQueue.add(
      JOB_FULFILL_ORDER,
      { orderId: '00000000-0000-4000-8000-000000000001' },
      {
        jobId: `dlq-test-${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 50 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    const dlqInjected = moduleRef.get<Queue>(getQueueToken(QUEUE_DEAD_LETTER));

    let found = false;
    for (let i = 0; i < 80; i++) {
      const waiting = await dlqInjected.getWaitingCount();
      const delayed = await dlqInjected.getDelayedCount();
      if (waiting + delayed > 0) {
        found = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    expect(found).toBe(true);

    await worker.close();
    await orderQueue.close();
    await dlqSide.close();
    await moduleRef.close();
    await rawConnection.quit();
  }, 60000);
});
