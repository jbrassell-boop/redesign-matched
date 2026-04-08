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
