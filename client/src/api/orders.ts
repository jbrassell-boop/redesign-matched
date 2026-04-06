import apiClient from './client';

export interface WizardClient {
  clientKey: number;
  name: string;
  city: string;
  state: string;
  zip: string;
  isActive: boolean;
}

export interface WizardDepartment {
  departmentKey: number;
  clientKey: number;
  name: string;
}

export interface WizardScope {
  scopeKey: number;
  serialNumber: string;
  model: string;
  manufacturer: string;
  type: string; // F, R, C, I
}

export interface WizardInstrumentType {
  typeCode: string;
  label: string;
}

export interface WizardScopeType {
  scopeTypeKey: number;
  description: string;
  manufacturer: string;
}

export interface CreateOrderRequest {
  departmentKey: number;
  orderType: string;
  scopeKey?: number | null;
  serialNumber?: string | null;
  scopeTypeKey?: number | null;
  complaint?: string | null;
  purchaseOrder?: string | null;
  rackPosition?: string | null;
  packageTypeKey?: number | null;
  includesCaseYN?: string | null;
  includesETOCapYN?: string | null;
  includesWaterProofCapYN?: string | null;
}

export interface CreateOrderResponse {
  repairKey: number;
  workOrderNumber: string;
}

export const getWizardClients = async (search?: string): Promise<WizardClient[]> => {
  const { data } = await apiClient.get<WizardClient[]>('/orders/wizard/clients', {
    params: search ? { search } : undefined,
  });
  return data;
};

export const getWizardDepartments = async (clientKey: number): Promise<WizardDepartment[]> => {
  const { data } = await apiClient.get<WizardDepartment[]>('/orders/wizard/departments', {
    params: { clientKey },
  });
  return data;
};

export const getWizardScopes = async (deptKey: number): Promise<WizardScope[]> => {
  const { data } = await apiClient.get<WizardScope[]>('/orders/wizard/scopes', {
    params: { deptKey },
  });
  return data;
};

export const getInstrumentTypes = async (): Promise<WizardInstrumentType[]> => {
  const { data } = await apiClient.get<WizardInstrumentType[]>('/orders/wizard/instrument-types');
  return data;
};

export const getWizardScopeTypes = async (instrumentType: string): Promise<WizardScopeType[]> => {
  const { data } = await apiClient.get<WizardScopeType[]>('/orders/wizard/scope-types', {
    params: { instrumentType },
  });
  return data;
};

export const createOrder = async (req: CreateOrderRequest): Promise<CreateOrderResponse> => {
  const { data } = await apiClient.post<CreateOrderResponse>('/orders', req);
  return data;
};
