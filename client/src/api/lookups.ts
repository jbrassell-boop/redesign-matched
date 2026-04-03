import apiClient from './client';

export interface LookupOption {
  key: number;
  name: string;
}

export interface ScopeLookupResult {
  scopeKey: number;
  serialNumber: string;
  scopeTypeKey: number | null;
  scopeTypeDesc: string;
  manufacturerKey: number | null;
  manufacturer: string;
  deptKey: number | null;
  deptName: string;
  clientKey: number | null;
  clientName: string;
}

export const getSalesReps = async (): Promise<LookupOption[]> => {
  const { data } = await apiClient.get<LookupOption[]>('/lookups/sales-reps');
  return data;
};

export const getPricingCategories = async (): Promise<LookupOption[]> => {
  const { data } = await apiClient.get<LookupOption[]>('/lookups/pricing-categories');
  return data;
};

export const getPaymentTerms = async (): Promise<LookupOption[]> => {
  const { data } = await apiClient.get<LookupOption[]>('/lookups/payment-terms');
  return data;
};

export const getCarriers = async (): Promise<LookupOption[]> => {
  const { data } = await apiClient.get<LookupOption[]>('/lookups/carriers');
  return data;
};

export const getRepairLevels = async (): Promise<LookupOption[]> => {
  const { data } = await apiClient.get<LookupOption[]>('/lookups/repair-levels');
  return data;
};

export const getRepairReasonOptions = async (): Promise<LookupOption[]> => {
  const { data } = await apiClient.get<LookupOption[]>('/lookups/repair-reasons');
  return data;
};

export const getScopeTypes = async (): Promise<(LookupOption & { manufacturerKey: number | null })[]> => {
  const { data } = await apiClient.get<(LookupOption & { manufacturerKey: number | null })[]>('/lookups/scope-types');
  return data;
};

export const getManufacturers = async (): Promise<LookupOption[]> => {
  const { data } = await apiClient.get<LookupOption[]>('/lookups/manufacturers');
  return data;
};

export const lookupScopeBySerial = async (sn: string): Promise<ScopeLookupResult | null> => {
  const { data } = await apiClient.get<ScopeLookupResult | null>('/repairs/scope-lookup', { params: { sn } });
  return data;
};

export const getClientsSimple = async (): Promise<LookupOption[]> => {
  const { data } = await apiClient.get<LookupOption[]>('/clients/simple');
  return data;
};

export const getDepartmentsByClient = async (clientKey: number): Promise<LookupOption[]> => {
  const { data } = await apiClient.get<LookupOption[]>(`/departments/by-client/${clientKey}`);
  return data;
};
