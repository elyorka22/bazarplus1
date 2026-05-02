import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  createUser(data: {
    email: string;
    passwordHash: string;
    name?: string;
    phone?: string;
    role?: Role;
  }) {
    return this.prisma.user.create({ data });
  }

  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.refreshToken.create({ data });
  }

  findRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });
  }

  deleteRefreshToken(id: string) {
    return this.prisma.refreshToken.delete({ where: { id } });
  }

  deleteRefreshTokensForUser(userId: string) {
    return this.prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
