export interface DepartmentListItem {
  deptKey: number;
  name: string;
  clientName: string;
  clientKey: number;
  isActive: boolean;
  openRepairs: number;
  scopeCount: number;
}

export interface DepartmentDetail {
  deptKey: number;
  name: string;
  clientName: string;
  clientKey: number;
  isActive: boolean;
  openRepairs: number;
  scopeCount: number;
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  contactName: string | null;
  email: string | null;
}

export interface DepartmentListResponse {
  departments: DepartmentListItem[];
  totalCount: number;
}

export interface DepartmentSubGroup {
  subGroupKey: number;
  name: string;
}

export interface DepartmentScope {
  scopeKey: number;
  serialNumber: string;
  model: string;
  manufacturer: string;
  type: string;
  category: string;
}
