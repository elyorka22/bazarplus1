import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  /** @deprecated Use webhook-confirmed PAID; kept for scripts */
  markPaidLegacy(orderId: string) {
    return this.paymentsRepository.updateStatusForOrder(
      orderId,
      PaymentStatus.PAID,
    );
  }

  failMockForOrder(orderId: string) {
    return this.paymentsRepository.updateStatusForOrder(
      orderId,
      PaymentStatus.FAILED,
    );
  }
}
