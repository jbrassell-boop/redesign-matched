import apiClient from './client';
import type { DepartmentListResponse, DepartmentDetail } from '../pages/departments/types';

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
