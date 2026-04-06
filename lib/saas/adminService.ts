import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";

export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  companyId: string;
}

export interface UpdateAdminInput {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
}

export interface AdminWithCompany {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  companyId: string;
  companyName: string;
}

export async function getAdmins({
  page = 1,
  limit = 20,
  search,
  companyId,
}: {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
} = {}) {
  const skip = (page - 1) * limit;

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(companyId && { companyId }),
  };

  const [admins, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
        company: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.admin.count({ where }),
  ]);

  return {
    admins: admins.map((admin) => ({
      ...admin,
      companyName: admin.company.name,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAdminById(id: string) {
  return prisma.admin.findUnique({
    where: { id },
    include: {
      company: {
        select: { name: true },
      },
    },
  });
}

export async function createAdmin(input: CreateAdminInput) {
  const hashedPassword = await bcrypt.hash(input.password, 12);

  return prisma.admin.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: input.role,
      companyId: input.companyId,
    },
    include: {
      company: {
        select: { name: true },
      },
    },
  });
}

export async function updateAdmin(id: string, input: UpdateAdminInput) {
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = input.email;
  if (input.role !== undefined) data.role = input.role;

  return prisma.admin.update({
    where: { id },
    data,
    include: {
      company: {
        select: { name: true },
      },
    },
  });
}

export async function deleteAdmin(id: string) {
  return prisma.admin.delete({
    where: { id },
  });
}

export async function resetAdminPassword(id: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  return prisma.admin.update({
    where: { id },
    data: { password: hashedPassword },
  });
}

export async function getAdminsByCompanyId(
  companyId: string,
  { page = 1, limit = 20 } = {}
) {
  const skip = (page - 1) * limit;

  const [admins, total] = await Promise.all([
    prisma.admin.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.admin.count({ where: { companyId } }),
  ]);

  return {
    admins,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
