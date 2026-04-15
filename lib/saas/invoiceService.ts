import { prisma } from "@/lib/prisma";

export interface CreateSaaSInvoiceInput {
  companyId: string;
  amount: number;
  dueDate?: string;
  description?: string;
  billingPeriod?: string;
  planId?: string;
  additionalCharges?: any;
}

export interface RecordSaaSPaymentInput {
  invoiceId: string;
  amount: number;
  method?: string;
  notes?: string;
  gateway?: string;
  transactionId?: string;
}

export async function getSaaSInvoicesByCompany(companyId: string, status?: string) {
  const where: any = { companyId };
  if (status && status !== "all") {
    where.status = status;
  }

  const invoices = await prisma.saaSInvoice.findMany({
    where,
    include: {
      payments: {
        where: { status: "success" },
        orderBy: { paymentDate: "desc" },
      },
      plan: true,
      previousInvoice: {
        select: { id: true },
      },
    },
    orderBy: { issuedDate: "desc" },
  });

  // Calculate payment totals and remaining amounts
  const invoicesWithTotals = invoices.map((invoice) => {
    const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalAmount = invoice.amount + invoice.carryForwardAmount;
    const remainingAmount = Math.max(0, totalAmount - totalPaid - invoice.creditUsed);
    const effectiveStatus =
      totalPaid === 0
        ? "unpaid"
        : remainingAmount > 0
        ? "partial"
        : "paid";

    return {
      ...invoice,
      totalPaid,
      totalAmount,
      remainingAmount,
      effectivePaymentStatus: effectiveStatus,
    };
  });

  return invoicesWithTotals;
}

export async function getSaaSInvoiceById(invoiceId: string) {
  const invoice = await prisma.saaSInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: {
        orderBy: { paymentDate: "desc" },
      },
      plan: true,
      company: {
        select: { id: true, name: true },
      },
      previousInvoice: {
        select: { id: true, amount: true, carryForwardAmount: true },
      },
    },
  });

  if (!invoice) return null;

  const totalPaid = invoice.payments
    .filter((p) => p.status === "success")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalAmount = invoice.amount + invoice.carryForwardAmount;
  const remainingAmount = Math.max(0, totalAmount - totalPaid - invoice.creditUsed);

  return {
    ...invoice,
    totalPaid,
    totalAmount,
    remainingAmount,
  };
}

export async function getSaaSInvoiceStats(companyId: string) {
  const invoices = await prisma.saaSInvoice.findMany({
    where: { companyId },
    select: {
      amount: true,
      carryForwardAmount: true,
      status: true,
      payments: {
        where: { status: "success" },
        select: { amount: true },
      },
    },
  });

  let totalBilled = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

  invoices.forEach((invoice) => {
    const invoiceTotal = invoice.amount + invoice.carryForwardAmount;
    totalBilled += invoiceTotal;

    const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    totalPaid += paid;

    const remaining = Math.max(0, invoiceTotal - paid);
    totalRemaining += remaining;
  });

  return {
    totalBilled,
    totalPaid,
    totalRemaining,
    totalInvoices: invoices.length,
  };
}

export async function createSaaSInvoice(input: CreateSaaSInvoiceInput) {
  const { companyId, amount, description, planId, additionalCharges } = input;

  // Verify company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error("Company not found");
  }

  // Verify plan exists if provided
  if (planId) {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      throw new Error("Plan not found");
    }
  }

  // Check for existing unpaid invoice for this company
  const existingUnpaidInvoice = await prisma.saaSInvoice.findFirst({
    where: {
      companyId,
      status: "unpaid",
    },
    orderBy: { issuedDate: "desc" },
  });

  if (existingUnpaidInvoice) {
    return {
      error: "Company already has an unpaid invoice",
      existingInvoice: existingUnpaidInvoice,
    };
  }

  // Get the last paid invoice to calculate carry-forward
  const lastInvoice = await prisma.saaSInvoice.findFirst({
    where: {
      companyId,
      status: "paid",
    },
    orderBy: { issuedDate: "desc" },
  });

  let carryForwardAmount = 0;
  let previousInvoiceId: string | null = null;

  if (lastInvoice) {
    const lastInvoiceTotalPaid = await prisma.saaSPayment.aggregate({
      where: {
        invoiceId: lastInvoice.id,
        status: "success",
      },
      _sum: { amount: true },
    });

    const totalPaid = lastInvoiceTotalPaid._sum.amount || 0;
    const totalAmount = lastInvoice.amount + lastInvoice.carryForwardAmount;
    const remaining = Math.max(0, totalAmount - totalPaid - lastInvoice.creditUsed);

    if (remaining > 0) {
      carryForwardAmount = remaining;
      previousInvoiceId = lastInvoice.id;
    }
  }

  // Calculate billing period
  const invoiceDate = new Date();
  const billingPeriod =
    input.billingPeriod ||
    `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, "0")}`;

  // Calculate due date (default: 30 days)
  const dueDate = input.dueDate
    ? new Date(input.dueDate)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Create the invoice
  const invoice = await prisma.saaSInvoice.create({
    data: {
      companyId,
      amount,
      description: description || `SaaS subscription for ${company.name}`,
      issuedDate: invoiceDate,
      dueDate,
      billingPeriod,
      carryForwardAmount,
      previousInvoiceId,
      planId,
      additionalCharges,
    },
    include: {
      plan: true,
      company: {
        select: { id: true, name: true },
      },
    },
  });

  return invoice;
}

export async function recordSaaSPayment(input: RecordSaaSPaymentInput) {
  const { invoiceId, amount, method, notes, gateway, transactionId } = input;

  // Verify invoice exists
  const invoice = await prisma.saaSInvoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Create the payment
  const payment = await prisma.saaSPayment.create({
    data: {
      invoiceId,
      amount,
      method: method || "bank_transfer",
      notes,
      gateway,
      transactionId,
      status: "success",
    },
  });

  // Update invoice status based on payment
  const allPayments = await prisma.saaSPayment.findMany({
    where: {
      invoiceId,
      status: "success",
    },
  });

  const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalAmount = invoice.amount + invoice.carryForwardAmount;
  const remaining = Math.max(0, totalAmount - totalPaid - invoice.creditUsed);

  let newStatus = "unpaid";
  if (totalPaid === 0) {
    newStatus = "unpaid";
  } else if (remaining > 0) {
    newStatus = "partial";
  } else {
    newStatus = "paid";
  }

  await prisma.saaSInvoice.update({
    where: { id: invoiceId },
    data: { status: newStatus as any },
  });

  return payment;
}

export async function updateSaaSInvoiceStatus(invoiceId: string, status: string) {
  return await prisma.saaSInvoice.update({
    where: { id: invoiceId },
    data: { status: status as any },
  });
}

export async function deleteSaaSInvoice(invoiceId: string) {
  // Delete all payments first
  await prisma.saaSPayment.deleteMany({
    where: { invoiceId },
  });

  // Delete the invoice
  return await prisma.saaSInvoice.delete({
    where: { id: invoiceId },
  });
}
