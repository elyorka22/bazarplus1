import { Global, Module } from '@nestjs/common';
import { RedisInfraModule } from '../redis/redis.module';
import { CacheVersionService } from './cache-version.service';

@Global()
@Module({
  imports: [RedisInfraModule],
  providers: [CacheVersionService],
  exports: [CacheVersionService],
})
export class CacheVersionModule {}
