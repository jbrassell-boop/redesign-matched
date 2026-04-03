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

export type DashboardView = 'briefing' | 'repairs' | 'shipping' | 'invoices' | 'flags' | 'emails' | 'tasks' | 'techbench';

export type ScopeTypeFilter = 'all' | 'Flexible' | 'Rigid' | 'Instrument' | 'Camera' | 'Carts';

export type LocationFilter = 'all' | 'inhouse' | 'outsourced' | 'hotlist';

export type GroupBy = 'none' | 'Client' | 'Status' | 'Tech' | 'ScopeType';

export interface DashboardToolbarState {
  view: DashboardView;
  type: ScopeTypeFilter;
  location: LocationFilter;
  groupBy: GroupBy;
  search: string;
  page: number;
  pageSize: number;
  statusFilter: string;
}

export interface BriefingStats {
  received: number;
  shipped: number;
  approved: number;
  revenue: number;
  avgTat: number;
  overdue: number;
}

// ── Tasks ──
export interface DashboardTask {
  taskKey: number;
  title: string;
  client: string;
  dept: string;
  taskType: string;
  priority: string;
  status: string;
  date: string;
  fromPortal: boolean;
}

export interface DashboardTaskStats {
  open: number;
  fulfilled: number;
  fromPortal: number;
  topTypeCount: number;
  topTypeLabel: string;
}

export interface DashboardTasksResponse {
  tasks: DashboardTask[];
  totalCount: number;
  stats: DashboardTaskStats;
}

// ── Emails ──
export interface DashboardEmail {
  emailKey: number;
  date: string;
  emailType: string;
  from: string;
  to: string;
  subject: string;
  status: string;
}

export interface DashboardEmailStats {
  total: number;
  pending: number;
  sent: number;
  emailTypes: number;
}

export interface DashboardEmailsResponse {
  emails: DashboardEmail[];
  totalCount: number;
  stats: DashboardEmailStats;
}

// ── Shipping ──
export interface DashboardShipment {
  repairKey: number;
  wo: string;
  client: string;
  dept: string;
  scopeType: string;
  serial: string;
  status: string;
  dateIn: string;
  shipDate: string | null;
  trackingNumber: string | null;
  shipCharge: number;
}

export interface DashboardShippingStats {
  readyToShip: number;
  shippedToday: number;
  totalCharges: number;
}

export interface DashboardShippingResponse {
  shipments: DashboardShipment[];
  totalCount: number;
  stats: DashboardShippingStats;
}

// ── Invoices ──
export interface DashboardInvoice {
  invoiceKey: number;
  invoiceNumber: string;
  wo: string;
  client: string;
  dept: string;
  amount: number;
  status: string;
  date: string;
  paidDate: string | null;
}

export interface DashboardInvoiceStats {
  readyToInvoice: number;
  invoicedMonth: number;
  totalAmount: number;
  avgInvoice: number;
}

export interface DashboardInvoicesResponse {
  invoices: DashboardInvoice[];
  totalCount: number;
  stats: DashboardInvoiceStats;
}

// ── Flags ──
export interface DashboardFlag {
  flagKey: number;
  flagText: string;
  flagType: string;
  ownerName: string;
  ownerKey: number;
}

export interface DashboardFlagStats {
  total: number;
  client: number;
  scopeType: number;
  scope: number;
  repair: number;
}

export interface DashboardFlagsResponse {
  flags: DashboardFlag[];
  totalCount: number;
  stats: DashboardFlagStats;
}

// ── Tech Bench ──
export interface DashboardTechBenchItem {
  repairKey: number;
  wo: string;
  serial: string;
  scopeType: string;
  client: string;
  daysIn: number;
  status: string;
  tech: string | null;
}

export interface DashboardTechBenchStats {
  assigned: number;
  inRepair: number;
  onHold: number;
  completedToday: number;
}

export interface DashboardTechBenchResponse {
  items: DashboardTechBenchItem[];
  totalCount: number;
  stats: DashboardTechBenchStats;
}

// ── Analytics ──
export interface DashboardAnalyticsMetric {
  rank: number;
  scopeType: string;
  repairCount: number;
  avgTat: number;
  inProgress: number;
  completed: number;
}

export interface DashboardAnalyticsStats {
  inHouse: number;
  avgTat: number;
  onTimeShipPct: number;
  throughput: number;
}

export interface DashboardAnalyticsResponse {
  metrics: DashboardAnalyticsMetric[];
  stats: DashboardAnalyticsStats;
}
