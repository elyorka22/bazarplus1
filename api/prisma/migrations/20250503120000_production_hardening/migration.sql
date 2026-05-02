-- Payment status: PAID was added in migration 20250503115959_add_payment_status_paid_value
UPDATE "payments" SET status = 'PAID'::"PaymentStatus" WHERE status = 'COMPLETED'::"PaymentStatus";

CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "response_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_keys_user_id_key_key" ON "idempotency_keys"("user_id", "key");
CREATE INDEX "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");

ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "payload_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events"("event_id");
