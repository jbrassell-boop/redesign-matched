import apiClient from './client';
import type { ClientListResponse, ClientDetail, ClientContact, ClientDepartment, ClientFlag, ClientFull, ClientKpis, ClientRepairItem } from '../pages/clients/types';
import type { ClientSummary } from '../pages/repairs/types';

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

export const getClientFull = async (clientKey: number): Promise<ClientFull> => {
  const { data } = await apiClient.get<ClientFull>(`/clients/${clientKey}/full`);
  return data;
};

export const getClientKpis = async (clientKey: number): Promise<ClientKpis> => {
  const { data } = await apiClient.get<ClientKpis>(`/clients/${clientKey}/kpis`);
  return data;
};

export const updateClient = async (clientKey: number, update: Partial<ClientFull>): Promise<void> => {
  await apiClient.put(`/clients/${clientKey}`, update);
};

export const createClient = async (data: Partial<ClientFull>): Promise<{ clientKey: number }> => {
  const { data: result } = await apiClient.post('/clients', data);
  return result;
};

export const deactivateClient = async (clientKey: number): Promise<void> => {
  await apiClient.put(`/clients/${clientKey}/deactivate`);
};

export const deleteClient = async (clientKey: number): Promise<void> => {
  await apiClient.delete(`/clients/${clientKey}`);
};

export const addClientContact = async (clientKey: number, contact: { firstName: string; lastName: string; phone?: string; fax?: string; email?: string }): Promise<{ contactKey: number }> => {
  const { data } = await apiClient.post(`/clients/${clientKey}/contacts`, contact);
  return data;
};

export const updateClientContact = async (clientKey: number, contactKey: number, contact: { firstName: string; lastName: string; phone?: string; fax?: string; email?: string }): Promise<void> => {
  await apiClient.put(`/clients/${clientKey}/contacts/${contactKey}`, contact);
};

export const setClientPrimaryContact = async (clientKey: number, contactKey: number): Promise<void> => {
  await apiClient.put(`/clients/${clientKey}/contacts/${contactKey}/primary`);
};

export const deleteClientContact = async (clientKey: number, contactKey: number): Promise<void> => {
  await apiClient.delete(`/clients/${clientKey}/contacts/${contactKey}`);
};

export const addClientFlag = async (clientKey: number, flag: { flagTypeKey: number; flag: string; visibleOnDI: boolean; visibleOnBlank: boolean }): Promise<{ flagKey: number }> => {
  const { data } = await apiClient.post(`/clients/${clientKey}/flags`, flag);
  return data;
};

export const updateClientFlag = async (clientKey: number, flagKey: number, flag: { flagTypeKey: number; flag: string; visibleOnDI: boolean; visibleOnBlank: boolean }): Promise<void> => {
  await apiClient.put(`/clients/${clientKey}/flags/${flagKey}`, flag);
};

export const deleteClientFlag = async (clientKey: number, flagKey: number): Promise<void> => {
  await apiClient.delete(`/clients/${clientKey}/flags/${flagKey}`);
};

export const getClientRepairs = async (clientKey: number, params?: { page?: number; pageSize?: number }): Promise<{ items: ClientRepairItem[]; totalCount: number; page: number; pageSize: number }> => {
  const { data } = await apiClient.get(`/clients/${clientKey}/repairs`, { params });
  return data;
};

export const getClientSummary = async (clientKey: number): Promise<ClientSummary> => {
  const { data } = await apiClient.get<ClientSummary>(`/clients/${clientKey}/summary`);
  return data;
};
