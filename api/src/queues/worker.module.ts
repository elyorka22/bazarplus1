import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import configuration from '../config/configuration';
import { envValidationSchema } from '../config/env.validation';
import { EventsModule } from '../infrastructure/events/events.module';
import { RedisInfraModule } from '../infrastructure/redis/redis.module';
import { CourierModule } from '../modules/courier/courier.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DeadLetterListener } from './dead-letter.listener';
import { QueuesFeatureModule } from './queues-feature.module';
import { NotificationProcessor } from './processors/notification.processor';
import { OrderProcessor } from './processors/order.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    RedisInfraModule,
    EventsModule,
    CourierModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: new Redis(config.getOrThrow<string>('redisUrl'), {
          maxRetriesPerRequest: null,
        }),
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential' as const, delay: 3000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),
    QueuesFeatureModule,
  ],
  providers: [OrderProcessor, NotificationProcessor, DeadLetterListener],
})
export class WorkerModule {}
