export interface InstrumentRepairListItem {
  repairKey: number;
  orderNumber: string;
  clientName: string;
  departmentName: string;
  dateReceived: string | null;
  dateDue: string | null;
  status: string;
  itemCount: number;
  totalValue: number;
}

export interface InstrumentRepairDetail {
  repairKey: number;
  orderNumber: string;
  clientName: string;
  departmentName: string;
  purchaseOrder: string | null;
  dateReceived: string | null;
  dateDue: string | null;
  dateCompleted: string | null;
  status: string;
  daysOpen: number;
  technicianName: string | null;
  notes: string | null;
  items: InstrumentRepairItem[];
}

export interface InstrumentRepairItem {
  tranKey: number;
  repairItemKey: number;
  itemDescription: string;
  approved: string | null;
  repairPrice: number;
  comments: string | null;
  fixType: string | null;
  problemId: string | null;
  initials: string | null;
}

export interface InstrumentCatalogItem {
  repairItemKey: number;
  itemDescription: string;
  rigidOrFlexible: string | null;
  partOrLabor: string | null;
  problemId: string | null;
  productId: string | null;
  isActive: boolean;
  avgCostMaterial: number;
  avgCostLabor: number;
  tsiCode: string | null;
  usageCount: number;
}

export interface InstrumentCatalogDetail {
  repairItemKey: number;
  itemDescription: string;
  rigidOrFlexible: string | null;
  partOrLabor: string | null;
  problemId: string | null;
  productId: string | null;
  productIdHPG: string | null;
  productIdPremier: string | null;
  isActive: boolean;
  avgCostMaterial: number;
  avgCostLabor: number;
  turnAroundTime: number;
  hoursTech1: number;
  hoursTech2: number;
  hoursTech3: number;
  isMajorRepair: boolean;
  tsiCode: string | null;
  diameterType: string | null;
  unitCost: number | null;
}

export interface InstrumentRepairStats {
  allOrders: number;
  received: number;
  inProgress: number;
  outsourced: number;
  onHold: number;
  complete: number;
  invoiced: number;
  totalValue: number;
}

export interface InstrumentRepairListResponse {
  items: InstrumentRepairListItem[];
  totalCount: number;
}

export interface InstrumentCatalogResponse {
  items: InstrumentCatalogItem[];
  totalCount: number;
}

export type InstrumentTab = 'repairs' | 'quotes' | 'catalog';
