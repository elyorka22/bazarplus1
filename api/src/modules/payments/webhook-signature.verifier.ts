import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class WebhookSignatureVerifier {
  constructor(private readonly config: ConfigService) {}

  /**
   * Validates `x-webhook-signature: sha256=<hex>` HMAC of raw body.
   * Swap implementation per PSP (Stripe, Adyen) without changing controller flow.
   */
  verifyRawBody(rawBody: Buffer, signatureHeader: string | undefined): void {
    const secret = this.config.getOrThrow<string>('paymentWebhookSecret');
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      throw new UnauthorizedException('Invalid webhook signature header');
    }
    const expectedHex = signatureHeader.slice('sha256='.length);
    const expected = Buffer.from(expectedHex, 'hex');
    const hmac = createHmac('sha256', secret).update(rawBody).digest();
    if (expected.length !== hmac.length || !timingSafeEqual(expected, hmac)) {
      throw new UnauthorizedException('Webhook signature mismatch');
    }
  }
}
