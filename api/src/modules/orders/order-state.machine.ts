import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

/** Strict linear flow per product requirements */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.CREATED]: OrderStatus.ACCEPTED,
  [OrderStatus.ACCEPTED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.ON_THE_WAY,
  [OrderStatus.ON_THE_WAY]: OrderStatus.DELIVERED,
};

export function assertAdminTransition(
  from: OrderStatus,
  to: OrderStatus,
): void {
  const expected = NEXT_STATUS[from];
  if (expected !== to) {
    throw new BadRequestException(
      `Invalid transition ${from} → ${to}. Allowed next from ${from}: ${expected ?? 'none'}`,
    );
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUS[from] === to;
}
