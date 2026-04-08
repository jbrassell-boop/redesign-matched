# redesign-matched — AI Context Map

> **Stack:** raw-http | none | unknown | javascript

> 0 routes | 0 models | 0 components | 38 lib files | 1 env vars | 1 middleware | 545 import links
> **Token savings:** this file is ~2,900 tokens. Without it, AI exploration would cost ~19,400 tokens. **Saves ~16,400 tokens per conversation.**

---

# Libraries

- `client\src\api\acquisitions.ts`
  - function getAcquisitions
  - function getAcquisitionsSold
  - function getAcquisitionStats
  - function getAcquisitionDetail
- `client\src\api\administration.ts`
  - function getAdminUsers
  - function getSecurityGroups
  - function getDeliveryMethods
  - function getPaymentTerms
  - function getScopeCategories
  - function getDistributors
  - _...24 more_
- `client\src\api\auth.ts`
  - function login
  - function logout
  - interface LoginResponse
- `client\src\api\client.ts`
  - function getToken
  - function setToken
  - function removeToken
- `client\src\api\clients.ts`
  - function getClients
  - function getClientDetail
  - function getClientContacts
  - function getClientDepartments
  - function getClientFlags
  - function getClientFull
  - _...16 more_
- `client\src\api\contracts.ts`
  - function getContracts
  - function getContract
  - function getContractStats
  - function getContractScopes
  - function getContractRepairs
  - function getContractInvoices
  - _...9 more_
- `client\src\api\dashboard.ts`
  - function getDashboardStats
  - function getDashboardRepairs
  - function getDashboardTasks
  - function getDashboardEmails
  - function getDashboardShipping
  - function getDashboardInvoices
  - _...4 more_
- `client\src\api\departments.ts`
  - function getDepartments
  - function getDepartmentDetail
  - function getDepartmentFull
  - function getDepartmentKpis
  - function updateDepartment
  - function getDepartmentContacts
  - _...17 more_
- `client\src\api\development-list.ts`
  - function getDevList
  - function getDevListDetail
  - function getDevListStatuses
  - function getDevListStats
- `client\src\api\endocarts.ts`
  - function getEndoCartScopeInventory
  - function getEndoCartServiceHistory
  - function getEndoCartStats
- `client\src\api\financial.ts`
  - function getInvoices
  - function getInvoiceDetail
  - function getPayments
  - function getClientsOnHold
  - function getGLAccounts
  - function getFinancialStats
  - _...2 more_
- `client\src\api\instruments.ts`
  - function getInstrumentRepairs
  - function getInstrumentRepairDetail
  - function getInstrumentCatalog
  - function getInstrumentCatalogDetail
  - function getInstrumentStats
- `client\src\api\inventory.ts`
  - function getInventoryList
  - function getInventoryDetail
  - function getInventoryStats
  - function getInventoryPurchaseOrders
  - function getInventorySuppliers
  - function getInventoryPendingReceipt
  - _...1 more_
- `client\src\api\loaners.ts`
  - function getLoaners
  - function getLoanerDetail
  - function getLoanerStats
  - function getLoanerRequests
  - function fulfillLoanerRequest
  - function declineLoanerRequest
  - _...2 more_
- `client\src\api\lookups.ts`
  - function getSalesReps
  - function getPricingCategories
  - function getPaymentTerms
  - function getCarriers
  - function getRepairLevels
  - function getRepairReasonOptions
  - _...7 more_
- `client\src\api\onsite-services.ts`
  - function getOnsiteServices
  - function getOnsiteServiceStats
  - function createOnsiteVisit
  - function updateOnsiteStatus
  - function getOnsiteServiceDetail
  - function getOnsiteServiceTrays
  - _...1 more_
- `client\src\api\orders.ts`
  - function getWizardClients
  - function getWizardDepartments
  - function getWizardScopes
  - function getInstrumentTypes
  - function getWizardScopeTypes
  - function createOrder
  - _...7 more_
- `client\src\api\outsource-validation.ts`
  - function getOutsourceValidation
  - function getOutsourceStats
  - function getOutsourceVendors
  - function sendToVendor
  - function receiveBack
  - function validateOutsource
- `client\src\api\product-sales.ts`
  - function getProductSales
  - function getProductSaleDetail
  - function getProductSaleStats
  - function createProductSale
- `client\src\api\quality.ts`
  - function getQualityInspections
  - function getQualityInspection
  - function getQualityStats
  - function getQualityNcr
  - function getQualityRework
- `client\src\api\receiving.ts`
  - function getPendingArrivals
  - function getReceivingStats
  - function intakeReceive
  - interface PendingArrival
  - interface ReceivingStats
  - interface ReceiveIntakeRequest
  - _...1 more_
- `client\src\api\repair-items.ts`
  - function getRepairItems
  - function getRepairItemDetail
  - function getRepairItemStats
  - function createRepairItem
  - function updateRepairItem
  - function deleteRepairItem
- `client\src\api\repairs.ts`
  - function getRepairs
  - function getRepairDetail
  - function getRepairLineItems
  - function getRepairScopeHistory
  - function getRepairFinancials
  - function updateRepairNotes
  - _...35 more_
- `client\src\api\scopeModels.ts`
  - function getScopeModels
  - function getScopeModelDetail
  - function getScopeModelStats
  - function getManufacturers
  - function getScopeModelRepairItems
  - function getScopeModelMaxCharges
  - _...4 more_
- `client\src\api\search.ts`
  - function globalSearch
  - interface SearchResult
  - interface SearchResponse
- `client\src\api\suppliers.ts`
  - function getSuppliers
  - function getSupplierDetail
  - function getSupplierStats
  - function getSupplierInventory
  - function getSupplierDocuments
  - function updateSupplier
  - _...1 more_
- `client\src\api\workspace.ts` — function getWorkspaceData
- `client\src\components\common\alertsController.ts` — function evaluateRepair: (data) => AlertInput[], function evaluateClient: (data) => AlertInput[]
- `client\src\components\common\useBulkSelect.ts` — function useBulkSelect: () => BulkSelectReturn<K>, interface BulkSelectReturn
- `client\src\hooks\useAlerts.ts`
  - function useAlerts: () => void
  - interface Alert
  - type AlertType
- `client\src\hooks\useAuth.ts` — function useAuth
- `client\src\hooks\useAutosave.ts`
  - function useAutosave: (saveFn) => void
  - interface UseAutosaveReturn
  - type AutosaveStatus
- `client\src\hooks\useDensity.ts` — function useDensity: () => void, type Density
- `client\src\hooks\useKeyboardNav.ts` — function useKeyboardNav: (items, selectedIndex, onSelect) => void
- `client\src\hooks\useTabBadges.ts` — function useTabBadges: (fetchers, CountFetcher>, deps) => void
- `client\src\pages\contracts\tabs\shared.ts`
  - function fmtDate
  - function fmtMoney
  - function fmtMoneyDecimal
  - function repairStatusColor
  - const spinnerContainerStyle: React.CSSProperties
  - const emptyStateStyle: React.CSSProperties
  - _...35 more_
- `client\src\pages\dashboard\columnDefs.ts` — function getColumnsForView, function getRowKey
- `client\src\pages\workspace\widgetRegistry.ts`
  - function loadLayout: () => WorkspaceLayout
  - function saveLayout: (layout) => void
  - interface WidgetConfig
  - interface WidgetInstance
  - interface WorkspaceLayout
  - const WIDGET_COMPONENTS: Record<string, ComponentType>
  - _...2 more_

---

# Config

## Environment Variables

- `VITE_API_BASE_URL` **required** — client\src\api\client.ts

## Config Files

- `client\vite.config.ts`

---

# Middleware

## auth
- auth — `client\src\api\auth.ts`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `client\src\pages\repairs\types.ts` — imported by **45** files
- `client\src\api\client.ts` — imported by **33** files
- `client\src\api\repairs.ts` — imported by **25** files
- `client\src\pages\clients\types.ts` — imported by **20** files
- `client\src\pages\contracts\types.ts` — imported by **16** files
- `client\src\pages\departments\types.ts` — imported by **14** files
- `client\src\api\departments.ts` — imported by **13** files
- `client\src\components\shared\StatStrip.tsx` — imported by **12** files
- `client\src\api\contracts.ts` — imported by **12** files
- `client\src\pages\dashboard\types.ts` — imported by **12** files
- `client\src\hooks\useAutosave.ts` — imported by **10** files
- `client\src\components\common\ExportButton.tsx` — imported by **10** files
- `client\src\api\lookups.ts` — imported by **10** files
- `client\src\api\clients.ts` — imported by **9** files
- `client\src\pages\inventory\types.ts` — imported by **7** files
- `client\src\components\common\AutosaveIndicator.tsx` — imported by **7** files
- `client\src\api\dashboard.ts` — imported by **7** files
- `client\src\pages\suppliers\types.ts` — imported by **6** files
- `client\src\components\shared\TabBar.tsx` — imported by **6** files
- `client\src\pages\repair-items\types.ts` — imported by **6** files

## Import Map (who imports what)

- `client\src\pages\repairs\types.ts` ← `client\src\api\clients.ts`, `client\src\api\departments.ts`, `client\src\api\repairs.ts`, `client\src\pages\repairs\CockpitHeader.tsx`, `client\src\pages\repairs\components\AmendmentModal.tsx` +40 more
- `client\src\api\client.ts` ← `client\src\api\acquisitions.ts`, `client\src\api\administration.ts`, `client\src\api\auth.ts`, `client\src\api\clients.ts`, `client\src\api\contracts.ts` +28 more
- `client\src\api\repairs.ts` ← `client\src\pages\dashboard\UnifiedTable.tsx`, `client\src\pages\dashboard\UnifiedTable.tsx`, `client\src\pages\repairs\components\AmendmentModal.tsx`, `client\src\pages\repairs\components\NewRepairModal.tsx`, `client\src\pages\repairs\components\NewRepairModal.tsx` +20 more
- `client\src\pages\clients\types.ts` ← `client\src\api\clients.ts`, `client\src\api\departments.ts`, `client\src\pages\clients\ClientDetailPane.tsx`, `client\src\pages\clients\ClientKpiStrip.tsx`, `client\src\pages\clients\ClientsList.tsx` +15 more
- `client\src\pages\contracts\types.ts` ← `client\src\api\contracts.ts`, `client\src\pages\contracts\ContractDetailPane.tsx`, `client\src\pages\contracts\ContractsList.tsx`, `client\src\pages\contracts\ContractsPage.tsx`, `client\src\pages\contracts\tabs\AddressTab.tsx` +11 more
- `client\src\pages\departments\types.ts` ← `client\src\pages\departments\DepartmentDetailPane.tsx`, `client\src\pages\departments\DepartmentsList.tsx`, `client\src\pages\departments\DepartmentsPage.tsx`, `client\src\pages\departments\DeptKpiStrip.tsx`, `client\src\pages\departments\DeptToolbar.tsx` +9 more
- `client\src\api\departments.ts` ← `client\src\pages\clients\NewClientModal.tsx`, `client\src\pages\departments\DepartmentsPage.tsx`, `client\src\pages\departments\NewDepartmentModal.tsx`, `client\src\pages\departments\ScopeDrawer.tsx`, `client\src\pages\departments\tabs\ContactsTab.tsx` +8 more
- `client\src\components\shared\StatStrip.tsx` ← `client\src\components\shared\index.ts`, `client\src\components\shared\index.ts`, `client\src\pages\acquisitions\AcquisitionsPage.tsx`, `client\src\pages\clients\tabs\RepairHistoryTab.tsx`, `client\src\pages\endocarts\EndoCartsPage.tsx` +7 more
- `client\src\api\contracts.ts` ← `client\src\pages\contracts\ContractDetailPane.tsx`, `client\src\pages\contracts\ContractDetailPane.tsx`, `client\src\pages\contracts\ContractsPage.tsx`, `client\src\pages\contracts\tabs\AffiliatesTab.tsx`, `client\src\pages\contracts\tabs\AmendmentsTab.tsx` +7 more
- `client\src\pages\dashboard\types.ts` ← `client\src\pages\dashboard\columnDefs.ts`, `client\src\pages\dashboard\DashboardPage.tsx`, `client\src\pages\dashboard\DashboardToolbar.tsx`, `client\src\pages\dashboard\OpsBriefing.tsx`, `client\src\pages\dashboard\QuickEditModal.tsx` +7 more

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_