import apiClient from './client';
import type {
  InvoiceListResponse,
  InvoiceDetail,
  PaymentListResponse,
  HoldListResponse,
  FinancialStats,
  GLAccountItem,
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
