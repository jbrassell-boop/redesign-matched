// client/src/types/fieldRegistry.ts

export const FIELD_VERIFIER_API = `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/field-verifier`;

export interface FieldEntry {
  id: string;
  label: string;
  sqlTable: string;
  sqlQuery: string;
  apiEndpoint: string;
  responseProperty: string;
  status: 'unverified' | 'confirmed' | 'flagged';
  notes: string;
  verifiedAt: string;
  verifiedBy: string;
}

export interface ScreenRegistry {
  screen: string;
  lastUpdated: string;
  fields: FieldEntry[];
}

// Maps screen display name → registry file slug
// Used by DevInspectorPanel to construct deep-links to /verify
export const SCREEN_FILES_REVERSE: Record<string, string> = {
  'Dashboard': 'dashboard',
  'Clients': 'clients',
  'Departments': 'departments',
  'Repairs': 'repairs',
  'Inventory': 'inventory',
  'Contracts': 'contracts',
  'Onsite Services': 'onsite-services',
  'Product Sale': 'product-sale',
  'Financial': 'financial',
  'Suppliers': 'suppliers',
  'Scope Model': 'scope-model',
};

// Maps route pathname → registry screen name
// Must stay in sync with SCREEN_FILES in FieldVerifier/index.tsx
export const ROUTE_TO_SCREEN: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/clients': 'Clients',
  '/departments': 'Departments',
  '/repairs': 'Repairs',
  '/inventory': 'Inventory',
  '/contracts': 'Contracts',
  '/onsite-services': 'Onsite Services',
  '/product-sale': 'Product Sale',
  '/financial': 'Financial',
  '/suppliers': 'Suppliers',
  '/scope-model': 'Scope Model',
};
