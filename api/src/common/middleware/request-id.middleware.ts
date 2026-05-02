import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const fromHeader = req.headers['x-request-id'];
    const id =
      typeof fromHeader === 'string' && fromHeader.length > 0
        ? fromHeader
        : randomUUID();
    req.requestId = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
