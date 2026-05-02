import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Haversine distance in km (mock — replace with routing API in production) */
function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.PREPARING,
  OrderStatus.ON_THE_WAY,
];

@Injectable()
export class CourierAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Picks nearest courier that is marked available and not on an active delivery.
   * Idempotent: if order already has courierId, returns null (no-op).
   */
  async assignNearestAvailable(params: {
    orderId: string;
    deliveryLat: number;
    deliveryLng: number;
  }): Promise<{ courierId: string } | null> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: params.orderId },
        select: {
          id: true,
          courierId: true,
          status: true,
        },
      });
      if (!order || order.status !== OrderStatus.ACCEPTED) {
        return null;
      }
      if (order.courierId) {
        return { courierId: order.courierId };
      }

      const couriers = await tx.courier.findMany({
        where: {
          isAvailable: true,
          currentLat: { not: null },
          currentLng: { not: null },
        },
      });

      const busyCourierIds = await tx.order.findMany({
        where: {
          status: { in: ACTIVE_STATUSES },
          courierId: { not: null },
        },
        select: { courierId: true },
        distinct: ['courierId'],
      });
      const busy = new Set(
        busyCourierIds
          .map((o) => o.courierId)
          .filter((id): id is string => id != null),
      );

      const candidates = couriers.filter((c) => !busy.has(c.id));
      if (candidates.length === 0) {
        return null;
      }

      let best = candidates[0];
      let bestDist = Infinity;
      for (const c of candidates) {
        const lat = c.currentLat!;
        const lng = c.currentLng!;
        const d = distanceKm(params.deliveryLat, params.deliveryLng, lat, lng);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }

      const updated = await tx.order.updateMany({
        where: {
          id: params.orderId,
          courierId: null,
          status: OrderStatus.ACCEPTED,
        },
        data: { courierId: best.id },
      });

      if (updated.count === 0) {
        const again = await tx.order.findUnique({
          where: { id: params.orderId },
          select: { courierId: true },
        });
        return again?.courierId ? { courierId: again.courierId } : null;
      }

      await tx.courier.update({
        where: { id: best.id },
        data: { isAvailable: false },
      });

      return { courierId: best.id };
    });
  }

  /** Manual assign: courier must be available and not busy */
  async validateCourierAssignable(
    tx: Prisma.TransactionClient,
    courierId: string,
  ): Promise<void> {
    const courier = await tx.courier.findUnique({
      where: { id: courierId },
    });
    if (!courier) {
      throw new BadRequestException('Courier not found');
    }
    const activeOrder = await tx.order.findFirst({
      where: {
        courierId,
        status: { in: ACTIVE_STATUSES },
      },
    });
    if (activeOrder) {
      throw new BadRequestException('Courier is busy with an active order');
    }
    if (!courier.isAvailable) {
      throw new BadRequestException('Courier is not available');
    }
  }
}
