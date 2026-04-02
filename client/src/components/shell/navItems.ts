export interface NavItem {
  key: string;
  label: string;
  path: string;
}

export interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { key: 'workspace', label: 'My Workspace', path: '/workspace' },
      { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    items: [
      { key: 'clients', label: 'Clients', path: '/clients' },
      { key: 'departments', label: 'Departments', path: '/departments' },
      { key: 'contracts', label: 'Contracts', path: '/contracts' },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    items: [
      { key: 'repairs', label: 'Repairs', path: '/repairs' },
      { key: 'instruments', label: 'Instrument Repair', path: '/instruments' },
      { key: 'endocarts', label: 'Carts', path: '/endocarts' },
      { key: 'loaners', label: 'Loaners', path: '/loaners' },
      { key: 'product-sale', label: 'Product Sale', path: '/product-sale' },
      { key: 'onsite-services', label: 'Onsite Services', path: '/onsite-services' },
      { key: 'outsource-validation', label: 'Outsource Validation', path: '/outsource-validation' },
    ],
  },
  {
    key: 'catalog',
    label: 'Catalog',
    items: [
      { key: 'inventory', label: 'Inventory', path: '/inventory' },
      { key: 'suppliers', label: 'Suppliers', path: '/suppliers' },
      { key: 'scope-model', label: 'Scope Model', path: '/scope-model' },
      { key: 'acquisitions', label: 'Acquisitions', path: '/acquisitions' },
    ],
  },
  {
    key: 'management',
    label: 'Management',
    items: [
      { key: 'quality', label: 'Quality', path: '/quality' },
      { key: 'financial', label: 'Financial', path: '/financial' },
      { key: 'reports', label: 'Reports/Extracts', path: '/reports' },
      { key: 'administration', label: 'Administration', path: '/administration' },
      { key: 'development-list', label: 'Development List', path: '/development-list' },
    ],
  },
];
