import apiClient from './client';
import type { InventoryListResponse, InventoryDetail, InventoryStats } from '../pages/inventory/types';

export const getInventoryList = async (params: {
  search?: string;
  activeFilter?: string;
  page?: number;
  pageSize?: number;
}): Promise<InventoryListResponse> => {
  const { data } = await apiClient.get<InventoryListResponse>('/inventory', {
    params: {
      search: params.search || undefined,
      activeFilter: params.activeFilter || undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 200,
    },
  });
  return data;
};

export const getInventoryDetail = async (inventoryKey: number): Promise<InventoryDetail> => {
  const { data } = await apiClient.get<InventoryDetail>(`/inventory/${inventoryKey}`);
  return data;
};

export const getInventoryStats = async (): Promise<InventoryStats> => {
  const { data } = await apiClient.get<InventoryStats>('/inventory/stats');
  return data;
};
