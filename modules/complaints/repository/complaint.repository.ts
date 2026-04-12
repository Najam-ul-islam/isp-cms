import {prisma} from '@/lib/prisma';
import { ComplaintStatus } from '@prisma/client';
import { CreateComplaintInput, UpdateComplaintInput } from '../types/complaint.types';

export const createComplaint = async (complaintData: CreateComplaintInput) => {
  return await prisma.complaint.create({
    data: {
      clientId: complaintData.clientId,
      title: complaintData.title,
      description: complaintData.description,
      priority: complaintData.priority || 'medium',
      companyId: complaintData.companyId
    },
    include: {
      client: true
    }
  });
};

export const getComplaintById = async (id: string) => {
  return await prisma.complaint.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      }
    }
  });
};

export const getAllComplaints = async (companyId?: string) => {
  const whereClause = companyId ? { companyId } : {};
  
  return await prisma.complaint.findMany({
    where: whereClause,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          username: true,
          phone: true
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

export const getComplaintsByClientId = async (clientId: string) => {
  return await prisma.complaint.findMany({
    where: { clientId },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

export const updateComplaint = async (id: string, complaintData: UpdateComplaintInput) => {
  const updateData: any = { ...complaintData };

  if (complaintData.status) {
    updateData.status = complaintData.status;
  }

  if (complaintData.priority) {
    updateData.priority = complaintData.priority;
  }

  if (complaintData.description) {
    updateData.description = complaintData.description;
  }

  return await prisma.complaint.update({
    where: { id },
    data: updateData,
    include: {
      client: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
};

export const deleteComplaint = async (id: string) => {
  return await prisma.complaint.delete({
    where: { id }
  });
};

export const getComplaintsByStatus = async (status: ComplaintStatus, companyId?: string) => {
  const whereClause: any = { status };
  if (companyId) {
    whereClause.companyId = companyId;
  }
  
  return await prisma.complaint.findMany({
    where: whereClause,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          username: true
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
};

export const assignComplaintToEmployee = async (
  complaintId: string,
  employeeId: string | null, // null to unassign
) => {
  return await prisma.complaint.update({
    where: { id: complaintId },
    data: {
      assignedToId: employeeId
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true
        }
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      }
    }
  });
};