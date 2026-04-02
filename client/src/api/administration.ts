import apiClient from './client';

export const getAdminUsers = (params: any) =>
  apiClient.get('/administration/users', { params }).then(r => r.data);

export const getSecurityGroups = () =>
  apiClient.get('/administration/security-groups').then(r => r.data);

export const getDeliveryMethods = () =>
  apiClient.get('/administration/delivery-methods').then(r => r.data);

export const getPaymentTerms = () =>
  apiClient.get('/administration/payment-terms').then(r => r.data);

export const getScopeCategories = (type?: string) =>
  apiClient.get('/administration/scope-categories', { params: type ? { type } : {} }).then(r => r.data);

export const getDistributors = (active?: boolean) =>
  apiClient.get('/administration/distributors', { params: active !== undefined ? { active } : {} }).then(r => r.data);

export const getCompanies = () =>
  apiClient.get('/administration/companies').then(r => r.data);

export const getRepairReasons = () =>
  apiClient.get('/administration/repair-reasons').then(r => r.data);

export const getRepairStatuses = () =>
  apiClient.get('/administration/repair-statuses').then(r => r.data);

export const getHolidays = () =>
  apiClient.get('/administration/holidays').then(r => r.data);

export const getSalesTax = () =>
  apiClient.get('/administration/sales-tax').then(r => r.data);

export const getPricingLists = () =>
  apiClient.get('/administration/pricing-lists').then(r => r.data);

export const getSettings = () =>
  apiClient.get('/administration/settings').then(r => r.data);

export const getAuditLog = (params: {
  search?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) =>
  apiClient.get('/administration/audit-log', { params }).then(r => r.data);

export const getCreditLimits = () =>
  apiClient.get('/administration/credit-limits').then(r => r.data);

export const getReportingGroups = () =>
  apiClient.get('/administration/reporting-groups').then(r => r.data);

export const getStandardDepts = () =>
  apiClient.get('/administration/standard-depts').then(r => r.data);

export const getCleaningSystems = () =>
  apiClient.get('/administration/cleaning-systems').then(r => r.data);

export const getCountries = () =>
  apiClient.get('/administration/countries').then(r => r.data);

export const getSalesReps = (companyKey?: number) =>
  apiClient.get('/administration/sales-reps', { params: companyKey ? { companyKey } : {} }).then(r => r.data);

export const getSalesRepAssignments = (salesRepKey: number) =>
  apiClient.get('/administration/sales-rep-assignments', { params: { salesRepKey } }).then(r => r.data);

export const getBonusPools = (type: string = 'tech') =>
  apiClient.get('/administration/bonus-pools', { params: { type } }).then(r => r.data);

export const getAdminStats = () =>
  apiClient.get('/administration/stats').then(r => r.data);
