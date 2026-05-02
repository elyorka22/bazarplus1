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

describe('Performance sanity — concurrent orders (e2e)', () => {
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

  it('handles many concurrent POST /orders without corrupting stock', async () => {
    const user = await createUser(prisma);
    const token = await loginAccessToken(app, user.email, getTestPassword());
    const cat = await createCategory(prisma);
    const product = await createProduct(prisma, cat.id, { stock: 500 });
    const addr = await createAddress(prisma, user.id);

    const conc = 80;
    const base = Date.now();

    const started = Date.now();
    const responses = await Promise.all(
      Array.from({ length: conc }, (_, i) =>
        request(getHttpServer(app))
          .post('/orders')
          .set('Authorization', `Bearer ${token}`)
          .set('Idempotency-Key', `perf-${base}-${i}`)
          .send(
            createOrderPayload(addr.id, [
              { productId: product.id, quantity: 1 },
            ]),
          ),
      ),
    );
    const elapsed = Date.now() - started;

    const ok = responses.filter((r) => r.status === 201 || r.status === 200);
    expect(ok.length).toBe(conc);

    const orders = await prisma.order.count({ where: { userId: user.id } });
    expect(orders).toBe(conc);

    const refreshed = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(refreshed!.stock).toBe(500 - conc);
    expect(refreshed!.stock).toBeGreaterThanOrEqual(0);

    expect(elapsed).toBeLessThan(120000);
  });
});
