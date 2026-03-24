import { Role } from '@prisma/client';
import { CreateUserInput, UpdateUserInput, LoginInput, LoginResult } from '../types/user.types';
import {
  createUser as createUserRepo,
  getUserByEmail as getUserByEmailRepo,
  getUserById as getUserByIdRepo,
  getAllUsers as getAllUsersRepo,
  updateUser as updateUserRepo,
  deleteUser as deleteUserRepo,
  updateUserRole as updateUserRoleRepo
} from '../repository/user.repository';
import { generateToken, verifyPassword } from '@/lib/auth';

export const registerUser = async (userData: CreateUserInput) => {
  // Check if user already exists
  const existingUser = await getUserByEmailRepo(userData.email);
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  return await createUserRepo(userData);
};

export const loginUser = async (credentials: LoginInput): Promise<LoginResult> => {
  const user = await getUserByEmailRepo(credentials.email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // In a real application, compare hashed passwords
  // For now, assuming the existing system handles password comparison
  const isValidPassword = await verifyPassword(credentials.password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    },
    token
  };
};

export const getUserProfile = async (userId: string) => {
  const user = await getUserByIdRepo(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

export const getAllUsers = async () => {
  return await getAllUsersRepo();
};

export const updateUserProfile = async (userId: string, userData: UpdateUserInput) => {
  return await updateUserRepo(userId, userData);
};

export const deleteUser = async (userId: string) => {
  return await deleteUserRepo(userId);
};

export const changeUserRole = async (userId: string, role: Role) => {
  return await updateUserRoleRepo(userId, role);
};

