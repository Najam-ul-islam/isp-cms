-- CreateEnum
CREATE TYPE "InvoiceSource" AS ENUM ('package', 'product_sale', 'manual', 'quotation');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('pending', 'sent', 'accepted', 'rejected', 'expired');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "source" "InvoiceSource" NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'pending',
    "validUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invoiceId" TEXT,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_invoiceId_key" ON "quotations"("invoiceId");

-- CreateIndex
CREATE INDEX "quotations_clientId_idx" ON "quotations"("clientId");

-- CreateIndex
CREATE INDEX "quotations_companyId_idx" ON "quotations"("companyId");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

-- CreateIndex
CREATE INDEX "quotations_validUntil_idx" ON "quotations"("validUntil");

-- CreateIndex
CREATE INDEX "quotation_items_quotationId_idx" ON "quotation_items"("quotationId");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
