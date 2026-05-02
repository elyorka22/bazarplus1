import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { assertAdminTransition, canTransition } from './order-state.machine';

describe('OrderStateMachine', () => {
  it('allows linear progression', () => {
    expect(canTransition(OrderStatus.CREATED, OrderStatus.ACCEPTED)).toBe(true);
    expect(canTransition(OrderStatus.ACCEPTED, OrderStatus.PREPARING)).toBe(
      true,
    );
    expect(canTransition(OrderStatus.PREPARING, OrderStatus.ON_THE_WAY)).toBe(
      true,
    );
    expect(canTransition(OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED)).toBe(
      true,
    );
  });

  it('rejects skips and backwards transitions', () => {
    expect(() =>
      assertAdminTransition(OrderStatus.CREATED, OrderStatus.PREPARING),
    ).toThrow(BadRequestException);
    expect(() =>
      assertAdminTransition(OrderStatus.DELIVERED, OrderStatus.ON_THE_WAY),
    ).toThrow(BadRequestException);
    expect(() =>
      assertAdminTransition(OrderStatus.DELIVERED, OrderStatus.CREATED),
    ).toThrow(BadRequestException);
    expect(() =>
      assertAdminTransition(OrderStatus.ACCEPTED, OrderStatus.CREATED),
    ).toThrow(BadRequestException);
  });
});
