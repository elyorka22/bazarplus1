import { INestApplication } from '@nestjs/common';
import request from 'supertest';
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

describe('Idempotency and concurrent stock (e2e)', () => {
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

  it('same Idempotency-Key creates one order and returns same id twice', async () => {
    const user = await createUser(prisma);
    const token = await loginAccessToken(app, user.email, getTestPassword());
    const cat = await createCategory(prisma);
    const product = await createProduct(prisma, cat.id, { stock: 10 });
    const addr = await createAddress(prisma, user.id);

    const key = 'idem-key-' + Date.now();
    const payload = createOrderPayload(addr.id, [
      { productId: product.id, quantity: 2 },
    ]);

    const [a, b] = await Promise.all([
      request(getHttpServer(app))
        .post('/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send(payload),
      request(getHttpServer(app))
        .post('/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send(payload),
    ]);

    expect([200, 201]).toContain(a.status);
    expect([200, 201]).toContain(b.status);

    const idA = (a.body as { id: string }).id;
    const idB = (b.body as { id: string }).id;
    expect(idA).toBe(idB);

    const orders = await prisma.order.findMany({ where: { userId: user.id } });
    expect(orders).toHaveLength(1);

    const refreshed = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(refreshed!.stock).toBe(8);
  });

  it('parallel orders with stock=1: one succeeds, other out of stock; stock never negative', async () => {
    const u1 = await createUser(prisma);
    const u2 = await createUser(prisma);
    const t1 = await loginAccessToken(app, u1.email, getTestPassword());
    const t2 = await loginAccessToken(app, u2.email, getTestPassword());

    const cat = await createCategory(prisma);
    const product = await createProduct(prisma, cat.id, { stock: 1 });
    const a1 = await createAddress(prisma, u1.id);
    const a2 = await createAddress(prisma, u2.id);

    const payload1 = createOrderPayload(a1.id, [
      { productId: product.id, quantity: 1 },
    ]);
    const payload2 = createOrderPayload(a2.id, [
      { productId: product.id, quantity: 1 },
    ]);

    const [r1, r2] = await Promise.all([
      request(getHttpServer(app))
        .post('/orders')
        .set('Authorization', `Bearer ${t1}`)
        .set('Idempotency-Key', `key-a-${Date.now()}`)
        .send(payload1),
      request(getHttpServer(app))
        .post('/orders')
        .set('Authorization', `Bearer ${t2}`)
        .set('Idempotency-Key', `key-b-${Date.now()}`)
        .send(payload2),
    ]);

    const okStatus = r1.status === 400 ? r2.status : r1.status;
    const failStatus = r1.status === 400 ? r1.status : r2.status;
    expect([200, 201]).toContain(okStatus);
    expect(failStatus).toBe(400);

    const ok = r1.status === 400 ? r2 : r1;
    const fail = r1.status === 400 ? r1 : r2;
    expect(
      (fail.body as { error?: { message?: string } }).error?.message,
    ).toMatch(/out of stock/i);
    expect((ok.body as { id?: string }).id).toBeDefined();

    const stock = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(stock!.stock).toBe(0);
    expect(stock!.stock).toBeGreaterThanOrEqual(0);

    const orderCount = await prisma.order.count({
      where: { items: { some: { productId: product.id } } },
    });
    expect(orderCount).toBe(1);
  });
});
