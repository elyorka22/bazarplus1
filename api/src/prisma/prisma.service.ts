import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
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
    const databaseUrl = PrismaService.resolveDatabaseUrl(config);

    const prismaQueryMetrics =
      config.get<boolean>('prismaQueryMetrics') === true;

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: prismaQueryMetrics
        ? [{ emit: 'event', level: 'query' }]
        : ['warn', 'error'],
    });
  }

  /**
   * Prefer validated Nest config; fall back to process.env for scripts/tests that skip ConfigModule.
   */
  private static resolveDatabaseUrl(config: ConfigService): string {
    const url =
      config.get<string>('databaseUrl')?.trim() ||
      process.env.DATABASE_URL?.trim();
    if (!url) {
      throw new Error(
        'DATABASE_URL is missing. Set it before starting the application.',
      );
    }
    return url;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (err) {
      this.logger.error('Database connection failed', err as Error);
      throw err;
    }

    if (this.config.get<boolean>('prismaQueryMetrics')) {
      this.$on('query' as never, (e: Prisma.QueryEvent) => {
        recordPrismaQueryEvent(e);
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
