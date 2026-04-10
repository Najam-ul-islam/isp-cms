-- CreateTable
CREATE TABLE "product_sales" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "productName" TEXT NOT NULL,
    "actualPrice" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitProfit" DOUBLE PRECISION NOT NULL,
    "totalOtherIncome" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "product_sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_sales_companyId_idx" ON "product_sales"("companyId");

-- CreateIndex
CREATE INDEX "product_sales_saleDate_idx" ON "product_sales"("saleDate");

-- CreateIndex
CREATE INDEX "product_sales_companyId_saleDate_idx" ON "product_sales"("companyId", "saleDate");

-- CreateIndex
CREATE INDEX "product_sales_clientId_idx" ON "product_sales"("clientId");

-- AddForeignKey
ALTER TABLE "product_sales" ADD CONSTRAINT "product_sales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_sales" ADD CONSTRAINT "product_sales_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
