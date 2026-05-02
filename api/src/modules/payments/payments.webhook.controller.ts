import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentWebhookService } from './payment-webhook.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsWebhookController {
  constructor(private readonly paymentWebhookService: PaymentWebhookService) {}

  @Public()
  @Post('webhook')
  @ApiOperation({
    summary:
      'PSP webhook (HMAC sha256=… on raw body; idempotent by eventId + payment state)',
  })
  async webhook(
    @Req() req: Request,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Body() dto: PaymentWebhookDto,
  ) {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException(
        'Raw body required for signature verification',
      );
    }
    return this.paymentWebhookService.handleWebhook(raw, signature, dto);
  }
}
