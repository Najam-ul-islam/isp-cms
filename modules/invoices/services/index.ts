import { prisma } from '@/lib/prisma';
import { InvoiceRepository } from '../repository';
import { getInvoicePaymentSummary, getClientPaymentSummary } from '@/lib/payment-calculator';
import type { InvoiceItem } from '@prisma/client';

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
  source?: 'package' | 'product_sale' | 'manual';  // ✅ Track invoice source
}

export interface InvoiceWithPayments {
  id: string;
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
}

/**
 * Creates a new invoice for a client with carry-forward and credit logic
 */
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
  }
): Promise<InvoiceWithPayments> {

  // ✅ PREVENT DUPLICATES: Check for existing unpaid invoice (unless explicitly allowed)
  if (!options?.allowDuplicate) {
    const existingUnpaidInvoice = await prisma.invoice.findFirst({
      where: {
        clientId,
        companyId,
        status: 'unpaid'
      },
      orderBy: {
        issuedDate: 'desc'
      }
    });

    if (existingUnpaidInvoice) {
      throw new Error(
        `Client already has an unpaid invoice (ID: ${existingUnpaidInvoice.id}). ` +
        `Use options.allowDuplicate = true to create another invoice.`
      );
    }
  }

  // Create the invoice with all history fields
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
  });

  // Return the invoice with payment details (initially no payments)
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

/**
 * Creates a new invoice with line items (modern approach)
 * Uses Prisma transactions for atomicity
 * ✅ Prevents duplicate unpaid invoices
 */
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

  // If appending to existing unpaid invoice
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

  // ✅ PREVENT DUPLICATES: Check for existing unpaid/partial invoice
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
    source: input.source || 'manual',  // ✅ Set invoice source
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

/**
 * Gets an invoice with its payment details and previous invoice reference
 */
export async function getInvoiceWithPayments(invoiceId: string, companyId: string): Promise<InvoiceWithPayments> {
  // Fetch the invoice with its payments, items, and previous invoice
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
      companyId
    },
    include: {
      previousInvoice: true,
      items: {
        orderBy: { createdAt: 'asc' }
      },
      payments: {
        orderBy: {
          paymentDate: 'asc'
        }
      }
    }
  });

  if (!invoice) {
    throw new Error(`Invoice with id ${invoiceId} not found`);
  }

  // Calculate payment summary using totalAmount
  const summary = await getInvoicePaymentSummary(invoiceId);
  const effectiveTotal = invoice.totalAmount ?? invoice.amount;

  return {
    ...invoice,
    payments: invoice.payments,
    items: invoice.items,
    totalAmount: effectiveTotal,
    totalPaid: summary.totalPaid,
    remainingAmount: summary.remainingAmount,
    overpaidAmount: summary.overpaidAmount,
    effectivePaymentStatus: summary.effectivePaymentStatus
  };
}

/**
 * Gets all invoices with their payment details for a client
 */
export async function getInvoicesForClient(clientId: string, companyId: string): Promise<InvoiceWithPayments[]> {
  // Fetch all invoices for the client with items
  const invoices = await prisma.invoice.findMany({
    where: {
      clientId,
      companyId
    },
    include: {
      previousInvoice: true,
      items: {
        orderBy: { createdAt: 'asc' }
      },
      payments: {
        orderBy: {
          paymentDate: 'asc'
        }
      }
    },
    orderBy: {
      issuedDate: 'desc'
    }
  });

  // Calculate payment summaries for each invoice
  const invoicesWithPayments = await Promise.all(
    invoices.map(async (invoice) => {
      const summary = await getInvoicePaymentSummary(invoice.id);
      const effectiveTotal = invoice.totalAmount ?? invoice.amount;

      return {
        ...invoice,
        payments: invoice.payments,
        items: invoice.items,
        totalAmount: effectiveTotal,
        totalPaid: summary.totalPaid,
        remainingAmount: summary.remainingAmount,
        overpaidAmount: summary.overpaidAmount,
        effectivePaymentStatus: summary.effectivePaymentStatus
      };
    })
  );

  return invoicesWithPayments;
}

/**
 * Updates an invoice's status based on payment status
 */
export async function updateInvoiceStatus(invoiceId: string, companyId: string): Promise<void> {
  // Calculate payment summary for the invoice
  const summary = await getInvoicePaymentSummary(invoiceId);

  // Update the invoice status based on the payment status
  await InvoiceRepository.update(
    invoiceId,
    { status: summary.effectivePaymentStatus },
    companyId
  );
}

/**
 * Generates an invoice based on client's package price
 * ✅ Prevents duplicate unpaid invoices
 */
export async function generateInvoiceFromClient(
  clientId: string,
  companyId: string,
  description?: string
): Promise<InvoiceWithPayments> {
  // Get client details to determine the invoice amount
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  });

  if (!client) {
    throw new Error(`Client with id ${clientId} not found`);
  }

  // ✅ Check for existing unpaid invoice first
  const existingUnpaidInvoice = await prisma.invoice.findFirst({
    where: {
      clientId,
      companyId,
      status: 'unpaid'
    },
    orderBy: {
      issuedDate: 'desc'
    }
  });

  if (existingUnpaidInvoice) {
    throw new Error(
      `Client already has an unpaid invoice for ${existingUnpaidInvoice.amount}. ` +
      `No new invoice will be created.`
    );
  }

  // Create invoice based on client's price
  return await createInvoiceForClient(
    clientId,
    client.price,
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Due in 30 days
    companyId,
    description || `Invoice for ${client.name}'s internet package`,
    { allowDuplicate: false } // Explicitly prevent duplicates
  );
}

/**
 * 🎯 GENERATE MONTHLY INVOICE WITH CARRY-FORWARD AND CREDIT LOGIC
 * This is the core billing engine function for automated monthly invoice generation
 */
export async function generateMonthlyInvoice(
  clientId: string,
  companyId: string,
  billingMonth: string, // Format: "2026-04"
  options: GenerateMonthlyInvoiceOptions = {}
): Promise<InvoiceWithPayments | null> {
  const { 
    allowDuplicate = false, 
    applyCredits = true, 
    carryForward = true 
  } = options;

  // ✅ Check if invoice already exists for this month
  if (!allowDuplicate) {
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        clientId,
        companyId,
        billingMonth
      }
    });

    if (existingInvoice) {
      console.log(`[Invoice Generation] Invoice already exists for client ${clientId} for month ${billingMonth}`);
      return null;
    }
  }

  // Get client details
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      package: true
    }
  });

  if (!client) {
    console.error(`[Invoice Generation] Client ${clientId} not found`);
    return null;
  }

  // Get the last invoice for this client (any month)
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      clientId,
      companyId
    },
    orderBy: {
      issuedDate: 'desc'
    }
  });

  // Calculate carry-forward amount from last invoice
  let carryForwardAmount = 0;
  let previousInvoiceId: string | undefined;

  if (lastInvoice && carryForward) {
    const lastInvoiceSummary = await getInvoicePaymentSummary(lastInvoice.id);
    
    // Only carry forward if there's a remaining balance
    if (lastInvoiceSummary.remainingAmount > 0) {
      carryForwardAmount = lastInvoiceSummary.remainingAmount;
      previousInvoiceId = lastInvoice.id;
      console.log(`[Invoice Generation] Carrying forward Rs. ${carryForwardAmount} from invoice ${lastInvoice.id}`);
    }
  }

  // Calculate available credits (from overpayments)
  let creditUsed = 0;
  if (applyCredits && lastInvoice) {
    const lastInvoiceSummary = await getInvoicePaymentSummary(lastInvoice.id);
    
    // If client overpaid, we can apply credits
    if (lastInvoiceSummary.overpaidAmount > 0) {
      creditUsed = lastInvoiceSummary.overpaidAmount;
      console.log(`[Invoice Generation] Applying Rs. ${creditUsed} in credits`);
    }
  }

  // Base amount from package price
  const baseAmount = client.price;

  // Total amount = base + carry forward - credits
  const totalAmount = baseAmount + carryForwardAmount;

  // Calculate due date (30 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  // Create the invoice
  const invoice = await createInvoiceForClient(
    clientId,
    baseAmount, // Base package price
    dueDate,
    companyId,
    `Monthly invoice for ${billingMonth}`,
    {
      billingMonth,
      carryForwardAmount,
      creditUsed,
      previousInvoiceId,
      allowDuplicate: true // We already checked for duplicates
    }
  );

  console.log(`[Invoice Generation] Created invoice ${invoice.id} for client ${clientId} for month ${billingMonth}`);
  console.log(`  Base Amount: Rs. ${baseAmount}`);
  console.log(`  Carry Forward: Rs. ${carryForwardAmount}`);
  console.log(`  Credits Used: Rs. ${creditUsed}`);
  console.log(`  Total Due: Rs. ${totalAmount}`);

  return invoice;
}

/**
 * 🔄 GENERATE MONTHLY INVOICES FOR ALL ACTIVE CLIENTS
 * Batch operation to generate invoices for all clients in a company
 */
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
  // Get all active clients
  const clients = await prisma.client.findMany({
    where: {
      companyId,
      status: 'active'
    },
    select: {
      id: true
    }
  });

  const results = {
    success: 0,
    skipped: 0,
    failed: 0,
    results: [] as Array<{ clientId: string; invoiceId?: string; error?: string }>
  };

  // Generate invoices for each client
  for (const client of clients) {
    try {
      const invoice = await generateMonthlyInvoice(
        client.id,
        companyId,
        billingMonth,
        options
      );

      if (invoice) {
        results.success++;
        results.results.push({
          clientId: client.id,
          invoiceId: invoice.id
        });
      } else {
        results.skipped++;
        results.results.push({
          clientId: client.id,
          error: 'Invoice already exists or client skipped'
        });
      }
    } catch (error: any) {
      results.failed++;
      results.results.push({
        clientId: client.id,
        error: error.message || 'Unknown error'
      });
      console.error(`[Invoice Generation] Failed for client ${client.id}:`, error);
    }
  }

  return results;
}

/**
 * 📊 GET INVOICE HISTORY WITH FULL BREAKDOWN
 * Returns complete invoice history with payment details for a client
 */
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
  const where: any = {
    clientId,
    companyId
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.billingMonth) {
    where.billingMonth = filters.billingMonth;
  }

  // Get invoices with pagination
  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      previousInvoice: true,
      items: {
        orderBy: { createdAt: 'asc' }
      },
      payments: {
        orderBy: {
          paymentDate: 'asc'
        }
      }
    },
    orderBy: {
      issuedDate: 'desc'
    },
    take: filters?.limit || 100,
    skip: filters?.offset || 0
  });

  // Get total count
  const total = await prisma.invoice.count({
    where
  });

  // Calculate payment summaries for each invoice
  const invoicesWithPayments = await Promise.all(
    invoices.map(async (invoice) => {
      const summary = await getInvoicePaymentSummary(invoice.id);
      const effectiveTotal = invoice.totalAmount ?? invoice.amount;

      return {
        ...invoice,
        payments: invoice.payments,
        items: invoice.items,
        totalAmount: effectiveTotal,
        totalPaid: summary.totalPaid,
        remainingAmount: summary.remainingAmount,
        overpaidAmount: summary.overpaidAmount,
        effectivePaymentStatus: summary.effectivePaymentStatus
      };
    })
  );

  // Calculate overall summary
  // Only count UNPAID and PARTIAL invoices (not fully paid ones)
  const summary = {
    totalBilled: 0,
    totalPaid: 0,
    totalRemaining: 0
  };

  for (const invoice of invoicesWithPayments) {
    // Only include outstanding invoices in totalBilled
    if (invoice.status === 'unpaid' || invoice.status === 'partial') {
      const effectiveTotal = invoice.totalAmount ?? invoice.amount;
      summary.totalBilled += effectiveTotal + invoice.carryForwardAmount;
    }
    summary.totalPaid += invoice.totalPaid;
    summary.totalRemaining += invoice.remainingAmount;
  }

  return {
    invoices: invoicesWithPayments,
    total,
    summary
  };
}