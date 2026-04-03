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

import type { RepairLineItem, RepairScopeHistory, RepairFinancials, RepairFull, RepairInspections, LineItemUpdate } from '../pages/repairs/types';

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
  inboundTracking?: string;
  displayCustomerComplaint?: boolean;
  displayItemizedDesc?: string;
  displayItemizedAmounts?: string;
  billToCustomer?: string;
}

export const patchRepairHeader = async (repairKey: number, patch: RepairHeaderPatch): Promise<void> => {
  await apiClient.patch(`/repairs/${repairKey}/header`, patch);
};
