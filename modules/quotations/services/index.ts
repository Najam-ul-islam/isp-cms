import { prisma } from '@/lib/prisma';
import { QuotationRepository } from '../repository';
import type { CreateQuotationInput, QuotationFilters } from '../types';
import { QuotationStatus } from '@prisma/client';
import { InvoiceSource } from '@prisma/client';
import { SequenceService } from '@/lib/sequence';
import { QuotationAuditService } from './audit';

export class QuotationService {
  static async createQuotation(
    input: CreateQuotationInput,
    companyId: string,
    idempotencyKey?: string
  ) {
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.amount * (item.quantity || 1),
      0
    );

    const quotation = await prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.quotation.findFirst({
          where: {
            companyId,
            idempotencyKey,
          },
        });
        if (existing) {
          return existing;
        }
      }

      const quotationNumber = await SequenceService.getNextQuotationNumber(tx, companyId);

      const quotation = await tx.quotation.create({
        data: {
          clientId: input.clientId,
          companyId,
          quotationNumber,
          title: input.title,
          description: input.description,
          totalAmount,
          validUntil: input.validUntil,
          items: {
            create: input.items.map(item => ({
              name: item.name,
              description: item.description,
              amount: item.amount,
              quantity: item.quantity || 1,
            })),
          },
          idempotencyKey,
        },
        include: {
          items: true,
          client: true,
        },
      });

      await QuotationAuditService.logWithTx(tx, {
        action: 'quotation.created',
        companyId,
        entityId: quotation.id,
        metadata: {
          quotationNumber: quotation.quotationNumber,
          title: quotation.title,
          clientId: quotation.clientId,
        },
      });

      return quotation;
    });

    return quotation;
  }

  static async getQuotationsForCompany(
    companyId: string,
    filters?: QuotationFilters
  ) {
    return QuotationRepository.findByCompanyId(companyId, filters);
  }

  static async getQuotationById(id: string, companyId: string) {
    return QuotationRepository.findByIdWithCompany(id, companyId);
  }

  static async sendQuotation(id: string, companyId: string) {
    const quotation = await QuotationRepository.findByIdWithCompany(id, companyId);

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    if (quotation.status !== QuotationStatus.pending) {
      throw new Error('Only pending quotations can be sent');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.sent,
          sentAt: new Date(),
        },
        include: {
          items: true,
          client: true,
        },
      });

      await QuotationAuditService.logWithTx(tx, {
        action: 'quotation.sent',
        companyId,
        entityId: id,
        metadata: {
          quotationNumber: quotation.quotationNumber,
          title: quotation.title,
          clientId: quotation.clientId,
        },
      });

      return updated;
    });
  }

  static async deleteQuotation(id: string, companyId: string) {
    const quotation = await QuotationRepository.findByIdWithCompany(id, companyId);

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    if (quotation.status !== QuotationStatus.pending) {
      throw new Error('Only pending quotations can be deleted');
    }

    return prisma.$transaction(async (tx) => {
      await tx.quotation.delete({
        where: { id },
      });

      await QuotationAuditService.logWithTx(tx, {
        action: 'quotation.deleted',
        companyId,
        entityId: id,
        metadata: {
          quotationNumber: quotation.quotationNumber,
          title: quotation.title,
          clientId: quotation.clientId,
        },
      });
    });
  }

  static async getPublicQuotation(id: string) {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        client: true,
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    return quotation;
  }

  static async acceptQuotation(id: string) {
    const result = await prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({
        where: { id },
        include: {
          items: true,
          client: true,
        },
      });

      if (!quotation) {
        throw new Error('Quotation not found');
      }

      if (quotation.status !== QuotationStatus.sent) {
        throw new Error('Quotation must be in sent status to be accepted');
      }

      if (quotation.validUntil && new Date() > quotation.validUntil) {
        throw new Error('Quotation has expired');
      }

      const existingInvoice = quotation.invoiceId 
        ? await tx.invoice.findUnique({ where: { id: quotation.invoiceId } })
        : null;

      if (existingInvoice || quotation.invoiceId) {
        return {
          quotation: await tx.quotation.findUnique({
            where: { id },
            include: {
              items: true,
              client: true,
              company: true,
            },
          }),
          invoice: existingInvoice,
        };
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const invoiceNumber = await SequenceService.getNextInvoiceNumber(tx, quotation.companyId);

      const invoice = await tx.invoice.create({
        data: {
          clientId: quotation.clientId,
          companyId: quotation.companyId,
          invoiceNumber,
          amount: quotation.totalAmount,
          totalAmount: quotation.totalAmount,
          dueDate,
          description: `Invoice for Quotation ${quotation.quotationNumber}`,
          source: InvoiceSource.quotation,
        },
      });

      await tx.invoiceItem.createMany({
        data: quotation.items.map((item) => ({
          invoiceId: invoice.id,
          name: item.name,
          description: item.description,
          amount: item.amount,
          quantity: item.quantity,
        })),
      });

      await tx.quotation.update({
        where: { id },
        data: {
          status: QuotationStatus.accepted,
          respondedAt: new Date(),
          invoiceId: invoice.id,
        },
      });

      await QuotationAuditService.logWithTx(tx, {
        action: 'quotation.accepted',
        companyId: quotation.companyId,
        entityId: id,
        metadata: {
          quotationNumber: quotation.quotationNumber,
          title: quotation.title,
          clientId: quotation.clientId,
          invoiceId: invoice.id,
        },
      });

      return {
        quotation: await tx.quotation.findUnique({
          where: { id },
          include: {
            items: true,
            client: true,
            company: true,
          },
        }),
        invoice,
      };
    });

    return result;
  }

  static async rejectQuotation(id: string) {
    const quotation = await QuotationRepository.findById(id);

    if (!quotation) {
      throw new Error('Quotation not found');
    }

    if (quotation.status !== QuotationStatus.sent) {
      throw new Error('Quotation must be in sent status to be rejected');
    }

    return QuotationRepository.updateStatus(id, QuotationStatus.rejected, {
      respondedAt: new Date(),
    });
  }
}