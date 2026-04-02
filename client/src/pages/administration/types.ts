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

export interface AdminStats {
  activeUsers: number;
  securityGroups: number;
  pricingLists: number;
  auditEntries24h: number;
  lockedAccounts: number;
}
