/*
  Warnings:

  - Added the required column `companyId` to the `account_ledgers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `account_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `areas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `complaints` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `packages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `service_providers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "account_ledgers" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "account_transactions" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "areas" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "service_providers" ADD COLUMN     "companyId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_providers" ADD CONSTRAINT "service_providers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_ledgers" ADD CONSTRAINT "account_ledgers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_transactions" ADD CONSTRAINT "account_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
