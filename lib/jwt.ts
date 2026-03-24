import { verifyToken } from './auth';
import { prisma } from './prisma';
import type { Admin, Package } from '@prisma/client';

export interface AdminWithPackages {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  packages?: Package[];
}

export const getAdminFromToken = async (request: Request): Promise<AdminWithPackages | null> => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const admin = await prisma.admin.findUnique({
    where: { id: decoded.userId },
    include: { packages: true }, // ✅ Critical fix
  });

  if (!admin) return null;

  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
    packages: admin.packages,
  };
};



// import { NextRequest } from 'next/server'
// import { verifyToken } from './auth'
// import {prisma} from './prisma'

//   export interface AdminWithRole {
//   id: string;
//   name: string;
//   email: string;
//   role: string;
//   createdAt: Date;
//   updatedAt: Date;
//   packages?: any[]; // Add other properties as needed
// }

// export const getAdminFromToken = async (request: Request): Promise<AdminWithRole | null> => {
//     const authHeader = request.headers.get('authorization');

//     if (!authHeader) {
//       return null;
//     }

//     const token = authHeader.replace('Bearer ', '');

//     if (!token) {
//       return null
//     }

//     const decoded = verifyToken(token)
//     if (!decoded) {
//       return null
//     }

//     const admin = await prisma.admin.findUnique({
//       where: { id: decoded.userId }
//     })

//     if (!admin) {
//       return null
//     }

//     // Return admin with role from database (more reliable than token)
//     return {
//       id: admin.id,
//       name: admin.name,
//       email: admin.email,
//       role: admin.role,
//       createdAt: admin.createdAt,
//       updatedAt: admin.updatedAt,
//       packages: admin.packages
//     }
//   }