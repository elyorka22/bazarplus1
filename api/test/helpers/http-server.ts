import type { INestApplication } from '@nestjs/common';
import type { Server } from 'http';

export function getHttpServer(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}
