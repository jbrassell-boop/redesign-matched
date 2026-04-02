export interface SupplierListItem {
  supplierKey: number;
  name: string;
  city: string;
  state: string;
  phone: string;
  gpId: string;
  isActive: boolean;
  isAcquisitionSupplier: boolean;
  roles: string[];
}

export interface SupplierDetail {
  supplierKey: number;
  name: string;
  name2: string | null;
  shipAddr1: string | null;
  shipAddr2: string | null;
  shipCity: string | null;
  shipState: string | null;
  shipZip: string | null;
  shipCountry: string | null;
  billAddr1: string | null;
  billAddr2: string | null;
  billCity: string | null;
  billState: string | null;
  billZip: string | null;
  billCountry: string | null;
  mailAddr1: string | null;
  mailAddr2: string | null;
  mailCity: string | null;
  mailState: string | null;
  mailZip: string | null;
  mailCountry: string | null;
  contactFirst: string | null;
  contactLast: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  gpId: string | null;
  peachTreeId: string | null;
  orderMinimum: number | null;
  isActive: boolean;
  isAcquisitionSupplier: boolean;
  showOnDashboard: boolean;
  blindPoForGp: boolean;
  createPartNumbers: boolean;
  partNumberPrefix: string | null;
  showVendorSkuOnPo: boolean;
  includePartNumberInPoDescription: boolean;
  additionalPoDescription: string | null;
  additionalPoDescriptionCostPerUnit: number | null;
  useVendorSku: boolean;
  allowDuplicatePartNumbers: boolean;
  supplierPoTypeKey: number | null;
  supplierPoType: string | null;
  supplierKeyLink: number | null;
  billEmail: string | null;
  billEmailName: string | null;
  billEmail2: string | null;
  billType: number | null;
  comments: string | null;
  lastUpdate: string | null;
  roles: string[];
  recentPos: SupplierPo[];
}

export interface SupplierPo {
  supplierPoKey: number;
  poNumber: string;
  date: string | null;
  amount: number;
  status: string;
  poType: string | null;
}

export interface SupplierStats {
  total: number;
  active: number;
  inactive: number;
  parts: number;
  repair: number;
  acquisition: number;
  carts: number;
}

export interface SupplierListResponse {
  items: SupplierListItem[];
  totalCount: number;
}
