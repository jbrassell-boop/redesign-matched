export interface LoanerListItem {
  loanerTranKey: number;
  scopeKey: number | null;
  scopeType: string;
  serial: string;
  status: string;
  client: string;
  dept: string;
  rep: string;
  daysOut: number;
  agreement: string;
  trackingNumber: string;
  purchaseOrder: string;
  category: string;
  recallNeeded: boolean;
}

export interface LoanerStats {
  available: number;
  evaluating: number;
  out: number;
  overdue: number;
  repair: number;
  agreementsPending: number;
}

export interface LoanerDetail {
  loanerTranKey: number;
  scopeKey: number | null;
  scopeType: string;
  serial: string;
  status: string;
  client: string;
  dept: string;
  rep: string;
  deliveryMethod: string;
  purchaseOrder: string;
  trackingNumber: string;
  rackPosition: string;
  dateOut: string;
  dateIn: string;
  createdBy: string;
  createdDate: string;
  category: string;
  onSiteLoaner: boolean;
}

export interface LoanerHistoryItem {
  loanerTranKey: number;
  dateOut: string;
  dateIn: string;
  client: string;
  dept: string;
  daysOut: number;
  agreement: string;
}

export interface CategoryAvailability {
  category: string;
  available: number;
  out: number;
  needed: number;
}

export interface CheckOutPayload {
  scopeKey: number;
  departmentKey: number;
  deliveryMethodKey: number;
  salesRepKey: number;
  purchaseOrder?: string;
  onSiteLoaner: boolean;
}

export interface CheckInPayload {
  loanerTranKey: number;
  rackPosition?: string;
  trackingNumber?: string;
}

export interface LoanerListResponse {
  items: LoanerListItem[];
  totalCount: number;
}

export interface LoanerRequest {
  repairKey: number;
  workOrder: string;
  serialNumber: string;
  scopeType: string;
  client: string;
  department: string;
  dateRequested: string | null;
  loanerProduced: string;
  status: string;
}

export interface LoanerScopeNeedItem {
  scopeType: string;
  deptName: string;
  clientName: string;
  repairsInProgress: number;
  avgTat: number;
  estimatedNeedDate: string;
}
