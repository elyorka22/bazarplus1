-- AlterEnum
-- PostgreSQL: a newly added enum label cannot be used in the same transaction as ADD VALUE.
-- This migration must run alone so the next migration can UPDATE to 'PAID'::"PaymentStatus".
-- IF NOT EXISTS requires PostgreSQL 15+ (docker-compose uses postgres:16).
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PAID';
