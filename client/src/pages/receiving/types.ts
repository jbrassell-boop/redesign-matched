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
