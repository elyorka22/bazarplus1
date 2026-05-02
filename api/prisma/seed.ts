import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('Admin12345!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bazarplus.local' },
    update: {},
    create: {
      email: 'admin@bazarplus.local',
      passwordHash: adminPass,
      name: 'Admin',
      role: Role.ADMIN,
    },
  });

  const userPass = await bcrypt.hash('User12345!', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'user@bazarplus.local' },
    update: {},
    create: {
      email: 'user@bazarplus.local',
      passwordHash: userPass,
      name: 'Demo Customer',
      role: Role.USER,
    },
  });

  const courierPass = await bcrypt.hash('Courier12345!', 12);
  const courierUser = await prisma.user.upsert({
    where: { email: 'courier@bazarplus.local' },
    update: { role: Role.COURIER },
    create: {
      email: 'courier@bazarplus.local',
      passwordHash: courierPass,
      name: 'Demo Courier',
      role: Role.COURIER,
    },
  });

  const produce = await prisma.category.upsert({
    where: { slug: 'produce' },
    update: {},
    create: { name: 'Produce', slug: 'produce' },
  });

  const dairy = await prisma.category.upsert({
    where: { slug: 'dairy' },
    update: {},
    create: { name: 'Dairy', slug: 'dairy' },
  });

  const products = [
    {
      name: 'Organic Bananas',
      description: '1 bunch',
      price: 2.99,
      stock: 500,
      categoryId: produce.id,
    },
    {
      name: 'Avocados',
      description: 'Ripe',
      price: 1.49,
      stock: 200,
      categoryId: produce.id,
    },
    {
      name: 'Whole Milk 1L',
      description: '3.25%',
      price: 3.29,
      stock: 150,
      categoryId: dairy.id,
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { name: p.name, categoryId: p.categoryId },
    });
    if (!existing) {
      await prisma.product.create({ data: p });
    }
  }

  const addr = await prisma.address.findFirst({
    where: { userId: customer.id, line1: '123 Market St' },
  });
  if (!addr) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        label: 'Home',
        line1: '123 Market St',
        city: 'Demo City',
        postalCode: 'H0H0H0',
        isDefault: true,
      },
    });
  }

  const courier = await prisma.courier.findFirst({
    where: { userId: courierUser.id },
  });
  if (!courier) {
    await prisma.courier.create({
      data: {
        userId: courierUser.id,
        name: 'Alex Rider',
        phone: '+10000000002',
        vehicle: 'bike',
        isAvailable: true,
        currentLat: 45.5017,
        currentLng: -73.5673,
      },
    });
  }

  console.log('Seed OK — users:', {
    admin: admin.email,
    customer: customer.email,
    courierLogin: courierUser.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
