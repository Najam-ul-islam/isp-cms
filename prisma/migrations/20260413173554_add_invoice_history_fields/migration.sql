/*
  Warnings:

  - You are about to drop the column `area` on the `clients` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyId,name]` on the table `areas` will be added. If there are existing duplicate values, this will fail.
  - Made the column `clientId` on table `payments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `invoiceId` on table `payments` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ProductSaleStatus" AS ENUM ('unpaid', 'paid');

-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_area_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_clientId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoiceId_fkey";

-- DropIndex
DROP INDEX "areas_name_key";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "area",
ADD COLUMN     "areaId" TEXT,
ADD COLUMN     "areaName" TEXT;

-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "assignedToId" TEXT;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'piece',
ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "inventory_transactions" ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "billingMonth" TEXT,
ADD COLUMN     "carryForwardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "creditUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "previousInvoiceId" TEXT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "clientId" SET NOT NULL,
ALTER COLUMN "invoiceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "product_sales" ADD COLUMN     "status" "ProductSaleStatus" NOT NULL DEFAULT 'unpaid';

-- CreateIndex
CREATE INDEX "areas_companyId_idx" ON "areas"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "areas_companyId_name_key" ON "areas"("companyId", "name");

-- CreateIndex
CREATE INDEX "clients_areaId_idx" ON "clients"("areaId");

-- CreateIndex
CREATE INDEX "complaints_assignedToId_idx" ON "complaints"("assignedToId");

-- CreateIndex
CREATE INDEX "invoices_clientId_billingMonth_idx" ON "invoices"("clientId", "billingMonth");

-- CreateIndex
CREATE INDEX "invoices_companyId_billingMonth_idx" ON "invoices"("companyId", "billingMonth");

-- CreateIndex
CREATE INDEX "invoices_previousInvoiceId_idx" ON "invoices"("previousInvoiceId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_previousInvoiceId_fkey" FOREIGN KEY ("previousInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
