-- CreateEnum
CREATE TYPE "ArrearsRolloverType" AS ENUM ('automatic', 'manual');

-- CreateEnum
CREATE TYPE "RevenueRolloverType" AS ENUM ('automatic', 'manual');

-- CreateTable
CREATE TABLE "monthly_arrears" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "pendingRecovery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalArrears" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previousArrears" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rolloverAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_arrears_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arrears_history" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "pendingRecoveryAmount" DOUBLE PRECISION NOT NULL,
    "amountRolledOver" DOUBLE PRECISION NOT NULL,
    "cumulativeArrears" DOUBLE PRECISION NOT NULL,
    "cumulativePrev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rolloverType" "ArrearsRolloverType" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arrears_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_revenue" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "previousRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rolloverAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_history" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "revenueAmount" DOUBLE PRECISION NOT NULL,
    "cumulativeRevenue" DOUBLE PRECISION NOT NULL,
    "cumulativePrev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rolloverType" "RevenueRolloverType" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_arrears_companyId_idx" ON "monthly_arrears"("companyId");

-- CreateIndex
CREATE INDEX "monthly_arrears_companyId_year_month_idx" ON "monthly_arrears"("companyId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_arrears_companyId_year_month_key" ON "monthly_arrears"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "arrears_history_companyId_idx" ON "arrears_history"("companyId");

-- CreateIndex
CREATE INDEX "arrears_history_companyId_year_month_idx" ON "arrears_history"("companyId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "arrears_history_companyId_year_month_key" ON "arrears_history"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "monthly_revenue_companyId_idx" ON "monthly_revenue"("companyId");

-- CreateIndex
CREATE INDEX "monthly_revenue_companyId_year_month_idx" ON "monthly_revenue"("companyId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_revenue_companyId_year_month_key" ON "monthly_revenue"("companyId", "year", "month");

-- CreateIndex
CREATE INDEX "revenue_history_companyId_idx" ON "revenue_history"("companyId");

-- CreateIndex
CREATE INDEX "revenue_history_companyId_year_month_idx" ON "revenue_history"("companyId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_history_companyId_year_month_key" ON "revenue_history"("companyId", "year", "month");

-- AddForeignKey
ALTER TABLE "monthly_arrears" ADD CONSTRAINT "monthly_arrears_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arrears_history" ADD CONSTRAINT "arrears_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_revenue" ADD CONSTRAINT "monthly_revenue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_history" ADD CONSTRAINT "revenue_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
