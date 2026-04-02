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

export const getAdminStats = () =>
  apiClient.get('/administration/stats').then(r => r.data);
