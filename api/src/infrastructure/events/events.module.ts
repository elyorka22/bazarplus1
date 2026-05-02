import { Module } from '@nestjs/common';
import { RedisInfraModule } from '../redis/redis.module';
import { OrderEventsPublisher } from './order-events.publisher';

@Module({
  imports: [RedisInfraModule],
  providers: [OrderEventsPublisher],
  exports: [OrderEventsPublisher],
})
export class EventsModule {}
