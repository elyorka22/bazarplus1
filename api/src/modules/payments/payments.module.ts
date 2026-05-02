import { Module } from '@nestjs/common';
import { EventsModule } from '../../infrastructure/events/events.module';
import { PaymentWebhookService } from './payment-webhook.service';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookController } from './payments.webhook.controller';
import { WebhookSignatureVerifier } from './webhook-signature.verifier';

@Module({
  imports: [EventsModule],
  controllers: [PaymentsWebhookController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    PaymentWebhookService,
    WebhookSignatureVerifier,
  ],
  exports: [PaymentsService, PaymentsRepository, PaymentWebhookService],
})
export class PaymentsModule {}
