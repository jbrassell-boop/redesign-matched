// client/src/types/fieldRegistry.ts

export const FIELD_VERIFIER_API = 'http://localhost:5000/api/field-verifier';

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
