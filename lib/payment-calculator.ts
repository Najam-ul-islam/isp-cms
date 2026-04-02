import { prisma } from './prisma';

export interface PaymentSummary {
  total: number;
  totalPaid: number;
  remainingAmount: number;
  overpaidAmount: number;
  effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
}

export interface InvoicePaymentSummary {
  total: number;
  totalPaid: number;
  remainingAmount: number;
  overpaidAmount: number;
  effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
}

/**
 * Calculates payment summary for a specific invoice
 */
export async function getInvoicePaymentSummary(invoiceId: string): Promise<InvoicePaymentSummary> {
  // Fetch the invoice to get its total amount
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { amount: true }
  });

  if (!invoice) {
    throw new Error(`Invoice with id ${invoiceId} not found`);
  }

  // Fetch all payments for this specific invoice
  const payments = await prisma.payment.findMany({
    where: { invoiceId },
    select: { amount: true }
  });

  // Calculate total paid
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate total, remaining, and overpaid amounts
  const total = invoice.amount;
  const remaining = Math.max(total - totalPaid, 0);
  const overpaid = Math.max(totalPaid - total, 0);

  // Determine payment status
  let effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
  if (totalPaid >= total) {
    effectivePaymentStatus = 'paid';
  } else if (totalPaid > 0 && totalPaid < total) {
    effectivePaymentStatus = 'partial';
  } else {
    effectivePaymentStatus = 'unpaid';
  }

  return {
    total,
    totalPaid,
    remainingAmount: remaining,
    overpaidAmount: overpaid,
    effectivePaymentStatus
  };
}

/**
 * Calculates client payment summary based on all invoices
 * This maintains backward compatibility by aggregating all invoices
 * If no invoices exist, it creates a virtual invoice based on client price
 */
export async function getClientPaymentSummary(clientId: string): Promise<PaymentSummary> {
  // Get all invoices for the client
  const invoices = await prisma.invoice.findMany({
    where: { clientId },
    select: { amount: true, id: true }
  });

  // If no invoices exist, create a virtual invoice based on client price
  if (invoices.length === 0) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { price: true }
    });

    if (!client) {
      throw new Error(`Client with id ${clientId} not found`);
    }

    // Calculate payments for this client directly
    const payments = await prisma.payment.findMany({
      where: { clientId },
      select: { amount: true }
    });

    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const total = client.price;
    const remaining = Math.max(total - totalPaid, 0);
    const overpaid = Math.max(totalPaid - total, 0);

    let effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
    if (totalPaid === 0) {
      effectivePaymentStatus = 'unpaid';
    } else if (totalPaid > 0 && totalPaid < total) {
      effectivePaymentStatus = 'partial';
    } else {
      effectivePaymentStatus = 'paid';
    }

    return {
      total,
      totalPaid,
      remainingAmount: remaining,
      overpaidAmount: overpaid,
      effectivePaymentStatus
    };
  }

  // Calculate summary for each invoice and aggregate
  let total = 0;
  let invoiceBasedPaid = 0;
  let totalOverpaid = 0;

  for (const invoice of invoices) {
    const invoiceSummary = await getInvoicePaymentSummary(invoice.id);

    total += invoiceSummary.total;
    invoiceBasedPaid += invoiceSummary.totalPaid;
    totalOverpaid += invoiceSummary.overpaidAmount;
  }

  // Get ALL payments for the client (including those not associated with invoices)
  const allClientPayments = await prisma.payment.findMany({
    where: { clientId },
    select: { amount: true }
  });

  const totalPaid = allClientPayments.reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate remaining amount based on total owed vs total paid
  const remaining = Math.max(total - totalPaid, 0);

  // Determine overall payment status based on all invoices and payments
  let effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
  if (totalPaid === 0) {
    effectivePaymentStatus = 'unpaid';
  } else if (totalPaid > 0 && totalPaid < total) {
    effectivePaymentStatus = 'partial';
  } else {
    effectivePaymentStatus = 'paid';
  }

  return {
    total,
    totalPaid,
    remainingAmount: remaining,
    overpaidAmount: Math.max(totalPaid - total, 0), // Recalculate overpaid based on totalPaid vs total
    effectivePaymentStatus
  };
}

/**
 * Gets all invoices with their payment details for a client
 */
export async function getClientInvoicesWithPayments(clientId: string) {
  // Get all invoices for the client
  const invoices = await prisma.invoice.findMany({
    where: { clientId },
    include: {
      payments: {
        orderBy: {
          paymentDate: 'desc'
        }
      }
    },
    orderBy: {
      issuedDate: 'desc'
    }
  });

  // Calculate payment summary for each invoice
  const invoicesWithSummaries = await Promise.all(
    invoices.map(async (invoice) => {
      const summary = await getInvoicePaymentSummary(invoice.id);

      return {
        ...invoice,
        totalPaid: summary.totalPaid,
        remainingAmount: summary.remainingAmount,
        overpaidAmount: summary.overpaidAmount,
        effectivePaymentStatus: summary.effectivePaymentStatus
      };
    })
  );

  return invoicesWithSummaries;
}