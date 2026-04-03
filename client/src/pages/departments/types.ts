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

export interface DepartmentFull {
  deptKey: number;
  name: string;
  clientName: string;
  clientKey: number;
  isActive: boolean;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  contactFirst?: string;
  contactLast?: string;
  contactPhone?: string;
  contactEmail?: string;
  serviceLocation?: string;
  scopeCount: number;
  openRepairs: number;
  // Options & Toggles
  showConsumptionOnReq?: boolean;
  enforceScopeTypeFiltering?: boolean;
  showProductId?: boolean;
  showUaOrNwt?: boolean;
  showItemizedDescriptions?: boolean;
  emailNewRepairs?: boolean;
  memberBoa?: boolean;
  trackingRequired?: boolean;
  taxExempt?: boolean;
  paysByCreditCard?: boolean;
  onsiteService?: boolean;
  // Billing & Defaults
  salesRepKey?: number;
  salesRep?: string;
  pricingCategoryKey?: number;
  pricingCategory?: string;
  discountPct?: number;
  defaultShipping?: number;
  // Bill To address
  billName1?: string;
  billAddr1?: string;
  billAddr2?: string;
  billCity?: string;
  billState?: string;
  billZip?: string;
  billEmail?: string;
  // Mailing address
  mailAddr1?: string;
  mailAddr2?: string;
  mailCity?: string;
  mailState?: string;
  mailZip?: string;
  mailCountry?: string;
  // Ship To extra (address1/city/state/zip already serve as ship)
  shipName1?: string;
  shipAddr2?: string;
  shipCountry?: string;
}

export interface DeptKpis {
  totalRepairs: number;
  openRepairs: number;
  avgTat: number;
  totalRevenue: number;
}

export interface DeptContact {
  contactKey: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
  isActive: boolean;
}

export interface ScopeDetail {
  scopeKey: number;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  type?: string;
  category?: string;
  isActive: boolean;
  lastRepairDate?: string;
  repairCount: number;
}

export interface DepartmentRepairItem {
  repairKey: number;
  workOrderNumber?: string;
  dateIn?: string;
  status?: string;
  scopeType?: string;
  serialNumber?: string;
  tat: number;
  amount?: number;
}

export type SaveState = 'ready' | 'unsaved' | 'saving' | 'saved';

export interface DeptContract {
  contractKey: number;
  contractName: string;
  contractNumber: string;
  contractType: string | null;
  dateEffective: string | null;
  dateTermination: string | null;
  status: string;
  annualValue: number | null;
}
