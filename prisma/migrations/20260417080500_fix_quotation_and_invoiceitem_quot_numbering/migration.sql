/*
  Warnings:

  - A unique constraint covering the columns `[companyId,quotationNumber]` on the table `quotations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `quotationNumber` to the `quotations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "quotationNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "quotations_companyId_quotationNumber_key" ON "quotations"("companyId", "quotationNumber");
