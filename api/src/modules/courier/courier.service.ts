import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { OrderEventsPublisher } from '../../infrastructure/events/order-events.publisher';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { assertAdminTransition } from '../orders/order-state.machine';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';
import { CourierOrdersScope } from './dto/courier-orders-query.dto';
import { UpdateCourierLocationDto } from './dto/update-courier-location.dto';
import { CourierRepository } from './courier.repository';

function serializeCourierOrderRow(order: {
  id: string;
  status: OrderStatus;
  totalPrice: Prisma.Decimal;
  createdAt: Date;
  deliverySnapshot: Prisma.JsonValue;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    productId: string;
    productSnapshot: Prisma.JsonValue | null;
  }>;
  user: { email: string; name: string | null; phone: string | null };
}) {
  return {
    id: order.id,
    status: order.status,
    totalPrice: order.totalPrice.toString(),
    createdAt: order.createdAt.toISOString(),
    deliverySnapshot: order.deliverySnapshot,
    items: order.items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toString(),
      productId: i.productId,
      productSnapshot: i.productSnapshot,
    })),
    customer: {
      email: order.user.email,
      name: order.user.name,
      phone: order.user.phone,
    },
  };
}

@Injectable()
export class CourierService {
  constructor(
    private readonly courierRepository: CourierRepository,
    private readonly prisma: PrismaService,
    private readonly orderEventsPublisher: OrderEventsPublisher,
  ) {}

  listAvailable() {
    return this.courierRepository.listAvailable();
  }

  async getMine(userId: string) {
    const courier = await this.courierRepository.findByUserId(userId);
    if (!courier) {
      return null;
    }
    return courier;
  }

  listOrdersForCourier(
    courierId: string,
    query: { scope: CourierOrdersScope } & PaginationQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const active = query.scope !== CourierOrdersScope.HISTORY;
    const where: Prisma.OrderWhereInput = {
      courierId,
      status: active
        ? { not: OrderStatus.DELIVERED }
        : OrderStatus.DELIVERED,
    };
    return this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: true,
          user: { select: { email: true, name: true, phone: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
  }

  paginatedCourierOrders(
    courierId: string,
    query: { scope: CourierOrdersScope } & PaginationQueryDto,
  ) {
    return this.listOrdersForCourier(courierId, query).then(([rows, total]) => ({
      items: rows.map((o) => serializeCourierOrderRow(o)),
      meta: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        totalPages: Math.ceil(total / (query.limit ?? 20)),
      },
    }));
  }

  async updateOrderStatusAsCourier(
    courierId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, courierId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    assertAdminTransition(order.status, dto.status);
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: dto.status },
      include: {
        items: true,
        courier: true,
        user: { select: { email: true, name: true, phone: true } },
      },
    });
    await this.orderEventsPublisher.publish({
      type: 'STATUS',
      orderId,
      status: dto.status,
    });
    return serializeCourierOrderRow(updated);
  }

  async updateLocation(courierId: string, dto: UpdateCourierLocationDto) {
    await this.prisma.courier.update({
      where: { id: courierId },
      data: {
        currentLat: dto.lat,
        currentLng: dto.lng,
      },
    });
    const orders = await this.prisma.order.findMany({
      where: {
        courierId,
        status: OrderStatus.ON_THE_WAY,
      },
      select: { id: true },
    });
    for (const o of orders) {
      await this.orderEventsPublisher.publish({
        type: 'COURIER_LOCATION',
        orderId: o.id,
        courierId,
        lat: dto.lat,
        lng: dto.lng,
      });
    }
    return { ok: true, ordersNotified: orders.length };
  }
}
