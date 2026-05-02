import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable } from 'rxjs';
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  httpResponsesServerErrorsTotal,
  normalizeHttpPath,
} from './prometheus-metrics';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const rawPath = req.path || req.url?.split('?')[0] || '/';
    if (rawPath === '/metrics') {
      return next.handle();
    }

    const path = normalizeHttpPath(rawPath);
    const method = req.method;
    const start = process.hrtime.bigint();

    res.once('finish', () => {
      const code = res.statusCode ?? 500;
      const status = String(code);
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      const labels = { method, path, status_code: status };
      httpRequestDurationSeconds.observe(labels, seconds);
      httpRequestsTotal.inc(labels);
      if (code >= 500) {
        httpResponsesServerErrorsTotal.inc({ method, path });
      }
    });

    return next.handle();
  }
}
