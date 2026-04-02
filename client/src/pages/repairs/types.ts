export interface RepairListItem {
  repairKey: number;
  wo: string;
  dateIn: string;
  client: string;
  dept: string;
  scopeType: string;
  serial: string;
  daysIn: number;
  status: string;
  statusId: number;
  isUrgent: boolean;
}

export interface RepairDetail {
  repairKey: number;
  wo: string;
  dateIn: string;
  client: string;
  clientKey: string;
  dept: string;
  deptKey: number;
  scopeType: string;
  serial: string;
  daysIn: number;
  status: string;
  statusId: number;
  isUrgent: boolean;
  tech: string | null;
  techKey: number | null;
  complaint: string | null;
  dateApproved: string | null;
  estDelivery: string | null;
  amountApproved: number | null;
  shipDate: string | null;
  trackingNumber: string | null;
  invoiceNumber: string | null;
  notes: string | null;
}

export interface RepairListResponse {
  repairs: RepairListItem[];
  totalCount: number;
}

export interface RepairsFilters {
  search: string;
  page: number;
  pageSize: number;
  statusFilter: string;
}

// ── Line Items (Workflow) ──
export interface RepairLineItem {
  tranKey: number;
  approved: string;
  itemCode: string;
  description: string;
  cause: string;
  fixType: string;
  amount: number;
  tech: string;
  comments: string;
}

// ── Scope History ──
export interface RepairScopeHistory {
  repairKey: number;
  wo: string;
  dateIn: string;
  status: string;
  scopeType: string;
  client: string;
  daysIn: number;
  amount: number | null;
}

// ── Financials ──
export interface RepairFinancials {
  saleAmount: number;
  tax: number;
  invoiceTotal: number;
  outsource: number;
  shipping: number;
  labor: number;
  inventory: number;
  gpo: number;
  commission: number;
  totalExpenses: number;
  marginPct: number;
  contractMargin: number;
}
