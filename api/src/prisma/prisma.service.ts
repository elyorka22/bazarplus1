import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Prisma, PrismaClient } from '@prisma/client';
import { recordPrismaQueryEvent } from '../infrastructure/metrics/prometheus-metrics';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: ConfigService) {
    super({
      log: config.get<boolean>('prismaQueryMetrics')
        ? [{ emit: 'event', level: 'query' }]
        : [],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connected');
    if (this.config.get<boolean>('prismaQueryMetrics')) {
      this.$on('query' as never, (e: Prisma.QueryEvent) => {
        recordPrismaQueryEvent(e);
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
