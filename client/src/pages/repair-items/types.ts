export interface RepairItemListItem {
  repairItemKey: number;
  itemDescription: string;
  problemId: string | null;
  tsiCode: string | null;
  productId: string | null;
  rigidOrFlexible: string | null;
  partOrLabor: string | null;
  isActive: boolean;
  turnaroundTime: number | null;
}

export interface RepairItemDetail {
  repairItemKey: number;
  itemDescription: string;
  problemId: string | null;
  tsiCode: string | null;
  productId: string | null;
  rigidOrFlexible: string | null;
  partOrLabor: string | null;
  isActive: boolean;
  turnaroundTime: number | null;
  avgCostMaterial: number | null;
  avgCostLabor: number | null;
  minutesTech1: number | null;
  minutesTech2: number | null;
  minutesTech3: number | null;
  minutesTech1SmallDiameter: number | null;
  minutesTech2SmallDiameter: number | null;
  minutesTech3SmallDiameter: number | null;
  okayToSkip: boolean;
  isAdjustment: boolean;
  skipPickList: boolean;
  profitItemPlus: boolean;
  profitItemMinus: boolean;
  isLocked: boolean;
  lastUpdated: string | null;
}

export interface RepairItemStats {
  total: number;
  active: number;
  inactive: number;
  flexible: number;
  rigid: number;
}

export interface RepairItemListResponse {
  items: RepairItemListItem[];
  totalCount: number;
}

export interface RepairItemCreate {
  itemDescription: string;
  problemId?: string | null;
  tsiCode?: string | null;
  productId?: string | null;
  rigidOrFlexible: string;
  partOrLabor: string;
  turnaroundTime?: number | null;
}

export interface RepairItemUpdate {
  itemDescription?: string;
  problemId?: string | null;
  tsiCode?: string | null;
  productId?: string | null;
  rigidOrFlexible?: string;
  partOrLabor?: string;
  isActive?: boolean;
  turnaroundTime?: number | null;
  avgCostMaterial?: number | null;
  avgCostLabor?: number | null;
  minutesTech1?: number | null;
  minutesTech2?: number | null;
  minutesTech3?: number | null;
  minutesTech1SmallDiameter?: number | null;
  minutesTech2SmallDiameter?: number | null;
  minutesTech3SmallDiameter?: number | null;
  okayToSkip?: boolean;
  isAdjustment?: boolean;
  skipPickList?: boolean;
  profitItemPlus?: boolean;
  profitItemMinus?: boolean;
  isLocked?: boolean;
}
