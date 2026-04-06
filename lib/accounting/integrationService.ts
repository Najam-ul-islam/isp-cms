/**
 * Accounting Integration Service
 * 
 * This service provides safe wrappers to integrate double-entry accounting
 * with existing Payment, Invoice, and Expense creation without modifying
 * the core business logic.
 */

import { prisma } from "@/lib/prisma";
import {
  recordPayment,
  recordInvoice,
  recordExpense,
} from "@/lib/accounting/accountingService";

export async function integratePaymentAccounting(paymentId: string) {
  // Add accounting entries for an existing payment.
  // Call this after a payment is created.
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: true,
      },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    await recordPayment({
      companyId: payment.companyId,
      amount: payment.amount,
      clientId: payment.clientId!,
      invoiceId: payment.invoiceId || undefined,
      paymentId: payment.id,
      method: payment.method || undefined,
      useBank: payment.method === "BANK_TRANSFER",
    });

    return { success: true, paymentId };
  } catch (error) {
    console.error("Payment accounting integration error:", error);
    throw error;
  }
}

export async function integrateInvoiceAccounting(invoiceId: string) {
  // Add accounting entries for an existing invoice.
  // Call this after an invoice is created.
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    await recordInvoice({
      companyId: invoice.companyId,
      amount: invoice.amount,
      clientId: invoice.clientId,
      invoiceId: invoice.id,
    });

    return { success: true, invoiceId };
  } catch (error) {
    console.error("Invoice accounting integration error:", error);
    throw error;
  }
}

export async function integrateExpenseAccounting(expenseId: string) {
  // Add accounting entries for an existing expense.
  // Call this after an expense is created.
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new Error("Expense not found");
    }

    await recordExpense({
      companyId: expense.companyId,
      amount: expense.amount,
      expenseId: expense.id,
      useBank: false, // Default to cash, can be parameterized later
    });

    return { success: true, expenseId };
  } catch (error) {
    console.error("Expense accounting integration error:", error);
    throw error;
  }
}

export async function backfillAccountingEntries(companyId: string) {
  // Backfill accounting entries for existing payments, invoices, and expenses.
  // Use this to add double-entry accounting to historical data.
  const results = {
    payments: 0,
    invoices: 0,
    expenses: 0,
    errors: [] as string[],
  };

  try {
    // Initialize ledgers first
    const { initializeLedgers } = await import(
      "@/lib/accounting/ledgerService"
    );
    await initializeLedgers(companyId);

    // Backfill payments
    const payments = await prisma.payment.findMany({
      where: { companyId },
    });

    for (const payment of payments) {
      try {
        const existingEntries = await prisma.accountTransaction.findMany({
          where: {
            companyId,
            reference: payment.id,
            referenceType: "Payment",
          },
        });

        if (existingEntries.length === 0) {
          await integratePaymentAccounting(payment.id);
          results.payments++;
        }
      } catch (error: any) {
        results.errors.push(`Payment ${payment.id}: ${error.message}`);
      }
    }

    // Backfill invoices
    const invoices = await prisma.invoice.findMany({
      where: { companyId },
    });

    for (const invoice of invoices) {
      try {
        const existingEntries = await prisma.accountTransaction.findMany({
          where: {
            companyId,
            reference: invoice.id,
            referenceType: "Invoice",
          },
        });

        if (existingEntries.length === 0) {
          await integrateInvoiceAccounting(invoice.id);
          results.invoices++;
        }
      } catch (error: any) {
        results.errors.push(`Invoice ${invoice.id}: ${error.message}`);
      }
    }

    // Backfill expenses
    const expenses = await prisma.expense.findMany({
      where: { companyId },
    });

    for (const expense of expenses) {
      try {
        const existingEntries = await prisma.accountTransaction.findMany({
          where: {
            companyId,
            reference: expense.id,
            referenceType: "Expense",
          },
        });

        if (existingEntries.length === 0) {
          await integrateExpenseAccounting(expense.id);
          results.expenses++;
        }
      } catch (error: any) {
        results.errors.push(`Expense ${expense.id}: ${error.message}`);
      }
    }

    return results;
  } catch (error) {
    console.error("Backfill error:", error);
    throw error;
  }
}
