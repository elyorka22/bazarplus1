import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { AdminOrdersQueryDto } from './dto/admin-orders-query.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard KPIs (admin)' })
  stats() {
    return this.adminService.dashboardStats();
  }

  @Get('couriers/live')
  @ApiOperation({
    summary: 'Couriers with last GPS + active order (live map bootstrap)',
  })
  liveCouriers() {
    return this.adminService.listCouriersLive();
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all orders (admin)' })
  orders(@Query() query: AdminOrdersQueryDto) {
    return this.adminService.listOrders(query);
  }

  @Get('users')
  @ApiOperation({ summary: 'List users (admin)' })
  users(@Query() query: PaginationQueryDto) {
    return this.adminService.listUsers(query);
  }
}
