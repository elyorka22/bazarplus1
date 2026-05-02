import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { JOB_FULFILL_ORDER, QUEUE_ORDER } from '../../common/constants';
import { OrderEventsPublisher } from '../../infrastructure/events/order-events.publisher';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { WebhookSignatureVerifier } from './webhook-signature.verifier';

function isUniqueViolation(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
  );
}

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verifier: WebhookSignatureVerifier,
    private readonly orderEventsPublisher: OrderEventsPublisher,
    @InjectQueue(QUEUE_ORDER) private readonly orderQueue: Queue,
  ) {}

  async handleWebhook(
    rawBody: Buffer,
    signatureHeader: string | undefined,
    dto: PaymentWebhookDto,
  ): Promise<{ ok: boolean; duplicate?: boolean }> {
    this.verifier.verifyRawBody(rawBody, signatureHeader);

    const payloadHash = createHash('sha256').update(rawBody).digest('hex');

    try {
      await this.prisma.webhookEvent.create({
        data: {
          provider: 'custom',
          eventId: dto.eventId,
          payloadHash,
        },
      });
    } catch (e) {
      if (isUniqueViolation(e)) {
        this.logger.log(`Webhook idempotent replay eventId=${dto.eventId}`);
        return { ok: true, duplicate: true };
      }
      throw e;
    }

    const applied = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: dto.paymentId, orderId: dto.orderId },
        include: { order: true },
      });
      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (
        payment.status === PaymentStatus.PAID ||
        payment.status === PaymentStatus.COMPLETED
      ) {
        return false;
      }

      if (dto.status === 'failed') {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
        return false;
      }

      if (dto.status !== 'paid') {
        return false;
      }

      if (payment.order.status !== OrderStatus.CREATED) {
        throw new ConflictException(
          `Order ${dto.orderId} is not awaiting payment confirmation`,
        );
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID },
      });

      await tx.order.update({
        where: { id: dto.orderId },
        data: { status: OrderStatus.ACCEPTED },
      });

      return true;
    });

    if (applied) {
      await this.orderEventsPublisher.publish({
        type: 'STATUS',
        orderId: dto.orderId,
        status: OrderStatus.ACCEPTED,
      });
      await this.orderQueue.add(
        JOB_FULFILL_ORDER,
        { orderId: dto.orderId },
        {
          jobId: `fulfill-${dto.orderId}`,
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: true,
        },
      );
    }

    return { ok: true };
  }
}
