export interface DiQueueItem {
  repairKey: number;
  woNumber: string;
  client: string;
  scopeType: string;
  serialNumber: string;
  scannedAt: string;
  failureCount: number;
  itemsLoaded: number;
  scanStatus: string; // 'Success' | 'BarcodeError' | 'OMRError' | 'Duplicate'
}

export interface LoadedRepair {
  tranKey: number;
  description: string;
  finding: string; // D&I field name that triggered this item
  approved: string;
}
