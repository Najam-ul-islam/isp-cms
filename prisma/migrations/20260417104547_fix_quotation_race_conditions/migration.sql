/*
  Warnings:

  - A unique constraint covering the columns `[companyId,invoiceNumber]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,idempotencyKey]` on the table `quotations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CounterType" AS ENUM ('quotation', 'invoice');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "invoiceNumber" TEXT;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateTable
CREATE TABLE "sequence_counters" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "CounterType" NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sequence_counters_companyId_type_idx" ON "sequence_counters"("companyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_counters_companyId_type_key" ON "sequence_counters"("companyId", "type");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_companyId_invoiceNumber_key" ON "invoices"("companyId", "invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_companyId_idempotencyKey_key" ON "quotations"("companyId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "sequence_counters" ADD CONSTRAINT "sequence_counters_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
