import apiClient from './client';
import type { ScopeModelDetail, ScopeModelListResponse, ScopeModelStats, ScopeModelsFilters, Manufacturer } from '../pages/scope-model/types';

export const getScopeModels = async (filters: ScopeModelsFilters): Promise<ScopeModelListResponse> => {
  const { data } = await apiClient.get<ScopeModelListResponse>('/scope-models', {
    params: {
      search: filters.search || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
      typeFilter: filters.typeFilter || undefined,
      statusFilter: filters.statusFilter || undefined,
      manufacturerKey: filters.manufacturerKey ?? undefined,
    },
  });
  return data;
};

export const getScopeModelDetail = async (id: number): Promise<ScopeModelDetail> => {
  const { data } = await apiClient.get<ScopeModelDetail>(`/scope-models/${id}`);
  return data;
};

export const getScopeModelStats = async (): Promise<ScopeModelStats> => {
  const { data } = await apiClient.get<ScopeModelStats>('/scope-models/stats');
  return data;
};

export const getManufacturers = async (): Promise<Manufacturer[]> => {
  const { data } = await apiClient.get<Manufacturer[]>('/scope-models/manufacturers');
  return data;
};
