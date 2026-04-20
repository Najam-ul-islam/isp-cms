import { prisma } from "@/lib/prisma";

export interface AuditLogFilters {
  companyId?: string;
  userId?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogWithDetails {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: unknown;
  companyId: string;
  companyName: string;
  createdAt: Date;
}

export async function getAuditLogs({
  companyId,
  userId,
  action,
  page = 1,
  limit = 50,
}: AuditLogFilters = {}) {
  const skip = (page - 1) * limit;

  const where = {
    ...(companyId && { companyId }),
    ...(userId && { userId }),
    ...(action && { action }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        userId: true,
        user: {
          select: { name: true },
        },
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        companyId: true,
        company: {
          select: { name: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user?.name || null,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      metadata: log.metadata,
      companyId: log.companyId,
      companyName: log.company.name,
      createdAt: log.createdAt,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAuditLogById(id: string) {
  return prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: {
        select: { name: true, email: true },
      },
      company: {
        select: { name: true },
      },
    },
  });
}

export async function getAuditActions() {
  const actions = await prisma.auditLog.groupBy({
    by: ["action"],
    _count: {
      action: true,
    },
    orderBy: {
      _count: {
        action: "desc",
      },
    },
  });

  return actions.map((a) => a.action);
}
