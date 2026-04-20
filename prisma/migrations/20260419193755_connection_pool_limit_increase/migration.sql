-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_companyId_fkey";

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "expenses_companyId_category_idx" ON "expenses"("companyId", "category");

-- CreateIndex
CREATE INDEX "inventory_items_companyId_idx" ON "inventory_items"("companyId");

-- CreateIndex
CREATE INDEX "inventory_items_quantity_idx" ON "inventory_items"("quantity");

-- CreateIndex
CREATE INDEX "inventory_items_companyId_quantity_idx" ON "inventory_items"("companyId", "quantity");

-- CreateIndex
CREATE INDEX "invoices_companyId_status_idx" ON "invoices"("companyId", "status");

-- CreateIndex
CREATE INDEX "payments_companyId_status_paymentDate_idx" ON "payments"("companyId", "status", "paymentDate");

-- CreateIndex
CREATE INDEX "product_sales_companyId_clientId_idx" ON "product_sales"("companyId", "clientId");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
