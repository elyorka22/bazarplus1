import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  create(data: { name: string; slug: string }) {
    return this.prisma.category.create({ data });
  }

  update(id: string, data: { name?: string; slug?: string }) {
    return this.prisma.category.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
