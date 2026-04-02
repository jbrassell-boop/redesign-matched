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
