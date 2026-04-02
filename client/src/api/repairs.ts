import apiClient from './client';
import type { RepairDetail, RepairListResponse, RepairsFilters } from '../pages/repairs/types';

export const getRepairs = async (filters: RepairsFilters): Promise<RepairListResponse> => {
  const { data } = await apiClient.get<RepairListResponse>('/repairs', {
    params: {
      search: filters.search || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
      statusFilter: filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
    },
  });
  return data;
};

export const getRepairDetail = async (repairKey: number): Promise<RepairDetail> => {
  const { data } = await apiClient.get<RepairDetail>(`/repairs/${repairKey}`);
  return data;
};
