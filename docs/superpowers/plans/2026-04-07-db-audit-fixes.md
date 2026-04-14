# DB Audit Fixes — Terminal Handoff Plan

**Date:** 2026-04-07
**Source:** Codebase audit against WinScopeNet legacy database rules
**Memory:** See `project_db_design_principles.md` for full rule set

---

## Task 1: R4 — Add CommandTimeout to all SqlCommands

**Priority:** CRITICAL — a runaway query can cascade-fail the entire API

**What:** Every `SqlCommand` in every controller must have `CommandTimeout = 30` set immediately after creation. Use `CommandTimeout = 60` only in `ReportsController` and `DashboardController` (known-heavy queries).

**How:**
1. Open each controller in `server/TSI.Api/Controllers/`
2. After every `new SqlCommand(...)` or `conn.CreateCommand()`, add `cmd.CommandTimeout = 30;`
3. Skip any that already have it set (12 existing — mostly in Dashboard and Reports)
4. For ReportsController: use `cmd.CommandTimeout = 60;`

**Scope:** ~325 SqlCommand instances across all controllers. Mechanical find-and-add.

**Verify:** `grep -c "CommandTimeout" server/TSI.Api/Controllers/*.cs` should match total SqlCommand count.

---

## Task 2: Empty catch blocks — Replace with user-visible errors

**Priority:** HIGH — 70 silent failures across 26 files

**What:** Every `.catch(() => {})` must become `.catch(() => message.error('Failed to load data'))` (or a more specific message where context is clear).

**How:**
1. Search `client/src/` for `.catch(() => {})` and variants
2. Replace with `.catch(() => message.error('...'))`
3. Make sure `message` is imported from `antd` in each file
4. Use context-appropriate messages:
   - Data loading: `'Failed to load data'`
   - Save/update: `'Failed to save changes'`
   - Delete: `'Failed to delete'`
   - Specific: `'Failed to load contracts'`, `'Failed to load departments'`, etc.
5. Run `cd client && npx tsc --noEmit` — fix any unused import errors

**Files (26):**
- `components/shell/NewOrderWizard.tsx`
- `pages/acquisitions/AcquisitionsPage.tsx`
- `pages/administration/AdministrationPage.tsx` (24 instances — worst offender)
- `pages/clients/tabs/InfoTab.tsx`
- `pages/contracts/ContractDetailPane.tsx`, `ContractsPage.tsx`
- `pages/dashboard/ExecutiveKpi.tsx`, `OpsBriefing.tsx`
- `pages/departments/tabs/InfoTab.tsx`
- `pages/development-list/DevelopmentListPage.tsx`
- `pages/financial/FinancialPage.tsx`
- `pages/instruments/InstrumentsPage.tsx`
- `pages/inventory/InventoryPage.tsx`
- `pages/product-sale/ProductSalePage.tsx`
- `pages/quality/QualityPage.tsx`
- `pages/repairs/components/AmendmentModal.tsx`, `NewRepairModal.tsx`, `RepairItemAutoComplete.tsx`, `UpdateSlipsModal.tsx`
- `pages/repairs/RepairDetailPane.tsx`
- `pages/repairs/tabs/DetailsTab.tsx`, `ExpenseTab.tsx`, `InspectionsTab.tsx`, `ScopeInTab.tsx`
- `pages/scope-model/ScopeModelPage.tsx`
- `pages/suppliers/SuppliersPage.tsx`

---

## Task 3: R2 — Fix N+1 INSERT in DepartmentsController

**Priority:** MEDIUM — single instance

**What:** `DepartmentsController.cs:504-511` loops individual INSERTs for subgroup keys. Replace with a single batch INSERT.

**How:**
```csharp
// Instead of loop with one INSERT per key, build a single command:
var values = string.Join(", ", subGroupKeys.Select((_, i) => $"(@deptKey, @sg{i})"));
await using var insCmd = new SqlCommand(
    $"INSERT INTO tblDepartmentSubGroups (lDepartmentKey, lSubGroupKey) VALUES {values}", conn);
insCmd.Parameters.AddWithValue("@deptKey", deptKey);
for (int i = 0; i < subGroupKeys.Count; i++)
    insCmd.Parameters.AddWithValue($"@sg{i}", subGroupKeys[i]);
await insCmd.ExecuteNonQueryAsync();
```

Add `CommandTimeout = 30` to the new command too.

---

## Task 4: Hardcoded hex colors (LOW PRIORITY — skip for now)

**Not included in this handoff.** 402+ instances across TSX files. Cosmetic debt that blocks theming but has no runtime impact. Will be addressed in a dedicated design-token sweep.

---

## Task 5: Hardcoded rgba values (LOW PRIORITY — skip for now)

**Not included in this handoff.** 78 instances. Same category as Task 4.

---

## Execution Order

1. **Task 1 (R4 CommandTimeout)** — backend, no frontend impact, can run independently
2. **Task 2 (Empty catches)** — frontend only, can run in parallel with Task 1
3. **Task 3 (N+1 fix)** — small, can bundle with Task 1

Tasks 1+3 are backend. Task 2 is frontend. They can be dispatched to two parallel terminal agents.

## Post-Fix Verification

**Backend:** `cd server/TSI.Api && dotnet build` must pass
**Frontend:** `cd client && npx tsc --noEmit` must pass with zero errors
**Do NOT push** — Joe will review and push.
