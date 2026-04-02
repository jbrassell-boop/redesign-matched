import apiClient from './client';
import type {
  ProductSaleListResponse,
  ProductSaleDetail,
  ProductSaleStats,
} from '../pages/product-sale/types';

export const getProductSales = (params: {
  search?: string;
  statusFilter?: string;
  page?: number;
  pageSize?: number;
}) =>
  apiClient
    .get<ProductSaleListResponse>('/product-sales', { params })
    .then((r) => r.data);

export const getProductSaleDetail = (id: number) =>
  apiClient
    .get<ProductSaleDetail>(`/product-sales/${id}`)
    .then((r) => r.data);

export const getProductSaleStats = () =>
  apiClient.get<ProductSaleStats>('/product-sales/stats').then((r) => r.data);
