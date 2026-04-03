export interface InvoiceListItem {
  invoiceKey: number;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  taxAmount: number;
  discount: number;
  paymentTerms: string;
  glAccount: string;
  issuedDate: string | null;
  dueDate: string | null;
  agingDays: number;
  status: string;
  deliveryMethod: string;
  greatPlainsId: string;
}

export interface InvoiceDetail {
  invoiceKey: number;
  repairKey: number | null;
  clientKey: number | null;
  departmentKey: number | null;
  invoiceNumber: string;
  clientName: string;
  billName: string;
  billAddress: string;
  billCity: string;
  billState: string;
  billZip: string;
  shipName: string;
  shipAddress: string;
  shipCity: string;
  shipState: string;
  shipZip: string;
  amount: number;
  shippingAmount: number;
  taxAmount: number;
  paymentTerms: string;
  deliveryMethod: string;
  purchaseOrder: string;
  scopeType: string;
  serialNumber: string;
  salesRep: string;
  issuedDate: string | null;
  dueDate: string | null;
  agingDays: number;
  status: string;
  lineItems: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  detailKey: number;
  description: string;
  amount: number;
  value: number;
  comments: string | null;
}

export interface InvoicePaymentItem {
  paymentId: number;
  invoiceKey: number;
  invoiceNumber: string;
  clientName: string;
  paymentAmount: number;
  paymentDate: string | null;
}

export interface ClientOnHold {
  clientKey: number;
  clientName: string;
  departmentName: string;
  onHoldDate: string | null;
  reason: string;
}

export interface FinancialStats {
  outstandingAR: number;
  overdueCount: number;
  avgDaysToPay: number;
  draftsCount: number;
  onHoldCount: number;
  paidMTD: number;
  dso: number;
  revenueMTD: number;
}

export interface InvoiceListResponse {
  items: InvoiceListItem[];
  totalCount: number;
}

export interface PaymentListResponse {
  items: InvoicePaymentItem[];
  totalCount: number;
}

export interface HoldListResponse {
  items: ClientOnHold[];
  totalCount: number;
}

export type FinancialTab = 'outstanding' | 'drafts' | 'hold' | 'payments' | 'gl' | 'atrisk' | 'trending';

export interface GLAccountItem {
  accountNumber: string;
  batchNumber: string;
}

export interface AtRiskItem {
  departmentKey: number;
  departmentName: string;
  clientName: string;
  repairCount: number;
  revenue: number;
  laborCost: number;
  materialCost: number;
  outsourceCost: number;
  shippingCost: number;
  commissionCost: number;
  totalExpenses: number;
  margin: number;
  marginPct: number;
}

export interface TrendingItem {
  month: string;
  repairCount: number;
  revenue: number;
  laborCost: number;
  materialCost: number;
  outsourceCost: number;
  totalExpenses: number;
  margin: number;
  marginPct: number;
}
