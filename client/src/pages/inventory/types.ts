export interface InventoryListItem {
  inventoryKey: number;
  description: string;
  category: string;
  currentLevel: number;
  minLevel: number;
  maxLevel: number;
  isActive: boolean;
  sizeCount: number;
  isLowStock: boolean;
}

export interface InventoryListResponse {
  items: InventoryListItem[];
  totalCount: number;
}

export interface InventorySizeItem {
  sizeKey: number;
  sizeDescription: string;
  currentLevel: number;
  minLevel: number;
  maxLevel: number;
  unitCost: number;
  binNumber: string | null;
  isActive: boolean;
}

export interface InventoryDetail {
  inventoryKey: number;
  description: string;
  category: string;
  currentLevel: number;
  minLevel: number;
  maxLevel: number;
  isActive: boolean;
  isLowStock: boolean;
  noCountAdjustment: boolean;
  notUsedByRepair: boolean;
  alwaysReOrder: boolean;
  largeDiameter: boolean;
  skipPickList: boolean;
  lastUpdate: string | null;
  createDate: string | null;
  sizes: InventorySizeItem[];
}

export interface InventoryReceivingItem {
  inventorySizeKey: number;
  inventoryKey: number;
  description: string;
  sizeDescription: string;
  currentLevel: number;
  minLevel: number;
  maxLevel: number;
  binNumber: string | null;
}

export interface ReceiveInventoryRequest {
  inventorySizeKey: number;
  quantity: number;
  lotNumber?: string;
  binNumber?: string;
  notes?: string;
}

export interface InventoryStats {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  lowStockCount: number;
}

export interface InventoryPurchaseOrder {
  supplierPOKey: number;
  poNumber: string;
  supplierName: string;
  poDate: string;
  poTotal: number;
  cancelled: boolean;
  lineCount: number;
  orderedQty: number;
  receivedQty: number;
}

export interface InventorySupplierItem {
  supplierSizesKey: number;
  supplierKey: number;
  supplierName: string;
  sizeDescription: string;
  partNumber: string;
  unitCost: number;
  orderMinimum: number;
  isActive: boolean;
}

// ── Purchase-order receive ───────────────────────────────────────────────────

export interface PoReceiptLine {
  supplierPOTranKey: number;
  supplierPOKey: number;
  poNumber: string;
  supplierName: string;
  itemDescription: string;
  sizeDescription: string;
  inventorySizeKey: number;
  orderedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  unitCost: number;
  qtyPerUnit: number;
  poDate: string | null;
}

export interface ReceivePoLineRequest {
  supplierPOTranKey: number;
  quantityReceived: number;
  binNumber?: string | null;
  storageLocation?: string | null;
  expirationDate?: string | null;
  lotNumberOverride?: string | null;
}

export interface ReceivePoLineResponse {
  lotNumber: string;
  receivedQuantityTotal: number;
  newLocationLevel: number;
}
