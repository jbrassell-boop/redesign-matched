import apiClient from './client';
import type { SupplierListResponse, SupplierDetail, SupplierStats } from '../pages/suppliers/types';

export const getSuppliers = async (params: { search?: string; page?: number; pageSize?: number }): Promise<SupplierListResponse> => {
  const { data } = await apiClient.get<SupplierListResponse>('/suppliers', { params });
  return data;
};

export const getSupplierDetail = async (id: number): Promise<SupplierDetail> => {
  const { data } = await apiClient.get<SupplierDetail>(`/suppliers/${id}`);
  return data;
};

export const getSupplierStats = async (): Promise<SupplierStats> => {
  const { data } = await apiClient.get<SupplierStats>('/suppliers/stats');
  return data;
};
