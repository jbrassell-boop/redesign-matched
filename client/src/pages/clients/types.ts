export interface ClientListItem {
  clientKey: number;
  name: string;
  city: string;
  state: string;
  isActive: boolean;
  deptCount: number;
  openRepairs: number;
}

export interface ClientDetail {
  clientKey: number;
  name: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  fax: string | null;
  email: string | null;
  contactName: string | null;
  isActive: boolean;
  deptCount: number;
  openRepairs: number;
}

export interface ClientListResponse {
  clients: ClientListItem[];
  totalCount: number;
}

export interface ClientContact {
  contactKey: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  fax: string | null;
  email: string | null;
  isActive: boolean;
}

export interface ClientDepartment {
  departmentKey: number;
  name: string;
  serviceLocation: string;
  isActive: boolean;
}

export interface ClientFlag {
  flagKey: number;
  flagType: string;
  flag: string;
  visibleOnDI: boolean;
  visibleOnBlank: boolean;
}
