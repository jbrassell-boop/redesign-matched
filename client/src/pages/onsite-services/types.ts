export interface OnsiteServiceListItem {
  onsiteServiceKey: number;
  invoiceNum: string;
  clientName: string;
  deptName: string;
  techName: string;
  visitDate: string | null;
  status: string;
  trayCount: number;
  instrumentCount: number;
  totalBilled: number;
  submittedDate: string | null;
}

export interface OnsiteServiceStats {
  total: number;
  submitted: number;
  invoiced: number;
  draft: number;
  void: number;
  totalValue: number;
}

export interface OnsiteServiceListResponse {
  items: OnsiteServiceListItem[];
  totalCount: number;
}

export interface OnsiteServiceFilters {
  search?: string;
  statusFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

export interface CreateOnsiteVisitRequest {
  clientKey: number;
  departmentKey: number;
  technicianKey: number;
  visitDate: string;
  location?: string;
  po?: string;
  truckNum?: string;
  priceClass?: string;
  notes?: string;
}

export interface OnsiteServiceDetail {
  onsiteServiceKey: number;
  invoiceNum: string;
  clientName: string;
  deptName: string;
  techName: string;
  visitDate: string | null;
  status: string;
  trayCount: number;
  instrumentCount: number;
  totalBilled: number;
  submittedDate: string | null;
  purchaseOrder: string | null;
  truckNumber: string | null;
  notes: string | null;
}

export interface OnsiteServiceTray {
  trayKey: number;
  trayNumber: number;
  trayName: string;
  instrumentsCount: number;
  repairedCount: number;
  sentToTsiCount: number;
  beyondEconomicalRepairCount: number;
  replacedCount: number;
}
