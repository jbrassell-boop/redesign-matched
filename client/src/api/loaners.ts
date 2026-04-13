import apiClient from './client';
import type {
  LoanerListResponse,
  LoanerDetail,
  LoanerStats,
  LoanerHistoryItem,
  CategoryAvailability,
  CheckOutPayload,
  CheckInPayload,
  LoanerScopeNeedItem,
} from '../pages/loaners/types';

export const getLoaners = (params: {
  search?: string;
  statusFilter?: string;
  salesRepKey?: number;
  page?: number;
  pageSize?: number;
}) =>
  apiClient.get<LoanerListResponse>('/loaners', { params }).then((r) => r.data);

export const getLoanerStats = () =>
  apiClient.get<LoanerStats>('/loaners/stats').then((r) => r.data);

export const getLoanerDetail = (scopeKey: number) =>
  apiClient.get<LoanerDetail>(`/loaners/${scopeKey}`).then((r) => r.data);

export const getLoanerHistory = (scopeKey: number) =>
  apiClient.get<LoanerHistoryItem[]>(`/loaners/${scopeKey}/history`).then((r) => r.data);

export const getCategoryAvailability = () =>
  apiClient.get<CategoryAvailability[]>('/loaners/category-availability').then((r) => r.data);

export const checkOutLoaner = (payload: CheckOutPayload) =>
  apiClient.post('/loaners/check-out', payload);

export const checkInLoaner = (payload: CheckInPayload) =>
  apiClient.post('/loaners/check-in', payload);

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

export const getLoanerScopeNeeds = async (): Promise<LoanerScopeNeedItem[]> => {
  const { data } = await apiClient.get<LoanerScopeNeedItem[]>('/loaners/scope-needs');
  return data;
};
