import { createHmac } from 'crypto';

/**
 * Matches WebhookSignatureVerifier: header `sha256=<hex>` over raw body bytes.
 */
export function signWebhookPayload(secret: string, rawBody: Buffer): string {
  const hmac = createHmac('sha256', secret).update(rawBody).digest('hex');
  return `sha256=${hmac}`;
}

export function buildPaidWebhookBody(params: {
  eventId: string;
  orderId: string;
  paymentId: string;
}): Buffer {
  const json = JSON.stringify({
    eventId: params.eventId,
    orderId: params.orderId,
    paymentId: params.paymentId,
    status: 'paid',
  });
  return Buffer.from(json, 'utf8');
}
