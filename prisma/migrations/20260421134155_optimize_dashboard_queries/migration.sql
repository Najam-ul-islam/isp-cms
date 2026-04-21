-- DropIndex
DROP INDEX "expenses_category_idx";

-- DropIndex
DROP INDEX "expenses_companyId_category_idx";

-- CreateIndex
CREATE INDEX "payments_invoiceId_status_idx" ON "payments"("invoiceId", "status");
