import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  JOB_ORDER_PLACED_NOTIFY,
  QUEUE_NOTIFICATION,
} from '../../common/constants';
import {
  recordQueueJobDuration,
  recordQueueJobFailure,
} from '../../infrastructure/metrics/prometheus-metrics';

export type NotificationJobData = {
  userId: string;
  orderId: string;
  message: string;
};

@Processor(QUEUE_NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  async process(job: Job<NotificationJobData>): Promise<void> {
    const t0 = process.hrtime.bigint();
    try {
      if (job.name !== JOB_ORDER_PLACED_NOTIFY && job.name !== 'order-created') {
        this.logger.warn(`Unknown notification job name=${job.name}`);
      }
      const payload = job.data;
      this.logger.log(
        JSON.stringify({
          component: 'notification',
          jobName: job.name,
          userId: payload.userId,
          orderId: payload.orderId,
          message: payload.message,
        }),
      );
    } catch (e) {
      recordQueueJobFailure(QUEUE_NOTIFICATION, job.name);
      throw e;
    } finally {
      const sec = Number(process.hrtime.bigint() - t0) / 1e9;
      recordQueueJobDuration(QUEUE_NOTIFICATION, job.name, sec);
    }
  }
}
