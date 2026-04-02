export interface ProductSaleListItem {
  productSaleKey: number;
  invoiceNumber: string;
  clientName: string;
  departmentName: string;
  salesRep: string;
  orderDate: string | null;
  status: string;
  itemCount: number;
  purchaseOrder: string;
  total: number;
  location: string;
}

export interface ProductSaleDetail {
  productSaleKey: number;
  invoiceNumber: string;
  clientName: string;
  departmentName: string;
  salesRep: string;
  orderDate: string | null;
  quoteDate: string | null;
  invoiceDate: string | null;
  canceledDate: string | null;
  status: string;
  purchaseOrder: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
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
  trackingNumber: string | null;
  subTotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  lineItems: ProductSaleLineItem[];
}

export interface ProductSaleLineItem {
  invoiceKey: number;
  itemDescription: string;
  sizeDescription: string;
  quantity: number;
  unitPrice: number;
  extendedPrice: number;
}

export interface ProductSaleStats {
  totalOrders: number;
  openCount: number;
  invoicedCount: number;
  draftCount: number;
  quotedCount: number;
  cancelledCount: number;
  totalRevenue: number;
}

export interface ProductSaleListResponse {
  items: ProductSaleListItem[];
  totalCount: number;
}
