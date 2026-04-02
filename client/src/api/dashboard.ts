import apiClient from './client';
import type {
  DashboardStats, DashboardRepairsResponse, DashboardFilters,
  DashboardTasksResponse, DashboardEmailsResponse,
  DashboardShippingResponse, DashboardInvoicesResponse,
  DashboardFlagsResponse, DashboardTechBenchResponse,
  DashboardAnalyticsResponse,
} from '../pages/dashboard/types';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await apiClient.get<DashboardStats>('/dashboard/stats');
  return data;
};

export const getDashboardRepairs = async (filters: DashboardFilters): Promise<DashboardRepairsResponse> => {
  const { data } = await apiClient.get<DashboardRepairsResponse>('/dashboard/repairs', {
    params: {
      search: filters.search || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
      statusFilter: filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
    },
  });
  return data;
};

export const getDashboardTasks = async (params: { search?: string; page?: number; pageSize?: number }) => {
  const { data } = await apiClient.get<DashboardTasksResponse>('/dashboard/tasks', { params });
  return data;
};

export const getDashboardEmails = async (params: { search?: string; page?: number; pageSize?: number }) => {
  const { data } = await apiClient.get<DashboardEmailsResponse>('/dashboard/emails', { params });
  return data;
};

export const getDashboardShipping = async (params: { search?: string; segment?: string; page?: number; pageSize?: number }) => {
  const { data } = await apiClient.get<DashboardShippingResponse>('/dashboard/shipping', { params });
  return data;
};

export const getDashboardInvoices = async (params: { search?: string; segment?: string; page?: number; pageSize?: number }) => {
  const { data } = await apiClient.get<DashboardInvoicesResponse>('/dashboard/invoices', { params });
  return data;
};

export const getDashboardFlags = async (params: { search?: string; flagType?: string; page?: number; pageSize?: number }) => {
  const { data } = await apiClient.get<DashboardFlagsResponse>('/dashboard/flags', { params });
  return data;
};

export const getDashboardTechBench = async (params: { search?: string; statusFilter?: string; page?: number; pageSize?: number }) => {
  const { data } = await apiClient.get<DashboardTechBenchResponse>('/dashboard/techbench', { params });
  return data;
};

export const getDashboardAnalytics = async () => {
  const { data } = await apiClient.get<DashboardAnalyticsResponse>('/dashboard/analytics');
  return data;
};
