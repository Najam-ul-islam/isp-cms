import {prisma} from '@/lib/prisma';
import { Area, AreaInsight } from '../types/area.types';

export const createArea = async (data: {
  name: string;
  description?: string;
  companyId: string;
}): Promise<Area> => {
  return await prisma.area.create({
    data: {
      name: data.name,
      description: data.description || '',
      company: {
        connect: { id: data.companyId },
      },
    },
  });
};

export const getAllAreas = async (): Promise<Area[]> => {
  return await prisma.area.findMany();
};

export const getAreaById = async (id: string): Promise<Area | null> => {
  return await prisma.area.findUnique({
    where: { id },
  });
};

export const updateArea = async (id: string, data: {
  name?: string;
  description?: string;
}): Promise<Area> => {
  return await prisma.area.update({
    where: { id },
    data,
  });
};

export const deleteArea = async (id: string): Promise<void> => {
  await prisma.area.delete({
    where: { id },
  });
};

export const getAreaInsights = async (companyId: string): Promise<AreaInsight[]> => {
  // Get top 5 areas by client count
  const insights = await prisma.client.groupBy({
    by: ['area'],
    _count: {
      id: true,
    },
    _sum: {
      price: true,
    },
    where: {
      area: {
        not: null,
      },
      companyId
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: 5,
  });

  // Map to the AreaInsight interface with active/expired breakdown
  const detailedInsights: AreaInsight[] = [];

  for (const insight of insights) {
    if (insight.area) {
      const activeCount = await prisma.client.count({
        where: {
          area: insight.area,
          status: 'active',
          companyId
        },
      });

      const expiredCount = await prisma.client.count({
        where: {
          area: insight.area,
          status: 'expired',
          companyId
        },
      });

      detailedInsights.push({
        areaName: insight.area,
        totalClients: insight._count.id,
        activeClients: activeCount,
        expiredClients: expiredCount,
      });
    }
  }

  return detailedInsights;
};

export const getClientsByArea = async (areaName: string, companyId: string) => {
  return await prisma.client.findMany({
    where: {
      area: areaName,
      companyId
    },
    include: {
      package: true,
    },
  });
};