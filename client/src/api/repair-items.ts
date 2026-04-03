import apiClient from './client';
import type {
  RepairItemListResponse,
  RepairItemDetail,
  RepairItemStats,
  RepairItemCreate,
  RepairItemUpdate,
} from '../pages/repair-items/types';

export const getRepairItems = async (params: {
  search?: string;
  typeFilter?: string;
  statusFilter?: string;
  page?: number;
  pageSize?: number;
}): Promise<RepairItemListResponse> => {
  const { data } = await apiClient.get<RepairItemListResponse>('/repair-items', {
    params: {
      search: params.search || undefined,
      typeFilter: params.typeFilter && params.typeFilter !== 'all' ? params.typeFilter : undefined,
      statusFilter: params.statusFilter && params.statusFilter !== 'all' ? params.statusFilter : undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 200,
    },
  });
  return data;
};

export const getRepairItemDetail = async (key: number): Promise<RepairItemDetail> => {
  const { data } = await apiClient.get<RepairItemDetail>(`/repair-items/${key}`);
  return data;
};

export const getRepairItemStats = async (): Promise<RepairItemStats> => {
  const { data } = await apiClient.get<RepairItemStats>('/repair-items/stats');
  return data;
};

export const createRepairItem = async (payload: RepairItemCreate): Promise<{ repairItemKey: number }> => {
  const { data } = await apiClient.post('/repair-items', payload);
  return data;
};

export const updateRepairItem = async (key: number, payload: RepairItemUpdate): Promise<void> => {
  await apiClient.put(`/repair-items/${key}`, payload);
};

export const deleteRepairItem = async (key: number): Promise<void> => {
  await apiClient.delete(`/repair-items/${key}`);
};
