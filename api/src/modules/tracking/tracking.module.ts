import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RedisInfraModule } from '../../infrastructure/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { CourierModule } from '../courier/courier.module';
import { OrderEventsListener } from './order-events.listener';
import { TrackingGateway } from './tracking.gateway';

@Module({
  imports: [
    PrismaModule,
    CourierModule,
    RedisInfraModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwtAccessSecret'),
        signOptions: {
          expiresIn: 60 * 15,
        },
      }),
    }),
  ],
  providers: [TrackingGateway, OrderEventsListener],
  exports: [TrackingGateway],
})
export class TrackingModule {}
