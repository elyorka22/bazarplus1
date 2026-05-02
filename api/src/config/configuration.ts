function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  enableSwagger: process.env.ENABLE_SWAGGER === 'true',
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  throttleTtlSeconds: parseInt(process.env.THROTTLE_TTL_SECONDS ?? '60', 10),
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
  cacheTtlProductsSeconds: parseInt(
    process.env.CACHE_TTL_PRODUCTS_SECONDS ?? '60',
    10,
  ),
  cacheTtlCategoriesSeconds: parseInt(
    process.env.CACHE_TTL_CATEGORIES_SECONDS ?? '300',
    10,
  ),
  paymentWebhookSecret:
    process.env.PAYMENT_WEBHOOK_SECRET ?? 'development-webhook-secret-min16',
  /** When true, emit Prisma query events for `prisma_query_duration_seconds` (adds CPU overhead). */
  prismaQueryMetrics: process.env.PRISMA_QUERY_METRICS === 'true',
});
