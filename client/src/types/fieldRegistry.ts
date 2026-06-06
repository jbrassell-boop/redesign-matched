// client/src/types/fieldRegistry.ts
import { getToken } from '../api/client';

export const FIELD_VERIFIER_API = `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/field-verifier`;

// The field-verifier API now requires an Admin JWT (FieldVerifierController). These
// callers use native fetch (not the Axios apiClient that auto-attaches the token), so
// wrap fetch to attach the Authorization header.
export function fvFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

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
