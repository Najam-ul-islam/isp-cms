import { prisma } from '@/lib/prisma';
import { Invoice, Prisma } from '@prisma/client';

export interface CreateInvoiceData {
  clientId: string;
  amount: number;
  dueDate: Date;
  description?: string;
  companyId: string;
}

export interface UpdateInvoiceData {
  amount?: number;
  dueDate?: Date;
  description?: string;
  status?: 'unpaid' | 'partial' | 'paid';
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
        dueDate: data.dueDate,
        description: data.description,
        companyId: data.companyId,
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