import apiClient from './client';
import type { RepairDetail, RepairListResponse, RepairsFilters } from '../pages/repairs/types';

export const getRepairs = async (filters: RepairsFilters): Promise<RepairListResponse> => {
  const { data } = await apiClient.get<RepairListResponse>('/repairs', {
    params: {
      search: filters.search || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
      statusFilter: filters.statusFilter !== 'all' ? filters.statusFilter : undefined,
    },
  });
  return data;
};

export const getRepairDetail = async (repairKey: number): Promise<RepairDetail> => {
  const { data } = await apiClient.get<RepairDetail>(`/repairs/${repairKey}`);
  return data;
};

import type {
  RepairLineItem, RepairScopeHistory, RepairFinancials, RepairFull, RepairInspections, LineItemUpdate,
  RepairCatalogItem, Amendment, AmendType, AmendReason, CreateAmendmentRequest,
} from '../pages/repairs/types';

export const getRepairLineItems = async (repairKey: number): Promise<RepairLineItem[]> => {
  const { data } = await apiClient.get<RepairLineItem[]>(`/repairs/${repairKey}/lineitems`);
  return data;
};

export const getRepairScopeHistory = async (repairKey: number): Promise<RepairScopeHistory[]> => {
  const { data } = await apiClient.get<RepairScopeHistory[]>(`/repairs/${repairKey}/scopehistory`);
  return data;
};

export const getRepairFinancials = async (repairKey: number): Promise<RepairFinancials> => {
  const { data } = await apiClient.get<RepairFinancials>(`/repairs/${repairKey}/financials`);
  return data;
};

export const updateRepairNotes = async (repairKey: number, notes: string): Promise<void> => {
  await apiClient.patch(`/repairs/${repairKey}/notes`, { notes });
};

// ── Status Workflow ──

export interface RepairStatusOption {
  statusId: number;
  statusName: string;
  sortOrder: number | null;
}

export interface RepairStatusLogEntry {
  logId: number;
  statusName: string;
  changedAt: string;
  changedBy: string | null;
}

export const getRepairStatuses = async (): Promise<RepairStatusOption[]> => {
  const { data } = await apiClient.get<RepairStatusOption[]>('/repairs/statuses');
  return data;
};

export const updateRepairStatus = async (repairKey: number, statusId: number): Promise<void> => {
  await apiClient.put(`/repairs/${repairKey}/status`, { statusId });
};

export const getRepairStatusHistory = async (repairKey: number): Promise<RepairStatusLogEntry[]> => {
  const { data } = await apiClient.get<RepairStatusLogEntry[]>(`/repairs/${repairKey}/status-history`);
  return data;
};

// ── Cockpit Endpoints ──

export const getRepairFull = async (repairKey: number): Promise<RepairFull> => {
  const { data } = await apiClient.get<RepairFull>(`/repairs/${repairKey}/full`);
  return data;
};

export const getRepairInspections = async (repairKey: number): Promise<RepairInspections> => {
  const { data } = await apiClient.get<RepairInspections>(`/repairs/${repairKey}/inspections`);
  return data;
};

export const updateRepairInspections = async (repairKey: number, inspections: RepairInspections): Promise<void> => {
  await apiClient.put(`/repairs/${repairKey}/inspections`, inspections);
};

export const updateRepairPO = async (repairKey: number, po: string): Promise<void> => {
  await apiClient.put(`/repairs/${repairKey}/po`, JSON.stringify(po), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const addRepairLineItem = async (repairKey: number, item: LineItemUpdate): Promise<{ tranKey: number }> => {
  const { data } = await apiClient.post(`/repairs/${repairKey}/lineitems`, item);
  return data;
};

export const updateRepairLineItem = async (repairKey: number, tranKey: number, item: LineItemUpdate): Promise<void> => {
  await apiClient.put(`/repairs/${repairKey}/lineitems/${tranKey}`, item);
};

export const deleteRepairLineItem = async (repairKey: number, tranKey: number): Promise<void> => {
  await apiClient.delete(`/repairs/${repairKey}/lineitems/${tranKey}`);
};

export interface RepairHeaderPatch {
  purchaseOrder?: string;
  rackLocation?: string;
  complaint?: string;
  repairReason?: string;
  isUrgent?: boolean;
  inboundTracking?: string;
  displayCustomerComplaint?: boolean;
  displayItemizedDesc?: string;
  displayItemizedAmounts?: string;
  billToCustomer?: string;
  salesRepKey?: number;
  pricingCategoryKey?: number;
  paymentTermsKey?: number;
  discountPct?: number;
  psLevel?: string;
  distributorKey?: number;
  shippingCostIn?: number;
  requisition?: string;
  shipName?: string;
  shipAddr1?: string;
  shipAddr2?: string;
  shipCity?: string;
  shipState?: string;
  shipZip?: string;
  billName?: string;
  billAddr1?: string;
  billAddr2?: string;
  billCity?: string;
  billState?: string;
  billZip?: string;
}

export const patchRepairHeader = async (repairKey: number, patch: RepairHeaderPatch): Promise<void> => {
  await apiClient.patch(`/repairs/${repairKey}/header`, patch);
};

// ── Fast Entry ──
export const getRepairItemCatalog = async (repairKey: number): Promise<RepairCatalogItem[]> => {
  const { data } = await apiClient.get<RepairCatalogItem[]>('/repairs/items', {
    params: { repairKey },
  });
  return data;
};

export const patchLineItemCauseComments = async (
  repairKey: number,
  tranKey: number,
  cause: string | null,
  comments: string | null,
): Promise<void> => {
  await apiClient.patch(`/repairs/${repairKey}/lineitems/${tranKey}/causecomments`, {
    cause,
    comments,
  });
};

// ── Amendments ──
export const getAmendments = async (repairKey: number): Promise<Amendment[]> => {
  const { data } = await apiClient.get<Amendment[]>(`/repairs/${repairKey}/amendments`);
  return data;
};

export const createAmendment = async (
  repairKey: number,
  body: CreateAmendmentRequest,
): Promise<{ amendmentNumber: number }> => {
  const { data } = await apiClient.post(`/repairs/${repairKey}/amendments`, body);
  return data;
};

export const getAmendTypes = async (): Promise<AmendType[]> => {
  const { data } = await apiClient.get<AmendType[]>('/amend-types');
  return data;
};

export const getAmendReasons = async (typeKey: number): Promise<AmendReason[]> => {
  const { data } = await apiClient.get<AmendReason[]>('/amend-reasons', {
    params: { typeKey },
  });
  return data;
};

// ── Repair Notes ──
export interface RepairNote {
  noteKey: number;
  note: string;
  date: string;
  user: string;
}

export const getRepairNotes = async (repairKey: number): Promise<RepairNote[]> => {
  const { data } = await apiClient.get<RepairNote[]>(`/repairs/${repairKey}/repair-notes`);
  return data;
};

export const addRepairNote = async (repairKey: number, note: string): Promise<void> => {
  await apiClient.post(`/repairs/${repairKey}/repair-notes`, { note });
};

// ── Update Slips ──
export const getUpdateSlips = async (repairKey: number) => {
  const { data } = await apiClient.get(`/repairs/${repairKey}/update-slips`);
  return data as { slipKey: number; date: string; primaryTech: string; secondaryTech: string; reason: string }[];
};

// ── Defect Tracking ──
export const getDefectTracking = async (repairKey: number) => {
  const { data } = await apiClient.get(`/repairs/${repairKey}/defect-tracking`);
  return data as { itemKey: number; item: string; comment: string }[];
};

// ── Repair Inventory Usage ──
export const getRepairInventoryUsage = async (repairKey: number) => {
  const { data } = await apiClient.get(`/repairs/${repairKey}/inventory-usage`);
  return data as { key: number; inventoryItem: string; size: string; repairItem: string }[];
};

// ── Draft Invoice ──
export const createDraftInvoice = async (repairKey: number) => {
  const { data } = await apiClient.post(`/repairs/${repairKey}/draft-invoice`);
  return data as { invoiceKey: number };
};

// ── Create Repair ──
export interface CreateRepairPayload {
  scopeKey?: number | null;
  serialNumber?: string | null;
  scopeTypeKey?: number | null;
  deptKey: number;
  dateIn: string;
  statusId?: number | null;
  purchaseOrder?: string | null;
  complaint?: string | null;
  reasonKey?: number | null;
  carrierKey?: number | null;
  inboundTracking?: string | null;
  pickupRequired?: string | null;
  salesRepKey?: number | null;
  pricingCategoryKey?: number | null;
  paymentTermsKey?: number | null;
  billTo?: string | null;
  distributorKey?: number | null;
  billEmail?: string | null;
  billType?: number | null;
  displayCustomerComplaint?: string | null;
  displayItemDesc?: string | null;
  displayItemAmt?: string | null;
  rackPosition?: string | null;
}

export const createRepair = async (payload: CreateRepairPayload): Promise<{ repairKey: number }> => {
  const { data } = await apiClient.post('/repairs', payload);
  return data;
};

// ── Update Slip Creation ──
export const getUpdateSlipReasons = async () => {
  const { data } = await apiClient.get('/repairs/update-slip-reasons');
  return data as { key: number; name: string }[];
};

export const createUpdateSlip = async (repairKey: number, body: { techKey?: number | null; tech2Key?: number | null; reasonKey?: number | null }) => {
  const { data } = await apiClient.post(`/repairs/${repairKey}/update-slips`, body);
  return data as { slipKey: number };
};

// ── Technicians Lookup ──
export interface TechnicianOption {
  techKey: number;
  techName: string;
}

export const getRepairTechnicians = async (): Promise<TechnicianOption[]> => {
  const { data } = await apiClient.get<TechnicianOption[]>('/repairs/technicians');
  return data;
};

// ── Bulk Line Item Approval ──
export const bulkApproveLineItems = async (repairKey: number, approved: string): Promise<void> => {
  await apiClient.patch(`/repairs/${repairKey}/lineitems/bulk-approve`, { approved });
};

// ── Update Techs ──
export const updateRepairTechs = async (
  repairKey: number,
  techKey: number,
  tech2Key: number | null,
): Promise<void> => {
  await apiClient.patch(`/repairs/${repairKey}/techs`, { techKey, tech2Key });
};
