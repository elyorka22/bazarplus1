import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getHttpServer } from './http-server';

export async function loginAccessToken(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(getHttpServer(app))
    .post('/auth/login')
    .send({ email, password });

  expect([200, 201]).toContain(res.status);

  const body = res.body as { accessToken?: string };
  if (!body.accessToken) {
    throw new Error('Login response missing accessToken');
  }
  return body.accessToken;
}
