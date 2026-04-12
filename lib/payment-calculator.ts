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
 * Calculates client payment summary based on all invoices and product sales
 * Additional charges and product sales increase total, payments decrease remaining
 */
export async function getClientPaymentSummary(clientId: string): Promise<PaymentSummary> {
  // Get all invoices for the client with additional charges
  const invoices = await prisma.invoice.findMany({
    where: { clientId },
    select: { amount: true, id: true, additionalCharges: true }
  });

  // Calculate total from all invoices including additional charges
  let invoiceTotal = 0;

  if (invoices.length > 0) {
    for (const invoice of invoices) {
      // Each invoice total = base amount + one-time charges
      invoiceTotal += invoice.amount + calculateAdditionalChargesTotal(invoice);
    }
  } else {
    // If no invoices exist, use client price as base
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { price: true }
    });

    if (client) {
      invoiceTotal = client.price;
    }
  }

  // Get all product sales for the client and calculate total selling price (what client owes)
  // ✅ Only count UNPAID product sales to avoid double-counting after payment
  const productSales = await prisma.productSale.findMany({
    where: { 
      clientId,
      status: 'unpaid'  // Only include unpaid product sales
    },
    select: {
      sellingPrice: true,
      quantity: true,
      actualPrice: true,
      unitProfit: true,
      totalOtherIncome: true
    }
  });

  // Calculate total selling price (what client should pay) vs profit
  // ⚠️ CRITICAL: Client owes the FULL selling price, NOT just the profit
  // totalOtherIncome = profit (sellingPrice - actualPrice) * quantity - FOR INTERNAL USE ONLY
  // sellingPrice * quantity = what client actually pays
  const totalProductSelling = productSales.reduce(
    (sum, sale) => sum + (sale.sellingPrice * sale.quantity), 0
  );
  
  // Profit calculation for analytics/reports only - NEVER used in invoices or payments
  const totalProductProfit = productSales.reduce(
    (sum, sale) => sum + sale.totalOtherIncome, 0
  );

  // ✅ TOTAL CALCULATION
  // Total = invoice total (package + additional charges) + product sales SELLING PRICE
  // 🚫 NEVER include profit in total or remaining amount
  const total = invoiceTotal + totalProductSelling;

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

  // DEBUG: Log breakdown for investigation
  console.log(`[Payment Calculator] Client ${clientId} breakdown:`, {
    invoiceCount: invoices.length,
    invoiceTotal,
    invoices: invoices.map(inv => ({
      id: inv.id,
      amount: inv.amount,
      additionalCharges: inv.additionalCharges,
      chargesTotal: calculateAdditionalChargesTotal(inv)
    })),
    productSalesCount: productSales.length,
    totalProductSelling, // What client owes (FULL selling price)
    totalProductProfit,  // Your profit margin
    productSales: productSales.map(sale => ({
      sellingPrice: sale.sellingPrice,
      quantity: sale.quantity,
      totalSelling: sale.sellingPrice * sale.quantity,
      actualPrice: sale.actualPrice,
      profit: sale.totalOtherIncome
    })),
    total,
    paymentCount: allClientPayments.length,
    totalPaid,
    remaining,
    overpaid
  });

  // Determine overall payment status
  let effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
  if (totalPaid === 0) {
    effectivePaymentStatus = 'unpaid';
  } else if (totalPaid > 0 && totalPaid < total) {
    effectivePaymentStatus = 'partial';
  } else {
    effectivePaymentStatus = 'paid';
  }

  // Get client's package price
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { price: true, packageId: true }
  });

  const packageAmount = client?.price || 0;

  return {
    total,
    totalPaid,
    remainingAmount: remaining,
    overpaidAmount: overpaid,
    effectivePaymentStatus,
    packageAmount: packageAmount,  // ✅ Actual package price
    additionalCharges: 0, // This would need to be calculated separately if needed
    otherIncome: totalProductSelling  // ✅ Full selling price (what client owes), NOT profit
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