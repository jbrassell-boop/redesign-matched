import apiClient from './client';
import type { LoanerDetail, LoanerListResponse, LoanerStats, LoanersFilters } from '../pages/loaners/types';

export const getLoaners = async (filters: LoanersFilters): Promise<LoanerListResponse> => {
  const { data } = await apiClient.get<LoanerListResponse>('/loaners', {
    params: {
      search: filters.search || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
      statusFilter: filters.statusFilter !== 'All' ? filters.statusFilter : undefined,
    },
  });
  return data;
};

export const getLoanerDetail = async (id: number): Promise<LoanerDetail> => {
  const { data } = await apiClient.get<LoanerDetail>(`/loaners/${id}`);
  return data;
};

export const getLoanerStats = async (): Promise<LoanerStats> => {
  const { data } = await apiClient.get<LoanerStats>('/loaners/stats');
  return data;
};

export const getLoanerRequests = async (params?: { search?: string; statusFilter?: string }) => {
  const { data } = await apiClient.get('/loaners/requests', { params });
  return data;
};

export const fulfillLoanerRequest = async (repairKey: number): Promise<void> => {
  await apiClient.patch(`/loaners/requests/${repairKey}/fulfill`);
};

export const declineLoanerRequest = async (repairKey: number): Promise<void> => {
  await apiClient.patch(`/loaners/requests/${repairKey}/decline`);
};

export const bulkUpdateLoanerRequests = async (repairKeys: number[], action: 'fulfill' | 'decline'): Promise<{ updated: number }> => {
  const { data } = await apiClient.post('/loaners/requests/bulk', { repairKeys, action });
  return data;
};
