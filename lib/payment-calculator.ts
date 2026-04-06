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
 * Helper function to calculate additional charges total from an invoice
 */
function calculateAdditionalChargesTotal(invoice: { additionalCharges: any }): number {
  if (!invoice.additionalCharges) return 0;
  
  try {
    const charges = typeof invoice.additionalCharges === 'string' 
      ? JSON.parse(invoice.additionalCharges) 
      : invoice.additionalCharges;
    
    if (Array.isArray(charges)) {
      return charges.reduce((sum: number, charge: any) => 
        sum + (charge.amount || 0), 0
      );
    }
  } catch (error) {
    console.error('Error parsing additional charges:', error);
  }
  
  return 0;
}

/**
 * Calculates payment summary for a specific invoice
 * Additional charges are part of total bill, not payments
 */
export async function getInvoicePaymentSummary(invoiceId: string): Promise<InvoicePaymentSummary> {
  // Fetch the invoice with additional charges
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { 
      amount: true,
      additionalCharges: true
    }
  });

  if (!invoice) {
    throw new Error(`Invoice with id ${invoiceId} not found`);
  }

  // Calculate one-time charges (part of total, not payments)
  const oneTimeChargesTotal = calculateAdditionalChargesTotal(invoice);
  
  // Total = package charges + one-time charges
  const total = invoice.amount + oneTimeChargesTotal;

  // Fetch all payments for this specific invoice
  const payments = await prisma.payment.findMany({
    where: { invoiceId },
    select: { amount: true }
  });

  // Calculate total paid (ONLY actual payments from payment table)
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate remaining and overpaid amounts
  const remaining = Math.max(total - totalPaid, 0);
  const overpaid = Math.max(totalPaid - total, 0);

  // Determine payment status
  let effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
  if (totalPaid >= total) {
    effectivePaymentStatus = 'paid';
  } else if (totalPaid > 0) {
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
 * Additional charges increase total, payments decrease remaining
 */
export async function getClientPaymentSummary(clientId: string): Promise<PaymentSummary> {
  // Get all invoices for the client with additional charges
  const invoices = await prisma.invoice.findMany({
    where: { clientId },
    select: { amount: true, id: true, additionalCharges: true }
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

    // Total paid = ONLY actual payments
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

  // Calculate total from all invoices including additional charges
  let total = 0;

  for (const invoice of invoices) {
    // Each invoice total = base amount + one-time charges
    total += invoice.amount + calculateAdditionalChargesTotal(invoice);
  }

  // Get ALL payments for the client (ONLY actual payments, not additional charges)
  const allClientPayments = await prisma.payment.findMany({
    where: { clientId },
    select: { amount: true }
  });

  // Total paid = sum of actual payments only
  const totalPaid = allClientPayments.reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate remaining amount: total - total paid
  const remaining = Math.max(total - totalPaid, 0);
  const overpaid = Math.max(totalPaid - total, 0);

  // Determine overall payment status
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