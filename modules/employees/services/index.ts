import { prisma } from '@/lib/prisma';
import { AdminWithPackages } from '@/lib/jwt';
import { hashPassword } from '@/lib/auth';
import { logAction } from '../../audit/services';

export interface EmployeeInput {
  name: string;
  email: string;
  phone?: string;
  role: 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN'; // Maps to existing RBAC roles
  permissions?: any; // Store granular permissions
  salary?: number;
}

export interface EmployeeActivityInput {
  employeeId: string;
  action: string;
  metadata?: any;
}

/**
 * Create a new employee
 */
export const createEmployee = async (
  admin: AdminWithPackages,
  data: EmployeeInput
) => {
  // Validate role
  if (!['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'].includes(data.role)) {
    throw new Error('Invalid role. Must be EMPLOYEE, ADMIN, or SUPER_ADMIN');
  }

   // Check if email already exists within the company
   const existingEmployee = await prisma.employee.findUnique({
     where: { email_companyId: { email: data.email, companyId: admin.companyId } }
   });

  if (existingEmployee) {
    throw new Error('Employee with this email already exists');
  }

  const employee = await prisma.employee.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      permissions: data.permissions || null,
      salary: data.salary,
      companyId: admin.companyId
    }
  });

  // Log the action
  await logAction({
    userId: admin.id,
    action: 'CREATE_EMPLOYEE',
    entity: 'EMPLOYEE',
    entityId: employee.id,
    metadata: {
      name: employee.name,
      email: employee.email,
      role: employee.role,
      salary: employee.salary
    },
    companyId: admin.companyId
  });

  return employee;
};

/**
 * Get all employees for the company
 */
export const getEmployees = async (
  admin: AdminWithPackages,
  filters?: {
    role?: string;
    search?: string;
  }
) => {
  const whereClause: any = {
    companyId: admin.companyId
  };

  if (filters?.role) {
    whereClause.role = { contains: filters.role, mode: 'insensitive' };
  }

  if (filters?.search) {
    whereClause.name = { contains: filters.search, mode: 'insensitive' };
  }

  return await prisma.employee.findMany({
    where: whereClause,
    orderBy: {
      name: 'asc'
    }
  });
};

/**
 * Get employee by ID
 */
export const getEmployeeById = async (
  admin: AdminWithPackages,
  employeeId: string
) => {
  return await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId: admin.companyId
    }
  });
};

/**
 * Update employee information
 */
export const updateEmployee = async (
  admin: AdminWithPackages,
  employeeId: string,
  data: Partial<EmployeeInput>
) => {
  const employee = await prisma.employee.update({
    where: {
      id: employeeId,
      companyId: admin.companyId
    },
    data: {
      ...data,
      permissions: data.permissions !== undefined ? data.permissions : undefined
    }
  });

  // Log the action
  await logAction({
    userId: admin.id,
    action: 'UPDATE_EMPLOYEE',
    entity: 'EMPLOYEE',
    entityId: employee.id,
    metadata: {
      updatedFields: Object.keys(data),
      ...data
    },
    companyId: admin.companyId
  });

  return employee;
};

/**
 * Delete employee
 */
export const deleteEmployee = async (
  admin: AdminWithPackages,
  employeeId: string
) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId: admin.companyId
    }
  });

  if (!employee) {
    throw new Error('Employee not found or does not belong to your company');
  }

  await prisma.employee.delete({
    where: {
      id: employeeId,
      companyId: admin.companyId
    }
  });

  // Log the action
  await logAction({
    userId: admin.id,
    action: 'DELETE_EMPLOYEE',
    entity: 'EMPLOYEE',
    entityId: employeeId,
    metadata: {
      name: employee.name,
      email: employee.email
    },
    companyId: admin.companyId
  });

  return { message: 'Employee deleted successfully' };
};

/**
 * Assign role to employee
 */
export const assignRole = async (
  admin: AdminWithPackages,
  employeeId: string,
  role: 'EMPLOYEE' | 'ADMIN' | 'SUPER_ADMIN'
) => {
  // Validate role is one of the allowed values
  if (!['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    throw new Error('Invalid role. Must be EMPLOYEE, ADMIN, or SUPER_ADMIN');
  }

  const employee = await prisma.employee.update({
    where: {
      id: employeeId,
      companyId: admin.companyId
    },
    data: {
      role
    }
  });

  // Log the action
  await logAction({
    userId: admin.id,
    action: 'ASSIGN_ROLE',
    entity: 'EMPLOYEE',
    entityId: employee.id,
    metadata: {
      newRole: role,
      previousRole: employee.role
    },
    companyId: admin.companyId
  });

  return employee;
};

/**
 * Track employee activity
 */
export const trackEmployeeActivity = async (
  admin: AdminWithPackages,
  employeeId: string,
  action: string,
  metadata?: any
) => {
  // Verify employee belongs to company
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      companyId: admin.companyId
    }
  });

  if (!employee) {
    throw new Error('Employee not found or does not belong to your company');
  }

  const activity = await prisma.employeeActivity.create({
    data: {
      employeeId,
      action,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      companyId: admin.companyId
    }
  });

  // Log the action
  await logAction({
    userId: admin.id,
    action: 'TRACK_EMPLOYEE_ACTIVITY',
    entity: 'EMPLOYEE_ACTIVITY',
    entityId: activity.id,
    metadata: {
      employeeId,
      action,
      activityId: activity.id
    },
    companyId: admin.companyId
  });

  return activity;
};

/**
 * Get employee activities
 */
export const getEmployeeActivities = async (
  admin: AdminWithPackages,
  employeeId: string
) => {
  return await prisma.employeeActivity.findMany({
    where: {
      employeeId,
      companyId: admin.companyId
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

/**
 * Get employee statistics
 */
export const getEmployeeStats = async (admin: AdminWithPackages) => {
  const totalEmployees = await prisma.employee.count({
    where: {
      companyId: admin.companyId
    }
  });

  const roleCounts = await prisma.employee.groupBy({
    by: ['role'],
    where: {
      companyId: admin.companyId
    },
    _count: {
      _all: true
    }
  });

  return {
    totalEmployees,
    roleCounts
  };
};