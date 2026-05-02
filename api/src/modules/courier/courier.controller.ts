import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';
import { CourierService } from './courier.service';
import { CourierOrdersQueryDto } from './dto/courier-orders-query.dto';
import { UpdateCourierLocationDto } from './dto/update-courier-location.dto';
import { CourierProfileGuard } from './guards/courier-profile.guard';
import type { Request } from 'express';

@ApiTags('courier')
@ApiBearerAuth()
@Controller('courier')
export class CourierController {
  constructor(private readonly courierService: CourierService) {}

  @Get('available')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List couriers marked available (admin)' })
  listAvailable() {
    return this.courierService.listAvailable();
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard, CourierProfileGuard)
  @ApiOperation({ summary: 'Orders assigned to this courier (active or history)' })
  listOrders(@Req() req: Request, @Query() query: CourierOrdersQueryDto) {
    return this.courierService.paginatedCourierOrders(req.courier!.id, query);
  }

  @Patch('orders/:orderId/status')
  @UseGuards(JwtAuthGuard, CourierProfileGuard)
  @ApiOperation({ summary: 'Advance order status (courier, same pipeline as admin)' })
  updateOrderStatus(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.courierService.updateOrderStatusAsCourier(
      req.courier!.id,
      orderId,
      dto,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, CourierProfileGuard)
  @ApiOperation({ summary: 'Current courier profile (linked to user)' })
  me(@CurrentUser() user: JwtPayload) {
    return this.courierService.getMine(user.sub);
  }

  @Patch('me/location')
  @UseGuards(JwtAuthGuard, CourierProfileGuard)
  @ApiOperation({
    summary: 'Update GPS location (broadcasts on active deliveries)',
  })
  updateLocation(@Req() req: Request, @Body() dto: UpdateCourierLocationDto) {
    return this.courierService.updateLocation(req.courier!.id, dto);
  }
}
