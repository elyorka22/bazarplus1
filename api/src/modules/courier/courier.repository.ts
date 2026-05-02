import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CourierRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.courier.findUnique({ where: { userId } });
  }

  findById(id: string) {
    return this.prisma.courier.findUnique({ where: { id } });
  }

  listAvailable() {
    return this.prisma.courier.findMany({
      where: { isAvailable: true },
      orderBy: { name: 'asc' },
    });
  }
}
