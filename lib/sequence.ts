import { prisma } from '@/lib/prisma';
import { CounterType, Prisma, PrismaClient } from '@prisma/client';

export class SequenceService {
  static async getNextSequence(
    tx: Prisma.TransactionClient,
    companyId: string,
    type: CounterType
  ): Promise<number> {
    const counter = await tx.sequenceCounter.upsert({
      where: {
        companyId_type: {
          companyId,
          type,
        },
      },
      create: {
        companyId,
        type,
        current: 1,
      },
      update: {
        current: {
          increment: 1,
        },
      },
      select: {
        current: true,
      },
    });

    return counter.current;
  }

  static formatQuotationNumber(sequence: number): string {
    return `Q-${sequence.toString().padStart(4, '0')}`;
  }

  static formatInvoiceNumber(sequence: number): string {
    return `INV-${sequence.toString().padStart(4, '0')}`;
  }

  static async getNextQuotationNumber(
    tx: Prisma.TransactionClient,
    companyId: string
  ): Promise<string> {
    const sequence = await this.getNextSequence(tx, companyId, 'quotation');
    return this.formatQuotationNumber(sequence);
  }

  static async getNextInvoiceNumber(
    tx: Prisma.TransactionClient,
    companyId: string
  ): Promise<string> {
    const sequence = await this.getNextSequence(tx, companyId, 'invoice');
    return this.formatInvoiceNumber(sequence);
  }

  static async resetSequence(companyId: string, type: CounterType, value: number): Promise<void> {
    await prisma.sequenceCounter.upsert({
      where: {
        companyId_type: {
          companyId,
          type,
        },
      },
      create: {
        companyId,
        type,
        current: value,
      },
      update: {
        current: value,
      },
    });
  }
}