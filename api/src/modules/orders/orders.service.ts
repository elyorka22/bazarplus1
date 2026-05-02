import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OrderStatus, PaymentStatus, Prisma, Role } from '@prisma/client';
import { Queue } from 'bullmq';
import {
  JOB_ORDER_PLACED_NOTIFY,
  QUEUE_NOTIFICATION,
} from '../../common/constants';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { OrderEventsPublisher } from '../../infrastructure/events/order-events.publisher';
import { recordOrderCreated } from '../../infrastructure/metrics/prometheus-metrics';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CourierAssignmentService } from '../courier/courier-assignment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { assertAdminTransition } from './order-state.machine';
import { OrdersRepository } from './orders.repository';

function serializeOrder(order: {
  id: string;
  totalPrice: Prisma.Decimal;
  items: Array<{
    unitPrice: Prisma.Decimal;
    productSnapshot: unknown;
    quantity: number;
    productId: string;
    id: string;
  }>;
  payments?: Array<{ amount: Prisma.Decimal; status: unknown }>;
}) {
  return {
    ...order,
    totalPrice: order.totalPrice.toString(),
    items: order.items.map((i) => ({
      ...i,
      unitPrice: i.unitPrice.toString(),
    })),
    payments: order.payments?.map((p) => ({
      ...p,
      amount: p.amount.toString(),
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
    private readonly courierAssignment: CourierAssignmentService,
    private readonly orderEventsPublisher: OrderEventsPublisher,
    @InjectQueue(QUEUE_NOTIFICATION)
    private readonly notificationQueue: Queue,
  ) {}

  async createOrder(
    userId: string,
    idempotencyKey: string,
    dto: CreateOrderDto,
  ) {
    const merged = new Map<string, number>();
    for (const line of dto.items) {
      merged.set(
        line.productId,
        (merged.get(line.productId) ?? 0) + line.quantity,
      );
    }

    const cached = await this.prisma.idempotencyRecord.findUnique({
      where: {
        userId_key: { userId, key: idempotencyKey },
      },
    });
    if (cached) {
      return cached.responseJson;
    }

    try {
      const serialized = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SELECT pg_advisory_xact_lock(hashtext($1::text))`,
          `${userId}:${idempotencyKey}`,
        );

        const again = await tx.idempotencyRecord.findUnique({
          where: {
            userId_key: { userId, key: idempotencyKey },
          },
        });
        if (again) {
          return again.responseJson as ReturnType<typeof serializeOrder>;
        }

        const address = await tx.address.findFirst({
          where: { id: dto.addressId, userId },
        });
        if (!address) {
          throw new BadRequestException('Address not found for this user');
        }

        const productIds = [...merged.keys()];
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });
        if (products.length !== productIds.length) {
          throw new BadRequestException('One or more products not found');
        }

        let total = new Prisma.Decimal(0);

        for (const p of products) {
          const qty = merged.get(p.id)!;
          total = total.add(new Prisma.Decimal(p.price).mul(qty));
        }

        for (const p of products) {
          const qty = merged.get(p.id)!;
          const updated = await tx.$executeRawUnsafe(
            `UPDATE products SET stock = stock - $1 WHERE id = $2::uuid AND stock >= $3`,
            qty,
            p.id,
            qty,
          );
          if (updated !== 1) {
            throw new BadRequestException(`Out of stock: ${p.name}`);
          }
        }

        const deliverySnapshot = {
          label: address.label,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          postalCode: address.postalCode,
          lat: address.lat,
          lng: address.lng,
        };

        const created = await tx.order.create({
          data: {
            userId,
            status: OrderStatus.CREATED,
            totalPrice: total,
            deliverySnapshot,
            items: {
              create: products.map((p) => {
                const qty = merged.get(p.id)!;
                return {
                  productId: p.id,
                  quantity: qty,
                  unitPrice: p.price,
                  productSnapshot: {
                    name: p.name,
                    imageUrl: p.imageUrl,
                  },
                };
              }),
            },
          },
          include: {
            items: true,
            payments: true,
          },
        });

        await tx.payment.create({
          data: {
            orderId: created.id,
            amount: total,
            status: PaymentStatus.PENDING,
            provider: 'stripe',
          },
        });

        const full = await tx.order.findUnique({
          where: { id: created.id },
          include: {
            items: true,
            payments: true,
            courier: true,
          },
        });

        const out = serializeOrder(full!);

        await tx.idempotencyRecord.create({
          data: {
            userId,
            key: idempotencyKey,
            responseJson: out as unknown as Prisma.InputJsonValue,
          },
        });

        return out;
      });

      const placed = serialized as { id: string };
      await this.notificationQueue.add(
        JOB_ORDER_PLACED_NOTIFY,
        {
          userId,
          orderId: placed.id,
          message: 'Your order was received — complete payment to confirm',
        },
        {
          jobId: `notify-placed-${placed.id}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
        },
      );

      recordOrderCreated();

      const placedId = (serialized as { id: string }).id;
      const [row, profile] = await this.prisma.$transaction([
        this.prisma.order.findUnique({
          where: { id: placedId },
          select: {
            id: true,
            userId: true,
            status: true,
            totalPrice: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                unitPrice: true,
                productId: true,
              },
            },
          },
        }),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true },
        }),
      ]);
      if (row && profile) {
        await this.orderEventsPublisher.publish({
          type: 'ORDER_CREATED',
          order: {
            id: row.id,
            userId: row.userId,
            status: row.status,
            totalPrice: row.totalPrice.toString(),
            createdAt: row.createdAt.toISOString(),
            customer: {
              id: profile.id,
              email: profile.email,
              name: profile.name,
            },
            items: row.items.map((i) => ({
              id: i.id,
              quantity: i.quantity,
              unitPrice: i.unitPrice.toString(),
              productId: i.productId,
            })),
            courier: null,
          },
        });
      }

      return serialized;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const row = await this.prisma.idempotencyRecord.findUnique({
          where: { userId_key: { userId, key: idempotencyKey } },
        });
        if (row) {
          return row.responseJson;
        }
      }
      throw e;
    }
  }

  async listMine(userId: string, query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const [rows, total] = await this.ordersRepository.listForUser(
      userId,
      skip,
      limit,
    );
    return {
      items: rows.map((o) => serializeOrder(o)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOne(orderId: string, user: JwtPayload) {
    let order;
    if (user.role === Role.ADMIN) {
      order = await this.ordersRepository.findById(orderId);
    } else {
      order = await this.ordersRepository.findForUser(orderId, user.sub);
    }
    if (!order) {
      const courier = await this.prisma.courier.findUnique({
        where: { userId: user.sub },
      });
      if (courier) {
        order = await this.prisma.order.findFirst({
          where: { id: orderId, courierId: courier.id },
          include: {
            items: { include: { product: true } },
            payments: true,
            courier: true,
            user: { select: { email: true, name: true, phone: true } },
          },
        });
      }
    }
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return serializeOrder(order);
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    actor: JwtPayload,
  ) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Admin only');
    }
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    assertAdminTransition(order.status, dto.status);
    const updated = await this.ordersRepository.updateStatus(
      orderId,
      dto.status,
    );
    await this.orderEventsPublisher.publish({
      type: 'STATUS',
      orderId,
      status: dto.status,
    });
    return serializeOrder(updated);
  }

  async assignCourier(orderId: string, courierId: string, actor: JwtPayload) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Admin only');
    }
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.courierId === courierId) {
      return serializeOrder(order);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.courierAssignment.validateCourierAssignable(tx, courierId);
      const current = await tx.order.findUnique({ where: { id: orderId } });
      if (current?.courierId) {
        throw new ConflictException('Courier already assigned');
      }
      return tx.order.update({
        where: { id: orderId },
        data: { courierId },
        include: { courier: true, items: true, payments: true },
      });
    });
    await this.prisma.courier.update({
      where: { id: courierId },
      data: { isAvailable: false },
    });
    await this.orderEventsPublisher.publish({
      type: 'STATUS',
      orderId,
      status: updated.status,
    });
    if (updated.courier) {
      await this.orderEventsPublisher.publish({
        type: 'COURIER_ASSIGNED',
        orderId,
        courier: { id: updated.courier.id, name: updated.courier.name },
      });
    }
    return serializeOrder(updated);
  }
}
