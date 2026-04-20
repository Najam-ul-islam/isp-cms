-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "carriedForwardAt" TIMESTAMP(3),
ADD COLUMN     "lineItems" JSONB;

-- CreateIndex
CREATE INDEX "invoices_carriedForwardAt_idx" ON "invoices"("carriedForwardAt");
