# System Live & Linked — Terminal Handoff Plan
Date: 2026-04-03
Source: Chrome comparison of old HTML app vs new React app

## Goal
Close the highest-priority functional gaps so every primary workflow is usable.
Target: 0 screens showing "0 records" or "coming soon" on their core tab.

## Repo
```
C:/Projects/redesign-matched
git pull origin main   ← do this first
```

---

## Mandatory Rules (enforce every task)

1. **SQL columns** — verify every column against `C:/Projects/tsi-redesign/tasks/db-schema-dump.json` before writing SQL. Never assume. Trace the join chain.
2. **No silent catch** — never `.catch(() => {})`. Always `.catch(() => message.error('Failed to load ...'))`
3. **TypeScript** — after every file change: `cd client && npx tsc --noEmit 2>&1 | head -20`. Fix all errors before committing.
4. **CSS tokens only** — no hardcoded hex. All colors via CSS variables.
5. **Commit after each task group** — push at the very end.
6. **Live smoke test on finish** — hit the Azure API (expect 401s, not 500s) and load the live frontend.

Azure credentials (for migration if needed):
- Server: tsi-sql-jb2026.database.windows.net / DB: WinscopeNet / User: tsiadmin / Password: TsiDev2026!

---

## NOT IN SCOPE — Already built, do not re-build

- Repairs cockpit (Scope In, Details, Outgoing, Expense tabs) — wired
- Repairs line items fast-entry + amendment modal — wired
- Repairs Inspections, Financials, Scope History, Status Log — wired
- Clients full config screen (Info, Flags, Contacts, Addresses, Repair History) — wired
- Departments full config screen (Info, Contacts, Scopes, Flags, Addresses, Contracts, Sub-Groups) — wired
- Contracts (Specifications, Scopes, Repairs, Notes, Invoices, Documents) — wired
- Financial (Outstanding, Drafts, Hold, Payments, GL Accounts, At Risk, Trending) — wired
- Inventory (Inventory tab, Sizes, Purchase Orders, Receive tab) — wired
- Quality (QC Inspections, Non-Conformances, CAPA) — wired
- Loaners (Task Loaners, Requests, Scope Needs) — wired
- Onsite Services detail drawer — wired
- Acquisitions detail drawer — wired
- Administration (Users, Reasons, Statuses CRUD) — wired
- Scope Models (Inventory + Flags tabs) — wired
- Dashboard (stat strip, repair table, filters, QuickEdit) — wired
- Repair Items Catalog (full split-layout) — wired

---

## TASK 1 — Repairs: 9-Stage Workflow Pipeline Strip
**Priority: HIGH — this is the core visual of the repair cockpit**

### What it is
A horizontal pill bar showing the 8 repair stages:
`Received → D&I → Quoted → Approved → In Repair → QC → Shipping → Invoiced`

The current repair stage comes from `sRepairStatus` on `tblRepairStatuses` joined to the repair.
Map each stage visually: active stage = filled primary blue, past stages = muted, future = ghost.

### Implementation
- Add a `WorkflowPipeline` component to `client/src/pages/repairs/components/`
- Props: `currentStatus: string`
- Map status names to stages — some statuses map to the same stage (e.g. "In Repair", "In Progress" both → "In Repair" stage)
- Wire into `RepairDetailPane.tsx` header, below the repair title bar, above the tab strip
- No backend changes needed — status is already in `RepairFull.repairStatus`

Stage map (verify status names against tblRepairStatuses):
```
Received    → stage 1
D&I         → stage 2  (Damage & Inspection, check exact status name)
Quoted      → stage 3
Approved    → stage 4
In Repair   → stage 5
QC          → stage 6
Shipping    → stage 7
Invoiced    → stage 8
```

---

## TASK 2 — Repairs: Comments / Notes Tab with Note Types
**Priority: HIGH**

Currently stub: "Comments coming soon"

### What it is
Add/view notes on a repair with 4 types: Internal, External, Rework, Blind.
Internal = staff only. External = visible to client. Rework = rework-specific. Blind = anonymous.

### Backend
Check schema dump for a notes/comments table on repairs. Look for:
- `tblRepairNotes`, `tblRepairComments`, `tblRepairLog`
- Columns needed: repairKey FK, note text, note type, created date, created by

`GET /api/repairs/{repairKey}/notes` → list notes newest first
`POST /api/repairs/{repairKey}/notes` → body: `{ noteText, noteType }`

### Frontend (`client/src/pages/repairs/RepairDetailPane.tsx`)
Replace the "Comments coming soon" stub with a `NotesTab` component:
- Scrollable list: each note shows type badge (Internal/External/Rework/Blind), timestamp, user, text
- Bottom bar: textarea + note type selector (4 options) + "Add Note" button
- Type badge colors: Internal=blue, External=green, Rework=amber, Blind=muted

---

## TASK 3 — Repairs: Bulk Approve / Unapprove Line Items
**Priority: HIGH**

The old app has "✓ Approve All" and "Unapprove All" buttons in the line items header.

### Backend
Check `tblRepairItemTran` for an approval column. Look for `bApproved`, `bLineItemApproved`.
If exists: `PATCH /api/repairs/{repairKey}/line-items/approval` → `{ approved: true/false }`
If column doesn't exist: skip this task.

### Frontend (`client/src/pages/repairs/components/RepairItemsTable.tsx`)
Add "✓ Approve All" and "Unapprove All" buttons to the table header row (next to existing "+ Add Item" area).

---

## TASK 4 — Repairs: Update Techs Modal
**Priority: HIGH**

"Update Techs" button currently shows `message.info('coming soon')`.

### Backend
`PATCH /api/repairs/{repairKey}/techs` → body: `{ techKey: number, tech2Key: number | null }`
Updates `lTechKey` and second tech column on `tblRepair` (verify exact column names in schema dump).
`GET /api/repairs/technicians` already exists — use that for the dropdown.

### Frontend (`client/src/pages/repairs/tabs/DetailsTab.tsx`)
Replace the `message.info` stub with a small Ant Design Modal:
- Primary Tech dropdown (load from `/api/repairs/technicians`)
- Secondary Tech dropdown (same list + "None" option)
- Save → PATCH → refresh parent

---

## TASK 5 — Contracts: Show Real Data + Key Missing Tabs
**Priority: CRITICAL — screen shows 0 records**

The Contracts screen lists 0 records. This is the biggest functional gap.

### Step 5a — Debug why list shows 0 records
Check `ContractsController.cs` `GetContracts` endpoint:
- Hit `GET /api/contracts` locally or check the controller SQL
- Verify `tblContract` has rows: `SELECT COUNT(*) FROM tblContract` via sqlcmd locally
- Check if Azure has the data: `sqlcmd -S tsi-sql-jb2026.database.windows.net -d WinscopeNet -U tsiadmin -P "TsiDev2026!" -Q "SELECT COUNT(*) FROM tblContract"`
- If tblContract is empty in Azure: run migration → `.\scripts\migrate-data.ps1 -AzurePassword "TsiDev2026!" -AzureUser "tsiadmin" -Tables "tblContract,tblContractDepartments,tblContractTypes"`
- Verify column names in the controller match schema dump exactly

### Step 5b — Contract Address Tab
Build `ContractAddressTab`:
- Check `tblContract` columns in schema dump for billing/shipping address fields
- Fields: Bill To Name, Attn, Address, City, State, Zip; same for Ship To + "Same as Bill To"
- Save via existing `PUT /api/contracts/{contractKey}`

### Step 5c — Contract Departments Tab (read-only)
Build `ContractDepartmentsTab`:
- `GET /api/contracts/{contractKey}/departments`
- Join `tblContractDepartments → tblDepartment → tblClient`
- Show: Client, Department, City, State, Active badge

---

## TASK 6 — Inventory: Show Real Data
**Priority: CRITICAL — screen shows 0 items**

Inventory shows "0 items". Diagnose and fix.

### Step 6a — Check why items list is empty
- `SELECT COUNT(*) FROM tblInventory` locally and on Azure
- If Azure is empty: `.\scripts\migrate-data.ps1 -AzurePassword "TsiDev2026!" -AzureUser "tsiadmin" -Tables "tblInventory,tblInventorySize,tblInventoryLot"`
  (check schema dump for exact inventory table names — look for `tblInventory`, `tblInventoryItem`, `tblInventorySize`)
- Check `InventoryController.cs` SQL for WHERE clauses that might be filtering everything out
- Check if `bActive` filter is excluding all rows (use `ISNULL(bActive, 1) = 1` pattern)

### Step 6b — Fix the data load if it's a query bug
If the data is in Azure but query returns 0: read the controller carefully, trace the WHERE clause,
fix and test. This is likely the same `ISNULL(bActive, 1) = 1` pattern as the repair catalog bug.

---

## TASK 7 — Suppliers: Show Real Data
**Priority: HIGH — screen shows 0 records**

Same diagnosis pattern as Task 6:
- Check `tblSupplier` (or `tblVendor` — verify table name in schema dump) row count locally and Azure
- Migrate if empty
- Fix query if data is there but filtered out

---

## TASK 8 — Dashboard: Missing Filters and Table Columns
**Priority: HIGH — operations processors use this all day**

From Chrome comparison:

### 8a — Source filter (In House / Outsourced / Hot List)
The old app has location source chips. Check `DashboardController.cs` — `bOutsourced` filter was
added by a previous agent. If it's there but not wired in the UI, add the filter chips to `DashboardPage.tsx`.

### 8b — Size filter (Large / Small / All)
Add SIZE filter to dashboard toolbar. Backend: filter on `tblScope.bLargeDiameter` (verify column name).
Frontend: 3 chip buttons (All / Large / Small) above the repairs table.

### 8c — Additional table columns
Add these columns to the dashboard repairs table if data is available:
- **Date Approved** — check `tblRepair` for `dtApproved`, `dtApprovalDate` in schema dump
- **Est Delivery** — check for `dtEstDelivery`, `dtGTD` in schema dump
- **Repair note row** — `sRepairDescription` or `sComment` shown as italic sub-row beneath each repair row

### 8d — HOT badge
If `bHotList` exists on `tblRepair` (verify), show a red "HOT" badge next to client name in table rows.

---

## TASK 9 — Repairs: QC Inspections Tab
**Priority: HIGH — blocks quality control workflow**

Check if this tab already exists. If not, build it.

The old app has an Inspections tab on each repair with:
- BR (Bending Rubber): Pass/Fail
- Epoxy In, Max Epoxy: measurement fields
- Eyepiece, Fiber, Tube, Vision: P/F fields
- QC Technician dropdown, Inspected By dropdown
- "☑ QC Inspection" button to save

Check schema dump for `tblQCInspection`, `tblRepairQC`, `tblQCRepair` or similar.
Backend: `GET /api/repairs/{repairKey}/qc` and `POST /api/repairs/{repairKey}/qc`
Frontend: new `QCTab` in `client/src/pages/repairs/`

If this tab already exists in `RepairDetailPane.tsx` but is named differently, verify it loads data.

---

## TASK 10 — Financial: + New Invoice Button
**Priority: HIGH**

The old Financial screen has a "+ New Invoice" button. Add it:
- Opens a modal: select Client → Department → find open repairs → create draft invoice
- Or simpler: just `POST /api/financial/invoices` with `{ repairKey }` and show a toast
- Check `tblInvoice` structure in schema dump before building

---

## TASK 11 — Loaners: + New Loaner Button
**Priority: MEDIUM**

The old Loaners screen has a "+ New Loaner" button. Add it:
- Modal: select scope, client, department, reason
- Check `tblLoaner` structure in schema dump
- `POST /api/loaners` → insert row → refresh list

---

## TASK 12 — Development List: Show Real Data
**Priority: MEDIUM — shows 0 items**

If there's a `tblDevelopmentTask` or similar in schema dump, wire it.
If not, this is likely internal tooling — leave as "No items" empty state (remove "0 items" stub text).

---

## Commit Strategy
```bash
# After every 2-3 tasks:
cd C:/Projects/redesign-matched
git add -A
git commit -m "feat: [description of what was done]"

# Final push after all tasks:
git push
```

---

## Definition of Done
- `cd client && npx tsc --noEmit` → zero errors
- `dotnet publish -c Release` → no compilation errors (or check CI)
- Contracts list shows real records (not 0)
- Inventory list shows real items (not 0)
- Suppliers list shows real records (not 0)
- Repairs cockpit shows 9-stage pipeline strip
- Repairs has a working Comments/Notes tab
- No "coming soon" text visible on any primary workflow screen
- Azure API returns 401 (not 500) on all endpoints
- Live frontend loads without console errors
