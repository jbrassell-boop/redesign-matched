import apiClient from './client';
import type {
  PendingContractListResponse,
  PendingContractDetail,
  PendingContractScopeItem,
  AvailablePendingContractScope,
  PendingContractDepartmentItem,
  PendingContractAffiliateItem,
  PendingContractAgreementTemplate,
} from '../pages/pending-contracts/types';

const BASE = '/pending-contracts';

// ── Header ──
export const getPendingContracts = async (params: {
  search?: string;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<PendingContractListResponse> => {
  const { data } = await apiClient.get<PendingContractListResponse>(BASE, {
    params: {
      search: params.search || undefined,
      includeInactive: params.includeInactive ? true : undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 200,
    },
  });
  return data;
};

export const getPendingContract = async (key: number): Promise<PendingContractDetail> => {
  const { data } = await apiClient.get<PendingContractDetail>(`${BASE}/${key}`);
  return data;
};

export interface CreatePendingContractPayload {
  clientKey: number;
  contractTypeKey: number;
  name?: string;
}

export const createPendingContract = async (
  payload: CreatePendingContractPayload,
): Promise<{ pendingContractKey: number; name: string }> => {
  const { data } = await apiClient.post<{ pendingContractKey: number; name: string }>(BASE, payload);
  return data;
};

export interface PatchPendingContractPayload {
  status?: string;
  salesRepKey?: number;
  contractTypeKey?: number;
  termMonths?: number;
  agreementTemplateKey?: number;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  fax?: string;
}

export const updatePendingContract = async (key: number, patch: PatchPendingContractPayload): Promise<void> => {
  await apiClient.patch(`${BASE}/${key}`, patch);
};

export const deletePendingContract = async (key: number): Promise<void> => {
  await apiClient.delete(`${BASE}/${key}`);
};

// ── Scopes ──
export const getPendingContractScopes = async (key: number): Promise<PendingContractScopeItem[]> => {
  const { data } = await apiClient.get<PendingContractScopeItem[]>(`${BASE}/${key}/scopes`);
  return data;
};

export const getAvailablePendingContractScopes = async (key: number): Promise<AvailablePendingContractScope[]> => {
  const { data } = await apiClient.get<AvailablePendingContractScope[]>(`${BASE}/${key}/scopes/available`);
  return data;
};

export const addPendingContractScope = async (key: number, scopeKey: number): Promise<{ pendingContractScopeKey: number }> => {
  const { data } = await apiClient.post<{ pendingContractScopeKey: number }>(`${BASE}/${key}/scopes`, { scopeKey });
  return data;
};

export interface AddPendingContractScopeModelPayload {
  scopeTypeKey: number;
  departmentKey: number;
  clientKey: number;
  quantity: number;
  unitCost: number;
}

export const addPendingContractScopeModel = async (
  key: number,
  payload: AddPendingContractScopeModelPayload,
): Promise<{ pendingContractScopeKey: number }> => {
  const { data } = await apiClient.post<{ pendingContractScopeKey: number }>(`${BASE}/${key}/scopes/models`, payload);
  return data;
};

export interface PatchPendingContractScopePayload {
  scopeTypeKey?: number;
  quantity?: number;
  unitCost?: number;
  cost?: number;
  serialNumber?: string;
}

export const updatePendingContractScope = async (
  key: number,
  scopeRowKey: number,
  patch: PatchPendingContractScopePayload,
): Promise<void> => {
  await apiClient.patch(`${BASE}/${key}/scopes/${scopeRowKey}`, patch);
};

export const deletePendingContractScope = async (key: number, scopeRowKey: number): Promise<void> => {
  await apiClient.delete(`${BASE}/${key}/scopes/${scopeRowKey}`);
};

// ── Departments ──
export const getPendingContractDepartments = async (key: number): Promise<PendingContractDepartmentItem[]> => {
  const { data } = await apiClient.get<PendingContractDepartmentItem[]>(`${BASE}/${key}/departments`);
  return data;
};

export const getAvailablePendingContractDepartments = async (key: number): Promise<PendingContractDepartmentItem[]> => {
  const { data } = await apiClient.get<PendingContractDepartmentItem[]>(`${BASE}/${key}/departments/available`);
  return data;
};

export const addPendingContractDepartments = async (key: number, departmentKeys: number[]): Promise<{ added: number }> => {
  const { data } = await apiClient.post<{ added: number }>(`${BASE}/${key}/departments`, { departmentKeys });
  return data;
};

export const removePendingContractDepartment = async (key: number, deptKey: number): Promise<void> => {
  await apiClient.delete(`${BASE}/${key}/departments/${deptKey}`);
};

// ── Affiliates ──
export const getPendingContractAffiliates = async (key: number): Promise<PendingContractAffiliateItem[]> => {
  const { data } = await apiClient.get<PendingContractAffiliateItem[]>(`${BASE}/${key}/affiliates`);
  return data;
};

export const getAvailablePendingContractAffiliates = async (key: number): Promise<PendingContractAffiliateItem[]> => {
  const { data } = await apiClient.get<PendingContractAffiliateItem[]>(`${BASE}/${key}/affiliates/available`);
  return data;
};

export const addPendingContractAffiliate = async (key: number, departmentKey: number): Promise<void> => {
  await apiClient.post(`${BASE}/${key}/affiliates`, { departmentKey });
};

export const removePendingContractAffiliate = async (key: number, deptKey: number): Promise<void> => {
  await apiClient.delete(`${BASE}/${key}/affiliates/${deptKey}`);
};

// ── Agreement templates ──
export const getPendingContractAgreementTemplates = async (): Promise<PendingContractAgreementTemplate[]> => {
  const { data } = await apiClient.get<PendingContractAgreementTemplate[]>(`${BASE}/agreement-templates`);
  return data;
};

// ── Convert ──
export interface ConvertPendingContractPayload {
  contractName: string;
  contractNumber: string;     // PO# (≤ 20 chars)
  effectiveDate: string;      // ISO date
  terminationDate: string;    // ISO date
  contractLength: number;     // months
  installmentTypeId: number;  // invoice frequency
}

export interface ConvertResult {
  contractKey?: number;
  message?: string;
  preflightPassed?: boolean;
  scopeCount?: number;
}

// On success this returns a new contractKey. In the current cloud environment
// the conversion engine (dbo.pendingContractConvert) is not provisioned, so a
// passing pre-flight returns HTTP 501 — the caller surfaces the message.
export const convertPendingContract = async (
  key: number,
  payload: ConvertPendingContractPayload,
): Promise<ConvertResult> => {
  const { data } = await apiClient.post<ConvertResult>(`${BASE}/${key}/convert`, payload);
  return data;
};
