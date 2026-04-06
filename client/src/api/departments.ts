import apiClient from './client';
import type {
  DepartmentListResponse, DepartmentDetail, DepartmentSubGroup, DepartmentScope,
  DepartmentFull, DeptKpis, DeptContact, ScopeDetail, DepartmentRepairItem, DeptContract
} from '../pages/departments/types';
import type { ClientFlag } from '../pages/clients/types';
import type { PrimaryContact } from '../pages/repairs/types';

export const getDepartments = async (params: {
  search?: string;
  page?: number;
  pageSize?: number;
  clientKey?: number;
}): Promise<DepartmentListResponse> => {
  const { data } = await apiClient.get<DepartmentListResponse>('/departments', {
    params: {
      search: params.search || undefined,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 200,
      clientKey: params.clientKey,
    },
  });
  return data;
};

export const getDepartmentDetail = async (deptKey: number): Promise<DepartmentDetail> => {
  const { data } = await apiClient.get<DepartmentDetail>(`/departments/${deptKey}`);
  return data;
};

export const getDepartmentFull = async (deptKey: number): Promise<DepartmentFull> => {
  const { data } = await apiClient.get<DepartmentFull>(`/departments/${deptKey}/full`);
  return data;
};

export const getDepartmentKpis = async (deptKey: number): Promise<DeptKpis> => {
  const { data } = await apiClient.get<DeptKpis>(`/departments/${deptKey}/kpis`);
  return data;
};

export const updateDepartment = async (deptKey: number, update: Partial<DepartmentFull>): Promise<void> => {
  await apiClient.put(`/departments/${deptKey}`, update);
};

export const getDepartmentContacts = async (deptKey: number): Promise<DeptContact[]> => {
  const { data } = await apiClient.get<DeptContact[]>(`/departments/${deptKey}/contacts`);
  return data;
};

export const getScopeDetail = async (deptKey: number, scopeKey: number): Promise<ScopeDetail> => {
  const { data } = await apiClient.get<ScopeDetail>(`/departments/${deptKey}/scopes/${scopeKey}`);
  return data;
};

export const getDepartmentRepairs = async (
  deptKey: number,
  params?: { page?: number; pageSize?: number }
): Promise<{ items: DepartmentRepairItem[]; totalCount: number; page: number; pageSize: number }> => {
  const { data } = await apiClient.get(`/departments/${deptKey}/repairs`, { params });
  return data;
};

export const updateDepartmentSubGroups = async (deptKey: number, subGroupKeys: number[]): Promise<void> => {
  await apiClient.put(`/departments/${deptKey}/sub-groups`, subGroupKeys);
};

export const getDepartmentSubGroups = async (deptKey: number): Promise<DepartmentSubGroup[]> => {
  const { data } = await apiClient.get<DepartmentSubGroup[]>(`/departments/${deptKey}/sub-groups`);
  return data;
};

export const getDepartmentScopes = async (deptKey: number): Promise<DepartmentScope[]> => {
  const { data } = await apiClient.get<DepartmentScope[]>(`/departments/${deptKey}/scopes`);
  return data;
};

export const getDepartmentPrimaryContact = async (deptKey: number): Promise<PrimaryContact> => {
  const { data } = await apiClient.get<PrimaryContact>(`/departments/${deptKey}/contacts/primary`);
  return data;
};

export const getDeptFlags = async (deptKey: number): Promise<ClientFlag[]> => {
  const { data } = await apiClient.get<ClientFlag[]>(`/departments/${deptKey}/flags`);
  return data;
};

export const addDeptFlag = async (deptKey: number, flag: { flagTypeKey: number; flag: string; visibleOnDI: boolean; visibleOnBlank: boolean }): Promise<{ flagKey: number }> => {
  const { data } = await apiClient.post(`/departments/${deptKey}/flags`, flag);
  return data;
};

export const updateDeptFlag = async (deptKey: number, flagKey: number, flag: { flagTypeKey: number; flag: string; visibleOnDI: boolean; visibleOnBlank: boolean }): Promise<void> => {
  await apiClient.put(`/departments/${deptKey}/flags/${flagKey}`, flag);
};

export const deleteDeptFlag = async (deptKey: number, flagKey: number): Promise<void> => {
  await apiClient.delete(`/departments/${deptKey}/flags/${flagKey}`);
};

export const getDeptContracts = async (deptKey: number): Promise<DeptContract[]> => {
  const { data } = await apiClient.get<DeptContract[]>(`/departments/${deptKey}/contracts`);
  return data;
};

export interface CreateDepartmentPayload {
  clientKey?: number | null;
  name: string;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  contactFirst?: string | null;
  contactLast?: string | null;
  contactEmail?: string | null;
  salesRepKey?: number | null;
  pricingCategoryKey?: number | null;
  carrierKey?: number | null;
  serviceLocationKey?: number | null;
  showConsumptionOnReq: boolean;
  enforceScopeTypeFiltering: boolean;
  showProductId?: string | null;
  showUAorNWT: boolean;
  showItemizedDesc: boolean;
  emailNewRepairs: boolean;
  trackingRequired: boolean;
  taxExempt: boolean;
  paysByCreditCard: boolean;
  onsiteService: boolean;
  serialNumber?: string | null;
  scopeTypeKey?: number | null;
}

export const createDepartment = async (payload: CreateDepartmentPayload): Promise<{ deptKey: number }> => {
  const { data } = await apiClient.post('/departments', payload);
  return data;
};
