import apiClient from './client';
import type { SupplierListResponse, SupplierDetail, SupplierStats, SupplierInventoryItem, SupplierDocument } from '../pages/suppliers/types';

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

export const getSupplierInventory = async (id: number): Promise<SupplierInventoryItem[]> => {
  const { data } = await apiClient.get<SupplierInventoryItem[]>(`/suppliers/${id}/inventory`);
  return data;
};

export const getSupplierDocuments = async (id: number): Promise<SupplierDocument[]> => {
  const { data } = await apiClient.get<SupplierDocument[]>(`/suppliers/${id}/documents`);
  return data;
};
