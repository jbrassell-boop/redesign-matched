# Pages — Route to File Map

All protected routes are wrapped in `RouteGuard → AppShell`. See `client/src/router.tsx`.

---

## Public Routes

| Route | Component | File |
|-------|-----------|------|
| `/login` | LoginPage | `client/src/pages/login/LoginPage.tsx` |
| `/verify` | FieldVerifierPage | `client/src/pages/FieldVerifier/FieldVerifierPage.tsx` |

---

## Protected Routes (require auth)

| Route | Component | File | Layout |
|-------|-----------|------|--------|
| `/` | DashboardPage | `client/src/pages/dashboard/DashboardPage.tsx` | Full-width |
| `/dashboard` | DashboardPage | `client/src/pages/dashboard/DashboardPage.tsx` | Full-width |
| `/clients` | ClientsPage | `client/src/pages/clients/ClientsPage.tsx` | Split |
| `/contracts` | ContractsPage | `client/src/pages/contracts/ContractsPage.tsx` | Split |
| `/departments` | DepartmentsPage | `client/src/pages/departments/DepartmentsPage.tsx` | Split |
| `/inventory` | InventoryPage | `client/src/pages/inventory/InventoryPage.tsx` | Split |
| `/quality` | QualityPage | `client/src/pages/quality/QualityPage.tsx` | Full-width |
| `/repairs` | RepairsPage | `client/src/pages/repairs/RepairsPage.tsx` | Split |
| `/repairs/:repairKey` | RepairsPage | `client/src/pages/repairs/RepairsPage.tsx` | Split (parameterized) |
| `/loaners` | LoanersPage | `client/src/pages/loaners/LoanersPage.tsx` | Split |
| `/suppliers` | SuppliersPage | `client/src/pages/suppliers/SuppliersPage.tsx` | Split |
| `/financial` | FinancialPage | `client/src/pages/financial/FinancialPage.tsx` | Split |
| `/onsite-services` | OnsiteServicesPage | `client/src/pages/onsite-services/OnsiteServicesPage.tsx` | Split |
| `/scope-model` | ScopeModelPage | `client/src/pages/scope-model/ScopeModelPage.tsx` | Split |
| `/instruments` | InstrumentsPage | `client/src/pages/instruments/InstrumentsPage.tsx` | Split |
| `/outsource-validation` | OutsourceValidationPage | `client/src/pages/outsource-validation/OutsourceValidationPage.tsx` | Split |
| `/acquisitions` | AcquisitionsPage | `client/src/pages/acquisitions/AcquisitionsPage.tsx` | Split |
| `/product-sale` | ProductSalePage | `client/src/pages/product-sale/ProductSalePage.tsx` | Split |
| `/reports` | ReportsPage | `client/src/pages/reports/ReportsPage.tsx` | Full-width |
| `/workspace` | WorkspacePage | `client/src/pages/workspace/WorkspacePage.tsx` | Split |
| `/administration` | AdministrationPage | `client/src/pages/administration/AdministrationPage.tsx` | Full-width |
| `/development-list` | DevelopmentListPage | `client/src/pages/development-list/DevelopmentListPage.tsx` | Full-width |
| `/endocarts` | EndoCartsPage | `client/src/pages/endocarts/EndoCartsPage.tsx` | Split |
| `/receiving` | ReceivingPage | `client/src/pages/receiving/ReceivingPage.tsx` | Split |
| `/repair-items` | RepairItemsPage | `client/src/pages/repair-items/RepairItemsPage.tsx` | Split |
| `*` | NotFoundPage | `client/src/pages/not-found/NotFoundPage.tsx` | — |

---

## Page File Anatomy (split-layout)

Each split-layout screen folder contains:

| File | Purpose |
|------|---------|
| `XxxPage.tsx` | Container: fetches data, owns state, renders StatStrip + SplitLayout |
| `XxxList.tsx` | Left panel (260–320px): search input + scrollable list + collapse toggle |
| `XxxDetailPane.tsx` | Right panel: DetailHeader + TabBar + tab content panels |
| `tabs/XxxTab.tsx` | Individual tab content panels |
| `types.ts` | TypeScript interfaces matching backend models |

---

## Backend API Endpoints (per domain)

| Route prefix | Controller file |
|---|---|
| `/api/auth` | `AuthController.cs` |
| `/api/clients` | `ClientsController.cs` |
| `/api/contracts` | `ContractsController.cs` |
| `/api/departments` | `DepartmentsController.cs` |
| `/api/repairs` | `RepairsController.cs` |
| `/api/repair-items` | `RepairItemsController.cs` |
| `/api/inventory` | `InventoryController.cs` |
| `/api/quality` | `QualityController.cs` |
| `/api/loaners` | `LoanersController.cs` |
| `/api/suppliers` | `SuppliersController.cs` |
| `/api/financial` | `FinancialController.cs` |
| `/api/onsite-services` | `OnsiteServicesController.cs` |
| `/api/scope-models` | `ScopeModelsController.cs` |
| `/api/instruments` | `InstrumentsController.cs` |
| `/api/outsource-validation` | `OutsourceValidationController.cs` |
| `/api/acquisitions` | `AcquisitionsController.cs` |
| `/api/product-sales` | `ProductSalesController.cs` |
| `/api/reports` | `ReportsController.cs` |
| `/api/workspace` | `WorkspaceController.cs` |
| `/api/administration` | `AdministrationController.cs` |
| `/api/development-list` | `DevelopmentListController.cs` |
| `/api/endocarts` | `EndoCartsController.cs` |
| `/api/receiving` | `ReceivingController.cs` |
| `/api/orders` | `OrdersController.cs` |
| `/api/search` | `SearchController.cs` |
| `/api/lookups` | `LookupsController.cs` |
| `/api/field-verifier` | `FieldVerifierController.cs` |

---

## Tabs Built Per Screen

### Repairs (`/repairs`)
`tabs/`: Details, Financials, LineItems, ScopeHistory, Notes, Documents

### Clients (`/clients`)
`tabs/`: Main, Contacts, RepairHistory, Flags, Notes

### Departments (`/departments`)
`tabs/`: Main, Scopes, GPOs, SubGroups, Contacts, Notes

### Contracts (`/contracts`)
`tabs/`: Specs, Affiliates, Amendments, Scopes, Repairs, Invoices

### Inventory (`/inventory`)
`tabs/`: Inventory, Sizes

### Suppliers (`/suppliers`)
`tabs/`: Main, Inventory, Documents

### Scope Model (`/scope-model`)
`tabs/`: Main, RepairItems, MaxCharges

### Repair Items (`/repair-items`)
`tabs/`: Main, Pricing

---

_Last updated: 2026-04-09_
