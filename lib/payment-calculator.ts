import { prisma } from './prisma';

export interface PaymentSummary {
  total: number;
  totalPaid: number;
  remainingAmount: number;
  overpaidAmount: number;
  effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
  packageAmount?: number;
  additionalCharges?: number;
  otherIncome?: number;
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
 * Calculates client payment summary based ONLY on invoices
 * 
 * ✅ CORRECT BUSINESS RULE:
 * - Invoices are the SINGLE source of truth for all billing
 * - Product sales MUST create invoices (enforced at creation time)
 * - Payments are always linked to invoices
 * - productSales table is for analytics/profit tracking ONLY
 * 
 * This prevents double-counting where both invoices and productSales were summed.
 */
export async function getClientPaymentSummary(clientId: string): Promise<PaymentSummary> {
  // ✅ Get ALL invoices for the client with their payments
  const invoices = await prisma.invoice.findMany({
    where: { clientId },
    include: {
      payments: {
        select: { amount: true }
      }
    },
    orderBy: { issuedDate: 'desc' }
  });

  let total = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  let outstandingInvoices = 0;

  // Calculate totals from invoices ONLY
  const invoiceBreakdown = invoices.map((inv) => {
    const charges = calculateAdditionalChargesTotal(inv);
    const carryForward = inv.carryForwardAmount || 0;

    const invoiceTotal = inv.amount + charges + carryForward;

    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(invoiceTotal - paid, 0);

    total += invoiceTotal;
    totalPaid += paid;

    if (remaining > 0) {
      outstandingInvoices++;
      totalRemaining += remaining;
    }

    return {
      id: inv.id,
      total: invoiceTotal,
      paid,
      remaining,
      status: remaining === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'
    };
  });

  const overpaid = Math.max(totalPaid - total, 0);

  let effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
  if (totalPaid === 0) {
    effectivePaymentStatus = 'unpaid';
  } else if (totalRemaining > 0) {
    effectivePaymentStatus = 'partial';
  } else {
    effectivePaymentStatus = 'paid';
  }

  return {
    total,                         // ✅ ONLY invoices (package + charges + carry-forward)
    totalPaid,                     // ✅ Sum of all payments
    remainingAmount: totalRemaining, // ✅ Sum of remaining from all invoices
    overpaidAmount: overpaid,
    effectivePaymentStatus,
    packageAmount: 0,              // Optional metadata
    additionalCharges: 0,          // Optional metadata  
    otherIncome: 0                 // ✅ ZERO - productSales NOT included in billing
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