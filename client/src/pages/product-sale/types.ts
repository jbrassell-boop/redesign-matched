/* ── Product Sales Types ─────────────────────────────────────────────────── */

export interface ProductSaleListItem {
  productSaleKey: number;
  invoiceNumber: string;
  clientName: string;
  departmentName: string;
  status: string;
  source: string;
  salesRep: string;
  orderDate: string | null;
  total: number;
  itemCount: number;
  backorderedCount: number;
  parentProductSaleKey: number | null;
}

export interface ProductSaleStats {
  total: number;
  draft: number;
  quoted: number;
  approved: number;
  invoiced: number;
  cancelled: number;
  revenue: number;
}

export interface ProductSaleListResponse {
  items: ProductSaleListItem[];
  totalCount: number;
}

/* ── Detail ──────────────────────────────────────────────────────────────── */

export interface ProductSaleDetail {
  productSaleKey: number;
  invoiceNumber: string;
  status: string;
  clientKey: number | null;
  clientName: string;
  departmentKey: number | null;
  departmentName: string;
  salesRepKey: number | null;
  salesRep: string;
  orderDate: string | null;
  quoteDate: string | null;
  expirationDate: string | null;
  approvalDate: string | null;
  deniedDate: string | null;
  canceledDate: string | null;
  invoiceDate: string | null;
  purchaseOrder: string;
  shipTrackingNumber: string | null;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  quoteAmount: number;
  pricingListKey: number | null;
  pricingListName: string | null;
  note: string | null;
  // contact
  contactKey: number | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  // ship address
  shipName1: string | null;
  shipName2: string | null;
  shipAddressLine1: string | null;
  shipAddressLine2: string | null;
  shipCity: string | null;
  shipState: string | null;
  shipZipCode: string | null;
  shipCountry: string | null;
  // bill address
  billName1: string | null;
  billName2: string | null;
  billAddressLine1: string | null;
  billAddressLine2: string | null;
  billCity: string | null;
  billState: string | null;
  billZipCode: string | null;
  billCountry: string | null;
  billType: number | null;
  billEmail: string | null;
  billEmailName: string | null;
  // denial
  deniedBy: string | null;
  denialReason: string | null;
  // estimated ship
  estimatedShipDateFrom: string | null;
  estimatedShipDateTo: string | null;
  // parent reference
  parentProductSaleKey: number | null;
  parentInvoiceNumber: string | null;
  // line items
  lineItems: ProductSaleLineItem[];
}

/* ── Line Items ──────────────────────────────────────────────────────────── */

export interface ProductSaleLineItem {
  productSaleInventoryKey: number;
  inventorySizeKey: number | null;
  itemDescription: string;
  sizeDescription: string;
  sizeDescription2: string | null;
  sizeDescription3: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  lotNumber: string | null;
  itemStatus: string;
}

/* ── Inventory Picker ────────────────────────────────────────────────────── */

export interface InventoryCategory {
  inventoryKey: number;
  itemDescription: string;
}

export interface InventorySize {
  inventorySizeKey: number;
  sizeDescription: string;
  sizeDescription2: string | null;
  sizeDescription3: string | null;
  status: string | null;
  unitCost: number;
}

/* ── Related Orders ─────────────────────────────────────────────────────── */

export interface RelatedOrderItem {
  productSaleKey: number;
  invoiceNumber: string;
  status: string;
  itemCount: number;
}

export interface RelatedOrdersResponse {
  parent: RelatedOrderItem | null;
  children: RelatedOrderItem[];
}

/* ── Invoice Response ───────────────────────────────────────────────────── */

export interface InvoiceResponse {
  invoiceNumber: string;
  invoiceDate: string;
  childOrderKey: number | null;
  childOrderItemCount: number;
}
