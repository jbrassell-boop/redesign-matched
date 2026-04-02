import apiClient from './client';
import type { AcquisitionListResponse, AcquisitionSoldResponse, AcquisitionStats, AcquisitionsFilters } from '../pages/acquisitions/types';

export const getAcquisitions = async (filters: AcquisitionsFilters): Promise<AcquisitionListResponse> => {
  const { data } = await apiClient.get<AcquisitionListResponse>('/acquisitions', {
    params: {
      search: filters.search || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
      tab: filters.tab,
    },
  });
  return data;
};

export const getAcquisitionsSold = async (filters: AcquisitionsFilters): Promise<AcquisitionSoldResponse> => {
  const { data } = await apiClient.get<AcquisitionSoldResponse>('/acquisitions', {
    params: {
      search: filters.search || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
      tab: 'sold',
    },
  });
  return data;
};

export const getAcquisitionStats = async (): Promise<AcquisitionStats> => {
  const { data } = await apiClient.get<AcquisitionStats>('/acquisitions/stats');
  return data;
};
