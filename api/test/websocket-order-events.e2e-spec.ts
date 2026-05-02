import { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { OrderStatus } from '@prisma/client';
import { createTestApp } from './helpers/create-test-app';
import { getHttpServer } from './helpers/http-server';
import {
  createAddress,
  createCategory,
  createOrderPayload,
  createProduct,
  createAdminUser,
  createUser,
  getTestPassword,
} from './helpers/factories';
import { getTestPrisma, resetDatabase } from './helpers/reset-database';
import { loginAccessToken } from './helpers/http-login';

function getListenPort(server: Server): number {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') {
    throw new Error('Could not read listen port');
  }
  return addr.port;
}

describe('WebSocket order events (e2e)', () => {
  let app: INestApplication;
  const prisma = getTestPrisma();

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('client joins order room and receives a single status event per admin update', async () => {
    const user = await createUser(prisma);
    const admin = await createAdminUser(prisma);
    const userToken = await loginAccessToken(
      app,
      user.email,
      getTestPassword(),
    );
    const adminToken = await loginAccessToken(
      app,
      admin.email,
      getTestPassword(),
    );

    const cat = await createCategory(prisma);
    const product = await createProduct(prisma, cat.id, { stock: 20 });
    const addr = await createAddress(prisma, user.id);

    const orderRes = await request(getHttpServer(app))
      .post('/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', `ws-${Date.now()}`)
      .send(
        createOrderPayload(addr.id, [{ productId: product.id, quantity: 1 }]),
      );

    expect([200, 201]).toContain(orderRes.status);

    const orderId = (orderRes.body as { id: string }).id;

    const port = getListenPort(getHttpServer(app));
    const socket: Socket = io(`http://127.0.0.1:${port}/tracking`, {
      auth: { token: userToken },
      transports: ['websocket'],
      forceNew: true,
    });

    const statusEvents: Array<{ orderId: string; status: string }> = [];

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('connect timeout')), 10000);
      socket.on('connect', () => {
        clearTimeout(t);
        resolve();
      });
      socket.on('connect_error', (err) => {
        clearTimeout(t);
        reject(err);
      });
    });

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('joined timeout')), 10000);
      socket.once('joined', () => {
        clearTimeout(t);
        resolve();
      });
      socket.on('order:status', (p: { orderId: string; status: string }) => {
        statusEvents.push(p);
      });
      socket.emit('join', { orderId });
    });

    await request(getHttpServer(app))
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: OrderStatus.ACCEPTED })
      .expect(200);

    await new Promise((r) => setTimeout(r, 500));

    expect(statusEvents.length).toBe(1);
    expect(statusEvents[0].orderId).toBe(orderId);
    expect(statusEvents[0].status).toBe(OrderStatus.ACCEPTED);

    socket.close();
  });
});
