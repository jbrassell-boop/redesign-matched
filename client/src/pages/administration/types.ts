export interface AdminUserItem {
  userKey: number;
  name: string;
  email: string;
  role: string | null;
  location: string | null;
  lastLogin: string | null;
  isActive: boolean;
}

export interface AdminUserListResponse {
  items: AdminUserItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SecurityGroupItem {
  groupKey: number;
  groupName: string;
  description: string | null;
  memberCount: number;
  isActive: boolean;
}

export interface DeliveryMethodItem {
  methodKey: number;
  methodName: string;
  cost: number | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface PaymentTermsItem {
  termsKey: number;
  description: string;
  greatPlainsId: string | null;
  dueDays: number | null;
  dueDateMode: string | null;
  isDefault: boolean;
}

export interface ScopeCategoryItem {
  categoryKey: number;
  categoryName: string;
  instrumentType: string | null;
  size: string | null;
  isActive: boolean;
}

export interface DistributorItem {
  distributorKey: number;
  name: string;
  contact: string | null;
  phone: string | null;
  companyName: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
}

export interface CompanyItem {
  companyKey: number;
  companyName: string;
  abbreviation: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  peachTreeId: string | null;
  distributorCount: number;
}

export interface RepairReasonItem {
  reasonKey: number;
  reason: string;
  category: string | null;
  isActive: boolean;
}

export interface RepairStatusItem {
  statusId: number;
  statusName: string;
  sortOrder: number | null;
  isActive: boolean;
  isReadOnly: boolean;
}

export interface HolidayItem {
  holidayKey: number;
  holidayName: string;
  holidayDate: string | null;
  dayOfWeek: string | null;
  isRecurring: boolean;
  isActive: boolean;
}

export interface SalesTaxItem {
  taxKey: number;
  stateCode: string | null;
  stateName: string | null;
  rate: number | null;
  effectiveDate: string | null;
  isTaxable: boolean;
}

export interface CreditLimitItem {
  limitKey: number;
  amount: number;
}

export interface PricingListItem {
  listKey: number;
  listName: string;
  clientCount: number;
  itemCount: number;
  lastUpdated: string | null;
  isActive: boolean;
}

export interface SystemSettingItem {
  configKey: number;
  name: string;
  boolValue: boolean | null;
  stringValue: string | null;
  intValue: number | null;
  decimalValue: number | null;
}

export interface AuditLogItem {
  auditKey: number;
  timestamp: string;
  userName: string;
  action: string;
  module: string;
  description: string;
  ipAddress: string | null;
}

export interface AuditLogResponse {
  items: AuditLogItem[];
  totalCount: number;
}

export interface ReportingGroupItem {
  groupKey: number;
  groupName: string;
  isActive: boolean;
}

export interface StandardDeptItem {
  deptKey: number;
  deptName: string;
  isActive: boolean;
}

export interface CleaningSystemItem {
  systemKey: number;
  systemName: string;
  isActive: boolean;
}

export interface CountryItem {
  countryKey: number;
  countryName: string;
}

export interface SalesRepOption {
  salesRepKey: number;
  name: string;
}

export interface SalesRepAssignment {
  departmentKey: number;
  clientName: string;
  departmentName: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  currentRep: string;
}

export interface BonusPoolItem {
  poolKey: number;
  name: string;
  period: string | null;
  target: number | null;
  actual: number | null;
  payoutPct: number | null;
  isActive: boolean;
}

export interface AdminStats {
  activeUsers: number;
  securityGroups: number;
  pricingLists: number;
  auditEntries24h: number;
  lockedAccounts: number;
}
