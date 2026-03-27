import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { AdminWithPackages } from '@/lib/jwt';

export interface AuditLogInput {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: any;
  companyId: string;
}

/**
 * Log an action to the audit trail
 */
export const logAction = async ({
  userId,
  action,
  entity,
  entityId,
  metadata,
  companyId
}: AuditLogInput): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : Prisma.DbNull,
        companyId
      }
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw error as audit logging shouldn't break the main operation
  }
};

/**
 * Get audit logs for a specific company
 */
export const getAuditLogs = async (
  admin: AdminWithPackages,
  limit: number = 50,
  offset: number = 0
) => {
  return await prisma.auditLog.findMany({
    where: {
      companyId: admin.companyId
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    skip: offset
  });
};

/**
 * Count audit logs by various criteria
 */
export const countAuditLogs = async (
  admin: AdminWithPackages,
  searchTerm?: string,
  action?: string,
  entity?: string,
  dateFrom?: Date,
  dateTo?: Date
) => {
  const whereClause: any = {
    companyId: admin.companyId
  };

  if (searchTerm) {
    whereClause.OR = [
      { action: { contains: searchTerm, mode: 'insensitive' } },
      { entity: { contains: searchTerm, mode: 'insensitive' } },
      { entityId: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  if (action) {
    whereClause.action = { contains: action, mode: 'insensitive' };
  }

  if (entity) {
    whereClause.entity = { contains: entity, mode: 'insensitive' };
  }

  if (dateFrom || dateTo) {
    whereClause.createdAt = {};
    if (dateFrom) whereClause.createdAt.gte = dateFrom;
    if (dateTo) whereClause.createdAt.lte = dateTo;
  }

  return await prisma.auditLog.count({
    where: whereClause
  });
};

/**
 * Search audit logs by various criteria
 */
export const searchAuditLogs = async (
  admin: AdminWithPackages,
  searchTerm?: string,
  action?: string,
  entity?: string,
  dateFrom?: Date,
  dateTo?: Date,
  limit: number = 50,
  offset: number = 0
) => {
  const whereClause: any = {
    companyId: admin.companyId
  };

  if (searchTerm) {
    whereClause.OR = [
      { action: { contains: searchTerm, mode: 'insensitive' } },
      { entity: { contains: searchTerm, mode: 'insensitive' } },
      { entityId: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  if (action) {
    whereClause.action = { contains: action, mode: 'insensitive' };
  }

  if (entity) {
    whereClause.entity = { contains: entity, mode: 'insensitive' };
  }

  if (dateFrom || dateTo) {
    whereClause.createdAt = {};
    if (dateFrom) whereClause.createdAt.gte = dateFrom;
    if (dateTo) whereClause.createdAt.lte = dateTo;
  }

  return await prisma.auditLog.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    skip: offset
  });
};