import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness: Postgres + Redis' })
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    await this.redis.client.ping();
    return {
      status: 'ok',
      database: 'up',
      redis: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
