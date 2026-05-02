import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string, include?: Prisma.OrderInclude) {
    return this.prisma.order.findUnique({
      where: { id },
      include: include ?? {
        items: { include: { product: true } },
        payments: true,
        courier: true,
      },
    });
  }

  findForUser(orderId: string, userId: string) {
    return this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: { include: { product: true } },
        payments: true,
        courier: true,
      },
    });
  }

  listForUser(userId: string, skip: number, take: number) {
    return this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          items: true,
          courier: { select: { id: true, name: true } },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
  }

  listAll(skip: number, take: number, status?: OrderStatus) {
    const where = status ? { status } : {};
    return this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          items: true,
          courier: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
  }

  updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: true,
        courier: true,
      },
    });
  }

  assignCourier(orderId: string, courierId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { courierId },
      include: { courier: true, items: true },
    });
  }
}
