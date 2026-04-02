import apiClient from './client';
import type { ContractListResponse, ContractDetail, ContractStats } from '../pages/contracts/types';

export const getContracts = async (params: {
  search?: string;
  page?: number;
  pageSize?: number;
  statusFilter?: string;
}): Promise<ContractListResponse> => {
  const { data } = await apiClient.get<ContractListResponse>('/contracts', {
    params: {
      search: params.search || undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 200,
      statusFilter: params.statusFilter && params.statusFilter !== 'all' ? params.statusFilter : undefined,
    },
  });
  return data;
};

export const getContract = async (contractKey: number): Promise<ContractDetail> => {
  const { data } = await apiClient.get<ContractDetail>(`/contracts/${contractKey}`);
  return data;
};

export const getContractStats = async (): Promise<ContractStats> => {
  const { data } = await apiClient.get<ContractStats>('/contracts/stats');
  return data;
};

export const getContractScopes = async (contractKey: number) => {
  const { data } = await apiClient.get(`/contracts/${contractKey}/scopes`);
  return data;
};

export const getContractRepairs = async (contractKey: number) => {
  const { data } = await apiClient.get(`/contracts/${contractKey}/repairs`);
  return data;
};

export const getContractInvoices = async (contractKey: number) => {
  const { data } = await apiClient.get(`/contracts/${contractKey}/invoices`);
  return data;
};

export const getContractNotes = async (contractKey: number) => {
  const { data } = await apiClient.get(`/contracts/${contractKey}/notes`);
  return data;
};

export const getContractDocuments = async (contractKey: number) => {
  const { data } = await apiClient.get(`/contracts/${contractKey}/documents`);
  return data;
};

export const getContractHealth = async (contractKey: number) => {
  const { data } = await apiClient.get(`/contracts/${contractKey}/health`);
  return data;
};
