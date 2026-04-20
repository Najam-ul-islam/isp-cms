/*
  Warnings:

  - A unique constraint covering the columns `[email,companyId]` on the table `employees` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,companyId]` on the table `service_providers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "account_ledgers_name_key";

-- DropIndex
DROP INDEX "employees_email_key";

-- DropIndex
DROP INDEX "service_providers_name_key";

-- CreateIndex
CREATE INDEX "account_ledgers_companyId_idx" ON "account_ledgers"("companyId");

-- CreateIndex
CREATE INDEX "clients_companyId_packageId_idx" ON "clients"("companyId", "packageId");

-- CreateIndex
CREATE INDEX "employees_companyId_idx" ON "employees"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_companyId_key" ON "employees"("email", "companyId");

-- CreateIndex
CREATE INDEX "packages_companyId_serviceProviderId_idx" ON "packages"("companyId", "serviceProviderId");

-- CreateIndex
CREATE INDEX "payments_companyId_clientId_idx" ON "payments"("companyId", "clientId");

-- CreateIndex
CREATE INDEX "service_providers_companyId_idx" ON "service_providers"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "service_providers_name_companyId_key" ON "service_providers"("name", "companyId");
