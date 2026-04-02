import apiClient from './client';
import type {
  EndoCartScopeInventoryResponse,
  EndoCartServiceHistoryResponse,
  EndoCartApiStats,
} from '../pages/endocarts/types';

export const getEndoCartScopeInventory = async (params: {
  search?: string;
  rigidOrFlexible?: string;
  page?: number;
  pageSize?: number;
}): Promise<EndoCartScopeInventoryResponse> => {
  const { data } = await apiClient.get<EndoCartScopeInventoryResponse>('/endocarts/scope-inventory', { params });
  return data;
};

export const getEndoCartServiceHistory = async (params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<EndoCartServiceHistoryResponse> => {
  const { data } = await apiClient.get<EndoCartServiceHistoryResponse>('/endocarts/service-history', { params });
  return data;
};

export const getEndoCartStats = async (): Promise<EndoCartApiStats> => {
  const { data } = await apiClient.get<EndoCartApiStats>('/endocarts/stats');
  return data;
};
