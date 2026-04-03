export interface ContractListItem {
  contractKey: number;
  clientKey: number;
  name: string;
  contractNumber: string;
  contractId: string;
  effectiveDate: string | null;
  terminationDate: string | null;
  totalAmount: number;
  amtInvoiced: number;
  scopeCount: number;
  status: 'Active' | 'Expiring' | 'Expired';
  contractType: number;
}

export interface ContractDetail {
  contractKey: number;
  clientKey: number;
  name: string;
  contractNumber: string;
  contractId: string;
  effectiveDate: string | null;
  terminationDate: string | null;
  lengthInMonths: number;
  totalAmount: number;
  amtInvoiced: number;
  installmentsTotal: number;
  installmentsInvoiced: number;
  contractType: number;
  servicePlan: boolean;
  sharedRisk: boolean;
  taxExempt: boolean;
  billName: string;
  billAddress: string;
  billCity: string;
  billState: string;
  billZip: string;
  phone: string;
  billEmail: string;
  comments: string;
  countFlexible: number;
  countRigid: number;
  countCamera: number;
  countInstrument: number;
  countAll: number;
  status: 'Active' | 'Expiring' | 'Expired';
  lastUpdate: string | null;
  createDate: string | null;
}

export interface ContractListResponse {
  contracts: ContractListItem[];
  totalCount: number;
}

export interface ContractStats {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  totalACV: number;
}

export interface ContractScope {
  contractScopeKey: number;
  scopeKey: number;
  serialNumber: string;
  model: string;
  manufacturer: string;
  rigidOrFlexible: string;
  scopeAdded: string | null;
  scopeRemoved: string | null;
  cost: number;
}

export interface ContractRepair {
  repairKey: number;
  wo: string;
  serialNumber: string;
  model: string;
  repairType: string;
  dateIn: string | null;
  status: string;
  cost: number;
  tech: string;
}

export interface ContractInvoice {
  installmentKey: number;
  invoiceNumber: string;
  dateCreated: string | null;
  dateDue: string | null;
  amount: number;
  status: string;
}

export interface ContractNote {
  noteKey: number;
  noteDate: string | null;
  author: string;
  note: string;
}

export interface ContractDocument {
  documentKey: number;
  documentName: string;
  fileName: string;
  documentDate: string | null;
  categoryType: string;
}

export interface ContractHealth {
  revenue: number;
  consumption: number;
  percentConsumed: number;
  percentTimeElapsed: number;
  margin: number;
  grade: string;
}

export interface ContractDepartment {
  contractDepartmentKey: number;
  departmentKey: number;
  departmentName: string;
  effectiveDate: string | null;
  endDate: string | null;
  nonBillable: boolean;
  poNumber: string | null;
}

export interface ContractAmendment {
  amendmentKey: number;
  amendmentDate: string | null;
  status: string;
  previousTotal: number;
  newTotal: number;
  previousInvoiceAmount: number;
  newInvoiceAmount: number;
  remainingMonths: number;
}

export interface ContractAffiliate {
  affiliateKey: number;
  departmentKey: number;
  departmentName: string;
  clientName: string;
  startDate: string | null;
  endDate: string | null;
}
