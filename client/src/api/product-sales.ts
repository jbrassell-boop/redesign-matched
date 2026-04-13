import apiClient from './client';
import type {
  ProductSaleListResponse,
  ProductSaleDetail,
  ProductSaleStats,
  InventoryCategory,
  InventorySize,
} from '../pages/product-sale/types';

/* ── List / Stats ────────────────────────────────────────────────────────── */

export const getProductSales = (params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) =>
  apiClient
    .get<ProductSaleListResponse>('/product-sales', { params })
    .then((r) => r.data);

export const getProductSaleDetail = (key: number) =>
  apiClient
    .get<ProductSaleDetail>(`/product-sales/${key}`)
    .then((r) => r.data);

export const getProductSaleStats = () =>
  apiClient.get<ProductSaleStats>('/product-sales/stats').then((r) => r.data);

/* ── Create / Update ─────────────────────────────────────────────────────── */

export const createProductSale = (body: {
  clientKey: number;
  departmentKey: number;
  salesRepKey?: number | null;
  purchaseOrder?: string | null;
  note?: string | null;
}) =>
  apiClient
    .post<{ productSaleKey: number }>('/product-sales', body)
    .then((r) => r.data);

export const updateProductSale = (
  key: number,
  body: Record<string, unknown>,
) =>
  apiClient
    .patch<{ updated: boolean }>(`/product-sales/${key}`, body)
    .then((r) => r.data);

/* ── Line Items ──────────────────────────────────────────────────────────── */

export const addLineItem = (
  key: number,
  body: { inventorySizeKey: number; quantity: number },
) =>
  apiClient
    .post<{ productSaleInventoryKey: number; unitCost: number; totalCost: number }>(
      `/product-sales/${key}/items`,
      body,
    )
    .then((r) => r.data);

export const removeLineItem = (key: number, itemKey: number) =>
  apiClient
    .delete<{ deleted: boolean }>(`/product-sales/${key}/items/${itemKey}`)
    .then((r) => r.data);

export const updateLineItem = (
  key: number,
  itemKey: number,
  body: { quantity?: number; lotNumber?: string },
) =>
  apiClient
    .patch<{ updated: boolean }>(`/product-sales/${key}/items/${itemKey}`, body)
    .then((r) => r.data);

/* ── Lifecycle ───────────────────────────────────────────────────────────── */

export const generateQuote = (key: number) =>
  apiClient
    .post<{ quoted: boolean }>(`/product-sales/${key}/quote`)
    .then((r) => r.data);

export const approveOrder = (key: number) =>
  apiClient
    .post<{ approved: boolean }>(`/product-sales/${key}/approve`)
    .then((r) => r.data);

export const invoiceOrder = (key: number) =>
  apiClient
    .post<{ invoiced: boolean }>(`/product-sales/${key}/invoice`)
    .then((r) => r.data);

export const voidOrder = (key: number) =>
  apiClient
    .post<{ voided: boolean }>(`/product-sales/${key}/void`)
    .then((r) => r.data);

/* ── Inventory Picker ────────────────────────────────────────────────────── */

export const getInventoryCategories = (search?: string) =>
  apiClient
    .get<InventoryCategory[]>('/inventory/categories', {
      params: search ? { search } : undefined,
    })
    .then((r) => r.data);

export const getInventorySizes = (
  inventoryKey: number,
  pricingListKey?: number | null,
) =>
  apiClient
    .get<InventorySize[]>(`/inventory/${inventoryKey}/sizes`, {
      params: pricingListKey ? { pricingListKey } : undefined,
    })
    .then((r) => r.data);
