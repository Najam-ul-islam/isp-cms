-- CreateEnum
CREATE TYPE "SaaSInvoiceStatus" AS ENUM ('unpaid', 'partial', 'paid', 'overdue', 'cancelled');

-- CreateTable
CREATE TABLE "saas_invoices" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "SaaSInvoiceStatus" NOT NULL DEFAULT 'unpaid',
    "description" TEXT,
    "billingPeriod" TEXT,
    "carryForwardAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalCharges" JSONB,
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "previousInvoiceId" TEXT,

    CONSTRAINT "saas_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "notes" TEXT,
    "gateway" TEXT,
    "transactionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saas_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saas_invoices_companyId_idx" ON "saas_invoices"("companyId");

-- CreateIndex
CREATE INDEX "saas_invoices_issuedDate_idx" ON "saas_invoices"("issuedDate");

-- CreateIndex
CREATE INDEX "saas_invoices_dueDate_idx" ON "saas_invoices"("dueDate");

-- CreateIndex
CREATE INDEX "saas_invoices_companyId_issuedDate_idx" ON "saas_invoices"("companyId", "issuedDate");

-- CreateIndex
CREATE INDEX "saas_invoices_companyId_billingPeriod_idx" ON "saas_invoices"("companyId", "billingPeriod");

-- CreateIndex
CREATE INDEX "saas_invoices_previousInvoiceId_idx" ON "saas_invoices"("previousInvoiceId");

-- CreateIndex
CREATE INDEX "saas_invoices_planId_idx" ON "saas_invoices"("planId");

-- CreateIndex
CREATE INDEX "saas_payments_invoiceId_idx" ON "saas_payments"("invoiceId");

-- CreateIndex
CREATE INDEX "saas_payments_paymentDate_idx" ON "saas_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "saas_payments_gateway_idx" ON "saas_payments"("gateway");

-- CreateIndex
CREATE INDEX "saas_payments_status_idx" ON "saas_payments"("status");

-- CreateIndex
CREATE INDEX "saas_payments_transactionId_idx" ON "saas_payments"("transactionId");

-- AddForeignKey
ALTER TABLE "saas_invoices" ADD CONSTRAINT "saas_invoices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_invoices" ADD CONSTRAINT "saas_invoices_previousInvoiceId_fkey" FOREIGN KEY ("previousInvoiceId") REFERENCES "saas_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_invoices" ADD CONSTRAINT "saas_invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_payments" ADD CONSTRAINT "saas_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "saas_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
