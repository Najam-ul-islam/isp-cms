import { prisma } from "@/lib/prisma";
import { TransactionKind, AccountType } from "@prisma/client";

export interface DoubleEntryInput {
  companyId: string;
  description: string;
  reference?: string;
  referenceType?: string;
  entries: {
    accountName: string;
    amount: number;
    transactionType: TransactionKind;
  }[];
}

export interface PaymentEntryInput {
  companyId: string;
  amount: number;
  clientId: string;
  invoiceId?: string;
  paymentId: string;
  method?: string;
  useBank?: boolean;
}

export interface InvoiceEntryInput {
  companyId: string;
  amount: number;
  clientId: string;
  invoiceId: string;
}

export interface ExpenseEntryInput {
  companyId: string;
  amount: number;
  expenseId: string;
  useBank?: boolean;
}

export async function createDoubleEntryTransaction(
  input: DoubleEntryInput
) {
  const { companyId, description, reference, referenceType, entries } = input;

  // Validate double-entry: total debits must equal total credits
  const totalDebits = entries
    .filter((e) => e.transactionType === "DEBIT")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalCredits = entries
    .filter((e) => e.transactionType === "CREDIT")
    .reduce((sum, e) => sum + e.amount, 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(
      `Unbalanced transaction: Debits (${totalDebits}) != Credits (${totalCredits})`
    );
  }

  // Execute in transaction
  return prisma.$transaction(async (tx) => {
    const createdTransactions = [];

    for (const entry of entries) {
      // Find the account
      const account = await tx.accountLedger.findFirst({
        where: {
          companyId,
          name: entry.accountName,
        },
      });

      if (!account) {
        throw new Error(`Account "${entry.accountName}" not found`);
      }

      // Create transaction
      const transaction = await tx.accountTransaction.create({
        data: {
          accountId: account.id,
          companyId,
          amount: entry.amount,
          transactionType: entry.transactionType,
          description,
          reference,
          referenceType,
        },
        include: {
          account: true,
        },
      });

      createdTransactions.push(transaction);
    }

    return createdTransactions;
  });
}

export async function recordPayment(input: PaymentEntryInput) {
  const {
    companyId,
    amount,
    clientId,
    invoiceId,
    paymentId,
    method,
    useBank = false,
  } = input;

  const cashAccount = useBank ? "Bank" : "Cash";

  // Double-entry for payment received:
  // DEBIT: Cash/Bank (asset increases)
  // CREDIT: Accounts Receivable (asset decreases)
  return createDoubleEntryTransaction({
    companyId,
    description: `Payment received from client${method ? ` via ${method}` : ""}`,
    reference: paymentId,
    referenceType: "Payment",
    entries: [
      {
        accountName: cashAccount,
        amount,
        transactionType: TransactionKind.DEBIT,
      },
      {
        accountName: "Accounts Receivable",
        amount,
        transactionType: TransactionKind.CREDIT,
      },
    ],
  });
}

export async function recordInvoice(input: InvoiceEntryInput) {
  const { companyId, amount, clientId, invoiceId } = input;

  // Double-entry for invoice generated:
  // DEBIT: Accounts Receivable (asset increases)
  // CREDIT: Revenue (income increases)
  return createDoubleEntryTransaction({
    companyId,
    description: "Invoice generated",
    reference: invoiceId,
    referenceType: "Invoice",
    entries: [
      {
        accountName: "Accounts Receivable",
        amount,
        transactionType: TransactionKind.DEBIT,
      },
      {
        accountName: "Revenue",
        amount,
        transactionType: TransactionKind.CREDIT,
      },
    ],
  });
}

export async function recordExpense(input: ExpenseEntryInput) {
  const { companyId, amount, expenseId, useBank = false } = input;

  const cashAccount = useBank ? "Bank" : "Cash";

  // Double-entry for expense:
  // DEBIT: Expense (expense increases)
  // CREDIT: Cash/Bank (asset decreases)
  return createDoubleEntryTransaction({
    companyId,
    description: "Expense recorded",
    reference: expenseId,
    referenceType: "Expense",
    entries: [
      {
        accountName: "Expense",
        amount,
        transactionType: TransactionKind.DEBIT,
      },
      {
        accountName: cashAccount,
        amount,
        transactionType: TransactionKind.CREDIT,
      },
    ],
  });
}

export async function recordRefund(input: {
  companyId: string;
  amount: number;
  originalPaymentId: string;
  refundId: string;
  useBank?: boolean;
}) {
  const { companyId, amount, originalPaymentId, refundId, useBank = false } =
    input;

  const cashAccount = useBank ? "Bank" : "Cash";

  // Double-entry for refund (reverse of payment):
  // DEBIT: Accounts Receivable (asset increases)
  // CREDIT: Cash/Bank (asset decreases)
  return createDoubleEntryTransaction({
    companyId,
    description: `Refund for payment ${originalPaymentId}`,
    reference: refundId,
    referenceType: "Refund",
    entries: [
      {
        accountName: "Accounts Receivable",
        amount,
        transactionType: TransactionKind.DEBIT,
      },
      {
        accountName: cashAccount,
        amount,
        transactionType: TransactionKind.CREDIT,
      },
    ],
  });
}

export async function recordOverpayment(input: {
  companyId: string;
  amount: number;
  clientId: string;
  paymentId: string;
  useBank?: boolean;
}) {
  const { companyId, amount, clientId, paymentId, useBank = false } = input;

  const cashAccount = useBank ? "Bank" : "Cash";

  // For overpayment, record as liability (credit to Revenue, but we'll handle it separately)
  // DEBIT: Cash/Bank (asset increases)
  // CREDIT: Accounts Receivable (will be negative, meaning client has credit)
  return createDoubleEntryTransaction({
    companyId,
    description: `Overpayment recorded (advance from client)`,
    reference: paymentId,
    referenceType: "Payment",
    entries: [
      {
        accountName: cashAccount,
        amount,
        transactionType: TransactionKind.DEBIT,
      },
      {
        accountName: "Accounts Receivable",
        amount,
        transactionType: TransactionKind.CREDIT,
      },
    ],
  });
}

export async function getTransactionsByReference(
  companyId: string,
  reference: string
) {
  return prisma.accountTransaction.findMany({
    where: { companyId, reference },
    include: {
      account: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTransactionsByType(
  companyId: string,
  referenceType: string,
  { page = 1, limit = 50 } = {}
) {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.accountTransaction.findMany({
      where: { companyId, referenceType },
      include: {
        account: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.accountTransaction.count({
      where: { companyId, referenceType },
    }),
  ]);

  return {
    transactions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAllTransactions(
  companyId: string,
  options: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    ledgerId?: string;
    transactionType?: string;
    referenceType?: string;
  } = {}
) {
  const { page = 1, limit = 50, startDate, endDate, ledgerId, transactionType, referenceType } = options;
  const skip = (page - 1) * limit;

  const where: any = {
    companyId,
    ...(startDate && endDate && {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }),
    ...(ledgerId && { accountId: ledgerId }),
    ...(transactionType && { transactionType }),
    ...(referenceType && { referenceType }),
  };

  const [transactions, total] = await Promise.all([
    prisma.accountTransaction.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.accountTransaction.count({ where }),
  ]);

  return {
    transactions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
