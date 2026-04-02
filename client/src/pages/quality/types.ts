export interface QualityInspectionListItem {
  inspectionKey: number;
  repairKey: number;
  workOrderNumber: string;
  inspectionType: string;
  result: string;
  technicianKey: number | null;
  inspectionDate: string;
  clientName: string;
  scopeSN: string | null;
}

export interface QualityInspectionDetail {
  inspectionKey: number;
  repairKey: number;
  workOrderNumber: string;
  inspectionType: string;
  result: string;
  technicianKey: number | null;
  techName: string | null;
  inspectionDate: string;
  clientName: string;
  scopeSN: string | null;
  hotColdLeakTestPass: boolean | null;
  autoclaveTestPass: boolean | null;
}

export interface QualityInspectionListResponse {
  inspections: QualityInspectionListItem[];
  totalCount: number;
}

export interface QualityStats {
  totalInspections: number;
  passCount: number;
  failCount: number;
  conditionalCount: number;
  firstPassYield: number;
}

export interface QualityFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  resultFilter: string;
  page: number;
  pageSize: number;
}

// ── NCR ──────────────────────────────────────────────────────────────────────

export interface NcrListItem {
  isoComplaintKey: number;
  ncrNumber: string;
  repairKey: number | null;
  workOrderNumber: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  dateFiled: string;
  clientName: string;
  departmentName: string;
}

export interface NcrListResponse {
  items: NcrListItem[];
  totalCount: number;
}

// ── Rework ───────────────────────────────────────────────────────────────────

export interface ReworkListItem {
  repairKey: number;
  reworkNumber: string;
  workOrderNumber: string;
  serialNumber: string;
  reason: string;
  techName: string;
  originalComplete: string;
  reworkDue: string;
  status: string;
}

export interface ReworkListResponse {
  items: ReworkListItem[];
  totalCount: number;
}
