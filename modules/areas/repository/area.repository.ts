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
  // Get areas with their client counts
  const areas = await prisma.area.findMany({
    where: { companyId },
    include: {
      _count: {
        select: {
          clients: true
        }
      },
      clients: {
        select: {
          id: true,
          status: true
        }
      }
    },
    orderBy: {
      clients: {
        _count: 'desc'
      }
    },
    take: 5
  });

  // Map to the AreaInsight interface with active/expired breakdown
  const detailedInsights: AreaInsight[] = areas.map(area => {
    const activeCount = area.clients.filter(c => c.status === 'active').length;
    const expiredCount = area.clients.filter(c => c.status === 'expired').length;
    
    return {
      areaName: area.name,
      totalClients: area._count.clients,
      activeClients: activeCount,
      expiredClients: expiredCount,
    };
  });

  return detailedInsights;
};

export const getClientsByArea = async (areaId: string, companyId: string) => {
  return await prisma.client.findMany({
    where: {
      areaId,
      companyId
    },
    include: {
      package: true,
    },
  });
};