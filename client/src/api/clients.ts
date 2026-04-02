import apiClient from './client';
import type { ClientListResponse, ClientDetail, ClientContact, ClientDepartment, ClientFlag } from '../pages/clients/types';

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

export const getClientContacts = async (clientKey: number): Promise<ClientContact[]> => {
  const { data } = await apiClient.get<ClientContact[]>(`/clients/${clientKey}/contacts`);
  return data;
};

export const getClientDepartments = async (clientKey: number): Promise<ClientDepartment[]> => {
  const { data } = await apiClient.get<ClientDepartment[]>(`/clients/${clientKey}/departments`);
  return data;
};

export const getClientFlags = async (clientKey: number): Promise<ClientFlag[]> => {
  const { data } = await apiClient.get<ClientFlag[]>(`/clients/${clientKey}/flags`);
  return data;
};
