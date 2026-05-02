import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createPending(data: { orderId: string; amount: Prisma.Decimal }) {
    return this.prisma.payment.create({
      data: {
        orderId: data.orderId,
        amount: data.amount,
        status: PaymentStatus.PENDING,
        provider: 'stripe',
      },
    });
  }

  updateStatusForOrder(orderId: string, status: PaymentStatus) {
    return this.prisma.payment.updateMany({
      where: { orderId },
      data: { status },
    });
  }

  findPaymentForOrder(orderId: string) {
    return this.prisma.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
