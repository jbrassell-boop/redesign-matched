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
