import apiClient from './client';
import type {
  DashboardStats, DashboardRepairsResponse, DashboardFilters,
  DashboardTasksResponse, DashboardEmailsResponse,
  DashboardShippingResponse, DashboardInvoicesResponse,
  DashboardFlagsResponse, DashboardTechBenchResponse,
  DashboardAnalyticsResponse, BriefingStats,
  DashboardToolbarState,
} from '../pages/dashboard/types';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await apiClient.get<DashboardStats>('/dashboard/stats');
  return data;
};

export const getDashboardRepairs = async (filters: DashboardFilters | DashboardToolbarState): Promise<DashboardRepairsResponse> => {
  const params: Record<string, unknown> = {
    search: filters.search || undefined,
    page: filters.page,
    pageSize: filters.pageSize,
    statusFilter: filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
  };
  if ('type' in filters && filters.type !== 'all') params.type = filters.type;
  if ('location' in filters && filters.location !== 'all') params.location = filters.location;
  if ('groupBy' in filters && filters.groupBy !== 'none') params.groupBy = filters.groupBy;
  const { data } = await apiClient.get<DashboardRepairsResponse>('/dashboard/repairs', { params });
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

export const getDashboardBriefing = async (): Promise<BriefingStats> => {
  const { data } = await apiClient.get<BriefingStats>('/dashboard/briefing');
  return data;
};
