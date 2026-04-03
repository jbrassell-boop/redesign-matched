import apiClient from './client';
import type { OnsiteServiceListResponse, OnsiteServiceStats, OnsiteServiceFilters, CreateOnsiteVisitRequest, OnsiteServiceDetail, OnsiteServiceTray } from '../pages/onsite-services/types';

export const getOnsiteServices = async (filters: OnsiteServiceFilters): Promise<OnsiteServiceListResponse> => {
  const { data } = await apiClient.get<OnsiteServiceListResponse>('/onsite-services', {
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

export const getOnsiteServiceStats = async (): Promise<OnsiteServiceStats> => {
  const { data } = await apiClient.get<OnsiteServiceStats>('/onsite-services/stats');
  return data;
};

export const createOnsiteVisit = async (req: CreateOnsiteVisitRequest) => {
  const { data } = await apiClient.post('/onsite-services', req);
  return data;
};

export const updateOnsiteStatus = async (id: number, status: string, notes?: string) => {
  const { data } = await apiClient.put(`/onsite-services/${id}/status`, { status, notes });
  return data;
};

export const getOnsiteServiceDetail = async (id: number): Promise<OnsiteServiceDetail> => {
  const { data } = await apiClient.get<OnsiteServiceDetail>(`/onsite-services/${id}/detail`);
  return data;
};

export const getOnsiteServiceTrays = async (id: number): Promise<OnsiteServiceTray[]> => {
  const { data } = await apiClient.get<OnsiteServiceTray[]>(`/onsite-services/${id}/trays`);
  return data;
};

export const submitOnsiteForInvoicing = async (id: number): Promise<void> => {
  await apiClient.patch(`/onsite-services/${id}/submit`);
};
