// Pending Contracts (deal origination) — staged deals separate from tblContract.

export interface PendingContractListItem {
  pendingContractKey: number;
  clientKey: number;
  clientName: string;
  name: string;
  contractTypeKey: number;
  contractType: string;
  status: string;            // 'Pending' | 'Dead' (or other inactive)
  statusDate: string | null;
  creationDate: string | null;
  salesRepKey: number;
  salesRep: string;
  termMonths: number;
  scopeCount: number;
  isDead: boolean;
}

export interface PendingContractListResponse {
  items: PendingContractListItem[];
  totalCount: number;
}

export interface PendingContractDetail {
  pendingContractKey: number;
  clientKey: number;
  clientName: string;
  name: string;
  contractTypeKey: number;
  contractType: string;
  status: string;
  statusDate: string | null;
  creationDate: string | null;
  salesRepKey: number;
  salesRep: string;
  termMonths: number;
  agreementTemplateKey: number;
  billName1: string;
  billName2: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  fax: string;
  scopeCount: number;
  departmentCount: number;
  affiliateCount: number;
}

export interface PendingContractScopeItem {
  pendingContractScopeKey: number;
  scopeKey: number;          // 0 = model-only (no serial yet)
  scopeTypeKey: number;
  scopeTypeDesc: string;
  serialNumber: string;
  rigidOrFlexible: string;
  clientKey: number;
  clientName: string;
  departmentKey: number;
  departmentName: string;
  quantity: number;
  unitCost: number;
  contractCost: number;
}

export interface AvailablePendingContractScope {
  scopeKey: number;
  serialNumber: string;
  scopeTypeKey: number;
  scopeTypeDesc: string;
  rigidOrFlexible: string;
  clientKey: number;
  clientName: string;
  departmentKey: number;
  departmentName: string;
}

export interface PendingContractDepartmentItem {
  departmentKey: number;
  departmentName: string;
  clientName: string;
}

export interface PendingContractAffiliateItem {
  departmentKey: number;
  departmentName: string;
  clientName: string;
}

export interface PendingContractAgreementTemplate {
  agreementTemplateKey: number;
  name: string;
  fileName: string;
}
