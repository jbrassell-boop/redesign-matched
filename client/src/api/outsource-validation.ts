import apiClient from './client';
import type { OutsourceListResponse, OutsourceStats, OutsourceFilters } from '../pages/outsource-validation/types';

export const getOutsourceValidation = async (filters: OutsourceFilters): Promise<OutsourceListResponse> => {
  const { data } = await apiClient.get<OutsourceListResponse>('/outsource-validation', {
    params: {
      search: filters.search || undefined,
      statusFilter: filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  });
  return data;
};

export const getOutsourceStats = async (): Promise<OutsourceStats> => {
  const { data } = await apiClient.get<OutsourceStats>('/outsource-validation/stats');
  return data;
};

export const getOutsourceVendors = async () => {
  const { data } = await apiClient.get<{ vendorKey: number; name: string }[]>('/outsource-validation/vendors');
  return data;
};

export const sendToVendor = async (repairKey: number, vendorKey: number, outsourceCost: number, trackingNumber?: string, notes?: string) => {
  const { data } = await apiClient.put(`/outsource-validation/${repairKey}/send-to-vendor`, { vendorKey, outsourceCost, trackingNumber, notes });
  return data;
};

export const receiveBack = async (repairKey: number, trackingNumberReturn?: string, notes?: string) => {
  const { data } = await apiClient.put(`/outsource-validation/${repairKey}/receive-back`, { trackingNumberReturn, notes });
  return data;
};

export const validateOutsource = async (repairKey: number, status: string, notes?: string) => {
  const { data } = await apiClient.put(`/outsource-validation/${repairKey}/validate`, { status, notes });
  return data;
};
