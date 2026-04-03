import apiClient from './client';
import type {
  DepartmentListResponse, DepartmentDetail, DepartmentSubGroup, DepartmentScope,
  DepartmentFull, DeptKpis, DeptContact, ScopeDetail, DepartmentRepairItem
} from '../pages/departments/types';
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
