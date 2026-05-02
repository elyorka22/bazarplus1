import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(userId: string) {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.usersRepository.updateProfile(userId, {
      name: dto.name,
      phone: dto.phone,
    });
  }

  listAddresses(userId: string) {
    return this.usersRepository.listAddresses(userId);
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.usersRepository.unsetOtherDefaults(userId);
    }
    return this.usersRepository.createAddress(userId, {
      label: dto.label,
      line1: dto.line1,
      line2: dto.line2,
      city: dto.city,
      postalCode: dto.postalCode,
      lat: dto.lat,
      lng: dto.lng,
      isDefault: dto.isDefault ?? false,
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    const existing = await this.usersRepository.findAddressForUser(
      addressId,
      userId,
    );
    if (!existing) {
      throw new NotFoundException('Address not found');
    }
    if (dto.isDefault === true) {
      await this.usersRepository.unsetOtherDefaults(userId, addressId);
    }
    return this.usersRepository.updateAddress(addressId, userId, {
      label: dto.label,
      line1: dto.line1,
      line2: dto.line2,
      city: dto.city,
      postalCode: dto.postalCode,
      lat: dto.lat,
      lng: dto.lng,
      isDefault: dto.isDefault,
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const result = await this.usersRepository.deleteAddress(addressId, userId);
    if (result.count === 0) {
      throw new NotFoundException('Address not found');
    }
    return { deleted: true };
  }
}
