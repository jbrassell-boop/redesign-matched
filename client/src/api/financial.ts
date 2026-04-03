import apiClient from './client';
import type {
  InvoiceListResponse,
  InvoiceDetail,
  PaymentListResponse,
  HoldListResponse,
  FinancialStats,
  GLAccountItem,
  AtRiskItem,
  TrendingItem,
} from '../pages/financial/types';

export const getInvoices = (params: {
  search?: string;
  statusFilter?: string;
  clientFilter?: string;
  tab?: string;
  page?: number;
  pageSize?: number;
}) =>
  apiClient
    .get<InvoiceListResponse>('/financial/invoices', { params })
    .then((r) => r.data);

export const getInvoiceDetail = (id: number) =>
  apiClient
    .get<InvoiceDetail>(`/financial/invoices/${id}`)
    .then((r) => r.data);

export const getPayments = (params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) =>
  apiClient
    .get<PaymentListResponse>('/financial/payments', { params })
    .then((r) => r.data);

export const getClientsOnHold = (params: {
  page?: number;
  pageSize?: number;
}) =>
  apiClient
    .get<HoldListResponse>('/financial/on-hold', { params })
    .then((r) => r.data);

export const getGLAccounts = () =>
  apiClient.get<GLAccountItem[]>('/financial/gl-accounts').then((r) => r.data);

export const getFinancialStats = () =>
  apiClient.get<FinancialStats>('/financial/stats').then((r) => r.data);

export const getAtRisk = (params?: {
  from?: string;
  to?: string;
  minInvoices?: number;
  includeOutsource?: boolean;
  includeLabor?: boolean;
  includeMaterial?: boolean;
  includeShipping?: boolean;
  includeCommissions?: boolean;
}) =>
  apiClient.get<AtRiskItem[]>('/financial/at-risk', { params }).then((r) => r.data);

export const getTrending = (params?: {
  from?: string;
  to?: string;
  groupBy?: string;
}) =>
  apiClient.get<TrendingItem[]>('/financial/trending', { params }).then((r) => r.data);
