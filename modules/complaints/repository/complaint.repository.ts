import {prisma} from '@/lib/prisma';
import { ComplaintStatus } from '@prisma/client';
import { CreateComplaintInput, UpdateComplaintInput } from '../types/complaint.types';

export const createComplaint = async (complaintData: CreateComplaintInput) => {
  return await prisma.complaint.create({
    data: {
      clientId: complaintData.clientId,
      title: complaintData.title,
      description: complaintData.description,
      priority: complaintData.priority || 'medium'
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
      }
    }
  });
};

export const getAllComplaints = async () => {
  return await prisma.complaint.findMany({
    include: {
      client: {
        select: {
          id: true,
          name: true,
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
      client: true
    }
  });
};

export const deleteComplaint = async (id: string) => {
  return await prisma.complaint.delete({
    where: { id }
  });
};

export const getComplaintsByStatus = async (status: ComplaintStatus) => {
  return await prisma.complaint.findMany({
    where: { status },
    include: {
      client: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
};