# Repairs Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Repairs detail view as a dense cockpit optimized for operations processors — full-width layout with reference strip, flags bar, and always-visible context sidebar.

**Architecture:** Full-width cockpit replaces the current split-pane detail view. Compact header + reference strip + flags bar across the top, then two-pane body: left has tabs (Workflow default), right has always-visible context cards. New backend endpoints provide client summary, primary contact, full repair detail with addresses, and inspection data. The left list panel moves to Dashboard — processors navigate from Dashboard repair table to individual cockpit views.

**Tech Stack:** React 19, TypeScript, Ant Design 5 (minimal), CSS modules, ASP.NET Core 8, raw SqlClient

**Spec:** `docs/superpowers/specs/2026-04-02-repairs-cockpit-design.md`

**DB Schema Reference:** `C:/Projects/tsi-redesign/tasks/db-schema-dump.json`

---

## File Structure

### Backend (new/modified)
- Modify: `server/TSI.Api/Models/Repair.cs` — add RepairFull, RepairInspections, ClientSummary, PrimaryContact records
- Modify: `server/TSI.Api/Controllers/RepairsController.cs` — add /full, /inspections, /po endpoints, add/update/delete line items
- Modify: `server/TSI.Api/Controllers/ClientsController.cs` — add /summary endpoint
- Modify: `server/TSI.Api/Controllers/DepartmentsController.cs` — add /contacts/primary endpoint

### Frontend Types
- Modify: `client/src/pages/repairs/types.ts` — add RepairFull, RepairInspections, ClientSummary, PrimaryContact types

### Frontend API
- Modify: `client/src/api/repairs.ts` — add getRepairFull, getRepairInspections, updateInspections, updatePO, addLineItem, updateLineItem, deleteLineItem
- Modify: `client/src/api/clients.ts` — add getClientSummary
- Modify: `client/src/api/departments.ts` — add getDepartmentPrimaryContact

### Frontend Components (new)
- Create: `client/src/pages/repairs/CockpitHeader.tsx` — compact header bar
- Create: `client/src/pages/repairs/CockpitHeader.css`
- Create: `client/src/pages/repairs/ReferenceStrip.tsx` — persistent context bar
- Create: `client/src/pages/repairs/ReferenceStrip.css`
- Create: `client/src/pages/repairs/FlagsBar.tsx` — client flags display
- Create: `client/src/pages/repairs/FlagsBar.css`
- Create: `client/src/pages/repairs/ContextSidebar.tsx` — right-side context cards
- Create: `client/src/pages/repairs/ContextSidebar.css`
- Create: `client/src/pages/repairs/tabs/DetailsTab.tsx` — full details with addresses
- Create: `client/src/pages/repairs/tabs/FinancialsTab.tsx` — replace stub
- Create: `client/src/pages/repairs/tabs/InspectionsTab.tsx` — P/F grid + angulation

### Frontend (modified)
- Rewrite: `client/src/pages/repairs/RepairDetailPane.tsx` — cockpit layout orchestrator
- Modify: `client/src/pages/repairs/RepairsPage.tsx` — route change for cockpit mode
- Modify: `client/src/router.tsx` — add `/repairs/:repairKey` route

---

## Task 1: Backend — Extended Repair Models

**Files:**
- Modify: `server/TSI.Api/Models/Repair.cs`

- [ ] **Step 1: Add new record types to Repair.cs**

Add these records after the existing ones:

```csharp
public record RepairFull(
    // Core identity
    int RepairKey, string Wo, string Status, int StatusId, bool IsUrgent,
    // Related entities
    string Client, int ClientKey, string Dept, int DeptKey,
    string ScopeType, string Serial, string? ScopeModel, string? Manufacturer,
    // Dates
    string DateIn, string? DateApproved, string? EstDelivery, string? ShipDate, string? DateOut,
    int DaysIn,
    // People
    string? Tech, int? TechKey, string? Tech2, string? Inspector,
    string? ApprovalName, string? SalesRep,
    // Financial
    decimal? AmountApproved, string? InvoiceNumber, string? PurchaseOrder,
    // Complaint & Notes
    string? Complaint, string? Notes, string? CustomerRef,
    // Billing Address
    string? BillName, string? BillAddr1, string? BillAddr2,
    string? BillCity, string? BillState, string? BillZip, string? BillEmail,
    // Shipping Address
    string? ShipName, string? ShipAddr1, string? ShipAddr2,
    string? ShipCity, string? ShipState, string? ShipZip,
    // Shipping & Tracking
    string? TrackingNumber, string? TrackingNumberIn, string? TrackingNumberFedEx,
    string? ShipWeight, string? DeliveryServiceLevel,
    // Loaner
    bool LoanerRequested, bool? LoanerProvided, string? LoanerRepair,
    // Accessories
    bool IncludesBox, bool IncludesCase, bool IncludesETOCap, bool IncludesCO2Cap,
    bool IncludesCamera, bool IncludesHood, bool IncludesLightPostAdapter,
    bool IncludesSuctionValve, bool IncludesWaterProofCap, bool IncludesAirWaterValve,
    // Workflow flags
    bool Outsourced, bool FirstRepair, string? ReworkRequired,
    // Pricing context
    string? PricingCategory, string? PaymentTerms, string? ContractNumber,
    string? RepairLevel, string? RepairReason, string? Source
);

public record RepairInspections(
    // D&I flags
    string? ScopeRepairable, string? ScopeUsable,
    // Angulation In
    string? AngInUp, string? AngInDown, string? AngInLeft, string? AngInRight,
    // Angulation Out
    string? AngOutUp, string? AngOutDown, string? AngOutLeft, string? AngOutRight,
    // Fiber
    string? BrokenFibersIn, string? BrokenFibersOut, string? FiberAngle, string? FiberLightTrans,
    // P/F checkpoints (30+)
    string? InsImage, string? InsLeak, string? InsFiberLightTrans, string? InsAngulation,
    string? InsFocalDistance, string? InsImageCentration, string? InsFog,
    string? InsHotColdLeak, string? InsSuction, string? InsForcepChannel,
    string? InsAirWater, string? InsAuxWater
    // Add remaining P/F fields from tblRepair schema — check db-schema-dump.json for all sIns* columns
);

public record ClientSummary(
    string Name, string? PricingCategory, string? ContractType,
    string? PaymentTerms, string? SalesRep, bool IsActive
);

public record PrimaryContact(
    string? FirstName, string? LastName, string? Email, string? Phone, string? Title
);

public record LineItemUpdate(
    string? Approved, string? ItemCode, string? Description,
    string? FixType, decimal? Amount, string? Comments
);
```

- [ ] **Step 2: Verify build**

Run: `cd server/TSI.Api && dotnet build`

- [ ] **Step 3: Commit**

```bash
git add server/TSI.Api/Models/Repair.cs
git commit -m "feat: add extended repair models for cockpit"
```

---

## Task 2: Backend — Full Repair Detail Endpoint

**Files:**
- Modify: `server/TSI.Api/Controllers/RepairsController.cs`

- [ ] **Step 1: Add GET /repairs/{id}/full endpoint**

Add a new endpoint that queries tblRepair with all the fields needed by the cockpit — core identity, dates, addresses, shipping, accessories, workflow flags, pricing context. Join with tblClient (for client name), tblDepartment (for dept name), tblScopeType, tblScope (for serial, model), tblRepairStatuses, tblTechnicians, tblSalesRep, tblPaymentTerms, tblPricingCategory.

Follow the existing `GetRepairDetail` pattern but include:
- Billing address fields (sBillName1, sBillAddr1, etc.)
- Shipping address fields (sShipName1, sShipAddr1, etc.)
- Tracking numbers (all 4 fields)
- Accessories (all sIncludes* bool fields)
- Loaner fields
- PO#, contract #, repair level, reason, source
- Pricing category name, payment terms name

Return `RepairFull` record.

- [ ] **Step 2: Add PUT /repairs/{id}/po endpoint**

Simple update of `sPurchaseOrder` on tblRepair:

```csharp
[HttpPut("{id}/po")]
public async Task<IActionResult> UpdatePO(int id, [FromBody] string po)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();
    await using var cmd = new SqlCommand(
        "UPDATE tblRepair SET sPurchaseOrder = @po WHERE lRepairKey = @id", conn);
    cmd.Parameters.AddWithValue("@po", po);
    cmd.Parameters.AddWithValue("@id", id);
    await cmd.ExecuteNonQueryAsync();
    return NoContent();
}
```

- [ ] **Step 3: Verify build and commit**

```bash
cd server/TSI.Api && dotnet build
git add server/TSI.Api/Controllers/RepairsController.cs
git commit -m "feat: add /repairs/{id}/full and /repairs/{id}/po endpoints"
```

---

## Task 3: Backend — Inspections + Line Item CRUD Endpoints

**Files:**
- Modify: `server/TSI.Api/Controllers/RepairsController.cs`

- [ ] **Step 1: Add GET /repairs/{id}/inspections**

Query all sIns* and sAng* columns from tblRepair. Return `RepairInspections` record.

- [ ] **Step 2: Add PUT /repairs/{id}/inspections**

Accept `RepairInspections` body, update all inspection columns on tblRepair.

- [ ] **Step 3: Add POST /repairs/{id}/lineitems**

Insert into tblRepairItemTran. Accept `LineItemUpdate` body. Return the created record.

- [ ] **Step 4: Add PUT /repairs/{id}/lineitems/{tranKey}**

Update tblRepairItemTran fields (approved, fixType, amount, comments).

- [ ] **Step 5: Add DELETE /repairs/{id}/lineitems/{tranKey}**

Delete from tblRepairItemTran.

- [ ] **Step 6: Verify build and commit**

```bash
cd server/TSI.Api && dotnet build
git add server/TSI.Api/Controllers/RepairsController.cs
git commit -m "feat: add inspections + line item CRUD endpoints"
```

---

## Task 4: Backend — Client Summary + Primary Contact Endpoints

**Files:**
- Modify: `server/TSI.Api/Controllers/ClientsController.cs`
- Modify: `server/TSI.Api/Controllers/DepartmentsController.cs`

- [ ] **Step 1: Add GET /clients/{id}/summary**

Lightweight query joining tblClient with tblPricingCategory, tblPaymentTerms, tblSalesRep:

```csharp
[HttpGet("{id}/summary")]
public async Task<ActionResult<ClientSummary>> GetSummary(int id)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();
    await using var cmd = new SqlCommand(@"
        SELECT c.sClientName, pc.sPricingCategoryName, pt.sPaymentTermsName,
               sr.sSalesRepName, c.bActive
        FROM tblClient c
        LEFT JOIN tblPricingCategory pc ON c.lPricingCategoryKey = pc.lPricingCategoryKey
        LEFT JOIN tblPaymentTerms pt ON c.lPaymentTermsKey = pt.lPaymentTermsKey
        LEFT JOIN tblSalesRep sr ON c.lSalesRepKey = sr.lSalesRepKey
        WHERE c.lClientKey = @id", conn);
    cmd.Parameters.AddWithValue("@id", id);
    await using var rdr = await cmd.ExecuteReaderAsync();
    if (!await rdr.ReadAsync()) return NotFound();
    return new ClientSummary(
        rdr.GetString(0), rdr.IsDBNull(1) ? null : rdr.GetString(1),
        null, // contract type — derive from contract existence
        rdr.IsDBNull(2) ? null : rdr.GetString(2),
        rdr.IsDBNull(3) ? null : rdr.GetString(3),
        rdr.GetBoolean(4)
    );
}
```

Verify column names against `C:/Projects/tsi-redesign/tasks/db-schema-dump.json`.

- [ ] **Step 2: Add GET /departments/{id}/contacts/primary**

Query tblDepartment for contact fields (sContactFirst, sContactLast, sContactPhoneVoice, sContactEMail):

```csharp
[HttpGet("{id}/contacts/primary")]
public async Task<ActionResult<PrimaryContact>> GetPrimaryContact(int id)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();
    await using var cmd = new SqlCommand(@"
        SELECT sContactFirst, sContactLast, sContactEMail, sContactPhoneVoice
        FROM tblDepartment WHERE lDepartmentKey = @id", conn);
    cmd.Parameters.AddWithValue("@id", id);
    await using var rdr = await cmd.ExecuteReaderAsync();
    if (!await rdr.ReadAsync()) return NotFound();
    return new PrimaryContact(
        rdr.IsDBNull(0) ? null : rdr.GetString(0),
        rdr.IsDBNull(1) ? null : rdr.GetString(1),
        rdr.IsDBNull(2) ? null : rdr.GetString(2),
        rdr.IsDBNull(3) ? null : rdr.GetString(3),
        null // title not in schema
    );
}
```

Note: `PrimaryContact` and `ClientSummary` records are defined in `Repair.cs` — these controllers reference them. Add `using` if needed or move to a shared models file.

- [ ] **Step 3: Verify build and commit**

```bash
cd server/TSI.Api && dotnet build
git add server/TSI.Api/Controllers/ClientsController.cs server/TSI.Api/Controllers/DepartmentsController.cs
git commit -m "feat: add client summary + department primary contact endpoints"
```

---

## Task 5: Frontend — Extended Types + API Functions

**Files:**
- Modify: `client/src/pages/repairs/types.ts`
- Modify: `client/src/api/repairs.ts`
- Modify: `client/src/api/clients.ts`
- Modify: `client/src/api/departments.ts`

- [ ] **Step 1: Add TypeScript types**

Add to `types.ts`:

```typescript
export interface RepairFull {
  repairKey: number; wo: string; status: string; statusId: number; isUrgent: boolean;
  client: string; clientKey: number; dept: string; deptKey: number;
  scopeType: string; serial: string; scopeModel?: string; manufacturer?: string;
  dateIn: string; dateApproved?: string; estDelivery?: string; shipDate?: string; dateOut?: string;
  daysIn: number;
  tech?: string; techKey?: number; tech2?: string; inspector?: string;
  approvalName?: string; salesRep?: string;
  amountApproved?: number; invoiceNumber?: string; purchaseOrder?: string;
  complaint?: string; notes?: string; customerRef?: string;
  billName?: string; billAddr1?: string; billAddr2?: string;
  billCity?: string; billState?: string; billZip?: string; billEmail?: string;
  shipName?: string; shipAddr1?: string; shipAddr2?: string;
  shipCity?: string; shipState?: string; shipZip?: string;
  trackingNumber?: string; trackingNumberIn?: string; trackingNumberFedEx?: string;
  shipWeight?: string; deliveryServiceLevel?: string;
  loanerRequested: boolean; loanerProvided?: boolean; loanerRepair?: string;
  includesBox: boolean; includesCase: boolean; includesETOCap: boolean; includesCO2Cap: boolean;
  includesCamera: boolean; includesHood: boolean; includesLightPostAdapter: boolean;
  includesSuctionValve: boolean; includesWaterProofCap: boolean; includesAirWaterValve: boolean;
  outsourced: boolean; firstRepair: boolean; reworkRequired?: string;
  pricingCategory?: string; paymentTerms?: string; contractNumber?: string;
  repairLevel?: string; repairReason?: string; source?: string;
}

export interface RepairInspections {
  scopeRepairable?: string; scopeUsable?: string;
  angInUp?: string; angInDown?: string; angInLeft?: string; angInRight?: string;
  angOutUp?: string; angOutDown?: string; angOutLeft?: string; angOutRight?: string;
  brokenFibersIn?: string; brokenFibersOut?: string; fiberAngle?: string; fiberLightTrans?: string;
  insImage?: string; insLeak?: string; insFiberLightTrans?: string; insAngulation?: string;
  insFocalDistance?: string; insImageCentration?: string; insFog?: string;
  insHotColdLeak?: string; insSuction?: string; insForcepChannel?: string;
  insAirWater?: string; insAuxWater?: string;
}

export interface ClientSummary {
  name: string; pricingCategory?: string; contractType?: string;
  paymentTerms?: string; salesRep?: string; isActive: boolean;
}

export interface PrimaryContact {
  firstName?: string; lastName?: string; email?: string; phone?: string; title?: string;
}

export interface LineItemUpdate {
  approved?: string; itemCode?: string; description?: string;
  fixType?: string; amount?: number; comments?: string;
}
```

- [ ] **Step 2: Add API functions**

Add to `client/src/api/repairs.ts`:

```typescript
export const getRepairFull = (id: number) => apiClient.get(`/repairs/${id}/full`);
export const getRepairInspections = (id: number) => apiClient.get(`/repairs/${id}/inspections`);
export const updateRepairInspections = (id: number, data: RepairInspections) =>
  apiClient.put(`/repairs/${id}/inspections`, data);
export const updateRepairPO = (id: number, po: string) =>
  apiClient.put(`/repairs/${id}/po`, JSON.stringify(po), {
    headers: { 'Content-Type': 'application/json' }
  });
export const addRepairLineItem = (id: number, item: LineItemUpdate) =>
  apiClient.post(`/repairs/${id}/lineitems`, item);
export const updateRepairLineItem = (id: number, tranKey: number, item: LineItemUpdate) =>
  apiClient.put(`/repairs/${id}/lineitems/${tranKey}`, item);
export const deleteRepairLineItem = (id: number, tranKey: number) =>
  apiClient.delete(`/repairs/${id}/lineitems/${tranKey}`);
```

Add to `client/src/api/clients.ts`:

```typescript
export const getClientSummary = (id: number) => apiClient.get(`/clients/${id}/summary`);
```

Add to `client/src/api/departments.ts`:

```typescript
export const getDepartmentPrimaryContact = (id: number) =>
  apiClient.get(`/departments/${id}/contacts/primary`);
```

- [ ] **Step 3: Verify build and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/repairs/types.ts client/src/api/repairs.ts client/src/api/clients.ts client/src/api/departments.ts
git commit -m "feat: add cockpit types and API functions"
```

---

## Task 6: Frontend — CockpitHeader + ReferenceStrip + FlagsBar

**Files:**
- Create: `client/src/pages/repairs/CockpitHeader.tsx` + `.css`
- Create: `client/src/pages/repairs/ReferenceStrip.tsx` + `.css`
- Create: `client/src/pages/repairs/FlagsBar.tsx` + `.css`

- [ ] **Step 1: Build CockpitHeader**

Single-line header: WO# (bold primary-dark) + status badge + urgent badge + separator + client → dept + separator + scope model + serial + separator + TAT (color-coded) + right-aligned action buttons (Next Stage, Change Status, Print D&I).

Props: `repair: RepairFull`, `onNextStage`, `onChangeStatus`, `onPrint`

Use shared `StatusBadge` for status/urgent pills.

CSS: `height: 36px`, flex row, `padding: 0 16px`, `border-bottom: 1px solid var(--neutral-200)`, `background: var(--card)`.

- [ ] **Step 2: Build ReferenceStrip**

Horizontal row of labeled cells: Client (clickable), Department (clickable), Scope (model + serial clickable), Pricing, Terms, TAT, Contact, PO# (editable inline).

Props: `repair: RepairFull`, `clientSummary: ClientSummary`, `contact: PrimaryContact`, `onClientClick`, `onDeptClick`, `onSerialClick`, `onPOChange`

CSS: flex row, each cell `padding: 6px 14px`, `border-right: 1px solid var(--neutral-200)`, `background: #FAFBFC`. Labels 9px uppercase muted. Values 11px. Clickable values use `color: var(--primary)`, `cursor: pointer`.

- [ ] **Step 3: Build FlagsBar**

Conditional bar showing flag chips. Only renders when flags array is non-empty.

Props: `flags: ClientFlag[]`, `scopeHistoryCount: number`

CSS: flex row, `gap: 6px`, `padding: 6px 14px`, `border-bottom: 1px solid var(--neutral-200)`. Flag chips use StatusBadge-like styling (amber for warnings, blue for info, purple for scope history).

- [ ] **Step 4: Verify build and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/repairs/CockpitHeader.* client/src/pages/repairs/ReferenceStrip.* client/src/pages/repairs/FlagsBar.*
git commit -m "feat: add CockpitHeader, ReferenceStrip, FlagsBar components"
```

---

## Task 7: Frontend — ContextSidebar

**Files:**
- Create: `client/src/pages/repairs/ContextSidebar.tsx` + `.css`

- [ ] **Step 1: Build ContextSidebar**

280px right pane with four `SectionCard` components stacked vertically:

1. **Client & Pricing** — name (bold, linked), contract type, pricing tier, payment terms, sales rep, "View full client →" link
2. **Send Estimate To** — primary contact name, title, email (mailto), phone, "Change contact" link
3. **Scope History** — mini table of last 5 repairs (WO#, Status pill, Date), "View all →" link
4. **Financial Snapshot** — revenue, expenses, margin % (color-coded)

Props: `clientSummary`, `contact`, `scopeHistory`, `financials`, `onViewClient`, `onViewAll`

CSS: `width: 280px`, `background: #FAFBFC`, `padding: 10px`, `border-left: 1.5px solid var(--border-dk)`, `overflow-y: auto`. Uses `SectionCard` from shared components.

- [ ] **Step 2: Verify build and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/repairs/ContextSidebar.*
git commit -m "feat: add ContextSidebar component for repair cockpit"
```

---

## Task 8: Frontend — DetailsTab (Full Details with Addresses)

**Files:**
- Create: `client/src/pages/repairs/tabs/DetailsTab.tsx`

- [ ] **Step 1: Build DetailsTab**

Two-column layout using `SectionCard` and `FormGrid`:

**Left column (flex):**
- *Repair Information* section: Date In, Date Out, Tech, Tech 2, Date Approved, Approval Name, Est. Delivery, Approved Amount, Invoice #, Level, Reason, Source
- *Complaint* section: editable textarea + Customer Ref field
- *Loaner* section (conditional): Loaner Requested, Provided, Loaner Scope

**Right column (310px):**
- *Billing Address* section: all bill fields
- *Shipping Address* section: all ship fields
- *Shipping & Tracking* section: Ship Date, Weight, Service Level, all tracking #s
- *Accessories* section: checkbox grid for all 10 accessories

Props: `repair: RepairFull`

Uses: `Field`, `FormGrid`, `SectionCard` from shared components.

- [ ] **Step 2: Verify build and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/repairs/tabs/DetailsTab.tsx
git commit -m "feat: add DetailsTab with addresses and accessories"
```

---

## Task 9: Frontend — InspectionsTab (P/F Grid)

**Files:**
- Rewrite: `client/src/pages/repairs/tabs/InspectionsTab.tsx`

- [ ] **Step 1: Build InspectionsTab**

Two-panel layout:

**Left: Incoming D&I**
- Scope Repairable toggle, Scope Usable toggle
- Angulation grid: 4x2 table (Up/Down/Left/Right × In/Out)
- Broken fibers (in/out), fiber angle, light transmission

**Right: Final QC**
- Same structure for outgoing measurements

**Bottom: P/F Grid**
- 4-column grid of pass/fail toggles for all inspection checkpoints
- Each: label + green Pass button + red Fail button
- "Mark All Pass" and "Clear All" buttons at top
- Counter: "18/24 Pass"

Props: `repairKey: number`

Fetches inspection data via `getRepairInspections`, saves via `updateRepairInspections`.

- [ ] **Step 2: Verify build and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/repairs/tabs/InspectionsTab.tsx
git commit -m "feat: add InspectionsTab with P/F grid and angulation"
```

---

## Task 10: Frontend — Cockpit Orchestrator (RepairDetailPane Rewrite)

**Files:**
- Rewrite: `client/src/pages/repairs/RepairDetailPane.tsx`
- Modify: `client/src/pages/repairs/RepairsPage.tsx`
- Modify: `client/src/router.tsx`

- [ ] **Step 1: Rewrite RepairDetailPane as cockpit orchestrator**

This component orchestrates the full cockpit layout:

```
CockpitHeader
ReferenceStrip
FlagsBar (conditional)
┌────────────────────────┬──────────────┐
│ TabBar                 │              │
│ ─────────────────────  │ Context      │
│ Tab Content            │ Sidebar      │
│ (scrollable)           │ (scrollable) │
└────────────────────────┴──────────────┘
```

- Fetches `RepairFull` via `getRepairFull`
- Fetches `ClientSummary` via `getClientSummary` (using repair.clientKey)
- Fetches `PrimaryContact` via `getDepartmentPrimaryContact` (using repair.deptKey)
- Fetches `ClientFlags` via `getClientFlags` (using repair.clientKey)
- Fetches `RepairScopeHistory` via `getRepairScopeHistory`
- Fetches `RepairFinancials` via `getRepairFinancials`

Tab bar defaults to "Workflow". Tabs: Details, Workflow, Inspections, Financials, Scope History, Status Log.

- [ ] **Step 2: Update RepairsPage for cockpit routing**

When a repair is selected from Dashboard, navigate to `/repairs/:repairKey`. The RepairsPage route renders the cockpit full-width (no split pane when viewing a specific repair).

If no repairKey param, show the split-pane list view as currently exists (fallback).

- [ ] **Step 3: Add route to router.tsx**

```typescript
{ path: 'repairs/:repairKey', element: <RepairsPage /> }
```

RepairsPage reads the param and renders cockpit mode if `repairKey` is present.

- [ ] **Step 4: Verify full build**

```bash
cd client && npx tsc --noEmit && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/repairs/ client/src/router.tsx
git commit -m "feat: repairs cockpit — full orchestrator with routing"
```

---

## Task 11: Integration — Dashboard → Cockpit Navigation

**Files:**
- Modify: `client/src/pages/dashboard/RepairTable.tsx`

- [ ] **Step 1: Wire row click to cockpit navigation**

When a row in the dashboard repair table is clicked, navigate to `/repairs/:repairKey` instead of the current behavior (selecting in split pane).

Use `useNavigate` from react-router:
```typescript
const navigate = useNavigate();
// on row click:
navigate(`/repairs/${record.repairKey}`);
```

- [ ] **Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/dashboard/RepairTable.tsx
git commit -m "feat: wire dashboard repair table → cockpit navigation"
```
