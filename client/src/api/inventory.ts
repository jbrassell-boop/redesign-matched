import apiClient from './client';
import type { InventoryListResponse, InventoryDetail, InventoryStats, InventoryPurchaseOrder, InventorySupplierItem, InventoryReceivingItem, ReceiveInventoryRequest, PoReceiptLine, ReceivePoLineRequest, ReceivePoLineResponse } from '../pages/inventory/types';

export const getInventoryList = async (params: {
  search?: string;
  activeFilter?: string;
  page?: number;
  pageSize?: number;
}): Promise<InventoryListResponse> => {
  const { data } = await apiClient.get<InventoryListResponse>('/inventory', {
    params: {
      search: params.search || undefined,
      activeFilter: params.activeFilter || undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 200,
    },
  });
  return data;
};

export const getInventoryDetail = async (inventoryKey: number): Promise<InventoryDetail> => {
  // Location is sent automatically by the axios interceptor in api/client.ts
  // as the X-Service-Location header — no need to pass it explicitly.
  const { data } = await apiClient.get<InventoryDetail>(`/inventory/${inventoryKey}`);
  return data;
};

export const getInventoryStats = async (): Promise<InventoryStats> => {
  const { data } = await apiClient.get<InventoryStats>('/inventory/stats');
  return data;
};

export const getInventoryPurchaseOrders = async (inventoryKey: number): Promise<InventoryPurchaseOrder[]> => {
  const { data } = await apiClient.get<InventoryPurchaseOrder[]>(`/inventory/${inventoryKey}/purchase-orders`);
  return data;
};

export const getInventorySuppliers = async (inventoryKey: number): Promise<InventorySupplierItem[]> => {
  const { data } = await apiClient.get<InventorySupplierItem[]>(`/inventory/${inventoryKey}/suppliers`);
  return data;
};

export const getInventoryPendingReceipt = async (): Promise<InventoryReceivingItem[]> => {
  const { data } = await apiClient.get<InventoryReceivingItem[]>('/inventory/pending-receipt');
  return data;
};

export const receiveInventory = async (req: ReceiveInventoryRequest): Promise<void> => {
  await apiClient.post('/inventory/receive', req);
};

// Open PO lines awaiting receipt at the active service location.
export const getOpenPoReceipts = async (): Promise<PoReceiptLine[]> => {
  const { data } = await apiClient.get<PoReceiptLine[]>('/inventory/po-receipts');
  return data;
};

// Receive stock against one PO line (allocates a lot number server-side).
export const receivePoLine = async (req: ReceivePoLineRequest): Promise<ReceivePoLineResponse> => {
  const { data } = await apiClient.post<ReceivePoLineResponse>('/inventory/po-receipts/receive', req);
  return data;
};
