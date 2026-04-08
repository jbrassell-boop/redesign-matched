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
  baseAmount: number;
  amendmentCount: number;
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
  // Command strip fields
  rackLocation?: string;
  repairLevel?: string;
  leadTime?: string;
  turnAroundTime?: string;
  purchaseOrder?: string;
  // Scope glance computed
  withinFortyDay?: boolean;
  daysLastIn?: number | null;
  capFfs?: string;
  // Techs
  tech?: string; techKey?: number; tech2?: string; inspector?: string;
  // Order
  approvalName?: string; salesRep?: string; reportingGroup?: string;
  approvalSentDate?: string;
  requisition?: string;
  discountPct?: number | null;
  // Financial
  amountApproved?: number; invoiceNumber?: string;
  pricingCategory?: string; paymentTerms?: string; contractNumber?: string;
  // Complaint
  complaint?: string; notes?: string; repairReason?: string;
  psLevel?: string;
  customerRef?: string;
  // Invoice options
  displayComplaintOnInvoice?: boolean;
  displayItemizedDesc?: boolean;
  displayItemizedAmounts?: boolean;
  billToCustomer?: string;
  // Inbound
  inboundServiceLevel?: string;
  shippingCostIn?: number | null;
  distributor?: string;
  trackingNumberIn?: string;
  // Addresses
  billName?: string; billAddr1?: string; billAddr2?: string;
  billCity?: string; billState?: string; billZip?: string; billEmail?: string;
  shipName?: string; shipAddr1?: string; shipAddr2?: string;
  shipCity?: string; shipState?: string; shipZip?: string;
  // Outbound
  trackingNumber?: string; trackingNumberFedEx?: string;
  shipWeight?: string; deliveryServiceLevel?: string;
  packageType?: string;
  trackingRequired?: boolean;
  gtdDeliveryDate?: string;
  winscopeGtdDate?: string;
  actualDeliveryDate?: string;
  // Outsource
  outsourced: boolean; outsourceVendor?: string;
  outsourceCost?: number | null;
  outsourceTracking?: string;
  // Accessories / loaner
  loanerRequested: boolean; loanerProvided?: boolean; loanerRepair?: string;
  includesBox: boolean; includesCase: boolean; includesETOCap: boolean; includesCO2Cap: boolean;
  includesCamera: boolean; includesHood: boolean; includesLightPostAdapter: boolean;
  includesSuctionValve: boolean; includesWaterProofCap: boolean; includesAirWaterValve: boolean;
  firstRepair: boolean; reworkRequired?: string; source?: string;
  salesRepKey?: number | null;
  pricingCategoryKey?: number | null;
  paymentTermsKey?: number | null;
  distributorKey?: number | null;
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
  approved?: string;
  itemKey?: number;
  itemCode?: string;
  cause?: string;
  description?: string;
  fixType?: string;
  amount?: number;
  baseAmount?: number;
  techKey?: number | null;
  tech2Key?: number | null;
  isPrimary?: boolean;
  comments?: string;
}

// ── Repair Item Catalog ──
export interface RepairCatalogItem {
  itemKey: number;
  itemCode: string;
  description: string;
  defaultPrice: number;
  rigidOrFlexible: string;  // 'R' | 'F' | 'C' | ''
  partOrLabor: string;       // 'P' | 'L' | ''
  minutesTech1: number | null;
  minutesTech2: number | null;
  minutesTech3: number | null;
}

// ── Amendments ──
export interface Amendment {
  amendKey: number;
  amendmentNumber: number;
  date: string;
  amendType: string;
  amendReason: string;
  comment: string;
}

export interface AmendType {
  typeKey: number;
  typeName: string;
}

export interface AmendReason {
  reasonKey: number;
  reasonName: string;
}

export interface CreateAmendmentRequest {
  tranKey: number;
  amendTypeKey: number;
  amendReasonKey: number;
  comment?: string;
  newFixType?: string;
  newAmount?: number;
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
