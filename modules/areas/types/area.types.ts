export interface Area {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AreaInsight {
  areaName: string;
  totalClients: number;
  activeClients: number;
  expiredClients: number;
}