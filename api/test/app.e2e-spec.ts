import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { getHttpServer } from './helpers/http-server';

describe('Smoke (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health', async () => {
    await request(getHttpServer(app)).get('/health').expect(200);
  });
});
