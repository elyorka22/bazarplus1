import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

/**
 * Truncates all application tables in dependency-safe order.
 * Call before each spec that needs a clean slate.
 */
export async function resetDatabase(): Promise<void> {
  const p = getTestPrisma();
  await p.$executeRawUnsafe(`
    TRUNCATE TABLE
      "order_items",
      "payments",
      "orders",
      "idempotency_keys",
      "webhook_events",
      "refresh_tokens",
      "products",
      "addresses",
      "couriers",
      "users",
      "categories"
    RESTART IDENTITY CASCADE;
  `);
}

export async function disconnectTestPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}
