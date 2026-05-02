import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { JOB_FULFILL_ORDER, QUEUE_ORDER } from '../../common/constants';
import {
  recordQueueJobDuration,
  recordQueueJobFailure,
} from '../../infrastructure/metrics/prometheus-metrics';
import { CourierAssignmentService } from '../../modules/courier/courier-assignment.service';
import { PrismaService } from '../../prisma/prisma.service';

@Processor(QUEUE_ORDER)
export class OrderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly courierAssignment: CourierAssignmentService,
  ) {
    super();
  }

  /**
   * Idempotent: assigns nearest courier only when ACCEPTED + unpaid courier slot free.
   * Triggered after payment webhook (job name fulfill-order).
   */
  async process(job: Job<{ orderId: string }>): Promise<void> {
    const t0 = process.hrtime.bigint();
    try {
      if (job.name !== JOB_FULFILL_ORDER) {
        this.logger.warn(`Ignoring unknown job name=${job.name}`);
        return;
      }

      const { orderId } = job.data;
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          courierId: true,
          deliverySnapshot: true,
        },
      });

      if (!order || order.status !== OrderStatus.ACCEPTED) {
        this.logger.log(`Fulfill skip order=${orderId} state=${order?.status}`);
        return;
      }

      if (order.courierId) {
        this.logger.log(`Fulfill skip order=${orderId} courier already set`);
        return;
      }

      const snap = order.deliverySnapshot as {
        lat?: number;
        lng?: number;
      };
      const lat = snap.lat ?? 0;
      const lng = snap.lng ?? 0;

      const result = await this.courierAssignment.assignNearestAvailable({
        orderId,
        deliveryLat: lat,
        deliveryLng: lng,
      });

      if (result) {
        this.logger.log(`Courier ${result.courierId} assigned to ${orderId}`);
      } else {
        this.logger.warn(`No courier available for order ${orderId}`);
      }
    } catch (e) {
      recordQueueJobFailure(QUEUE_ORDER, job.name);
      throw e;
    } finally {
      const sec = Number(process.hrtime.bigint() - t0) / 1e9;
      recordQueueJobDuration(QUEUE_ORDER, job.name, sec);
    }
  }
}
