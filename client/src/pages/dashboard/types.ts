export interface DashboardRepair {
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
  dateApproved: string | null;
  estDelivery: string | null;
  amountApproved: number | null;
  tech: string | null;
  isUrgent: boolean;
}

export interface DashboardStats {
  openRepairs: number;
  urgentRepairs: number;
  pendingQC: number;
  pendingShip: number;
  completedToday: number;
  receivedToday: number;
}

export interface DashboardRepairsResponse {
  repairs: DashboardRepair[];
  totalCount: number;
}

export interface DashboardFilters {
  search: string;
  page: number;
  pageSize: number;
  statusFilter: string;
}
