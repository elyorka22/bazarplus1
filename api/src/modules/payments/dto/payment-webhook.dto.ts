import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/** Minimal PSP-agnostic payload — extend per integration */
export class PaymentWebhookDto {
  @ApiProperty({ description: 'Unique provider event id for idempotency' })
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty()
  @IsUUID()
  paymentId!: string;

  @ApiProperty({ description: 'paid | failed' })
  @IsString()
  status!: string;
}
