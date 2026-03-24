import {prisma} from '@/lib/prisma';
import { Role } from '@prisma/client';
import { CreateUserInput, UpdateUserInput } from '../types/user.types';

export const createUser = async (userData: CreateUserInput) => {
  const hashedPassword = await hashPassword(userData.password);

  return await prisma.admin.create({
    data: {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || Role.EMPLOYEE
    }
  });
};

export const getUserByEmail = async (email: string) => {
  return await prisma.admin.findUnique({
    where: { email }
  });
};

export const getUserById = async (id: string) => {
  return await prisma.admin.findUnique({
    where: { id }
  });
};

export const getAllUsers = async () => {
  return await prisma.admin.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });
};

export const updateUser = async (id: string, userData: UpdateUserInput) => {
  const updateData: any = { ...userData };

  if (userData.password) {
    updateData.password = await hashPassword(userData.password);
  }

  return await prisma.admin.update({
    where: { id },
    data: updateData
  });
};

export const deleteUser = async (id: string) => {
  return await prisma.admin.delete({
    where: { id }
  });
};

export const updateUserRole = async (id: string, role: Role) => {
  return await prisma.admin.update({
    where: { id },
    data: { role }
  });
};

// Helper function for password hashing
const hashPassword = async (password: string): Promise<string> => {
  // In a real application, use bcrypt or similar
  // For now, we'll use a simple approach since the existing system does
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
};