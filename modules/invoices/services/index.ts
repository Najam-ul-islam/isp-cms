import { prisma } from '@/lib/prisma';
import { InvoiceRepository } from '../repository';
import { getInvoicePaymentSummary, getClientPaymentSummary, calculateAdditionalChargesTotal } from '@/lib/payment-calculator';
import type { InvoiceItem, Prisma } from '@prisma/client';

/**
 * Helper: Calculate payment summary directly from invoice data with pre-fetched payments.
 * Avoids extra database query.
 */
function calculateInvoiceSummaryFromData(invoice: {
  amount: number;
  additionalCharges: any;
  carryForwardAmount: number;
  payments: { amount: number }[];
}) {
  const charges = calculateAdditionalChargesTotal(invoice);
  const total = invoice.amount + charges + (invoice.carryForwardAmount || 0);
  const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(total - paid, 0);
  const overpaid = Math.max(paid - total, 0);
  
  let effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
  if (paid >= total) {
    effectivePaymentStatus = 'paid';
  } else if (paid > 0) {
    effectivePaymentStatus = 'partial';
  } else {
    effectivePaymentStatus = 'unpaid';
  }

  return {
    total,
    totalPaid: paid,
    remainingAmount: remaining,
    overpaidAmount: overpaid,
    effectivePaymentStatus
  };
}

export interface InvoicePaymentSummary {
  total: number;
  totalPaid: number;
  remainingAmount: number;
  overpaidAmount: number;
  effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
}

export interface InvoiceItemData {
  id?: string;
  name: string;
  description?: string | null;
  amount: number;
  quantity?: number;
  createdAt?: Date;
}

export interface CreateInvoiceWithItemsInput {
  clientId: string;
  items: InvoiceItemData[];
  dueDate?: Date;
  description?: string;
  billingMonth?: string;
  carryForwardAmount?: number;
  creditUsed?: number;
  previousInvoiceId?: string;
  source?: 'package' | 'product_sale' | 'manual';
}

export interface InvoiceWithPayments {
  id: string;
  invoiceNumber: string | null;
  clientId: string;
  amount: number;
  totalAmount: number;
  issuedDate: Date;
  dueDate: Date;
  status: 'unpaid' | 'partial' | 'paid';
  description: string | null;
  billingMonth: string | null;
  carryForwardAmount: number;
  creditUsed: number;
  previousInvoiceId: string | null;
  additionalCharges: any;
  createdAt: Date;
  updatedAt: Date;
  companyId: string;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: Date;
    method: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  items: InvoiceItemData[];
  totalPaid: number;
  remainingAmount: number;
  overpaidAmount: number;
  effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
  previousInvoice?: any | null;
}

export interface GenerateMonthlyInvoiceOptions {
  allowDuplicate?: boolean;
  applyCredits?: boolean;
  carryForward?: boolean;
  concurrency?: number;
}

export interface CarryForwardInvoice {
  invoiceId: string;
  billingMonth: string | null;
  total: number;
  paid: number;
  remaining: number;
}

export interface CarryForwardResult {
  carryForwardInvoices: CarryForwardInvoice[];
  carryForwardTotal: number;
}

/**
 * Get invoices with remaining balance that should be carried forward
 */
export async function getCarryForwardInvoices(
  clientId: string
): Promise<CarryForwardResult> {
  const invoices = await prisma.invoice.findMany({
    where: {
      clientId,
      carriedForwardAt: null,
    },
    select: {
      id: true,
      billingMonth: true,
      amount: true,
      carryForwardAmount: true,
      additionalCharges: true,
      payments: {
        select: { amount: true }
      }
    },
    orderBy: {
      issuedDate: 'asc'
    }
  });

  let carryForwardTotal = 0;
  const carryForwardInvoices: CarryForwardInvoice[] = [];

  for (const inv of invoices) {
    const additionalChargesTotal = calculateAdditionalChargesTotal(inv);
    const invoiceTotal = inv.amount + (inv.carryForwardAmount || 0) + additionalChargesTotal;
    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(invoiceTotal - paid, 0);

    if (remaining > 0) {
      carryForwardInvoices.push({
        invoiceId: inv.id,
        billingMonth: inv.billingMonth,
        total: invoiceTotal,
        paid,
        remaining
      });
      carryForwardTotal += remaining;
    }
  }

   return { carryForwardInvoices, carryForwardTotal };
 }

export async function getInvoicePreview(
  clientId: string,
  billingMonth: string
): Promise<{
  clientId: string;
  billingMonth: string;
  lineItems: Array<{
    type: 'package' | 'carry_forward' | 'additional';
    label: string;
    amount: number;
  }>;
  currentCharges: number;
  carryForwardTotal: number;
  total: number;
  canGenerate: boolean;
  existingInvoiceId?: string;
}> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { package: true }
  });

  if (!client) throw new Error('Client not found');

  const existingInvoice = await prisma.invoice.findFirst({
    where: { clientId, billingMonth }
  });

  const canGenerate = !existingInvoice;
  const packageAmount = client.price;

  const lineItems: Array<{
    type: 'package' | 'carry_forward' | 'additional';
    label: string;
    amount: number;
  }> = [
    {
      type: 'package',
      label: `Internet Package (${formatBillingMonth(billingMonth)})`,
      amount: packageAmount
    }
  ];

  const carryForwardResult = await getCarryForwardInvoices(clientId);
  let carryForwardTotal = 0;

  if (carryForwardResult.carryForwardTotal > 0) {
    carryForwardTotal = carryForwardResult.carryForwardTotal;
    for (const cf of carryForwardResult.carryForwardInvoices) {
      lineItems.push({
        type: 'carry_forward',
        label: `Carry Forward (${cf.invoiceId.slice(0, 8)} - ${cf.billingMonth || 'N/A'})`,
        amount: cf.remaining
      });
    }
  }

  const total = packageAmount + carryForwardTotal;

  return {
    clientId,
    billingMonth,
    lineItems,
    currentCharges: packageAmount,
    carryForwardTotal,
    total,
    canGenerate,
    existingInvoiceId: existingInvoice?.id
  };
}

export async function createInvoiceForClient(
  clientId: string,
  amount: number,
  dueDate: Date,
  companyId: string,
  description?: string,
  options?: {
    allowDuplicate?: boolean;
    billingMonth?: string;
    carryForwardAmount?: number;
    creditUsed?: number;
    previousInvoiceId?: string;
    additionalCharges?: any;
    lineItems?: Array<{
      type: 'package' | 'carry_forward' | 'additional';
      label: string;
      amount: number;
    }>;
  }
): Promise<InvoiceWithPayments> {
  if (!options?.allowDuplicate) {
    const existingUnpaidInvoice = await prisma.invoice.findFirst({
      where: { clientId, companyId, status: 'unpaid' },
      orderBy: { issuedDate: 'desc' }
    });

    if (existingUnpaidInvoice) {
      throw new Error(
        `Client already has an unpaid invoice (ID: ${existingUnpaidInvoice.id}). ` +
        `Use options.allowDuplicate = true to create another invoice.`
      );
    }
  }

  const invoice = await InvoiceRepository.create({
    clientId,
    amount,
    dueDate,
    description,
    companyId,
    billingMonth: options?.billingMonth,
    carryForwardAmount: options?.carryForwardAmount || 0,
    creditUsed: options?.creditUsed || 0,
    previousInvoiceId: options?.previousInvoiceId,
    additionalCharges: options?.additionalCharges,
    lineItems: options?.lineItems || undefined,
  });

  return {
    ...invoice,
    payments: [],
    totalPaid: 0,
    remainingAmount: amount + (options?.carryForwardAmount || 0),
    overpaidAmount: 0,
    effectivePaymentStatus: 'unpaid',
    items: [],
    totalAmount: amount,
  };
}

export async function createInvoiceWithItems(
  input: CreateInvoiceWithItemsInput,
  companyId: string,
  options?: {
    allowDuplicate?: boolean;
    appendToExistingUnpaid?: boolean;
  }
): Promise<InvoiceWithPayments> {
  if (!input.items || input.items.length === 0) {
    throw new Error('At least one line item is required');
  }

  const totalAmount = input.items.reduce(
    (sum, item) => sum + (item.amount * (item.quantity || 1)),
    0
  );

  if (options?.appendToExistingUnpaid) {
    const existingUnpaidInvoice = await prisma.invoice.findFirst({
      where: {
        clientId: input.clientId,
        companyId,
        status: { in: ['unpaid', 'partial'] }
      },
      orderBy: { issuedDate: 'desc' }
    });

    if (existingUnpaidInvoice) {
      const updatedInvoice = await InvoiceRepository.addItemsToInvoice(
        existingUnpaidInvoice.id,
        companyId,
        input.items
      );

      return {
        ...updatedInvoice,
        totalAmount: updatedInvoice.totalAmount ?? updatedInvoice.amount,
        payments: [],
        totalPaid: 0,
        remainingAmount: updatedInvoice.totalAmount ?? updatedInvoice.amount,
        overpaidAmount: 0,
        effectivePaymentStatus: 'unpaid',
      };
    }
  }

  if (!options?.allowDuplicate && !options?.appendToExistingUnpaid) {
    const existingUnpaidInvoice = await prisma.invoice.findFirst({
      where: {
        clientId: input.clientId,
        companyId,
        status: { in: ['unpaid', 'partial'] }
      },
      orderBy: { issuedDate: 'desc' }
    });

    if (existingUnpaidInvoice) {
      throw new Error(
        `Client already has an unpaid invoice (ID: ${existingUnpaidInvoice.id}). ` +
        `Use appendToExistingUnpaid = true to add items to it, or allowDuplicate = true to create a new invoice.`
      );
    }
  }

  const dueDate = input.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const invoice = await InvoiceRepository.createWithItems({
    clientId: input.clientId,
    dueDate,
    description: input.description,
    companyId,
    billingMonth: input.billingMonth,
    carryForwardAmount: input.carryForwardAmount || 0,
    creditUsed: input.creditUsed || 0,
    previousInvoiceId: input.previousInvoiceId,
    items: input.items,
    source: input.source || 'manual',
  });

  return {
    ...invoice,
    totalAmount: invoice.totalAmount ?? totalAmount,
    payments: [],
    totalPaid: 0,
    remainingAmount: totalAmount + (input.carryForwardAmount || 0),
    overpaidAmount: 0,
    effectivePaymentStatus: 'unpaid',
  };
}

export async function getInvoiceWithPayments(invoiceId: string, companyId: string): Promise<InvoiceWithPayments> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, companyId },
    include: {
      previousInvoice: true,
      items: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { paymentDate: 'asc' } }
    }
  });

  if (!invoice) throw new Error(`Invoice with id ${invoiceId} not found`);

  // Calculate summary from already-fetched payments (no extra query)
  const summary = calculateInvoiceSummaryFromData({
    amount: invoice.amount,
    additionalCharges: invoice.additionalCharges,
    carryForwardAmount: invoice.carryForwardAmount,
    payments: invoice.payments
  });

  const totalAmount = summary.total;

  return {
    ...invoice,
    payments: invoice.payments,
    items: invoice.items,
    totalAmount,
    totalPaid: summary.totalPaid,
    remainingAmount: summary.remainingAmount,
    overpaidAmount: summary.overpaidAmount,
    effectivePaymentStatus: summary.effectivePaymentStatus
  };
}

export async function getInvoicesForClient(clientId: string, companyId: string): Promise<InvoiceWithPayments[]> {
  const invoices = await prisma.invoice.findMany({
    where: { clientId, companyId },
    include: {
      previousInvoice: true,
      items: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { paymentDate: 'asc' } }
    },
    orderBy: { issuedDate: 'desc' }
  });

  // Compute summaries from already-fetched payments (no extra queries)
  return invoices.map(invoice => {
    const summary = calculateInvoiceSummaryFromData({
      amount: invoice.amount,
      additionalCharges: invoice.additionalCharges,
      carryForwardAmount: invoice.carryForwardAmount,
      payments: invoice.payments
    });

    return {
      ...invoice,
      payments: invoice.payments,
      items: invoice.items,
      totalAmount: summary.total,
      totalPaid: summary.totalPaid,
      remainingAmount: summary.remainingAmount,
      overpaidAmount: summary.overpaidAmount,
      effectivePaymentStatus: summary.effectivePaymentStatus
    };
  });
}

export async function updateInvoiceStatus(invoiceId: string, companyId: string): Promise<void> {
  const summary = await getInvoicePaymentSummary(invoiceId);
  await InvoiceRepository.update(
    invoiceId,
    { status: summary.effectivePaymentStatus },
    companyId
  );
}

export async function generateInvoiceFromClient(
  clientId: string,
  companyId: string,
  description?: string
): Promise<InvoiceWithPayments> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new Error(`Client with id ${clientId} not found`);

  const existingUnpaidInvoice = await prisma.invoice.findFirst({
    where: { clientId, companyId, status: 'unpaid' },
    orderBy: { issuedDate: 'desc' }
  });

  if (existingUnpaidInvoice) {
    throw new Error(
      `Client already has an unpaid invoice for ${existingUnpaidInvoice.amount}. ` +
      `No new invoice will be created.`
    );
  }

  return createInvoiceForClient(
    clientId,
    client.price,
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    companyId,
    description || `Invoice for ${client.name}'s internet package`,
    { allowDuplicate: false }
  );
}

export async function generateMonthlyInvoice(
  clientId: string,
  companyId: string,
  billingMonth: string,
  options: GenerateMonthlyInvoiceOptions = {}
): Promise<InvoiceWithPayments | null> {
  const {
    allowDuplicate = false,
    applyCredits = true,
    carryForward = true
  } = options;

  if (!allowDuplicate) {
    const existingInvoice = await prisma.invoice.findFirst({
      where: { clientId, companyId, billingMonth }
    });
    if (existingInvoice) {
      console.log(`[Invoice Generation] Invoice already exists for client ${clientId} for month ${billingMonth}`);
      return null;
    }
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { package: true }
  });

  if (!client) {
    console.error(`[Invoice Generation] Client ${clientId} not found`);
    return null;
  }

  const packageAmount = client.price;

  const lineItems: Array<{
    type: 'package' | 'carry_forward' | 'additional';
    label: string;
    amount: number;
  }> = [
    {
      type: 'package',
      label: `Internet Package (${formatBillingMonth(billingMonth)})`,
      amount: packageAmount
    }
  ];

  let totalCarryForward = 0;
  let creditUsed = 0;
  let carriedInvoiceIds: string[] = [];

  if (carryForward) {
    const carryForwardResult = await getCarryForwardInvoices(clientId);
    if (carryForwardResult.carryForwardTotal > 0) {
      totalCarryForward = carryForwardResult.carryForwardTotal;
      for (const cf of carryForwardResult.carryForwardInvoices) {
        lineItems.push({
          type: 'carry_forward',
          label: `Carry Forward (${cf.invoiceId.slice(0, 8)} - ${cf.billingMonth || 'N/A'})`,
          amount: cf.remaining
        });
        carriedInvoiceIds.push(cf.invoiceId);
      }
    }
  }

  if (applyCredits && carriedInvoiceIds.length > 0) {
    const lastCarriedInvoiceId = carriedInvoiceIds[carriedInvoiceIds.length - 1];
    if (lastCarriedInvoiceId) {
      const lastSummary = await getInvoicePaymentSummary(lastCarriedInvoiceId);
      if (lastSummary.overpaidAmount > 0) {
        creditUsed = lastSummary.overpaidAmount;
        lineItems.push({
          type: 'additional',
          label: 'Credit Adjustment',
          amount: -creditUsed
        });
        console.log(`[Invoice Generation] Applying Rs. ${creditUsed} in credits`);
      }
    }
  }

  const totalAmount = packageAmount + totalCarryForward - creditUsed;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await createInvoiceForClient(
    clientId,
    packageAmount,
    dueDate,
    companyId,
    `Monthly invoice for ${billingMonth}`,
    {
      billingMonth,
      carryForwardAmount: totalCarryForward,
      creditUsed,
      previousInvoiceId: carriedInvoiceIds[0],
      allowDuplicate: true,
      lineItems
    }
  );

  if (carriedInvoiceIds.length > 0) {
    await prisma.invoice.updateMany({
      where: { id: { in: carriedInvoiceIds } },
      data: { carriedForwardAt: new Date() }
    });
    console.log(`[Invoice Generation] Marked ${carriedInvoiceIds.length} invoices as carried forward`);
  }

  console.log(`[Invoice Generation] Created invoice ${invoice.id} for client ${clientId} for month ${billingMonth}`);
  console.log(`  Package: Rs. ${packageAmount}`);
  console.log(`  Carry Forward: Rs. ${totalCarryForward}`);
  console.log(`  Credits Used: Rs. ${creditUsed}`);
  console.log(`  Total Due: Rs. ${totalAmount}`);

  return invoice;
}

function formatBillingMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = monthNames[parseInt(monthNum, 10) - 1] || month;
  return `${monthName} ${year}`;
}

export async function generateMonthlyInvoicesForCompany(
  companyId: string,
  billingMonth: string,
  options: GenerateMonthlyInvoiceOptions = {}
): Promise<{
  success: number;
  skipped: number;
  failed: number;
  results: Array<{ clientId: string; invoiceId?: string; error?: string }>;
}> {
  const { concurrency = 5 } = options;

  const clients = await prisma.client.findMany({
    where: { companyId, status: 'active' },
    select: { id: true }
  });

  const results = {
    success: 0,
    skipped: 0,
    failed: 0,
    results: [] as Array<{ clientId: string; invoiceId?: string; error?: string }>
  };

  const clientQueue = [...clients];
  const processing: Promise<void>[] = [];

  const processClient = async (client: { id: string }) => {
    try {
      const invoice = await generateMonthlyInvoice(client.id, companyId, billingMonth, options);
      if (invoice) {
        results.results.push({ clientId: client.id, invoiceId: invoice.id });
      } else {
        results.results.push({ clientId: client.id, error: 'Invoice already exists or client skipped' });
      }
    } catch (error: any) {
      results.results.push({ clientId: client.id, error: error.message || 'Unknown error' });
      console.error(`[Invoice Generation] Failed for client ${client.id}:`, error);
    }
  };

  for (const client of clientQueue) {
    if (processing.length >= concurrency) {
      await Promise.any(processing);
    }

    const promise = processClient(client).then(() => {
      const idx = processing.indexOf(promise);
      if (idx > -1) processing.splice(idx, 1);
    });
    processing.push(promise);

    promise.then(() => {
      const result = results.results.find(r => r.clientId === client.id);
      if (result?.invoiceId) results.success++;
      else if (result?.error) {
        if (result.error.includes('already exists')) results.skipped++;
        else results.failed++;
      }
    });
  }

  await Promise.all(processing);

  return results;
}

export async function getInvoiceHistory(
  clientId: string,
  companyId: string,
  filters?: {
    status?: 'unpaid' | 'partial' | 'paid';
    billingMonth?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{
  invoices: InvoiceWithPayments[];
  total: number;
  summary: {
    totalBilled: number;
    totalPaid: number;
    totalRemaining: number;
  };
}> {
  const where: Prisma.InvoiceWhereInput = { clientId, companyId };

  if (filters?.billingMonth) {
    where.billingMonth = filters.billingMonth;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      previousInvoice: true,
      items: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { paymentDate: 'asc' } }
    },
    orderBy: { issuedDate: 'desc' }
  });

  // Compute summaries from already-fetched payments (no extra queries)
  const invoicesWithPayments = invoices.map(invoice => {
    const summary = calculateInvoiceSummaryFromData({
      amount: invoice.amount,
      additionalCharges: invoice.additionalCharges,
      carryForwardAmount: invoice.carryForwardAmount,
      payments: invoice.payments
    });

    return {
      ...invoice,
      payments: invoice.payments,
      items: invoice.items,
      totalAmount: invoice.totalAmount ?? invoice.amount,
      totalPaid: summary.totalPaid,
      remainingAmount: summary.remainingAmount,
      overpaidAmount: summary.overpaidAmount,
      effectivePaymentStatus: summary.effectivePaymentStatus
    };
  });

  // Apply status filter on computed effectivePaymentStatus
  const filteredInvoices = filters?.status
    ? invoicesWithPayments.filter(inv => inv.effectivePaymentStatus === filters.status)
    : invoicesWithPayments;

  const summary = {
    totalBilled: 0,
    totalPaid: 0,
    totalRemaining: 0
  };

  for (const invoice of filteredInvoices) {
    if (invoice.effectivePaymentStatus === 'unpaid' || invoice.effectivePaymentStatus === 'partial') {
      const effectiveTotal = invoice.totalAmount ?? invoice.amount;
      summary.totalBilled += effectiveTotal + invoice.carryForwardAmount;
    }
    summary.totalPaid += invoice.totalPaid;
    summary.totalRemaining += invoice.remainingAmount;
  }

  // FIX: renamed from `total` — was declared twice causing the build error
  const filteredTotal = filteredInvoices.length;

  // Apply pagination after filtering
  const start = filters?.offset ?? 0;
  const end = filters?.limit ? start + filters.limit : undefined;
  const finalInvoices = (filters?.limit || filters?.offset)
    ? filteredInvoices.slice(start, end)
    : filteredInvoices;

  return {
    invoices: finalInvoices,
    total: filteredTotal,   // ← was the second `const total` that caused the error
    summary
  };
}



// import { prisma } from '@/lib/prisma';
// import { InvoiceRepository } from '../repository';
// import { getInvoicePaymentSummary, getClientPaymentSummary } from '@/lib/payment-calculator';
// import type { InvoiceItem } from '@prisma/client';

// export interface InvoicePaymentSummary {
//   total: number;
//   totalPaid: number;
//   remainingAmount: number;
//   overpaidAmount: number;
//   effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
// }

// export interface InvoiceItemData {
//   id?: string;
//   name: string;
//   description?: string | null;
//   amount: number;
//   quantity?: number;
//   createdAt?: Date;
// }

// export interface CreateInvoiceWithItemsInput {
//   clientId: string;
//   items: InvoiceItemData[];
//   dueDate?: Date;
//   description?: string;
//   billingMonth?: string;
//   carryForwardAmount?: number;
//   creditUsed?: number;
//   previousInvoiceId?: string;
//   source?: 'package' | 'product_sale' | 'manual';  // ✅ Track invoice source
// }

// export interface InvoiceWithPayments {
//   id: string;
//   clientId: string;
//   amount: number;
//   totalAmount: number;
//   issuedDate: Date;
//   dueDate: Date;
//   status: 'unpaid' | 'partial' | 'paid';
//   description: string | null;
//   billingMonth: string | null;
//   carryForwardAmount: number;
//   creditUsed: number;
//   previousInvoiceId: string | null;
//   additionalCharges: any;
//   createdAt: Date;
//   updatedAt: Date;
//   companyId: string;
//   payments: Array<{
//     id: string;
//     amount: number;
//     paymentDate: Date;
//     method: string | null;
//     notes: string | null;
//     createdAt: Date;
//     updatedAt: Date;
//   }>;
//   items: InvoiceItemData[];
//   totalPaid: number;
//   remainingAmount: number;
//   overpaidAmount: number;
//   effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
//   previousInvoice?: any | null;
// }

// export interface GenerateMonthlyInvoiceOptions {
//   allowDuplicate?: boolean;
//   applyCredits?: boolean;
//   carryForward?: boolean;
//   concurrency?: number; // Number of concurrent invoice generations
// }

// export interface CarryForwardInvoice {
//   invoiceId: string;
//   billingMonth: string | null;
//   total: number;
//   paid: number;
//   remaining: number;
// }

// export interface CarryForwardResult {
//   carryForwardInvoices: CarryForwardInvoice[];
//   carryForwardTotal: number;
// }

// /**
//  * Get invoices with remaining balance that should be carried forward
//  * EXCLUDES: paid invoices, already-carried-forward invoices
//  * Returns ONLY unpaid/partial invoices where remaining > 0
//  */
// export async function getCarryForwardInvoices(
//   clientId: string
// ): Promise<CarryForwardResult> {
//   // Get all invoices where:
//   // 1. NOT already carried forward (carriedForwardAt IS NULL)
//   // 2. Has remaining balance > 0
//   const invoices = await prisma.invoice.findMany({
//     where: {
//       clientId,
//       carriedForwardAt: null, // NOT already carried forward
//     },
//     select: {
//       id: true,
//       billingMonth: true,
//       amount: true,
//       carryForwardAmount: true,
//       additionalCharges: true,
//       payments: {
//         select: { amount: true }
//       }
//     },
//     orderBy: {
//       issuedDate: 'asc' // Oldest first for proper carry-forward order
//     }
//   });

//   let carryForwardTotal = 0;
//   const carryForwardInvoices: CarryForwardInvoice[] = [];

//   for (const inv of invoices) {
//     const additionalChargesTotal = calculateAdditionalChargesTotal(inv);
//     const invoiceTotal = inv.amount + (inv.carryForwardAmount || 0) + additionalChargesTotal;
//     const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
//     const remaining = Math.max(invoiceTotal - paid, 0);

//     // Only include if there's remaining balance
//     if (remaining > 0) {
//       carryForwardInvoices.push({
//         invoiceId: inv.id,
//         billingMonth: inv.billingMonth,
//         total: invoiceTotal,
//         paid,
//         remaining
//       });
//       carryForwardTotal += remaining;
//     }
//   }

//   return {
//     carryForwardInvoices,
//     carryForwardTotal
//   };
// }

// /**
//  * Calculate total additional charges from invoice
//  */
// function calculateAdditionalChargesTotal(inv: {
//   additionalCharges: any;
// }): number {
//   if (!inv.additionalCharges) return 0;
  
//   try {
//     const charges = inv.additionalCharges as { items?: Array<{ amount: number }> };
//     if (charges.items && Array.isArray(charges.items)) {
//       return charges.items.reduce((sum, item) => sum + (item.amount || 0), 0);
//     }
//   } catch {
//     // Ignore parse errors
//   }
//   return 0;
// }

// /**
//  * Get invoice preview for a client before generation
//  * Returns line items breakdown without creating invoice
//  */
// export async function getInvoicePreview(
//   clientId: string,
//   billingMonth: string
// ): Promise<{
//   clientId: string;
//   billingMonth: string;
//   lineItems: Array<{
//     type: 'package' | 'carry_forward' | 'additional';
//     label: string;
//     amount: number;
//   }>;
//   currentCharges: number;
//   carryForwardTotal: number;
//   total: number;
//   canGenerate: boolean;
//   existingInvoiceId?: string;
// }> {
//   // Get client details
//   const client = await prisma.client.findUnique({
//     where: { id: clientId },
//     include: { package: true }
//   });

//   if (!client) {
//     throw new Error('Client not found');
//   }

//   // Check if invoice already exists for this month
//   const existingInvoice = await prisma.invoice.findFirst({
//     where: {
//       clientId,
//       billingMonth
//     }
//   });

//   const canGenerate = !existingInvoice;
//   const packageAmount = client.price;

//   // Build line items
//   const lineItems: Array<{
//     type: 'package' | 'carry_forward' | 'additional';
//     label: string;
//     amount: number;
//   }> = [
//     {
//       type: 'package',
//       label: `Internet Package (${formatBillingMonth(billingMonth)})`,
//       amount: packageAmount
//     }
//   ];

//   // Get carry-forward invoices
//   const carryForwardResult = await getCarryForwardInvoices(clientId);
//   let carryForwardTotal = 0;

//   if (carryForwardResult.carryForwardTotal > 0) {
//     carryForwardTotal = carryForwardResult.carryForwardTotal;

//     for (const cf of carryForwardResult.carryForwardInvoices) {
//       lineItems.push({
//         type: 'carry_forward',
//         label: `Carry Forward (${cf.invoiceId.slice(0, 8)} - ${cf.billingMonth || 'N/A'})`,
//         amount: cf.remaining
//       });
//     }
//   }

//   const total = packageAmount + carryForwardTotal;

//   return {
//     clientId,
//     billingMonth,
//     lineItems,
//     currentCharges: packageAmount,
//     carryForwardTotal,
//     total,
//     canGenerate,
//     existingInvoiceId: existingInvoice?.id
//   };
// }

// /**
//  * Creates a new invoice for a client with carry-forward and credit logic
//  */
// export async function createInvoiceForClient(
//   clientId: string,
//   amount: number,
//   dueDate: Date,
//   companyId: string,
//   description?: string,
//   options?: { 
//     allowDuplicate?: boolean;
//     billingMonth?: string;
//     carryForwardAmount?: number;
//     creditUsed?: number;
//     previousInvoiceId?: string;
//     additionalCharges?: any;
//     lineItems?: Array<{
//       type: 'package' | 'carry_forward' | 'additional';
//       label: string;
//       amount: number;
//     }>;
//   }
// ): Promise<InvoiceWithPayments> {

//   // ✅ PREVENT DUPLICATES: Check for existing unpaid invoice (unless explicitly allowed)
//   if (!options?.allowDuplicate) {
//     const existingUnpaidInvoice = await prisma.invoice.findFirst({
//       where: {
//         clientId,
//         companyId,
//         status: 'unpaid'
//       },
//       orderBy: {
//         issuedDate: 'desc'
//       }
//     });

//     if (existingUnpaidInvoice) {
//       throw new Error(
//         `Client already has an unpaid invoice (ID: ${existingUnpaidInvoice.id}). ` +
//         `Use options.allowDuplicate = true to create another invoice.`
//       );
//     }
//   }

//   // Create the invoice with all history fields
//   const invoice = await InvoiceRepository.create({
//     clientId,
//     amount,
//     dueDate,
//     description,
//     companyId,
//     billingMonth: options?.billingMonth,
//     carryForwardAmount: options?.carryForwardAmount || 0,
//     creditUsed: options?.creditUsed || 0,
//     previousInvoiceId: options?.previousInvoiceId,
//     additionalCharges: options?.additionalCharges,
//     lineItems: options?.lineItems || undefined,
//   });

//   // Return the invoice with payment details (initially no payments)
//   return {
//     ...invoice,
//     payments: [],
//     totalPaid: 0,
//     remainingAmount: amount + (options?.carryForwardAmount || 0),
//     overpaidAmount: 0,
//     effectivePaymentStatus: 'unpaid',
//     items: [],
//     totalAmount: amount,
//   };
// }

// /**
//  * Creates a new invoice with line items (modern approach)
//  * Uses Prisma transactions for atomicity
//  * ✅ Prevents duplicate unpaid invoices
//  */
// export async function createInvoiceWithItems(
//   input: CreateInvoiceWithItemsInput,
//   companyId: string,
//   options?: {
//     allowDuplicate?: boolean;
//     appendToExistingUnpaid?: boolean;
//   }
// ): Promise<InvoiceWithPayments> {
//   if (!input.items || input.items.length === 0) {
//     throw new Error('At least one line item is required');
//   }

//   const totalAmount = input.items.reduce(
//     (sum, item) => sum + (item.amount * (item.quantity || 1)),
//     0
//   );

//   // If appending to existing unpaid invoice
//   if (options?.appendToExistingUnpaid) {
//     const existingUnpaidInvoice = await prisma.invoice.findFirst({
//       where: {
//         clientId: input.clientId,
//         companyId,
//         status: { in: ['unpaid', 'partial'] }
//       },
//       orderBy: { issuedDate: 'desc' }
//     });

//     if (existingUnpaidInvoice) {
//       const updatedInvoice = await InvoiceRepository.addItemsToInvoice(
//         existingUnpaidInvoice.id,
//         companyId,
//         input.items
//       );

//       return {
//         ...updatedInvoice,
//         totalAmount: updatedInvoice.totalAmount ?? updatedInvoice.amount,
//         payments: [],
//         totalPaid: 0,
//         remainingAmount: updatedInvoice.totalAmount ?? updatedInvoice.amount,
//         overpaidAmount: 0,
//         effectivePaymentStatus: 'unpaid',
//       };
//     }
//   }

//   // ✅ PREVENT DUPLICATES: Check for existing unpaid/partial invoice
//   if (!options?.allowDuplicate && !options?.appendToExistingUnpaid) {
//     const existingUnpaidInvoice = await prisma.invoice.findFirst({
//       where: {
//         clientId: input.clientId,
//         companyId,
//         status: { in: ['unpaid', 'partial'] }
//       },
//       orderBy: { issuedDate: 'desc' }
//     });

//     if (existingUnpaidInvoice) {
//       throw new Error(
//         `Client already has an unpaid invoice (ID: ${existingUnpaidInvoice.id}). ` +
//         `Use appendToExistingUnpaid = true to add items to it, or allowDuplicate = true to create a new invoice.`
//       );
//     }
//   }

//   const dueDate = input.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

//   const invoice = await InvoiceRepository.createWithItems({
//     clientId: input.clientId,
//     dueDate,
//     description: input.description,
//     companyId,
//     billingMonth: input.billingMonth,
//     carryForwardAmount: input.carryForwardAmount || 0,
//     creditUsed: input.creditUsed || 0,
//     previousInvoiceId: input.previousInvoiceId,
//     items: input.items,
//     source: input.source || 'manual',  // ✅ Set invoice source
//   });

//   return {
//     ...invoice,
//     totalAmount: invoice.totalAmount ?? totalAmount,
//     payments: [],
//     totalPaid: 0,
//     remainingAmount: totalAmount + (input.carryForwardAmount || 0),
//     overpaidAmount: 0,
//     effectivePaymentStatus: 'unpaid',
//   };
// }

// /**
//  * Gets an invoice with its payment details and previous invoice reference
//  */
// export async function getInvoiceWithPayments(invoiceId: string, companyId: string): Promise<InvoiceWithPayments> {
//   // Fetch the invoice with its payments, items, and previous invoice
//   const invoice = await prisma.invoice.findUnique({
//     where: {
//       id: invoiceId,
//       companyId
//     },
//     include: {
//       previousInvoice: true,
//       items: {
//         orderBy: { createdAt: 'asc' }
//       },
//       payments: {
//         orderBy: {
//           paymentDate: 'asc'
//         }
//       }
//     }
//   });

//   if (!invoice) {
//     throw new Error(`Invoice with id ${invoiceId} not found`);
//   }

//   // Calculate payment summary using totalAmount (includes additional charges)
//   const summary = await getInvoicePaymentSummary(invoiceId);
//   // Use the computed total from summary, which includes additional charges
//   const totalAmount = summary.total;

//   return {
//     ...invoice,
//     payments: invoice.payments,
//     items: invoice.items,
//     totalAmount,
//     totalPaid: summary.totalPaid,
//     remainingAmount: summary.remainingAmount,
//     overpaidAmount: summary.overpaidAmount,
//     effectivePaymentStatus: summary.effectivePaymentStatus
//   };
// }

// /**
//  * Gets all invoices with their payment details for a client
//  */
// export async function getInvoicesForClient(clientId: string, companyId: string): Promise<InvoiceWithPayments[]> {
//   // Fetch all invoices for the client with items
//   const invoices = await prisma.invoice.findMany({
//     where: {
//       clientId,
//       companyId
//     },
//     include: {
//       previousInvoice: true,
//       items: {
//         orderBy: { createdAt: 'asc' }
//       },
//       payments: {
//         orderBy: {
//           paymentDate: 'asc'
//         }
//       }
//     },
//     orderBy: {
//       issuedDate: 'desc'
//     }
//   });

//   // Calculate payment summaries for each invoice
//   const invoicesWithPayments = await Promise.all(
//     invoices.map(async (invoice) => {
//       const summary = await getInvoicePaymentSummary(invoice.id);
//       // Use the computed total from summary (includes additional charges)
//       const totalAmount = summary.total;

//       return {
//         ...invoice,
//         payments: invoice.payments,
//         items: invoice.items,
//         totalAmount,
//         totalPaid: summary.totalPaid,
//         remainingAmount: summary.remainingAmount,
//         overpaidAmount: summary.overpaidAmount,
//         effectivePaymentStatus: summary.effectivePaymentStatus
//       };
//     })
//   );

//   return invoicesWithPayments;
// }

// /**
//  * Updates an invoice's status based on payment status
//  */
// export async function updateInvoiceStatus(invoiceId: string, companyId: string): Promise<void> {
//   // Calculate payment summary for the invoice
//   const summary = await getInvoicePaymentSummary(invoiceId);

//   // Update the invoice status based on the payment status
//   await InvoiceRepository.update(
//     invoiceId,
//     { status: summary.effectivePaymentStatus },
//     companyId
//   );
// }

// /**
//  * Generates an invoice based on client's package price
//  * ✅ Prevents duplicate unpaid invoices
//  */
// export async function generateInvoiceFromClient(
//   clientId: string,
//   companyId: string,
//   description?: string
// ): Promise<InvoiceWithPayments> {
//   // Get client details to determine the invoice amount
//   const client = await prisma.client.findUnique({
//     where: { id: clientId }
//   });

//   if (!client) {
//     throw new Error(`Client with id ${clientId} not found`);
//   }

//   // ✅ Check for existing unpaid invoice first
//   const existingUnpaidInvoice = await prisma.invoice.findFirst({
//     where: {
//       clientId,
//       companyId,
//       status: 'unpaid'
//     },
//     orderBy: {
//       issuedDate: 'desc'
//     }
//   });

//   if (existingUnpaidInvoice) {
//     throw new Error(
//       `Client already has an unpaid invoice for ${existingUnpaidInvoice.amount}. ` +
//       `No new invoice will be created.`
//     );
//   }

//   // Create invoice based on client's price
//   return await createInvoiceForClient(
//     clientId,
//     client.price,
//     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Due in 30 days
//     companyId,
//     description || `Invoice for ${client.name}'s internet package`,
//     { allowDuplicate: false } // Explicitly prevent duplicates
//   );
// }

// /**
//  * 🎯 GENERATE MONTHLY INVOICE WITH CARRY-FORWARD AND CREDIT LOGIC
//  * This is the core billing engine function for automated monthly invoice generation
//  * Uses getCarryForwardInvoices() for proper carry-forward tracking
//  */
// export async function generateMonthlyInvoice(
//   clientId: string,
//   companyId: string,
//   billingMonth: string, // Format: "2026-04"
//   options: GenerateMonthlyInvoiceOptions = {}
// ): Promise<InvoiceWithPayments | null> {
//   const { 
//     allowDuplicate = false, 
//     applyCredits = true, 
//     carryForward = true 
//   } = options;

//   // ✅ Check if invoice already exists for this month
//   if (!allowDuplicate) {
//     const existingInvoice = await prisma.invoice.findFirst({
//       where: {
//         clientId,
//         companyId,
//         billingMonth
//       }
//     });

//     if (existingInvoice) {
//       console.log(`[Invoice Generation] Invoice already exists for client ${clientId} for month ${billingMonth}`);
//       return null;
//     }
//   }

//   // Get client details
//   const client = await prisma.client.findUnique({
//     where: { id: clientId },
//     include: {
//       package: true
//     }
//   });

//   if (!client) {
//     console.error(`[Invoice Generation] Client ${clientId} not found`);
//     return null;
//   }

//   // Base amount from package price
//   const packageAmount = client.price;

//   // Build line items
//   const lineItems: Array<{
//     type: 'package' | 'carry_forward' | 'additional';
//     label: string;
//     amount: number;
//   }> = [
//     {
//       type: 'package',
//       label: `Internet Package (${formatBillingMonth(billingMonth)})`,
//       amount: packageAmount
//     }
//   ];

//   let totalCarryForward = 0;
//   let creditUsed = 0;
//   let carriedInvoiceIds: string[] = [];

//   // ✅ Get all carry-forward invoices (unpaid/partial only)
//   if (carryForward) {
//     const carryForwardResult = await getCarryForwardInvoices(clientId);
    
//     if (carryForwardResult.carryForwardTotal > 0) {
//       totalCarryForward = carryForwardResult.carryForwardTotal;
      
//       // Add line items for each carried invoice
//       for (const cf of carryForwardResult.carryForwardInvoices) {
//         lineItems.push({
//           type: 'carry_forward',
//           label: `Carry Forward (${cf.invoiceId.slice(0, 8)} - ${cf.billingMonth || 'N/A'})`,
//           amount: cf.remaining
//         });
//         carriedInvoiceIds.push(cf.invoiceId);
//       }
//     }
//   }

//   // ✅ Calculate available credits (from overpayments)
//   if (applyCredits && carriedInvoiceIds.length > 0) {
//     // Get the last invoice that was carried from for credits
//     const lastCarriedInvoiceId = carriedInvoiceIds[carriedInvoiceIds.length - 1];
//     if (lastCarriedInvoiceId) {
//       const lastSummary = await getInvoicePaymentSummary(lastCarriedInvoiceId);
//       if (lastSummary.overpaidAmount > 0) {
//         creditUsed = lastSummary.overpaidAmount;
//         lineItems.push({
//           type: 'additional',
//           label: 'Credit Adjustment',
//           amount: -creditUsed // Negative as credit
//         });
//         console.log(`[Invoice Generation] Applying Rs. ${creditUsed} in credits`);
//       }
//     }
//   }

//   // Total amount = package + carry forward - credits
//   const totalAmount = packageAmount + totalCarryForward - creditUsed;

//   // Calculate due date (30 days from now)
//   const dueDate = new Date();
//   dueDate.setDate(dueDate.getDate() + 30);

//   // Create the invoice with line items
//   const invoice = await createInvoiceForClient(
//     clientId,
//     packageAmount, // Base package price
//     dueDate,
//     companyId,
//     `Monthly invoice for ${billingMonth}`,
//     {
//       billingMonth,
//       carryForwardAmount: totalCarryForward,
//       creditUsed,
//       previousInvoiceId: carriedInvoiceIds[0], // Link to first carried invoice
//       allowDuplicate: true, // We already checked for duplicates
//       lineItems // Pass line items for transparency
//     }
//   );

//   // ✅ Mark carried invoices as carried forward (in transaction)
//   if (carriedInvoiceIds.length > 0) {
//     await prisma.invoice.updateMany({
//       where: {
//         id: { in: carriedInvoiceIds }
//       },
//       data: {
//         carriedForwardAt: new Date()
//       }
//     });
//     console.log(`[Invoice Generation] Marked ${carriedInvoiceIds.length} invoices as carried forward`);
//   }

//   console.log(`[Invoice Generation] Created invoice ${invoice.id} for client ${clientId} for month ${billingMonth}`);
//   console.log(`  Package: Rs. ${packageAmount}`);
//   console.log(`  Carry Forward: Rs. ${totalCarryForward}`);
//   console.log(`  Credits Used: Rs. ${creditUsed}`);
//   console.log(`  Total Due: Rs. ${totalAmount}`);

//   return invoice;
// }

// /**
//  * Format billing month for display
//  */
// function formatBillingMonth(month: string): string {
//   const [year, monthNum] = month.split('-');
//   const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
//   const monthName = monthNames[parseInt(monthNum, 10) - 1] || month;
//   return `${monthName} ${year}`;
// }

// /**
//  * 🔄 GENERATE MONTHLY INVOICES FOR ALL ACTIVE CLIENTS
//  * Batch operation to generate invoices for all clients in a company
//  * With controlled concurrency for safe batch processing
//  */
// export async function generateMonthlyInvoicesForCompany(
//   companyId: string,
//   billingMonth: string,
//   options: GenerateMonthlyInvoiceOptions = {}
// ): Promise<{
//   success: number;
//   skipped: number;
//   failed: number;
//   results: Array<{ clientId: string; invoiceId?: string; error?: string }>;
// }> {
//   const { concurrency = 5 } = options; // Default to 5 concurrent generations
  
//   // Get all active clients
//   const clients = await prisma.client.findMany({
//     where: {
//       companyId,
//       status: 'active'
//     },
//     select: {
//       id: true
//     }
//   });

//   const results = {
//     success: 0,
//     skipped: 0,
//     failed: 0,
//     results: [] as Array<{ clientId: string; invoiceId?: string; error?: string }>
//   };

//   // Process in batches with controlled concurrency
//   const clientQueue = [...clients];
//   const processing: Promise<void>[] = [];

//   const processClient = async (client: { id: string }) => {
//     try {
//       const invoice = await generateMonthlyInvoice(
//         client.id,
//         companyId,
//         billingMonth,
//         options
//       );

//       if (invoice) {
//         results.results.push({
//           clientId: client.id,
//           invoiceId: invoice.id
//         });
//       } else {
//         results.results.push({
//           clientId: client.id,
//           error: 'Invoice already exists or client skipped'
//         });
//       }
//     } catch (error: any) {
//       results.results.push({
//         clientId: client.id,
//         error: error.message || 'Unknown error'
//       });
//       console.error(`[Invoice Generation] Failed for client ${client.id}:`, error);
//     }
//   };

//   for (const client of clientQueue) {
//     // Wait if we've reached concurrency limit
//     if (processing.length >= concurrency) {
//       await Promise.any(processing);
//     }
    
//     const promise = processClient(client).then(() => {
//       const idx = processing.indexOf(promise);
//       if (idx > -1) processing.splice(idx, 1);
//     });
//     processing.push(promise);
    
//     // Update counters after promise settles
//     promise.then(() => {
//       const result = results.results.find(r => r.clientId === client.id);
//       if (result?.invoiceId) results.success++;
//       else if (result?.error) {
//         if (result.error.includes('already exists')) results.skipped++;
//         else results.failed++;
//       }
//     });
//   }

//   // Wait for all remaining
//   await Promise.all(processing);

//   return results;
// }

// /**
//  * 📊 GET INVOICE HISTORY WITH FULL BREAKDOWN
//  * Returns complete invoice history with payment details for a client
//  */
// export async function getInvoiceHistory(
//   clientId: string,
//   companyId: string,
//   filters?: {
//     status?: 'unpaid' | 'partial' | 'paid';
//     billingMonth?: string;
//     limit?: number;
//     offset?: number;
//   }
// ): Promise<{
//   invoices: InvoiceWithPayments[];
//   total: number;
//   summary: {
//     totalBilled: number;
//     totalPaid: number;
//     totalRemaining: number;
//   };
// }> {
//   const where: any = {
//     clientId,
//     companyId
//   };

//   if (filters?.billingMonth) {
//     where.billingMonth = filters.billingMonth;
//   }

//   // Get invoices (fetch all matching; pagination applied after computing effective status)
//   const invoices = await prisma.invoice.findMany({
//     where,
//     include: {
//       previousInvoice: true,
//       items: {
//         orderBy: { createdAt: 'asc' }
//       },
//       payments: {
//         orderBy: {
//           paymentDate: 'asc'
//         }
//       }
//     },
//     orderBy: {
//       issuedDate: 'desc'
//     }
//     // No take/skip here; we'll paginate after computing effective status
//   });

//   // Get total count after applying non-status filters (we'll adjust after status filter)
//   const total = invoices.length;

//   // Calculate payment summaries for each invoice
//   const invoicesWithPayments = await Promise.all(
//     invoices.map(async (invoice) => {
//       const summary = await getInvoicePaymentSummary(invoice.id);
//       const effectiveTotal = invoice.totalAmount ?? invoice.amount;

//       return {
//         ...invoice,
//         payments: invoice.payments,
//         items: invoice.items,
//         totalAmount: effectiveTotal,
//         totalPaid: summary.totalPaid,
//         remainingAmount: summary.remainingAmount,
//         overpaidAmount: summary.overpaidAmount,
//         effectivePaymentStatus: summary.effectivePaymentStatus
//       };
//     })
//    );

//   // Apply status filter on computed effectivePaymentStatus (if provided)
//   let filteredInvoices = invoicesWithPayments;
//   if (filters?.status) {
//     filteredInvoices = invoicesWithPayments.filter(inv => inv.effectivePaymentStatus === filters.status);
//   }

//   // Calculate overall summary from filtered invoices
//   const summary = {
//     totalBilled: 0,
//     totalPaid: 0,
//     totalRemaining: 0
//   };

//   for (const invoice of filteredInvoices) {
//     // Only include outstanding invoices in totalBilled
//     if (invoice.effectivePaymentStatus === 'unpaid' || invoice.effectivePaymentStatus === 'partial') {
//       const effectiveTotal = invoice.totalAmount ?? invoice.amount;
//       summary.totalBilled += effectiveTotal + invoice.carryForwardAmount;
//     }
//     summary.totalPaid += invoice.totalPaid;
//     summary.totalRemaining += invoice.remainingAmount;
//   }

//   // Apply pagination after filtering
//   // let finalInvoices = filteredInvoices;
//   // if (filters?.limit || filters?.offset) {
//   //   const start = filters.offset || 0;
//   //   const end = filters.limit ? start + filters.limit : undefined;
//   //   finalInvoices = filteredInvoices.slice(start, end);
//   // }

//   // Total count is number of invoices after status filter (before pagination)
//   const filteredTotal = filteredInvoices.length;
 
//   // Apply pagination after filtering
//   const start = filters?.offset ?? 0;
//   const end = filters?.limit ? start + filters.limit : undefined;
//   const finalInvoices = (filters?.limit || filters?.offset)
//     ? filteredInvoices.slice(start, end)
//     : filteredInvoices;

//   return {
//     invoices: finalInvoices,
//     total,
//     summary
//   };
// }