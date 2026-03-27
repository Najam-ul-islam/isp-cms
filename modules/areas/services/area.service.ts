import {
  createArea as createAreaRepo,
  getAllAreas as getAllAreasRepo,
  getAreaById as getAreaByIdRepo,
  updateArea as updateAreaRepo,
  deleteArea as deleteAreaRepo,
  getAreaInsights as getAreaInsightsRepo,
  getClientsByArea as getClientsByAreaRepo
} from '../repository/area.repository';
import { Area, AreaInsight } from '../types/area.types';
import { AdminWithPackages } from '@/lib/jwt';

export const createArea = async (data: {
  name: string;
  description?: string;
  companyId: string;
}) => {
  return await createAreaRepo(data);
};

export const getAllAreas = async (): Promise<Area[]> => {
  return await getAllAreasRepo();
};

export const getAreaById = async (id: string): Promise<Area | null> => {
  return await getAreaByIdRepo(id);
};

export const updateArea = async (id: string, data: {
  name?: string;
  description?: string;
}) => {
  return await updateAreaRepo(id, data);
};

export const deleteArea = async (id: string) => {
  return await deleteAreaRepo(id);
};

export const getAreaInsights = async (companyId: string): Promise<AreaInsight[]> => {
  return await getAreaInsightsRepo(companyId);
};

export const getClientsByArea = async (areaName: string, companyId: string) => {
  return await getClientsByAreaRepo(areaName, companyId);
};