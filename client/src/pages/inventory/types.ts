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
  lastUpdate: string | null;
  createDate: string | null;
  sizes: InventorySizeItem[];
}

export interface InventoryStats {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  lowStockCount: number;
}
