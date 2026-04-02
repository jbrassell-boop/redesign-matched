import apiClient from './client';

export interface PendingArrival {
  repairKey: number;
  workOrderNumber: string;
  clientName: string;
  departmentName: string;
  scopeTypeDesc: string;
  serialNumber: string;
  complaintDesc: string;
  repairStatus: string;
  dateIn: string | null;
  daysIn: number;
}

export interface ReceivingStats {
  totalPending: number;
  overdue: number;
  today: number;
}

export interface ReceiveIntakeRequest {
  departmentKey: number;
  scopeTypeKey?: number;
  serialNumber: string;
  complaintDesc: string;
  poNumber?: string;
  trackingIn?: string;
  notes?: string;
}

export interface ReceiveIntakeResponse {
  repairKey: number;
  workOrderNumber: string;
}

export const getPendingArrivals = async (search?: string): Promise<PendingArrival[]> => {
  const { data } = await apiClient.get<PendingArrival[]>('/receiving/pending', {
    params: search ? { search } : undefined,
  });
  return data;
};

export const getReceivingStats = async (): Promise<ReceivingStats> => {
  const { data } = await apiClient.get<ReceivingStats>('/receiving/stats');
  return data;
};

export const intakeReceive = async (req: ReceiveIntakeRequest): Promise<ReceiveIntakeResponse> => {
  const { data } = await apiClient.post<ReceiveIntakeResponse>('/receiving/intake', req);
  return data;
};
