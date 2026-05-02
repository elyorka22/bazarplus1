import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OrderStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { CourierAssignmentService } from '../src/modules/courier/courier-assignment.service';
import { createTestApp } from './helpers/create-test-app';
import {
  createAddress,
  createCategory,
  createCourier,
  createOrderPayload,
  createProduct,
  createAdminUser,
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

describe('Courier assignment and order state machine (e2e)', () => {
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

  it('assigns nearest courier once; busy courier not reused; repeated assign is idempotent', async () => {
    const user = await createUser(prisma);
    const token = await loginAccessToken(app, user.email, getTestPassword());
    const cat = await createCategory(prisma);
    const product = await createProduct(prisma, cat.id, { stock: 10 });
    const addr = await createAddress(prisma, user.id, {
      lat: 45.5,
      lng: -73.56,
    });

    const far = await createCourier(prisma, {
      name: 'Far',
      lat: 10,
      lng: 10,
      isAvailable: true,
    });
    const near = await createCourier(prisma, {
      name: 'Near',
      lat: 45.501,
      lng: -73.56,
      isAvailable: true,
    });

    const orderRes = await request(getHttpServer(app))
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `c1-${Date.now()}`)
      .send(
        createOrderPayload(addr.id, [{ productId: product.id, quantity: 1 }]),
      );

    expect([200, 201]).toContain(orderRes.status);

    const orderId = (orderRes.body as { id: string }).id;
    const payment = await prisma.payment.findFirst({ where: { orderId } });
    const secret = app
      .get(ConfigService)
      .getOrThrow<string>('paymentWebhookSecret');
    const raw = buildPaidWebhookBody({
      eventId: `evt-courier-${Date.now()}`,
      orderId,
      paymentId: payment!.id,
    });

    const wh1 = await request(getHttpServer(app))
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-webhook-signature', signWebhookPayload(secret, raw))
      .send(raw);
    expect([200, 201]).toContain(wh1.status);

    const assignment = app.get(CourierAssignmentService);
    const first = await assignment.assignNearestAvailable({
      orderId,
      deliveryLat: 45.5,
      deliveryLng: -73.56,
    });
    const second = await assignment.assignNearestAvailable({
      orderId,
      deliveryLat: 45.5,
      deliveryLng: -73.56,
    });

    expect(first?.courierId).toBe(near.id);
    expect(second?.courierId).toBe(near.id);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order!.courierId).toBe(near.id);

    const busyOrder = await prisma.order.findFirst({
      where: { courierId: near.id, status: OrderStatus.ACCEPTED },
    });
    expect(busyOrder).toBeTruthy();

    const otherUser = await createUser(prisma);
    const otherToken = await loginAccessToken(
      app,
      otherUser.email,
      getTestPassword(),
    );
    const otherAddr = await createAddress(prisma, otherUser.id, {
      lat: 45.5,
      lng: -73.56,
    });

    const order2Res = await request(getHttpServer(app))
      .post('/orders')
      .set('Authorization', `Bearer ${otherToken}`)
      .set('Idempotency-Key', `c2-${Date.now()}`)
      .send(
        createOrderPayload(otherAddr.id, [
          { productId: product.id, quantity: 1 },
        ]),
      );

    expect([200, 201]).toContain(order2Res.status);

    const order2Id = (order2Res.body as { id: string }).id;
    const pay2 = await prisma.payment.findFirst({
      where: { orderId: order2Id },
    });
    const raw2 = buildPaidWebhookBody({
      eventId: `evt-courier-2-${Date.now()}`,
      orderId: order2Id,
      paymentId: pay2!.id,
    });
    const wh2 = await request(getHttpServer(app))
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-webhook-signature', signWebhookPayload(secret, raw2))
      .send(raw2);
    expect([200, 201]).toContain(wh2.status);

    const assign2 = await assignment.assignNearestAvailable({
      orderId: order2Id,
      deliveryLat: 45.5,
      deliveryLng: -73.56,
    });

    expect(assign2?.courierId).toBe(far.id);
  });

  it('rejects invalid admin transitions', async () => {
    const admin = await createAdminUser(prisma);
    const user = await createUser(prisma);
    const adminToken = await loginAccessToken(
      app,
      admin.email,
      getTestPassword(),
    );
    const userToken = await loginAccessToken(
      app,
      user.email,
      getTestPassword(),
    );

    const cat = await createCategory(prisma);
    const product = await createProduct(prisma, cat.id, { stock: 5 });
    const addr = await createAddress(prisma, user.id);

    const orderRes = await request(getHttpServer(app))
      .post('/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', `sm-${Date.now()}`)
      .send(
        createOrderPayload(addr.id, [{ productId: product.id, quantity: 1 }]),
      );

    expect([200, 201]).toContain(orderRes.status);

    const orderId = (orderRes.body as { id: string }).id;

    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.DELIVERED },
    });

    const bad1 = await request(getHttpServer(app))
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: OrderStatus.CREATED })
      .expect(400);

    expect(
      (bad1.body as { error?: { message?: string } }).error?.message,
    ).toMatch(/invalid transition/i);

    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.ACCEPTED },
    });

    const bad2 = await request(getHttpServer(app))
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: OrderStatus.CREATED })
      .expect(400);

    expect(
      (bad2.body as { error?: { message?: string } }).error?.message,
    ).toMatch(/invalid transition/i);
  });
});
