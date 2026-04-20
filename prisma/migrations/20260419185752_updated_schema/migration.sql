/*
  Warnings:

  - A unique constraint covering the columns `[importHash,companyId]` on the table `clients` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "importHash" TEXT,
ADD COLUMN     "serviceProviderId" TEXT;

-- CreateIndex
CREATE INDEX "clients_companyId_serviceProviderId_idx" ON "clients"("companyId", "serviceProviderId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_importHash_companyId_key" ON "clients"("importHash", "companyId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "service_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
