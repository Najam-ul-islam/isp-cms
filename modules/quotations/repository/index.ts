import { prisma } from '@/lib/prisma';
import { Quotation } from '@prisma/client';
import type { QuotationFilters } from '../types';

export class QuotationRepository {
  static async findById(id: string): Promise<Quotation | null> {
    return prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        client: true,
        company: true,
        invoice: true,
      },
    });
  }

  static async findByIdWithCompany(id: string, companyId: string): Promise<Quotation | null> {
    return prisma.quotation.findUnique({
      where: { 
        id,
        companyId,
      },
      include: {
        items: true,
        client: true,
        company: true,
        invoice: true,
      },
    });
  }

  static async findByCompanyId(companyId: string, filters?: QuotationFilters): Promise<Quotation[]> {
    const where: any = {
      companyId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters?.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters?.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return prisma.quotation.findMany({
      where,
      include: {
        items: true,
        client: true,
        invoice: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async create(data: {
    clientId: string;
    companyId: string;
    quotationNumber: string;
    title?: string;
    description?: string;
    totalAmount: number;
    validUntil?: Date;
    items: {
      name: string;
      description?: string;
      amount: number;
      quantity?: number;
    }[];
  }): Promise<Quotation> {
    return prisma.quotation.create({
      data: {
        clientId: data.clientId,
        companyId: data.companyId,
        quotationNumber: data.quotationNumber,
        title: data.title,
        description: data.description,
        totalAmount: data.totalAmount,
        validUntil: data.validUntil,
        items: {
          create: data.items.map(item => ({
            name: item.name,
            description: item.description,
            amount: item.amount,
            quantity: item.quantity || 1,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  static async updateStatus(id: string, status: string, additionalData?: {
    sentAt?: Date;
    respondedAt?: Date;
    invoiceId?: string;
  }): Promise<Quotation> {
    return prisma.quotation.update({
      where: { id },
      data: {
        status: status as any,
        ...(additionalData?.sentAt && { sentAt: additionalData.sentAt }),
        ...(additionalData?.respondedAt && { respondedAt: additionalData.respondedAt }),
        ...(additionalData?.invoiceId && { invoiceId: additionalData.invoiceId }),
      },
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.quotation.delete({
      where: { id },
    });
  }

  static async findByQuotationNumber(quotationNumber: string, companyId: string): Promise<Quotation | null> {
    return prisma.quotation.findUnique({
      where: {
        companyId_quotationNumber: {
          companyId,
          quotationNumber,
        },
      },
      include: {
        items: true,
        client: true,
        company: true,
      },
    });
  }
}