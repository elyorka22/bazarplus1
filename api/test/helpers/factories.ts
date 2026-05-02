import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const TEST_PASSWORD = 'TestPass12345!';
const BCRYPT_ROUNDS = 5;

export type CreateUserOpts = {
  email?: string;
  name?: string;
  role?: Role;
};

export async function createUser(
  prisma: PrismaClient,
  opts: CreateUserOpts = {},
) {
  const email =
    opts.email ??
    `u-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@test.local`;
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      name: opts.name ?? 'Test User',
      role: opts.role ?? Role.USER,
    },
  });
}

export async function createAdminUser(prisma: PrismaClient) {
  return createUser(prisma, {
    email: `admin-${Date.now()}@test.local`,
    name: 'Admin',
    role: Role.ADMIN,
  });
}

export async function createCategory(prisma: PrismaClient, name?: string) {
  const slug = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return prisma.category.create({
    data: {
      name: name ?? 'Test Category',
      slug,
    },
  });
}

export async function createProduct(
  prisma: PrismaClient,
  categoryId: string,
  opts: { stock?: number; price?: number; name?: string } = {},
) {
  return prisma.product.create({
    data: {
      name: opts.name ?? `Product ${Date.now()}`,
      categoryId,
      price: opts.price ?? 9.99,
      stock: opts.stock ?? 100,
    },
  });
}

export async function createAddress(
  prisma: PrismaClient,
  userId: string,
  opts: { lat?: number; lng?: number } = {},
) {
  return prisma.address.create({
    data: {
      userId,
      label: 'Home',
      line1: '1 Test St',
      city: 'Test City',
      postalCode: 'T0T0T0',
      lat: opts.lat ?? 45.5017,
      lng: opts.lng ?? -73.5673,
      isDefault: true,
    },
  });
}

export type OrderLine = { productId: string; quantity: number };

export function createOrderPayload(addressId: string, lines: OrderLine[]) {
  return {
    addressId,
    items: lines.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
    })),
  };
}

export function getTestPassword(): string {
  return TEST_PASSWORD;
}

export async function createCourier(
  prisma: PrismaClient,
  opts: {
    name?: string;
    lat?: number;
    lng?: number;
    isAvailable?: boolean;
    userId?: string | null;
  } = {},
) {
  return prisma.courier.create({
    data: {
      name: opts.name ?? 'Courier',
      phone: `+1555${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`,
      isAvailable: opts.isAvailable ?? true,
      currentLat: opts.lat ?? 45.5017,
      currentLng: opts.lng ?? -73.5673,
      userId: opts.userId ?? null,
    },
  });
}
