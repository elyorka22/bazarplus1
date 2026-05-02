import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  /** Comma-separated browser origins (e.g. https://app.example.com,https://www.example.com). Required in production. */
  CORS_ORIGINS: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(4).required(),
    otherwise: Joi.string().allow('', null),
  }),
  /** Set to `true` to expose /docs Swagger UI in production (default off). */
  ENABLE_SWAGGER: Joi.string().valid('true', 'false').optional(),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
  THROTTLE_TTL_SECONDS: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(120),
  CACHE_TTL_PRODUCTS_SECONDS: Joi.number().default(60),
  CACHE_TTL_CATEGORIES_SECONDS: Joi.number().default(300),
  PAYMENT_WEBHOOK_SECRET: Joi.string()
    .min(16)
    .default('development-webhook-secret-min16'),
  /** `true` enables Prisma query logging for Prometheus DB histogram (extra overhead). */
  PRISMA_QUERY_METRICS: Joi.string().valid('true', 'false').optional(),
});
