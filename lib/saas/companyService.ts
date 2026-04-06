import { prisma } from "@/lib/prisma";

export interface CreateCompanyInput {
  name: string;
  modulesEnabled?: Record<string, boolean>;
}

export interface UpdateCompanyInput {
  name?: string;
  isActive?: boolean;
  modulesEnabled?: Record<string, boolean>;
}

export interface CompanyWithStats {
  id: string;
  name: string;
  isActive: boolean;
  modulesEnabled: any;
  createdAt: Date;
  totalClients: number;
  totalRevenue: number;
}

export async function getCompanies(): Promise<CompanyWithStats[]> {
  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      modulesEnabled: true,
      createdAt: true,
      _count: {
        select: { clients: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const companiesWithStats = await Promise.all(
    companies.map(async (company) => {
      const revenue = await prisma.payment.aggregate({
        where: { companyId: company.id },
        _sum: { amount: true },
      });

      return {
        id: company.id,
        name: company.name,
        isActive: company.isActive,
        modulesEnabled: company.modulesEnabled,
        createdAt: company.createdAt,
        totalClients: company._count.clients,
        totalRevenue: revenue._sum.amount || 0,
      };
    })
  );

  return companiesWithStats;
}

export async function getCompanyById(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          clients: true,
          admins: true,
          payments: true,
        },
      },
    },
  });

  if (!company) {
    return null;
  }

  const revenue = await prisma.payment.aggregate({
    where: { companyId: id },
    _sum: { amount: true },
  });

  return {
    ...company,
    totalRevenue: revenue._sum.amount || 0,
  };
}

export async function createCompany(input: CreateCompanyInput) {
  return prisma.company.create({
    data: {
      name: input.name,
      modulesEnabled: input.modulesEnabled || {
        billing: true,
        inventory: false,
        employees: true,
      },
    },
  });
}

export async function updateCompany(id: string, input: UpdateCompanyInput) {
  return prisma.company.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.modulesEnabled !== undefined && {
        modulesEnabled: input.modulesEnabled as any,
      }),
    },
  });
}

export async function deleteCompany(id: string) {
  return prisma.company.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function toggleCompanyStatus(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!company) {
    return null;
  }

  return prisma.company.update({
    where: { id },
    data: { isActive: !company.isActive },
  });
}

export async function updateCompanyModules(
  id: string,
  modulesEnabled: Record<string, boolean>
) {
  return prisma.company.update({
    where: { id },
    data: { modulesEnabled: modulesEnabled as any },
  });
}

export async function getCompanyWithStats(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: {
        select: { clients: true },
      },
    },
  });

  if (!company) {
    return null;
  }

  const revenue = await prisma.payment.aggregate({
    where: { companyId: id },
    _sum: { amount: true },
  });

  return {
    id: company.id,
    name: company.name,
    isActive: company.isActive,
    modulesEnabled: company.modulesEnabled,
    createdAt: company.createdAt,
    totalClients: company._count.clients,
    totalRevenue: revenue._sum.amount || 0,
  };
}
