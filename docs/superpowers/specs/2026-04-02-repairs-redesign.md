# Repairs Screen Redesign — Design Spec
**Date:** 2026-04-02
**Status:** Approved
**Route:** `/repairs`

---

## Overview

The current repairs screen uses a tabbed cockpit layout (Details / Workflow / Inspections / Financials / Scope History / Status Log). This must be replaced with a **4-tab persistent layout** designed around how processors actually work a repair order: receive scope in → work items → ship out → review financials.

The design goal is a dense, flow-state cockpit where the most-used data is always visible and actions are one click away.

---

## Persistent Shell (all tabs)

### 1. Command Strip (top, dark navy)
Always visible. Contains the core repair header fields in a single row:

| Field | Notes |
|-------|-------|
| Client | Display name, editable |
| Department | Display name, editable |
| Work Order | Auto-assigned |
| Purchase Order | Editable |
| Rack Location | Editable |
| Repair Level | Dropdown |
| Lead Time | Editable |
| Turn Around Time | Editable |
| Date In | Date picker |

### 2. Scope Glance Strip (below command strip, light blue tint)
Read-only scope identity + quick flags:

- Manufacturer · Category · Model · SN#
- Cap / FFS · Days Last In · Within 40 Day (red if true)
- Flag pills (Rush, Loaner Out, etc.) rendered right-aligned in amber/red

### 3. Tab Bar
Four tabs: **1 — Scope In** · **2 — Details** · **3 — Outgoing** · **4 — Expense**

---

## Tab 1 — Scope In

Two-column layout.

**Left column:**
- Inbound Shipping: Service Level, Tracking, Shipping Cost, Distributor
- Approval & Requisition: Sent Date, Received Approval, Name on Approval via Portal, Requisition #
- Sales & Reporting: Sales Rep, Reporting Group, Pricing Category, Discount %
- Actions bar: Consumption · Defect Tracking · Integrate to GP · Labels

**Right column:**
- Shipping Address: Ship To Name, Address, City/State/ZIP
- Billing Address: Bill To Name, Address, City/State/ZIP
- Invoice Options:
  - Checkboxes: Display customer complaint · Display itemized description · Display itemized amounts
  - Bill to Customer/Distro · Payment Terms

---

## Tab 2 — Details

This is where most repair work happens. Layout prioritizes the repair items table.

### Action Bar (full width, top)
Single row of action buttons always visible:
Consumption · Unapproved · Approved · Update Slips · Amend Repair · Defect Tracking · Update Techs · Inventory

### Two-column layout below action bar
**Left sidebar (260px fixed):**
- Customer Complaint section: Repair Reason + PS Level fields + complaint textarea
- Angulation IN: UP · DOWN · RIGHT · LEFT · Epoxy Size · Size + Max Charge field. Reset and Override buttons in section header.
- Outsource: Vendor · Cost · Tracking
- Comments: Entry textarea + scrollable comment log (author + timestamp + text)

**Right panel (flex):** Three stacked elements top-to-bottom:

1. **Complaint Banner** (always visible, blue left border)
   Displays the complaint text, Repair Reason, and PS Level read-only. Ensures the complaint is visible while working items.

2. **Flags Banner** (amber, only rendered if repair has flags)
   Shows all flag pills. "Review before proceeding" label. Ensures special instructions are seen before touching the items table.

3. **Repair Items Table** (takes all remaining vertical space)
   Header: blue, shows item count + warranty total + customer total + `+ Add Item` button.

   **Columns:**
   | Column | Notes |
   |--------|-------|
   | ● (dot) | Green = approved, Yellow = pending, Red = rejected |
   | TSI Repair Code | Short code |
   | Repair Item | Description |
   | UA / NWT | User Abuse or Normal Wear — colored badge |
   | W / N / C / A | Warranty / Non-conformance / Customer / Amendment — colored badge |
   | Approval | ✓ Approved / Pending / Rejected |
   | Amount | Right-aligned, bold |
   | Tech 1 | Assigned technician |
   | Tech 2 | Optional second tech |
   | Primary | Checkbox — marks primary item |
   | Comments | Free text |

   **Inline add row** always visible at the bottom of the table (blue tint, input fields in each column).

   **Totals footer** (navy bar):
   Warranty: $X · Non-Warranty: $X · **Total: $X**

---

## Tab 3 — Outgoing

Two-column layout.

**Left column:**
- Outbound Shipping: Service Level, Ship Date, Outbound Tracking, Package Type, Package Weight, Tracking Required (radio)
- Delivery Dates: GTD Delivery Date & Time, Winscope GTD Delivery, Actual Delivery Date & Time
- Ship To Address (editable): Name, Address, City/State/ZIP + Create Label button

**Right column:**
- Invoice Card (primary): Invoice Number (large), Invoice Date, Draft Invoice / Email Invoice / Void Invoice buttons
- Invoice Line Summary table: Description · Cause badge · Fix Type badge · Amount (right-aligned)
- Invoice totals footer: Warranty · Non-Warranty · Total
- Actions: Consumption · Defect Tracking

---

## Tab 4 — Expense

Three-column layout.

**Left — Expenses breakdown:**
Line items: Labor · Inventory/Parts · Shipping · Outsource · Commission · GPO
Total Expense row (bold, double border)

**Center — Revenue:**
Customer Charges · Warranty (absorbed)
Total Revenue row
Repair Margin display: large percentage + dollar profit

**Right — Visual Margin Display:**
Dark navy card. Large green margin %. Revenue / Expense / Profit sub-lines. Formula reminder.

---

## Data / Backend Notes

- All fields in the command strip map to `tblRepair` columns
- Repair items table reads from `tblRepairItem` (joined with `tblRepairItemTran` for amounts/approval)
- Angulation IN fields: `nAngUp`, `nAngDown`, `nAngRight`, `nAngLeft`, `nEpoxySize`, `nSize` (verify column names against db-schema-dump.json)
- Flags come from the existing flags relationship on the repair record
- Comments are a child collection on the repair (may require a new table or existing notes table — verify)
- Expense tab figures are computed: Labor = sum of tech time entries, Inventory = sum of parts consumed, etc. (confirm source tables)

---

## What Is NOT Changing

- The left list panel (repair list / search) — no changes to `RepairList.tsx`
- The overall split-layout shell (list left, detail right) — stays as-is
- Authentication, routing, API client pattern — unchanged

---

## Files Affected

| File | Change |
|------|--------|
| `client/src/pages/repairs/RepairDetailPane.tsx` | Full rewrite — new 4-tab structure replaces current tabbed cockpit |
| `client/src/pages/repairs/tabs/ScopeInTab.tsx` | New file |
| `client/src/pages/repairs/tabs/DetailsTab.tsx` | New file — contains complaint banner, flags banner, items table |
| `client/src/pages/repairs/tabs/OutgoingTab.tsx` | New file |
| `client/src/pages/repairs/tabs/ExpenseTab.tsx` | New file |
| `client/src/pages/repairs/components/RepairItemsTable.tsx` | New shared component — table + inline add row + totals footer |
| `client/src/pages/repairs/components/CommandStrip.tsx` | New — persistent header fields |
| `client/src/pages/repairs/components/ScopeGlance.tsx` | New — scope identity + flags strip |
| `client/src/pages/repairs/types.ts` | Extend `RepairFull` with all new fields |
| `server/TSI.Api/Controllers/RepairsController.cs` | Extend `GetRepairFull` query to return all fields; add repair items CRUD endpoints |
| `client/src/api/repairs.ts` | Add repair item create/update/delete calls |
