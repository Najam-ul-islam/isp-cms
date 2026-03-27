import { AdminWithPackages } from './jwt';
import { prisma } from './prisma';

/**
 * Ensures that the current user belongs to the specified company
 */
export const verifyCompanyAccess = async (admin: AdminWithPackages, companyId: string): Promise<boolean> => {
  return admin.companyId === companyId;
};

/**
 * Gets the company ID from the authenticated admin
 */
export const getCurrentCompanyId = (admin: AdminWithPackages): string => {
  return admin.companyId;
};

/**
 * Creates a filtered query based on company ID
 */
export const addCompanyFilter = (admin: AdminWithPackages, whereClause: any = {}) => {
  return {
    ...whereClause,
    companyId: admin.companyId
  };
};

/**
 * Creates a company-safe data object by adding companyId
 */
export const addCompanyToData = (admin: AdminWithPackages, data: any) => {
  return {
    ...data,
    companyId: admin.companyId
  };
};