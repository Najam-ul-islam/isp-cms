import { Role } from '@prisma/client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  password?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: User;
  token: string;
}