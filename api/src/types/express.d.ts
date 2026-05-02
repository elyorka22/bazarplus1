import type { Courier } from '@prisma/client';
import type { JwtPayload } from '../modules/auth/types/jwt-payload.type';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    courier?: Courier;
    rawBody?: Buffer;
    /** Set after JWT auth guard validates Bearer token. */
    user?: JwtPayload;
  }
}
