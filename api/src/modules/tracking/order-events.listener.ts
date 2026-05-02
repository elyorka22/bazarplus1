import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import Redis from 'ioredis';
import { REDIS_CHANNEL_ORDER_EVENTS } from '../../common/constants';
import type { AdminBroadcastOrderListItem } from '../../infrastructure/events/order-events.publisher';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { TrackingGateway } from './tracking.gateway';

@Injectable()
export class OrderEventsListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderEventsListener.name);
  private subscriber?: Redis;

  constructor(
    private readonly redis: RedisService,
    private readonly gateway: TrackingGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    this.subscriber = this.redis.createSubscriber();
    await this.subscriber.subscribe(REDIS_CHANNEL_ORDER_EVENTS);
    this.subscriber.on('message', (_channel, message) => {
      try {
        const data = JSON.parse(message) as {
          type: string;
          orderId: string;
          status?: OrderStatus;
          courierId?: string;
          lat?: number;
          lng?: number;
        };
        if (data.type === 'STATUS' && data.status) {
          void this.gateway
            .emitOrderStatus(data.orderId, data.status)
            .catch(() =>
              this.logger.warn(
                `emitOrderStatus failed for ${data.orderId}`,
              ),
            );
        }
        if (
          data.type === 'COURIER_LOCATION' &&
          data.lat != null &&
          data.lng != null &&
          data.courierId
        ) {
          this.gateway.emitCourierLocation(data.orderId, {
            orderId: data.orderId,
            courierId: data.courierId,
            lat: data.lat,
            lng: data.lng,
          });
        }
        if (data.type === 'ORDER_CREATED' && 'order' in data && data.order) {
          this.gateway.emitOrderCreated(data.order as AdminBroadcastOrderListItem);
        }
        if (
          data.type === 'COURIER_ASSIGNED' &&
          'courier' in data &&
          data.orderId &&
          data.courier &&
          typeof data.courier === 'object'
        ) {
          const c = data.courier as { id: string; name: string };
          this.gateway.emitCourierAssigned(data.orderId, c);
        }
      } catch {
        this.logger.warn(`Bad order event payload: ${message}`);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }
}
