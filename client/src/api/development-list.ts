import apiClient from './client';
import type { DevListResponse, DevListItem, DevListStatus, DevListStats } from '../pages/development-list/types';

export const getDevList = async (params: {
  search?: string;
  statusId?: number;
  page?: number;
  pageSize?: number;
}): Promise<DevListResponse> => {
  const { data } = await apiClient.get<DevListResponse>('/development-list', { params });
  return data;
};

export const getDevListDetail = async (id: number): Promise<DevListItem> => {
  const { data } = await apiClient.get<DevListItem>(`/development-list/${id}`);
  return data;
};

export const getDevListStatuses = async (): Promise<DevListStatus[]> => {
  const { data } = await apiClient.get<DevListStatus[]>('/development-list/statuses');
  return data;
};

export const getDevListStats = async (): Promise<DevListStats> => {
  const { data } = await apiClient.get<DevListStats>('/development-list/stats');
  return data;
};
