import apiClient from './client';
import type { ClientListResponse, ClientDetail } from '../pages/clients/types';

export const getClients = async (params: {
  search?: string;
  page?: number;
  pageSize?: number;
  statusFilter?: string;
}): Promise<ClientListResponse> => {
  const { data } = await apiClient.get<ClientListResponse>('/clients', {
    params: {
      search: params.search || undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 100,
      statusFilter: params.statusFilter && params.statusFilter !== 'all' ? params.statusFilter : undefined,
    },
  });
  return data;
};

export const getClientDetail = async (clientKey: number): Promise<ClientDetail> => {
  const { data } = await apiClient.get<ClientDetail>(`/clients/${clientKey}`);
  return data;
};
