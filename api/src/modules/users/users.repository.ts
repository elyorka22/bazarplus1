import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
  }

  updateProfile(id: string, data: { name?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  }

  createAddress(
    userId: string,
    data: {
      label?: string;
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      lat?: number;
      lng?: number;
      isDefault?: boolean;
    },
  ) {
    return this.prisma.address.create({
      data: { userId, ...data },
    });
  }

  findAddressForUser(addressId: string, userId: string) {
    return this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
  }

  updateAddress(
    addressId: string,
    userId: string,
    data: Partial<{
      label: string | null;
      line1: string;
      line2: string | null;
      city: string;
      postalCode: string;
      lat: number | null;
      lng: number | null;
      isDefault: boolean;
    }>,
  ) {
    return this.prisma.address.update({
      where: { id: addressId },
      data,
    });
  }

  deleteAddress(addressId: string, userId: string) {
    return this.prisma.address.deleteMany({
      where: { id: addressId, userId },
    });
  }

  async unsetOtherDefaults(userId: string, exceptId?: string) {
    await this.prisma.address.updateMany({
      where: {
        userId,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  }
}
