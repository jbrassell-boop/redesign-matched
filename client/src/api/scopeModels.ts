import apiClient from './client';
import type { ScopeModelDetail, ScopeModelListResponse, ScopeModelStats, ScopeModelsFilters, Manufacturer, ScopeTypeRepairItem, ScopeTypeDeptMaxCharge, ScopeTypeInventoryItem, ScopeTypeFlag } from '../pages/scope-model/types';

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

export const getScopeModelRepairItems = async (id: number): Promise<ScopeTypeRepairItem[]> => {
  const { data } = await apiClient.get<ScopeTypeRepairItem[]>(`/scope-models/${id}/repair-items`);
  return data;
};

export const getScopeModelMaxCharges = async (id: number): Promise<ScopeTypeDeptMaxCharge[]> => {
  const { data } = await apiClient.get<ScopeTypeDeptMaxCharge[]>(`/scope-models/${id}/max-charges`);
  return data;
};

export const getScopeModelInventory = async (id: number): Promise<ScopeTypeInventoryItem[]> => {
  const { data } = await apiClient.get<ScopeTypeInventoryItem[]>(`/scope-models/${id}/inventory`);
  return data;
};

export const getScopeModelFlags = async (id: number): Promise<ScopeTypeFlag[]> => {
  const { data } = await apiClient.get<ScopeTypeFlag[]>(`/scope-models/${id}/flags`);
  return data;
};

export interface PatchScopeModelPayload {
  description?: string;
  insertTubeLength?: string;
  insertTubeDiameter?: string;
  forcepChannelSize?: string;
  fieldOfView?: string;
  directionOfView?: string;
  depthOfField?: string;
  lengthSpec?: string;
  angUp?: string;
  angDown?: string;
  angLeft?: string;
  angRight?: string;
  notes?: string;
  contractCost?: number | null;
  maxCharge?: number | null;
}

export const updateScopeModel = async (id: number, patch: PatchScopeModelPayload): Promise<void> => {
  await apiClient.patch(`/scope-models/${id}`, patch);
};
