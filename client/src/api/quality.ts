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

export interface RecordFinalInspectionBody {
  hotColdLeakPass: boolean;
  autoclavePass: boolean;
  inspectorKey?: number;
}

export interface RecordFinalInspectionResult {
  inspectionKey: number;
  result: 'Pass' | 'Fail';
}

// Record (upsert) the Post-Repair (final QC) inspection result for a repair.
// POST /api/quality/inspections — upserts the repair's lRepairInspectionType=2 row
// (bHotColdLeakTestPass + bAutoclaveTestPass). Result is Pass only when both pass.
export const recordFinalInspection = async (
  repairKey: number,
  body: RecordFinalInspectionBody,
): Promise<RecordFinalInspectionResult> => {
  const { data } = await apiClient.post<RecordFinalInspectionResult>(
    '/quality/inspections',
    { repairKey, ...body },
  );
  return data;
};
