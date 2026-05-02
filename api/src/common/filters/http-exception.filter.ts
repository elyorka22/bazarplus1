import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { httpRateLimitedTotal } from '../../infrastructure/metrics/prometheus-metrics';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw = isHttp ? exception.getResponse() : 'Internal server error';
    const body =
      typeof raw === 'string'
        ? { message: raw }
        : (raw as Record<string, unknown>);
    const message =
      typeof body.message === 'string'
        ? body.message
        : exception instanceof Error
          ? exception.message
          : 'Error';

    const requestId = request.requestId;

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      httpRateLimitedTotal.inc();
    }

    const stack = exception instanceof Error ? exception.stack : undefined;
    if (status >= 500) {
      this.logger.error(
        JSON.stringify({
          component: 'http.exception',
          requestId,
          method: request.method,
          url: request.url,
          status,
          message,
          sentryReady: Boolean(process.env.SENTRY_DSN),
        }),
        stack,
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code: `HTTP_${status}`,
        message,
      },
      requestId,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
