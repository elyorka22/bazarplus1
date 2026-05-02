import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const KEY_PRODUCTS_VERSION = 'cache:products:version';
const KEY_CATEGORIES_VERSION = 'cache:categories:version';

@Injectable()
export class CacheVersionService {
  constructor(private readonly redis: RedisService) {}

  async getProductsVersion(): Promise<number> {
    const v = await this.redis.get(KEY_PRODUCTS_VERSION);
    return v ? parseInt(v, 10) : 0;
  }

  async bumpProductsVersion(): Promise<number> {
    return this.redis.client.incr(KEY_PRODUCTS_VERSION);
  }

  async getCategoriesVersion(): Promise<number> {
    const v = await this.redis.get(KEY_CATEGORIES_VERSION);
    return v ? parseInt(v, 10) : 0;
  }

  async bumpCategoriesVersion(): Promise<number> {
    return this.redis.client.incr(KEY_CATEGORIES_VERSION);
  }

  async resolveProductsListKey(signature: string): Promise<string> {
    const v = await this.getProductsVersion();
    return `products:list:v${v}:${signature}`;
  }

  async resolveCategoriesListKey(): Promise<string> {
    const v = await this.getCategoriesVersion();
    return `categories:list:v${v}`;
  }
}
