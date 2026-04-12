import { prisma } from '@/lib/prisma';
import { InvoiceRepository } from '../repository';
import { getInvoicePaymentSummary } from '@/lib/payment-calculator';

export interface InvoicePaymentSummary {
  total: number;
  totalPaid: number;
  remainingAmount: number;
  overpaidAmount: number;
  effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
}

export interface InvoiceWithPayments {
  id: string;
  clientId: string;
  amount: number;
  issuedDate: Date;
  dueDate: Date;
  status: 'unpaid' | 'partial' | 'paid';
  description: string | null;
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
  totalPaid: number;
  remainingAmount: number;
  overpaidAmount: number;
  effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
}

/**
 * Creates a new invoice for a client
 * ✅ Prevents duplicate unpaid invoices for the same client
 */
export async function createInvoiceForClient(
  clientId: string, 
  amount: number, 
  dueDate: Date, 
  companyId: string, 
  description?: string,
  options?: { allowDuplicate?: boolean }
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

  // ✅ Auto-set billing month/year from due date
  const billingMonth = dueDate.getMonth() + 1; // getMonth() is 0-indexed
  const billingYear = dueDate.getFullYear();

  // Create the invoice
  const invoice = await InvoiceRepository.create({
    clientId,
    amount,
    dueDate,
    description,
    companyId,
    billingMonth,
    billingYear,
  });

  // Return the invoice with payment details (initially no payments)
  return {
    ...invoice,
    payments: [],
    totalPaid: 0,
    remainingAmount: amount,
    overpaidAmount: 0,
    effectivePaymentStatus: 'unpaid'
  };
}

/**
 * Gets an invoice with its payment details
 */
export async function getInvoiceWithPayments(invoiceId: string, companyId: string): Promise<InvoiceWithPayments> {
  // Fetch the invoice with its payments
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
      companyId
    },
    include: {
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

  // Calculate payment summary
  const summary = await getInvoicePaymentSummary(invoiceId);

  return {
    ...invoice,
    payments: invoice.payments,
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
  // Fetch all invoices for the client
  const invoices = await prisma.invoice.findMany({
    where: {
      clientId,
      companyId
    },
    include: {
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

      return {
        ...invoice,
        payments: invoice.payments,
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