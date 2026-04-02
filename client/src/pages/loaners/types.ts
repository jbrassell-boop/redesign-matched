export interface LoanerListItem {
  loanerTranKey: number;
  scopeKey: number | null;
  repairKey: number | null;
  departmentKey: number | null;
  scopeType: string;
  serial: string;
  client: string;
  dept: string;
  dateOut: string;
  dateIn: string;
  trackingNumber: string;
  purchaseOrder: string;
  status: string;
  daysOut: number;
  workOrder: string;
}

export interface LoanerDetail {
  loanerTranKey: number;
  scopeKey: number | null;
  repairKey: number | null;
  departmentKey: number | null;
  salesRepKey: number | null;
  deliveryMethodKey: number | null;
  contractKey: number | null;
  scopeType: string;
  serial: string;
  client: string;
  dept: string;
  dateOut: string;
  dateIn: string;
  trackingNumber: string;
  purchaseOrder: string;
  status: string;
  daysOut: number;
  workOrder: string;
  salesRep: string;
  deliveryMethod: string;
  rackPosition: string;
  repairClosed: string;
  createdDate: string;
}

export interface LoanerStats {
  total: number;
  out: number;
  overdue: number;
  returned: number;
  declined: number;
  fillRate: number;
}

export interface LoanerListResponse {
  items: LoanerListItem[];
  totalCount: number;
}

export interface LoanersFilters {
  search: string;
  page: number;
  pageSize: number;
  statusFilter: string;
}
