import { prisma } from '@/lib/prisma';
import { Invoice, Prisma, InvoiceItem } from '@prisma/client';

export interface CreateInvoiceData {
  clientId: string;
  amount: number;
  dueDate: Date;
  description?: string;
  companyId: string;
  billingMonth?: string;  // Format: "2026-04"
  carryForwardAmount?: number;
  creditUsed?: number;
  previousInvoiceId?: string;
  additionalCharges?: any;
  totalAmount?: number;
}

export interface CreateInvoiceWithItemsData {
  clientId: string;
  dueDate: Date;
  description?: string;
  companyId: string;
  billingMonth?: string;
  carryForwardAmount?: number;
  creditUsed?: number;
  previousInvoiceId?: string;
  source?: 'package' | 'product_sale' | 'manual';  // ✅ Track invoice source
  items: {
    name: string;
    description?: string | null;
    amount: number;
    quantity?: number;
  }[];
}

export interface UpdateInvoiceData {
  amount?: number;
  totalAmount?: number;
  dueDate?: Date;
  description?: string;
  status?: 'unpaid' | 'partial' | 'paid';
  billingMonth?: string;
  carryForwardAmount?: number;
  creditUsed?: number;
}

export class InvoiceRepository {
  /**
   * Create a new invoice
   */
  static async create(data: CreateInvoiceData): Promise<Invoice> {
    return await prisma.invoice.create({
      data: {
        clientId: data.clientId,
        amount: data.amount,
        totalAmount: data.totalAmount ?? data.amount,
        dueDate: data.dueDate,
        description: data.description,
        companyId: data.companyId,
        billingMonth: data.billingMonth,
        carryForwardAmount: data.carryForwardAmount || 0,
        creditUsed: data.creditUsed || 0,
        previousInvoiceId: data.previousInvoiceId,
        additionalCharges: data.additionalCharges,
      }
    });
  }

  /**
   * Create a new invoice with line items (atomic transaction)
   */
  static async createWithItems(data: CreateInvoiceWithItemsData): Promise<Invoice & { items: InvoiceItem[] }> {
    const totalAmount = data.items.reduce(
      (sum, item) => sum + (item.amount * (item.quantity || 1)),
      0
    );

    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          clientId: data.clientId,
          amount: totalAmount, // Keep amount same as totalAmount for consistency
          totalAmount,
          dueDate: data.dueDate,
          description: data.description,
          companyId: data.companyId,
          billingMonth: data.billingMonth,
          carryForwardAmount: data.carryForwardAmount || 0,
          creditUsed: data.creditUsed || 0,
          previousInvoiceId: data.previousInvoiceId,
          source: data.source || 'manual',  // ✅ Set invoice source
        }
      });

      const items = await Promise.all(
        data.items.map((item) =>
          tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              name: item.name,
              description: item.description,
              amount: item.amount,
              quantity: item.quantity || 1,
            }
          })
        )
      );

      return { ...invoice, items };
    });
  }

  /**
   * Add line items to an existing invoice (atomic transaction)
   * Updates totalAmount accordingly
   */
  static async addItemsToInvoice(
    invoiceId: string,
    companyId: string,
    items: {
      name: string;
      description?: string | null;
      amount: number;
      quantity?: number;
    }[]
  ): Promise<Invoice & { items: InvoiceItem[] }> {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId, companyId },
        include: { items: true }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const newItems = await Promise.all(
        items.map((item) =>
          tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              name: item.name,
              description: item.description,
              amount: item.amount,
              quantity: item.quantity || 1,
            }
          })
        )
      );

      const newItemTotal = items.reduce(
        (sum, item) => sum + (item.amount * (item.quantity || 1)),
        0
      );

      const newTotalAmount = (invoice.totalAmount ?? invoice.amount) + newItemTotal;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { totalAmount: newTotalAmount },
        include: { items: true }
      });

      return updatedInvoice;
    });
  }

  /**
   * Get invoice with line items
   */
  static async findByIdWithItems(id: string, companyId: string): Promise<(Invoice & { items: InvoiceItem[] }) | null> {
    return await prisma.invoice.findUnique({
      where: {
        id,
        companyId
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  /**
   * Find invoice by ID
   */
  static async findById(id: string, companyId: string): Promise<Invoice | null> {
    return await prisma.invoice.findUnique({
      where: {
        id,
        companyId
      }
    });
  }

  /**
   * Find all invoices for a client
   */
  static async findByClientId(clientId: string, companyId: string): Promise<Invoice[]> {
    return await prisma.invoice.findMany({
      where: {
        clientId,
        companyId
      },
      orderBy: {
        issuedDate: 'desc'
      }
    });
  }

  /**
   * Find all invoices for a company
   */
  static async findByCompanyId(companyId: string, filters?: {
    status?: 'unpaid' | 'partial' | 'paid';
    startDate?: Date;
    endDate?: Date;
  }): Promise<Invoice[]> {
    const whereClause: Prisma.InvoiceWhereInput = {
      companyId
    };

    if (filters) {
      if (filters.status) {
        whereClause.status = filters.status;
      }
      if (filters.startDate || filters.endDate) {
        whereClause.issuedDate = {};
        if (filters.startDate) {
          whereClause.issuedDate.gte = filters.startDate;
        }
        if (filters.endDate) {
          whereClause.issuedDate.lte = filters.endDate;
        }
      }
    }

    return await prisma.invoice.findMany({
      where: whereClause,
      orderBy: {
        issuedDate: 'desc'
      }
    });
  }

  /**
   * Update an invoice
   */
  static async update(id: string, data: UpdateInvoiceData, companyId: string): Promise<Invoice> {
    return await prisma.invoice.update({
      where: {
        id,
        companyId
      },
      data
    });
  }

  /**
   * Delete an invoice
   */
  static async delete(id: string, companyId: string): Promise<Invoice> {
    return await prisma.invoice.delete({
      where: {
        id,
        companyId
      }
    });
  }

  /**
   * Get invoice statistics for a company
   */
  static async getInvoiceStats(companyId: string) {
    const stats = await prisma.invoice.groupBy({
      by: ['status'],
      where: {
        companyId
      },
      _count: {
        _all: true
      },
      _sum: {
        amount: true
      }
    });

    const result: Record<string, { count: number; totalAmount: number }> = {};

    stats.forEach(stat => {
      result[stat.status] = {
        count: stat._count._all,
        totalAmount: stat._sum.amount || 0
      };
    });

    return {
      unpaid: result.unpaid || { count: 0, totalAmount: 0 },
      partial: result.partial || { count: 0, totalAmount: 0 },
      paid: result.paid || { count: 0, totalAmount: 0 }
    };
  }
}