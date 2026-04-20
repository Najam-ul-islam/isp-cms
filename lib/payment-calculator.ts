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
export function calculateAdditionalChargesTotal(invoice: { additionalCharges: any }): number {
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
  // Fetch the invoice with additional charges and carry forward
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { 
      amount: true,
      additionalCharges: true,
      carryForwardAmount: true
    }
  });

  if (!invoice) {
    throw new Error(`Invoice with id ${invoiceId} not found`);
  }

  // Calculate one-time charges (part of total, not payments)
  const oneTimeChargesTotal = calculateAdditionalChargesTotal(invoice);
  
  // Total = base amount + one-time charges + carry forward
  const total = invoice.amount + oneTimeChargesTotal + (invoice.carryForwardAmount || 0);

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
// ==================================================================
// Only Carry Forward Invoices
// Only calculates the unpaid + partial payments from invoices
// ==================================================================
export async function getCarryForwardInvoices(clientId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { clientId },
    include: {
      payments: {
        select: { amount: true }
      }
    },
    orderBy: { issuedDate: 'asc' }
  });

  const carryForwardInvoices = [];

  for (const inv of invoices) {
    const charges = calculateAdditionalChargesTotal(inv);
    const carryForward = inv.carryForwardAmount || 0;

    const total = inv.amount + charges + carryForward;

    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(total - paid, 0);

    // ✅ ONLY include unpaid or partial invoices
    if (remaining > 0) {
      carryForwardInvoices.push({
        invoiceId: inv.id,
        month: inv.billingMonth,
        total,
        paid,
        remaining
      });
    }
  }

  const carryForwardTotal = carryForwardInvoices.reduce(
    (sum, inv) => sum + inv.remaining,
    0
  );

  return {
    carryForwardInvoices,
    carryForwardTotal
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
 * Optimized: payments already included, no need for additional queries
 */
export async function getClientInvoicesWithPayments(clientId: string) {
  // Get all invoices for the client WITH payments in a single query
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

  // Calculate payment summary for each invoice using already-fetched payments
  const invoicesWithSummaries = invoices.map((invoice) => {
    const charges = calculateAdditionalChargesTotal(invoice);
    const carryForward = invoice.carryForwardAmount || 0;
    const invoiceTotal = invoice.amount + charges + carryForward;
    const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(invoiceTotal - paid, 0);

    let effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
    if (paid >= invoiceTotal) {
      effectivePaymentStatus = 'paid';
    } else if (paid > 0) {
      effectivePaymentStatus = 'partial';
    } else {
      effectivePaymentStatus = 'unpaid';
    }

    return {
      ...invoice,
      totalPaid: paid,
      remainingAmount: remaining,
      overpaidAmount: Math.max(paid - invoiceTotal, 0),
      effectivePaymentStatus
    };
  });

  return invoicesWithSummaries;
}