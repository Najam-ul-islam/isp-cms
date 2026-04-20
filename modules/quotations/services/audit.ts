import { prisma } from '@/lib/prisma';

export enum QuotationAuditAction {
  CREATED = 'quotation_created',
  SENT = 'quotation_sent',
  ACCEPTED = 'quotation_accepted',
  REJECTED = 'quotation_rejected',
  DELETED = 'quotation_deleted',
}

export class QuotationAuditService {
  static async log({
    action,
    userId,
    companyId,
    entityId,
    metadata,
  }: {
    action: QuotationAuditAction;
    userId?: string;
    companyId: string;
    entityId: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          action,
          userId: userId || undefined,
          entity: 'quotation',
          entityId,
          companyId,
          metadata: metadata || {},
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  static async logWithTx(tx: any, {
    action,
    userId,
    companyId,
    entityId,
    metadata,
  }: {
    action: string;
    userId?: string;
    companyId: string;
    entityId: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await tx.auditLog.create({
        data: {
          action,
          userId: userId || undefined,
          entity: 'quotation',
          entityId,
          companyId,
          metadata: metadata || {},
        },
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
}