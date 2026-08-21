-- CreateEnum
CREATE TYPE "email_delivery_status" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "email_delivery" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "status" "email_delivery_status" NOT NULL,
    "providerMessageId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_delivery_idempotencyKey_key" ON "email_delivery"("idempotencyKey");

-- CreateIndex
CREATE INDEX "email_delivery_to_idx" ON "email_delivery"("to");

-- CreateIndex
CREATE INDEX "email_delivery_status_idx" ON "email_delivery"("status");
