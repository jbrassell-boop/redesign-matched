import apiClient from './client';
import type { AcquisitionListResponse, AcquisitionSoldResponse, AcquisitionStats, AcquisitionsFilters, AcquisitionDetail } from '../pages/acquisitions/types';

export const getAcquisitions = async (filters: AcquisitionsFilters): Promise<AcquisitionListResponse> => {
  const { data } = await apiClient.get<AcquisitionListResponse>('/acquisitions', {
    params: {
      search: filters.search || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
      tab: filters.tab,
    },
  });
  return data;
};

export const getAcquisitionsSold = async (filters: AcquisitionsFilters): Promise<AcquisitionSoldResponse> => {
  const { data } = await apiClient.get<AcquisitionSoldResponse>('/acquisitions', {
    params: {
      search: filters.search || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
      tab: 'sold',
    },
  });
  return data;
};

export const getAcquisitionStats = async (): Promise<AcquisitionStats> => {
  const { data } = await apiClient.get<AcquisitionStats>('/acquisitions/stats');
  return data;
};

export const getAcquisitionDetail = async (scopeKey: number): Promise<AcquisitionDetail> => {
  const { data } = await apiClient.get<AcquisitionDetail>(`/acquisitions/${scopeKey}`);
  return data;
};

// ── Acquisition PO create ─────────────────────────────────────────
// Matches CreateAcquisitionPurchaseOrderRequest/Response on the backend.
// Draft-only: server forces bGenerated=0, bCancelled=0, bHoldGPIntegration=0.
// The acquisition header has NO location column — serviceLocationKey is used
// only to derive the PO# prefix (e.g. NPA2606001) and isn't persisted on the row.

export interface CreateAcquisitionPoLine {
  scopeTypeKey: number;
  serialNumber?: string | null;
  scopeCost: number;
}

export interface CreateAcquisitionPoRequest {
  serviceLocationKey: number;
  supplierKey: number;
  dateOfPO?: string | null;
  paymentMethodKey?: number | null;
  lines: CreateAcquisitionPoLine[];
}

export interface CreateAcquisitionPoResponse {
  acquisitionSupplierPOKey: number;
  supplierPONumber: string;
  poTotal: number;
}

export const createAcquisitionPurchaseOrder = async (
  body: CreateAcquisitionPoRequest,
): Promise<CreateAcquisitionPoResponse> => {
  const { data } = await apiClient.post<CreateAcquisitionPoResponse>(
    '/acquisitions/purchase-orders',
    body,
  );
  return data;
};
