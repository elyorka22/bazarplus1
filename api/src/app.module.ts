import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { IncomingMessage, ServerResponse } from 'http';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { LoggerModule } from 'nestjs-pino';
import Redis from 'ioredis';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { CacheVersionModule } from './infrastructure/cache/cache-version.module';
import { EventsModule } from './infrastructure/events/events.module';
import { RedisInfraModule } from './infrastructure/redis/redis.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CourierModule } from './modules/courier/courier.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueuesFeatureModule } from './queues/queues-feature.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('nodeEnv') ?? 'development';
        return {
          pinoHttp: {
            level: nodeEnv === 'production' ? 'info' : 'debug',
            transport:
              nodeEnv !== 'production'
                ? { target: 'pino-pretty', options: { singleLine: true } }
                : undefined,
            customProps: (req: IncomingMessage, _res: ServerResponse) => {
              const r = req as IncomingMessage & {
                requestId?: string;
                user?: { sub?: string };
              };
              return {
                requestId: r.requestId,
                userId: r.user?.sub,
              };
            },
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.getOrThrow<string>('redisUrl');
        const ttlSec = config.get<number>('throttleTtlSeconds') ?? 60;
        const limit = config.get<number>('throttleLimit') ?? 120;
        return {
          throttlers: [
            {
              name: 'default',
              ttl: seconds(ttlSec),
              limit,
            },
          ],
          storage: new ThrottlerStorageRedisService(redisUrl),
        };
      },
    }),
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
    PrismaModule,
    RedisInfraModule,
    CacheVersionModule,
    EventsModule,
    AdminModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    PaymentsModule,
    OrdersModule,
    CourierModule,
    TrackingModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
