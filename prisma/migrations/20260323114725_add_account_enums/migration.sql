/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cnic]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `type` on the `account_ledgers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `transactionType` on the `account_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('DEBIT', 'CREDIT', 'PAYMENT', 'REFUND', 'ADJUSTMENT', 'FEE');

-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_area_fkey";

-- AlterTable
ALTER TABLE "account_ledgers" DROP COLUMN "type",
ADD COLUMN     "type" "AccountType" NOT NULL;

-- AlterTable
ALTER TABLE "account_transactions" DROP COLUMN "transactionType",
ADD COLUMN     "transactionType" "TransactionKind" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clients_phone_key" ON "clients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_cnic_key" ON "clients"("cnic");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_area_fkey" FOREIGN KEY ("area") REFERENCES "areas"("name") ON DELETE SET NULL ON UPDATE CASCADE;
