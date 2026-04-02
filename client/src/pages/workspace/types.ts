export interface WorkspaceData {
  repairQueue: RepairQueueWidget;
  overdue: OverdueWidget;
  invoices: InvoicesWidget;
  contractsExpiring: ContractsWidget;
}

export interface RepairQueueWidget {
  received: number;
  inRepair: number;
  qcHold: number;
  shipReady: number;
  overdue: number;
  recentItems: RepairQueueItem[];
}

export interface RepairQueueItem {
  wo: string;
  client: string;
  scopeType: string;
  daysIn: number;
  status: string;
}

export interface OverdueWidget {
  items: OverdueItem[];
}

export interface OverdueItem {
  wo: string;
  client: string;
  daysIn: number;
  sla: number;
}

export interface InvoicesWidget {
  totalOutstanding: number;
  pastDue30: number;
  pastDue60: number;
  invoicedThisMonth: number;
}

export interface ContractsWidget {
  items: ContractExpiringItem[];
}

export interface ContractExpiringItem {
  client: string;
  expirationDate: string;
  daysUntil: number;
}
