import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyPaginated(params: {
    skip: number;
    take: number;
    categoryId?: string;
  }) {
    const where: Prisma.ProductWhereInput = {};
    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }
    return this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.product.count({ where }),
    ]);
  }

  findById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({
      data,
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  findByIdsForUpdate(tx: Prisma.TransactionClient, ids: string[]) {
    return tx.product.findMany({
      where: { id: { in: ids } },
    });
  }
}
