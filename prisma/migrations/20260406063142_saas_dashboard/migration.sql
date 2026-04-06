/*
  Warnings:

  - A unique constraint covering the columns `[companyId,name]` on the table `account_ledgers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_clientId_fkey";

-- AlterTable
ALTER TABLE "account_transactions" ADD COLUMN     "referenceType" TEXT;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "modulesEnabled" JSONB NOT NULL DEFAULT '{"billing":true,"inventory":false,"employees":true}';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "additionalCharges" JSONB;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "gateway" TEXT,
ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "referenceType" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "transactionId" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "description" TEXT,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_companyId_key" ON "subscriptions"("companyId");

-- CreateIndex
CREATE INDEX "subscriptions_companyId_idx" ON "subscriptions"("companyId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_endDate_idx" ON "subscriptions"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "account_ledgers_companyId_name_key" ON "account_ledgers"("companyId", "name");

-- CreateIndex
CREATE INDEX "account_transactions_companyId_idx" ON "account_transactions"("companyId");

-- CreateIndex
CREATE INDEX "account_transactions_referenceType_idx" ON "account_transactions"("referenceType");

-- CreateIndex
CREATE INDEX "account_transactions_date_idx" ON "account_transactions"("date");

-- CreateIndex
CREATE INDEX "account_transactions_companyId_date_idx" ON "account_transactions"("companyId", "date");

-- CreateIndex
CREATE INDEX "payments_gateway_idx" ON "payments"("gateway");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_transactionId_idx" ON "payments"("transactionId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
