import { ComplaintStatus } from '@prisma/client';
import { CreateComplaintInput, UpdateComplaintInput } from '../types/complaint.types';
import {
  createComplaint as createComplaintRepo,
  getComplaintById as getComplaintByIdRepo,
  getAllComplaints as getAllComplaintsRepo,
  getComplaintsByClientId as getComplaintsByClientIdRepo,
  updateComplaint as updateComplaintRepo,
  deleteComplaint as deleteComplaintRepo,
  getComplaintsByStatus as getComplaintsByStatusRepo,
  assignComplaintToEmployee as assignComplaintRepo
} from '../repository/complaint.repository';
import {prisma} from '@/lib/prisma';
import { AdminWithPackages } from '@/lib/jwt';

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

export const getAllComplaints = async (companyId?: string) => {
  return await getAllComplaintsRepo(companyId);
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

export const getComplaintsByStatus = async (status: ComplaintStatus, companyId?: string) => {
  return await getComplaintsByStatusRepo(status, companyId);
};

export const assignComplaintToEmployee = async (
  complaintId: string,
  employeeId: string | null,
  companyId: string
) => {
  // Validate complaint exists and belongs to company
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId }
  });

  if (!complaint) {
    throw new Error('Complaint not found');
  }

  if (complaint.companyId !== companyId) {
    throw new Error('Complaint does not belong to your company');
  }

  // If assigning to employee, validate employee exists and belongs to company
  if (employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    if (employee.companyId !== companyId) {
      throw new Error('Employee does not belong to your company');
    }
  }

  return await assignComplaintRepo(complaintId, employeeId);
};

export const getRecentComplaints = async (admin: AdminWithPackages, limit: number = 5) => {
  return await prisma.complaint.findMany({
    take: limit,
    where: {
      client: {
        companyId: admin.companyId
      }
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        }
      },
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