import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheVersionService } from '../../infrastructure/cache/cache-version.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly redis: RedisService,
    private readonly cacheVersion: CacheVersionService,
    private readonly config: ConfigService,
  ) {}

  async findAllCached() {
    const ttl = this.config.get<number>('cacheTtlCategoriesSeconds') ?? 300;
    const cacheKey = await this.cacheVersion.resolveCategoriesListKey();
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as unknown[];
    }
    const rows = await this.categoriesRepository.findAll();
    await this.redis.set(cacheKey, JSON.stringify(rows), ttl);
    return rows;
  }

  async invalidateCache(): Promise<void> {
    await this.cacheVersion.bumpCategoriesVersion();
  }

  async create(dto: CreateCategoryDto) {
    try {
      const row = await this.categoriesRepository.create(dto);
      await this.invalidateCache();
      return row;
    } catch {
      throw new ConflictException('Category slug must be unique');
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);
    try {
      const row = await this.categoriesRepository.update(id, dto);
      await this.invalidateCache();
      return row;
    } catch {
      throw new ConflictException('Unable to update category');
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.categoriesRepository.delete(id);
    await this.invalidateCache();
    return { deleted: true };
  }

  private async ensureExists(id: string) {
    const row = await this.categoriesRepository.findById(id);
    if (!row) {
      throw new NotFoundException('Category not found');
    }
  }
}
