export interface DailyReport {
  date: string;
  totalClients: number;
  newClients: number;
  activeClients: number;
  expiredClients: number;
  totalPayments: number;
  totalExpenses: number;
  netRevenue: number;
}

export interface MonthlyReport {
  month: string;
  year: number;
  totalClients: number;
  newClients: number;
  activeClients: number;
  expiredClients: number;
  totalPayments: number;
  totalExpenses: number;
  netRevenue: number;
  dailyBreakdown: DailyReport[];
}

export interface ExpiryReport {
  expiringToday: number;
  expiringThisWeek: number;
  expiringThisMonth: number;
  expired: number;
}

export interface PaymentStatusReport {
  paid: number;
  unpaid: number;
  partiallyPaid: number;
}

export interface AreaReport {
  [area: string]: {
    totalClients: number;
    activeClients: number;
    expiredClients: number;
  };
}