import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { CacheVersionService } from '../../infrastructure/cache/cache-version.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { CategoriesRepository } from '../categories/categories.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesRepository: CategoriesRepository,
    private readonly redis: RedisService,
    private readonly cacheVersion: CacheVersionService,
    private readonly config: ConfigService,
  ) {}

  private cacheSignature(query: ProductQueryDto): string {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const cat = query.categoryId ?? 'all';
    return `${page}:${limit}:${cat}`;
  }

  async findAllPaginated(query: ProductQueryDto) {
    const ttl = this.config.get<number>('cacheTtlProductsSeconds') ?? 60;
    const sig = this.cacheSignature(query);
    const key = await this.cacheVersion.resolveProductsListKey(sig);
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached) as {
        items: unknown[];
        meta: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const [items, total] = await this.productsRepository.findManyPaginated({
      skip,
      take: limit,
      categoryId: query.categoryId,
    });
    const serialized = items.map((p) => ({
      ...p,
      price: p.price.toString(),
    }));
    const payload = {
      items: serialized,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
    await this.redis.set(key, JSON.stringify(payload), ttl);
    return payload;
  }

  async invalidateListCache(): Promise<void> {
    await this.cacheVersion.bumpProductsVersion();
  }

  async findOne(id: string) {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return {
      ...product,
      price: product.price.toString(),
    };
  }

  async create(dto: CreateProductDto) {
    const category = await this.categoriesRepository.findById(dto.categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    try {
      const row = await this.productsRepository.create({
        name: dto.name,
        description: dto.description,
        price: new Prisma.Decimal(dto.price),
        stock: dto.stock ?? 0,
        imageUrl: dto.imageUrl,
        category: { connect: { id: dto.categoryId } },
      });
      await this.invalidateListCache();
      return {
        ...row,
        price: row.price.toString(),
      };
    } catch {
      throw new ConflictException('Unable to create product');
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);
    if (dto.categoryId) {
      const category = await this.categoriesRepository.findById(dto.categoryId);
      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }
    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }
    const row = await this.productsRepository.update(id, data);
    await this.invalidateListCache();
    return {
      ...row,
      price: row.price.toString(),
    };
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.productsRepository.delete(id);
    await this.invalidateListCache();
    return { deleted: true };
  }

  private async ensureExists(id: string) {
    const row = await this.productsRepository.findById(id);
    if (!row) {
      throw new NotFoundException('Product not found');
    }
  }
}
