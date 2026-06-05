import apiClient from './client';
import type { SupplierListResponse, SupplierDetail, SupplierStats, SupplierInventoryItem, SupplierDocument } from '../pages/suppliers/types';

export const getSuppliers = async (params: { search?: string; page?: number; pageSize?: number }): Promise<SupplierListResponse> => {
  const { data } = await apiClient.get<SupplierListResponse>('/suppliers', { params });
  return data;
};

export const getSupplierDetail = async (id: number): Promise<SupplierDetail> => {
  const { data } = await apiClient.get<SupplierDetail>(`/suppliers/${id}`);
  return data;
};

export const getSupplierStats = async (): Promise<SupplierStats> => {
  const { data } = await apiClient.get<SupplierStats>('/suppliers/stats');
  return data;
};

export const getSupplierInventory = async (id: number): Promise<SupplierInventoryItem[]> => {
  const { data } = await apiClient.get<SupplierInventoryItem[]>(`/suppliers/${id}/inventory`);
  return data;
};

export const getSupplierDocuments = async (id: number): Promise<SupplierDocument[]> => {
  const { data } = await apiClient.get<SupplierDocument[]>(`/suppliers/${id}/documents`);
  return data;
};

export interface PatchSupplierPayload {
  name?: string;
  shipAddr1?: string;
  shipAddr2?: string;
  shipCity?: string;
  shipState?: string;
  shipZip?: string;
  phone?: string;
  fax?: string;
  email?: string;
  contactFirst?: string;
  contactLast?: string;
  comments?: string;
}

export const updateSupplier = async (id: number, patch: PatchSupplierPayload): Promise<void> => {
  await apiClient.patch(`/suppliers/${id}`, patch);
};

// ── Inventory PO create ───────────────────────────────────────────
// Matches CreateInventoryPurchaseOrderRequest/Response on the backend.
// Draft-only: server forces bGenerated=0 / bCancelled=0; create never feeds GP.

export interface CreateInventoryPoLine {
  supplierSizesKey: number;
  orderQuantity: number;
  unitCost: number;
}

export interface CreateInventoryPoRequest {
  serviceLocationKey: number;
  supplierPOTypeKey: number;
  dateOfPO?: string | null;
  lines: CreateInventoryPoLine[];
}

export interface CreateInventoryPoResponse {
  supplierPOKey: number;
  supplierPONumber: string;
  poTotal: number;
}

export const createInventoryPurchaseOrder = async (
  supplierKey: number,
  body: CreateInventoryPoRequest,
): Promise<CreateInventoryPoResponse> => {
  const { data } = await apiClient.post<CreateInventoryPoResponse>(
    `/suppliers/${supplierKey}/purchase-orders`,
    body,
  );
  return data;
};

export interface CreateSupplierPayload {
  name: string;
  roleKeys: number[];
  name2?: string | null;
  shipAddr1?: string | null;
  shipAddr2?: string | null;
  shipCity?: string | null;
  shipState?: string | null;
  shipZip?: string | null;
  shipCountry?: string | null;
  mailAddr1?: string | null;
  mailAddr2?: string | null;
  mailCity?: string | null;
  mailState?: string | null;
  mailZip?: string | null;
  mailCountry?: string | null;
  billAddr1?: string | null;
  billAddr2?: string | null;
  billCity?: string | null;
  billState?: string | null;
  billZip?: string | null;
  billCountry?: string | null;
  phone?: string | null;
  fax?: string | null;
  contactFirst?: string | null;
  contactLast?: string | null;
  isAcquisitionSupplier?: boolean;
}

export const createSupplier = async (payload: CreateSupplierPayload): Promise<{ supplierKey: number }> => {
  const { data } = await apiClient.post<{ supplierKey: number }>('/suppliers', payload);
  return data;
};
