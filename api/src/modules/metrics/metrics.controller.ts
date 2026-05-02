import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import * as client from 'prom-client';
import { Public } from '../../common/decorators/public.decorator';
import {
  initPrometheusDefaultMetrics,
  metricsRegister,
} from '../../infrastructure/metrics/prometheus-metrics';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  @Public()
  @Get()
  @Header('Content-Type', client.register.contentType)
  async prometheus(): Promise<string> {
    initPrometheusDefaultMetrics();
    return metricsRegister.metrics();
  }
}
