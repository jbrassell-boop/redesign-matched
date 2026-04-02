export interface ScopeModelListItem {
  scopeTypeKey: number;
  description: string;
  type: string;
  manufacturer: string;
  category: string;
  active: boolean;
  insertTubeLength: string;
  insertTubeDiameter: string;
  fieldOfView: string;
  directionOfView: string;
  angUp: string;
  angDown: string;
  angLeft: string;
  angRight: string;
}

export interface ScopeModelDetail {
  scopeTypeKey: number;
  description: string;
  longDescription: string;
  type: string;
  typeId: string;
  manufacturer: string;
  category: string;
  active: boolean;
  angUp: string;
  angDown: string;
  angLeft: string;
  angRight: string;
  insertTubeLength: string;
  insertTubeDiameter: string;
  forcepChannelSize: string;
  fieldOfView: string;
  directionOfView: string;
  depthOfField: string;
  lengthSpec: string;
  tubeSystem: string;
  lensSystem: string;
  degree: string;
  idBand: string;
  eyeCupMount: string;
  contractCost: number | null;
  maxCharge: number | null;
  glAccount: string;
  itemCode: string;
  inspRequired: boolean;
  forceOnPortal: boolean;
  skipPortal: boolean;
  autoclaveable: boolean;
  drawing: boolean;
  notes: string;
  lastUpdated: string;
}

export interface ScopeModelStats {
  total: number;
  activeCount: number;
  inactiveCount: number;
  flexible: number;
  rigid: number;
  camera: number;
}

export interface ScopeModelListResponse {
  items: ScopeModelListItem[];
  totalCount: number;
}

export interface ScopeModelsFilters {
  search: string;
  page: number;
  pageSize: number;
  typeFilter: string;
  statusFilter: string;
  manufacturerKey: number | null;
}

export interface Manufacturer {
  key: number;
  name: string;
}
