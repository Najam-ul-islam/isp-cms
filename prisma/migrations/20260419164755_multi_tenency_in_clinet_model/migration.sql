/*
  Warnings:

  - A unique constraint covering the columns `[username,companyId]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone,companyId]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cnic,companyId]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,companyId]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,companyId]` on the table `packages` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "clients_cnic_key";

-- DropIndex
DROP INDEX "clients_email_key";

-- DropIndex
DROP INDEX "clients_phone_key";

-- DropIndex
DROP INDEX "clients_username_key";

-- DropIndex
DROP INDEX "packages_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "clients_username_companyId_key" ON "clients"("username", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_phone_companyId_key" ON "clients"("phone", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_cnic_companyId_key" ON "clients"("cnic", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_companyId_key" ON "clients"("email", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "packages_name_companyId_key" ON "packages"("name", "companyId");
