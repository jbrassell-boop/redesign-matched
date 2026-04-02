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
