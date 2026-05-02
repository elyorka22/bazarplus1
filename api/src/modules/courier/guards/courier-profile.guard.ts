import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../../auth/types/jwt-payload.type';
import { CourierRepository } from '../courier.repository';

@Injectable()
export class CourierProfileGuard implements CanActivate {
  constructor(private readonly courierRepository: CourierRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload; courier?: unknown }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException();
    }
    const courier = await this.courierRepository.findByUserId(user.sub);
    if (!courier) {
      throw new ForbiddenException('Courier profile required');
    }
    request.courier = courier;
    return true;
  }
}
