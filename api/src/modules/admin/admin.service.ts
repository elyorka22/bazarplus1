import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersRepository } from '../orders/orders.repository';
import { AdminOrdersQueryDto } from './dto/admin-orders-query.dto';

function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function serializeOrderListItem(order: {
  id: string;
  userId: string;
  status: OrderStatus;
  totalPrice: Prisma.Decimal;
  createdAt: Date;
  user: { id: string; email: string; name: string | null };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    productId: string;
  }>;
  courier: { id: string; name: string } | null;
}) {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    totalPrice: order.totalPrice.toString(),
    createdAt: order.createdAt.toISOString(),
    customer: {
      id: order.user.id,
      email: order.user.email,
      name: order.user.name,
    },
    items: order.items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toString(),
      productId: i.productId,
    })),
    courier: order.courier
      ? { id: order.courier.id, name: order.courier.name }
      : null,
  };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async dashboardStats() {
    const dayStart = startOfUtcDay(new Date());
    const [ordersToday, revenueAgg, activeOrders, allTimeOrderCount] =
      await this.prisma.$transaction([
        this.prisma.order.count({
          where: { createdAt: { gte: dayStart } },
        }),
        this.prisma.order.aggregate({
          where: { createdAt: { gte: dayStart } },
          _sum: { totalPrice: true },
        }),
        this.prisma.order.count({
          where: { status: { not: OrderStatus.DELIVERED } },
        }),
        this.prisma.order.count(),
      ]);

    const paidToday = await this.prisma.order.aggregate({
      where: {
        createdAt: { gte: dayStart },
        payments: { some: { status: PaymentStatus.PAID } },
      },
      _sum: { totalPrice: true },
    });

    const revenue =
      paidToday._sum.totalPrice?.toString() ??
      revenueAgg._sum.totalPrice?.toString() ??
      '0';

    return {
      ordersToday,
      revenue,
      activeOrders,
      allTimeOrderCount,
    };
  }

  /** Live map: courier rows + non-delivered assigned order + DB GPS fallback. */
  async listCouriersLive() {
    const couriers = await this.prisma.courier.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        currentLat: true,
        currentLng: true,
      },
    });
    const activeOrders = await this.prisma.order.findMany({
      where: {
        status: { not: OrderStatus.DELIVERED },
        courierId: { not: null },
      },
      select: { id: true, status: true, courierId: true },
      orderBy: { updatedAt: 'desc' },
    });
    const orderByCourier = new Map<
      string,
      { orderId: string; status: OrderStatus }
    >();
    for (const o of activeOrders) {
      if (!o.courierId) continue;
      if (!orderByCourier.has(o.courierId)) {
        orderByCourier.set(o.courierId, {
          orderId: o.id,
          status: o.status,
        });
      }
    }
    return couriers.map((c) => {
      const o = orderByCourier.get(c.id);
      return {
        courierId: c.id,
        name: c.name,
        lat: c.currentLat,
        lng: c.currentLng,
        orderId: o?.orderId ?? null,
        status: o?.status ?? null,
      };
    });
  }

  async listOrders(query: AdminOrdersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const [rows, total] = await this.ordersRepository.listAll(
      skip,
      limit,
      query.status,
    );
    return {
      items: rows.map(serializeOrderListItem),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listUsers(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);
    return {
      items: rows.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
