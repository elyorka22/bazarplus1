import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';
import { AssignCourierDto } from './dto/assign-courier.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.USER, Role.ADMIN)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description:
      'Unique key per logical request; retries must reuse the same key',
  })
  @ApiOperation({
    summary:
      'Create order (atomic stock decrement, idempotent by Idempotency-Key)',
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: CreateOrderDto,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    return this.ordersService.createOrder(user.sub, key, dto);
  }

  @Get('me')
  @Roles(Role.USER, Role.ADMIN)
  @ApiOperation({ summary: 'My orders' })
  listMine(
    @CurrentUser() user: JwtPayload,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ordersService.listMine(user.sub, query);
  }

  @Get(':id')
  @Roles(Role.USER, Role.ADMIN, Role.COURIER)
  @ApiOperation({ summary: 'Order detail (owner, admin, or assigned courier)' })
  getOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.getOne(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update order status (admin)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.updateStatus(id, dto, user);
  }

  @Post(':id/courier')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign courier (admin)' })
  assignCourier(
    @Param('id') id: string,
    @Body() dto: AssignCourierDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.assignCourier(id, dto.courierId, user);
  }
}
