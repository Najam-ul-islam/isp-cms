-- CreateEnum
CREATE TYPE "InvoiceItemType" AS ENUM ('package', 'addon', 'carry_forward', 'discount', 'other');

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "type" "InvoiceItemType" NOT NULL DEFAULT 'other';

-- CreateIndex
CREATE INDEX "invoice_items_type_idx" ON "invoice_items"("type");
