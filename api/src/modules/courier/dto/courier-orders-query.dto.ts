import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export enum CourierOrdersScope {
  ACTIVE = 'active',
  HISTORY = 'history',
}

export class CourierOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CourierOrdersScope, default: CourierOrdersScope.ACTIVE })
  @IsOptional()
  @IsEnum(CourierOrdersScope)
  scope: CourierOrdersScope = CourierOrdersScope.ACTIVE;
}
