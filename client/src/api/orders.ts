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

export interface CreateOrderRequest {
  departmentKey: number;
  orderType: string;
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

export const createOrder = async (req: CreateOrderRequest): Promise<CreateOrderResponse> => {
  const { data } = await apiClient.post<CreateOrderResponse>('/orders', req);
  return data;
};
