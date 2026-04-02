export interface EndoCartQuoteItem {
  partNum: string;
  desc: string;
  qty: number;
  unitCost: number;
}

export interface EndoCartQuote {
  lQuoteKey: number;
  quoteNum: string;
  clientKey: number;
  clientName: string;
  deptName: string;
  cartModel: string;
  salesRep: string;
  dateCreated: string;
  dateQuoted: string;
  status: 'Draft' | 'Quoted' | 'Approved' | 'Billed' | 'Cancelled';
  notes: string;
  items: EndoCartQuoteItem[];
  itemCount: number;
  total: number;
}

export interface CatalogPart {
  partNum: string;
  desc: string;
  category: 'Cart Frame' | 'Monitor' | 'Accessory' | 'Power' | 'Cabling' | 'Storage';
  unitCost: number;
  stock: number;
  reorderPt: number;
}

export interface CartModelComponent {
  partNum: string;
  desc: string;
  qty: number;
  unitCost: number;
}

export interface CartModel {
  lModelKey: number;
  modelName: string;
  desc: string;
  components: CartModelComponent[];
  basePrice: number;
  componentCount: number;
}

export interface EndoCartStats {
  total: number;
  draft: number;
  quoted: number;
  approved: number;
  billed: number;
  pipelineValue: number;
}

export interface EndoCartFilters {
  status: string;
  rep: string;
  search: string;
}

export interface EndoCartScopeItem {
  scopeKey: number;
  serialNumber: string;
  scopeType: string;
  manufacturer: string;
  clientName: string;
  departmentName: string;
  rigidOrFlexible: string;
  isDead: boolean;
  lastUpdate: string | null;
}

export interface EndoCartServiceHistoryItem {
  repairKey: number;
  workOrderNumber: string;
  serialNumber: string;
  scopeType: string;
  clientName: string;
  repairStatus: string;
  dateIn: string | null;
  dateOut: string | null;
  complaint: string | null;
  totalCost: number;
}

export interface EndoCartScopeInventoryResponse {
  items: EndoCartScopeItem[];
  totalCount: number;
}

export interface EndoCartServiceHistoryResponse {
  items: EndoCartServiceHistoryItem[];
  totalCount: number;
}

export interface EndoCartApiStats {
  totalScopes: number;
  activeScopes: number;
  inactiveScopes: number;
  totalRepairs: number;
  recentRepairs: number;
}
