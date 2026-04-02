export interface OutsourceListItem {
  repairKey: number;
  wo: string;
  serial: string;
  scopeType: string;
  clientName: string;
  vendorName: string;
  sentDate: string | null;
  daysOut: number;
  vendorCost: number;
  tsiCharge: number;
  marginDollar: number;
  marginPct: number;
  status: string;
}

export interface OutsourceStats {
  total: number;
  outsourceSpend: number;
  avgMarginPct: number;
  negativeMargin: number;
  topVendor: string;
  topVendorSpend: number;
  avgDaysOut: number;
}

export interface OutsourceListResponse {
  items: OutsourceListItem[];
  totalCount: number;
}

export interface OutsourceFilters {
  search?: string;
  statusFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}
