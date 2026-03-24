import {
  DailyReport,
  MonthlyReport,
  ExpiryReport,
  PaymentStatusReport,
  AreaReport
} from '../types/report.types';
import {
  getDailyReport as getDailyReportRepo,
  getMonthlyReport as getMonthlyReportRepo,
  getExpiryReport as getExpiryReportRepo,
  getPaymentStatusReport as getPaymentStatusReportRepo,
  getAreaReport as getAreaReportRepo
} from '../repository/report.repository';

export const getDailyReport = async (date: Date): Promise<DailyReport> => {
  return await getDailyReportRepo(date);
};

export const getMonthlyReport = async (month: number, year: number): Promise<MonthlyReport> => {
  return await getMonthlyReportRepo(month, year);
};

export const getExpiryReport = async (): Promise<ExpiryReport> => {
  return await getExpiryReportRepo();
};

export const getPaymentStatusReport = async (): Promise<PaymentStatusReport> => {
  return await getPaymentStatusReportRepo();
};

export const getAreaReport = async (): Promise<AreaReport> => {
  return await getAreaReportRepo();
};