export interface AcquisitionListItem {
  scopeKey: number;
  serial: string;
  scopeType: string;
  supplier: string;
  poNumber: string;
  dept: string;
  client: string;
  dateAcquired: string;
  poDate: string;
  condition: string;
  cost: number;
}

export interface AcquisitionSoldItem {
  scopeKey: number;
  serial: string;
  scopeType: string;
  client: string;
  saleDate: string;
  salePrice: number;
  buyer: string;
}

export interface AcquisitionStats {
  inHouse: number;
  consigned: number;
  sold: number;
  inHouseValue: number;
  soldRevenue: number;
}

export interface AcquisitionListResponse {
  items: AcquisitionListItem[];
  totalCount: number;
}

export interface AcquisitionSoldResponse {
  items: AcquisitionSoldItem[];
  totalCount: number;
}

export interface AcquisitionsFilters {
  search: string;
  page: number;
  pageSize: number;
  tab: string;
}

export interface AcquisitionDetail {
  scopeKey: number;
  serial: string;
  scopeType: string;
  manufacturer: string;
  client: string;
  dept: string;
  supplier: string;
  poNumber: string;
  poDate: string | null;
  dateReceived: string | null;
  cost: number;
  comment: string;
  flexOrRigid: string;
  isSold: boolean;
}
