import apiClient from './client';
import type { QualityInspectionListResponse, QualityInspectionDetail, QualityStats, QualityFilters, NcrListResponse, ReworkListResponse } from '../pages/quality/types';

export const getQualityInspections = async (filters: QualityFilters): Promise<QualityInspectionListResponse> => {
  const { data } = await apiClient.get<QualityInspectionListResponse>('/quality/inspections', {
    params: {
      search: filters.search || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      resultFilter: filters.resultFilter !== 'all' ? filters.resultFilter : undefined,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  });
  return data;
};

export const getQualityInspection = async (inspectionKey: number): Promise<QualityInspectionDetail> => {
  const { data } = await apiClient.get<QualityInspectionDetail>(`/quality/inspections/${inspectionKey}`);
  return data;
};

export const getQualityStats = async (): Promise<QualityStats> => {
  const { data } = await apiClient.get<QualityStats>('/quality/stats');
  return data;
};

export const getQualityNcr = async (params: {
  search?: string;
  severity?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<NcrListResponse> => {
  const { data } = await apiClient.get<NcrListResponse>('/quality/ncr', { params });
  return data;
};

export const getQualityRework = async (params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ReworkListResponse> => {
  const { data } = await apiClient.get<ReworkListResponse>('/quality/rework', { params });
  return data;
};
