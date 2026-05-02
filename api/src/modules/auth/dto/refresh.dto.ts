import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Opaque refresh token from login/refresh' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
