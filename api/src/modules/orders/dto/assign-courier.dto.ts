import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignCourierDto {
  @ApiProperty()
  @IsUUID()
  courierId!: string;
}
