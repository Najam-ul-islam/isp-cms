import { ComplaintStatus } from '@prisma/client';
import { CreateComplaintInput, UpdateComplaintInput } from '../types/complaint.types';
import {
  createComplaint as createComplaintRepo,
  getComplaintById as getComplaintByIdRepo,
  getAllComplaints as getAllComplaintsRepo,
  getComplaintsByClientId as getComplaintsByClientIdRepo,
  updateComplaint as updateComplaintRepo,
  deleteComplaint as deleteComplaintRepo,
  getComplaintsByStatus as getComplaintsByStatusRepo
} from '../repository/complaint.repository';
import {prisma} from '@/lib/prisma';

export const createComplaint = async (complaintData: CreateComplaintInput) => {
  // Validate that client exists
  const clientExists = await validateClientExists(complaintData.clientId);
  if (!clientExists) {
    throw new Error('Client does not exist');
  }

  return await createComplaintRepo(complaintData);
};

export const getComplaint = async (id: string) => {
  return await getComplaintByIdRepo(id);
};

export const getAllComplaints = async () => {
  return await getAllComplaintsRepo();
};

export const getComplaintsByClient = async (clientId: string) => {
  return await getComplaintsByClientIdRepo(clientId);
};

export const updateComplaint = async (id: string, complaintData: UpdateComplaintInput) => {
  return await updateComplaintRepo(id, complaintData);
};

export const deleteComplaint = async (id: string) => {
  return await deleteComplaintRepo(id);
};

export const getComplaintsByStatus = async (status: ComplaintStatus) => {
  return await getComplaintsByStatusRepo(status);
};

export const getRecentComplaints = async (limit: number = 5) => {
  return await prisma.complaint.findMany({
    take: limit,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

// Helper function to validate client exists
const validateClientExists = async (clientId: string): Promise<boolean> => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });
    return !!client;
  } catch (error) {
    return false;
  }
};