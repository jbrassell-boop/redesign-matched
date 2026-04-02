import apiClient from './client';
import type { DashboardStats, DashboardRepairsResponse, DashboardFilters } from '../pages/dashboard/types';

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
