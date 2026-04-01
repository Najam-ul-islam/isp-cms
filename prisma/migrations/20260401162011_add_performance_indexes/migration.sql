-- CreateIndex
CREATE INDEX "admins_companyId_idx" ON "admins"("companyId");

-- CreateIndex
CREATE INDEX "admins_role_idx" ON "admins"("role");

-- CreateIndex
CREATE INDEX "admins_companyId_role_idx" ON "admins"("companyId", "role");

-- CreateIndex
CREATE INDEX "clients_companyId_idx" ON "clients"("companyId");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_paymentStatus_idx" ON "clients"("paymentStatus");

-- CreateIndex
CREATE INDEX "clients_expiryDate_idx" ON "clients"("expiryDate");

-- CreateIndex
CREATE INDEX "clients_companyId_status_idx" ON "clients"("companyId", "status");

-- CreateIndex
CREATE INDEX "clients_companyId_paymentStatus_idx" ON "clients"("companyId", "paymentStatus");

-- CreateIndex
CREATE INDEX "clients_companyId_expiryDate_idx" ON "clients"("companyId", "expiryDate");

-- CreateIndex
CREATE INDEX "clients_companyId_status_expiryDate_idx" ON "clients"("companyId", "status", "expiryDate");

-- CreateIndex
CREATE INDEX "complaints_companyId_idx" ON "complaints"("companyId");

-- CreateIndex
CREATE INDEX "complaints_status_idx" ON "complaints"("status");

-- CreateIndex
CREATE INDEX "complaints_companyId_status_idx" ON "complaints"("companyId", "status");

-- CreateIndex
CREATE INDEX "expenses_companyId_idx" ON "expenses"("companyId");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_companyId_date_idx" ON "expenses"("companyId", "date");

-- CreateIndex
CREATE INDEX "packages_companyId_idx" ON "packages"("companyId");

-- CreateIndex
CREATE INDEX "packages_isActive_idx" ON "packages"("isActive");

-- CreateIndex
CREATE INDEX "packages_companyId_isActive_idx" ON "packages"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "payments_clientId_idx" ON "payments"("clientId");

-- CreateIndex
CREATE INDEX "payments_companyId_idx" ON "payments"("companyId");

-- CreateIndex
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");

-- CreateIndex
CREATE INDEX "payments_clientId_paymentDate_idx" ON "payments"("clientId", "paymentDate");

-- CreateIndex
CREATE INDEX "payments_companyId_paymentDate_idx" ON "payments"("companyId", "paymentDate");
