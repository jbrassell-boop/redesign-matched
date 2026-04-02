import apiClient from './client';
import type { QualityInspectionListResponse, QualityInspectionDetail, QualityStats, QualityFilters } from '../pages/quality/types';

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
