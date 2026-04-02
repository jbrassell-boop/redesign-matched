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
