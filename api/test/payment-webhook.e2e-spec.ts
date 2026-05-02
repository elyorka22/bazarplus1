import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { createTestApp } from './helpers/create-test-app';
import {
  createAddress,
  createCategory,
  createOrderPayload,
  createProduct,
  createUser,
  getTestPassword,
} from './helpers/factories';
import { getTestPrisma, resetDatabase } from './helpers/reset-database';
import { loginAccessToken } from './helpers/http-login';
import { getHttpServer } from './helpers/http-server';
import {
  buildPaidWebhookBody,
  signWebhookPayload,
} from './helpers/webhook-sign';

describe('Payment webhook idempotency (e2e)', () => {
  let app: INestApplication;
  const prisma = getTestPrisma();

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('same webhook twice processes payment once; no duplicate side-effects', async () => {
    const user = await createUser(prisma);
    const token = await loginAccessToken(app, user.email, getTestPassword());
    const cat = await createCategory(prisma);
    const product = await createProduct(prisma, cat.id, { stock: 5 });
    const addr = await createAddress(prisma, user.id);
    const payload = createOrderPayload(addr.id, [
      { productId: product.id, quantity: 1 },
    ]);

    const orderRes = await request(getHttpServer(app))
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `pay-${Date.now()}`)
      .send(payload);

    expect([200, 201]).toContain(orderRes.status);

    const orderId = (orderRes.body as { id: string }).id;
    const payment = await prisma.payment.findFirst({
      where: { orderId },
    });
    expect(payment).toBeTruthy();

    const secret = app
      .get(ConfigService)
      .getOrThrow<string>('paymentWebhookSecret');
    const eventId = 'evt-duplicate-test-' + Date.now();
    const raw = buildPaidWebhookBody({
      eventId,
      orderId,
      paymentId: payment!.id,
    });
    const sig = signWebhookPayload(secret, raw);

    const first = await request(getHttpServer(app))
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-webhook-signature', sig)
      .send(raw);

    expect([200, 201]).toContain(first.status);

    expect((first.body as { duplicate?: boolean }).duplicate).toBeFalsy();

    const second = await request(getHttpServer(app))
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-webhook-signature', sig)
      .send(raw);

    expect([200, 201]).toContain(second.status);

    expect((second.body as { duplicate?: boolean }).duplicate).toBe(true);

    const payments = await prisma.payment.findMany({ where: { orderId } });
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe(PaymentStatus.PAID);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order!.status).toBe(OrderStatus.ACCEPTED);

    const events = await prisma.webhookEvent.findMany({
      where: { eventId },
    });
    expect(events).toHaveLength(1);
  });
});
