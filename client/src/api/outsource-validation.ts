import apiClient from './client';
import type { OutsourceListResponse, OutsourceStats, OutsourceFilters } from '../pages/outsource-validation/types';

export const getOutsourceValidation = async (filters: OutsourceFilters): Promise<OutsourceListResponse> => {
  const { data } = await apiClient.get<OutsourceListResponse>('/outsource-validation', {
    params: {
      search: filters.search || undefined,
      statusFilter: filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  });
  return data;
};

export const getOutsourceStats = async (): Promise<OutsourceStats> => {
  const { data } = await apiClient.get<OutsourceStats>('/outsource-validation/stats');
  return data;
};
