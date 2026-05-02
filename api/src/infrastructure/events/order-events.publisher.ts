import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import { REDIS_CHANNEL_ORDER_EVENTS } from '../../common/constants';

/** Payload for admin Socket.IO `order:created` (matches admin list row shape). */
export type AdminBroadcastOrderListItem = {
  id: string;
  userId: string;
  status: OrderStatus;
  totalPrice: string;
  createdAt: string;
  customer: { id: string; email: string; name: string | null };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    productId: string;
  }>;
  courier: { id: string; name: string } | null;
};

export type OrderEventPayload =
  | {
      type: 'STATUS';
      orderId: string;
      status: OrderStatus;
    }
  | {
      type: 'COURIER_LOCATION';
      orderId: string;
      courierId: string;
      lat: number;
      lng: number;
    }
  | {
      type: 'ORDER_CREATED';
      order: AdminBroadcastOrderListItem;
    }
  | {
      type: 'COURIER_ASSIGNED';
      orderId: string;
      courier: { id: string; name: string };
    };

@Injectable()
export class OrderEventsPublisher {
  constructor(private readonly redis: RedisService) {}

  async publish(payload: OrderEventPayload): Promise<void> {
    await this.redis.client.publish(
      REDIS_CHANNEL_ORDER_EVENTS,
      JSON.stringify(payload),
    );
  }
}
