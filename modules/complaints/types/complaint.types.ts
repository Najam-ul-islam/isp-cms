import { ComplaintStatus } from '@prisma/client';

export interface Complaint {
  id: string;
  clientId: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  clientName?: string; // Optional field for displaying client name
}

export interface CreateComplaintInput {
  clientId: string;
  title: string;
  description: string;
  priority?: string;
}

export interface UpdateComplaintInput {
  status?: ComplaintStatus;
  priority?: string;
  description?: string;
}