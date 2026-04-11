import { prisma } from '@/lib/prisma';
import { AdminWithPackages } from '@/lib/jwt';
import { Client, Payment, Expense, Complaint, Package, Area, AccountLedger, AccountTransaction } from '@prisma/client';
import { logAction } from '@/modules/audit/services';

export interface BackupData {
  clients: Client[];
  payments: Payment[];
  expenses: Expense[];
  complaints: Complaint[];
  packages: Package[];
  areas: Area[];
  ledgers: AccountLedger[];
  transactions: AccountTransaction[];
  createdAt: Date;
}

export interface ExportOptions {
  includeClients?: boolean;
  includePayments?: boolean;
  includeExpenses?: boolean;
  includeComplaints?: boolean;
  includePackages?: boolean;
  includeAreas?: boolean;
  includeLedgers?: boolean;
  includeTransactions?: boolean;
}

/**
 * Export company data as a backup
 */
export const exportBackup = async (
  admin: AdminWithPackages,
  options: ExportOptions = {}
): Promise<BackupData> => {
  const {
    includeClients = true,
    includePayments = true,
    includeExpenses = true,
    includeComplaints = true,
    includePackages = true,
    includeAreas = true,
    includeLedgers = true,
    includeTransactions = true
  } = options;

  const backupData: Partial<BackupData> = {
    createdAt: new Date()
  };

  if (includeClients) {
    backupData.clients = await prisma.client.findMany({
      where: { companyId: admin.companyId },
      include: {
        package: true,
        creator: true
      }
    });
  }

  if (includePayments) {
    backupData.payments = await prisma.payment.findMany({
      where: { companyId: admin.companyId },
      include: {
        client: true
      }
    });
  }

  if (includeExpenses) {
    backupData.expenses = await prisma.expense.findMany({
      where: { companyId: admin.companyId }
    });
  }

  if (includeComplaints) {
    backupData.complaints = await prisma.complaint.findMany({
      where: { companyId: admin.companyId },
      include: {
        client: true
      }
    });
  }

  if (includePackages) {
    backupData.packages = await prisma.package.findMany({
      where: { companyId: admin.companyId },
      include: {
        creator: true,
        serviceProvider: true
      }
    });
  }

  if (includeAreas) {
    backupData.areas = await prisma.area.findMany({
      where: { companyId: admin.companyId }
    });
  }

  if (includeLedgers) {
    backupData.ledgers = await prisma.accountLedger.findMany({
      where: { companyId: admin.companyId }
    });
  }

  if (includeTransactions) {
    backupData.transactions = await prisma.accountTransaction.findMany({
      where: { companyId: admin.companyId },
      include: {
        account: true
      }
    });
  }

  // Log the backup export
  await logAction({
    userId: admin.id,
    action: 'EXPORT_BACKUP',
    entity: 'BACKUP',
    metadata: {
      exportedDataTypes: Object.keys(backupData).filter(key =>
        key !== 'createdAt' && backupData[key as keyof BackupData]
      ),
      recordCounts: {
        clients: backupData.clients?.length || 0,
        payments: backupData.payments?.length || 0,
        expenses: backupData.expenses?.length || 0,
        complaints: backupData.complaints?.length || 0,
        packages: backupData.packages?.length || 0,
        areas: backupData.areas?.length || 0,
        ledgers: backupData.ledgers?.length || 0,
        transactions: backupData.transactions?.length || 0
      }
    },
    companyId: admin.companyId
  });

  return backupData as BackupData;
};

/**
 * Import backup data into the company
 */
export const importBackup = async (
  admin: AdminWithPackages,
  backupData: BackupData
): Promise<{ success: boolean; message: string; importedCounts?: Record<string, number> }> => {
  try {
    // Verify this backup belongs to the same company or is compatible
    // (In a real system, you might have more sophisticated validation)

    const importedCounts: Record<string, number> = {};

    // Start a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Clear existing data for the company (optional, based on requirements)
      // Or you can choose to merge data instead of replacing

      // Import areas first (since other entities reference them)
      if (backupData.areas && backupData.areas.length > 0) {
        // Remove existing areas for this company to avoid conflicts
        await tx.area.deleteMany({
          where: { companyId: admin.companyId }
        });

        const areas = await tx.area.createMany({
          data: backupData.areas.map(area => ({
            ...area,
            id: undefined, // Let Prisma generate new IDs
            companyId: admin.companyId // Ensure it belongs to current company
          }))
        });
        importedCounts.areas = areas.count;
      }

      // Import packages
      if (backupData.packages && backupData.packages.length > 0) {
        await tx.package.deleteMany({
          where: { companyId: admin.companyId }
        });

        // Map old service provider IDs to new ones if needed
        const packages = await tx.package.createMany({
          data: backupData.packages.map(pkg => ({
            ...pkg,
            id: undefined,
            companyId: admin.companyId,
            createdBy: admin.id, // Use current admin as creator
            serviceProviderId: pkg.serviceProviderId || null // Map appropriately
          }))
        });
        importedCounts.packages = packages.count;
      }

      // Import clients
      if (backupData.clients && backupData.clients.length > 0) {
        await tx.client.deleteMany({
          where: { companyId: admin.companyId }
        });

        const clients = await tx.client.createMany({
          data: backupData.clients.map(client => ({
            ...client,
            id: undefined,
            companyId: admin.companyId,
            createdBy: admin.id,
            areaName: client.areaName || null,
            areaId: client.areaId || null
          }))
        });
        importedCounts.clients = clients.count;
      }

      // Import expenses
      if (backupData.expenses && backupData.expenses.length > 0) {
        await tx.expense.deleteMany({
          where: { companyId: admin.companyId }
        });

        const expenses = await tx.expense.createMany({
          data: backupData.expenses.map(expense => ({
            ...expense,
            id: undefined,
            companyId: admin.companyId
          }))
        });
        importedCounts.expenses = expenses.count;
      }

      // Import ledgers
      if (backupData.ledgers && backupData.ledgers.length > 0) {
        await tx.accountLedger.deleteMany({
          where: { companyId: admin.companyId }
        });

        const ledgers = await tx.accountLedger.createMany({
          data: backupData.ledgers.map(ledger => ({
            ...ledger,
            id: undefined,
            companyId: admin.companyId
          }))
        });
        importedCounts.ledgers = ledgers.count;
      }

      // Import transactions
      if (backupData.transactions && backupData.transactions.length > 0) {
        await tx.accountTransaction.deleteMany({
          where: { companyId: admin.companyId }
        });

        const transactions = await tx.accountTransaction.createMany({
          data: backupData.transactions.map(transaction => ({
            ...transaction,
            id: undefined,
            companyId: admin.companyId,
            // Need to map to new account IDs if accounts were recreated
            accountId: transaction.accountId
          }))
        });
        importedCounts.transactions = transactions.count;
      }

      // Import payments
      if (backupData.payments && backupData.payments.length > 0) {
        await tx.payment.deleteMany({
          where: { companyId: admin.companyId }
        });

        const payments = await tx.payment.createMany({
          data: backupData.payments.map(payment => ({
            ...payment,
            id: undefined,
            companyId: admin.companyId,
            // Need to map to new client IDs if clients were recreated
            clientId: payment.clientId
          }))
        });
        importedCounts.payments = payments.count;
      }

      // Import complaints
      if (backupData.complaints && backupData.complaints.length > 0) {
        await tx.complaint.deleteMany({
          where: { companyId: admin.companyId }
        });

        const complaints = await tx.complaint.createMany({
          data: backupData.complaints.map(complaint => ({
            ...complaint,
            id: undefined,
            companyId: admin.companyId,
            // Need to map to new client IDs if clients were recreated
            clientId: complaint.clientId
          }))
        });
        importedCounts.complaints = complaints.count;
      }
    });

    // Log the backup import
    await logAction({
      userId: admin.id,
      action: 'IMPORT_BACKUP',
      entity: 'BACKUP',
      metadata: {
        importedDataTypes: Object.keys(importedCounts),
        importedCounts
      },
      companyId: admin.companyId
    });

    return {
      success: true,
      message: `Backup imported successfully. Imported: ${Object.entries(importedCounts).map(([type, count]) => `${count} ${type}`).join(', ')}`,
      importedCounts
    };
  } catch (error) {
    console.error('Backup import failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      message: `Import failed: ${errorMessage}`
    };
  }
};

/**
 * Convert backup data to CSV format
 */
export const backupToCsv = async (backupData: BackupData): Promise<Record<string, string>> => {
  const csvData: Record<string, string> = {};

  if (backupData.clients) {
    csvData.clients = convertToCsv(backupData.clients);
  }

  if (backupData.payments) {
    csvData.payments = convertToCsv(backupData.payments);
  }

  if (backupData.expenses) {
    csvData.expenses = convertToCsv(backupData.expenses);
  }

  if (backupData.complaints) {
    csvData.complaints = convertToCsv(backupData.complaints);
  }

  if (backupData.packages) {
    csvData.packages = convertToCsv(backupData.packages);
  }

  if (backupData.areas) {
    csvData.areas = convertToCsv(backupData.areas);
  }

  if (backupData.ledgers) {
    csvData.ledgers = convertToCsv(backupData.ledgers);
  }

  if (backupData.transactions) {
    csvData.transactions = convertToCsv(backupData.transactions);
  }

  return csvData;
};

/**
 * Helper function to convert array of objects to CSV
 */
const convertToCsv = (data: any[]): string => {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const val = row[header];
        // Escape commas and quotes in values
        const str = typeof val === 'string' ? val : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
};