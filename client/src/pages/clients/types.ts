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

export interface ClientFull {
  clientKey: number;
  name: string;
  isActive: boolean;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  fax?: string;
  billingEmail?: string;
  pricingCategory?: string;
  pricingCategoryKey?: number;
  paymentTerms?: string;
  paymentTermsKey?: number;
  salesRep?: string;
  salesRepKey?: number;
  contractNumber?: string;
  distributor?: string;
  distributorKey?: number;
  isGPO: boolean;
  isNewCustomer: boolean;
  customerSince?: string;
  comments?: string;
  deptCount: number;
  openRepairs: number;
  // Additional Details
  secondaryName?: string;
  reference1?: string;
  reference2?: string;
  // Invoice & Options flags
  blindPS3?: boolean;
  reqTotalsOnly?: boolean;
  blindTotalsOnFinal?: boolean;
  skipMetrics?: boolean;
  poRequired?: boolean;
  neverHold?: boolean;
  skipTracking?: boolean;
  emailNewRepairs?: boolean;
  nationalAccount?: boolean;
  // Billing & Pricing
  discountPct?: number;
  creditLimitKey?: number;
  // Addresses — Bill To
  billName1?: string;
  billAddr1?: string;
  billAddr2?: string;
  billCity?: string;
  billState?: string;
  billZip?: string;
  billCountry?: string;
  billContact?: string;
  billEmail?: string;
  // Addresses — Ship To
  shipName1?: string;
  shipAddr1?: string;
  shipAddr2?: string;
  shipCity?: string;
  shipState?: string;
  shipZip?: string;
  shipCountry?: string;
  shipEmail?: string;
}

export interface ClientKpis {
  totalRepairs: number;
  openRepairs: number;
  avgTat: number;
  totalRevenue: number;
}

export type SaveState = 'ready' | 'unsaved' | 'saving' | 'saved';

export interface ClientRepairItem {
  repairKey: number;
  workOrderNumber: string;
  dateIn?: string;
  status: string;
  department?: string;
  scopeType?: string;
  serial?: string;
  tat?: number;
  amount?: number;
}
