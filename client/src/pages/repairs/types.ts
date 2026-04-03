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

// ── Full Cockpit Detail ──
export interface RepairFull {
  repairKey: number; wo: string; status: string; statusId: number; isUrgent: boolean;
  client: string; clientKey: number; dept: string; deptKey: number;
  scopeType: string; serial: string; scopeModel?: string; manufacturer?: string;
  dateIn: string; dateApproved?: string; estDelivery?: string; shipDate?: string; dateOut?: string;
  daysIn: number;
  tech?: string; techKey?: number; tech2?: string; inspector?: string;
  approvalName?: string; salesRep?: string;
  amountApproved?: number; invoiceNumber?: string; purchaseOrder?: string;
  complaint?: string; notes?: string; customerRef?: string;
  billName?: string; billAddr1?: string; billAddr2?: string;
  billCity?: string; billState?: string; billZip?: string; billEmail?: string;
  shipName?: string; shipAddr1?: string; shipAddr2?: string;
  shipCity?: string; shipState?: string; shipZip?: string;
  trackingNumber?: string; trackingNumberIn?: string; trackingNumberFedEx?: string;
  shipWeight?: string; deliveryServiceLevel?: string;
  loanerRequested: boolean; loanerProvided?: boolean; loanerRepair?: string;
  includesBox: boolean; includesCase: boolean; includesETOCap: boolean; includesCO2Cap: boolean;
  includesCamera: boolean; includesHood: boolean; includesLightPostAdapter: boolean;
  includesSuctionValve: boolean; includesWaterProofCap: boolean; includesAirWaterValve: boolean;
  outsourced: boolean; firstRepair: boolean; reworkRequired?: string;
  pricingCategory?: string; paymentTerms?: string; contractNumber?: string;
  repairReason?: string; source?: string;
}

export interface RepairInspections {
  scopeRepairable?: string; scopeUsable?: string;
  angInUp?: string; angInDown?: string; angInLeft?: string; angInRight?: string;
  angOutUp?: string; angOutDown?: string; angOutLeft?: string; angOutRight?: string;
  brokenFibersIn?: string; brokenFibersOut?: string; fiberAngle?: string; fiberLightTrans?: string;
  insImagePF?: string; insLeakPF?: string; insFiberLightTransPF?: string; insAngulationPF?: string;
  insFocalDistancePF?: string; insImageCentrationPF?: string; insFogPF?: string;
  insHotColdLeakPF?: string; insSuctionPF?: string; insForcepChannelPF?: string;
  insAirWaterPF?: string; insAuxWaterPF?: string;
  insVisionPF?: string; insInsertionTubePF?: string; insUniversalCordPF?: string;
  insLightGuideConnectorPF?: string; insDistalTipPF?: string; insEyePiecePF?: string;
  insLightFibersPF?: string; insAlcoholWipePF?: string;
  insFinalPF?: string;
}

export interface ClientSummary {
  name: string; pricingCategory?: string; contractType?: string;
  paymentTerms?: string; salesRep?: string; isActive: boolean;
}

export interface PrimaryContact {
  firstName?: string; lastName?: string; email?: string; phone?: string; title?: string;
}

export interface LineItemUpdate {
  approved?: string; itemCode?: string; description?: string;
  fixType?: string; amount?: number; comments?: string;
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
