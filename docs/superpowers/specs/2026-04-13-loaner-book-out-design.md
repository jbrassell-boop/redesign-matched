# Loaner Book-Out Flow — Design Spec

**Date:** 2026-04-13
**Status:** Draft

---

## Problem

Today, loaners go straight to "Out" status without inspection. When a scope fails after being booked out, processors must manually check it back in, create a repair WO, and link it — a clunky multi-step process that creates confusing transaction history. Additionally, Available loaners still show stale client/dept/rep data from the previous transaction.

## Solution

A task-driven fulfillment flow with an outgoing evaluation gate. The processor fulfills loaner requests from the task queue, picks a matching Available scope, runs the standard outgoing inspection, and only books out if it passes. Failures auto-create a repair WO under TSI's internal department.

---

## Workflow

### Entry Point: Task-Driven Fulfillment

Loaners are always tied to a task. Customers or reps submit requests via the portal, which creates a task (tblTasks with bFromPortal = 1). The task specifies the department and scope type needed (tblTaskLoaners).

The processor works from the task list. A task with a loaner request shows a **"Fulfill Loaner"** action. Clicking it:

1. Queries Available loaners matching the requested scope type (by model or category from tblTaskLoaners)
2. Shows a picker with matching scopes: serial#, rack position, on-site flag
3. If matches exist → processor picks one → proceeds to evaluation
4. If no matches → waitlist the request (no scope type substitution)

### Outgoing Evaluation (Gate)

After picking a scope, the processor sees the outgoing inspection checklist — the same component used for repair final inspection (`FinalInspectionForm`), filtered by scope type (Flexible / Rigid / Camera). Each item is pass/fail.

- **All pass** → loaner transaction created:
  - `sDateOut` set to current timestamp (YYYYMMDDhhmmss)
  - `lDepartmentKey` from the task
  - `lSalesRepKey` from the department's assigned rep
  - `lDeliveryMethodKey`, `sPurchaseOrder`, `sTrackingNumber` captured in form
  - `lTaskKey` linked (task ↔ loaner tran connection)
  - Status = "Out"
  - Processor can then ship the scope

- **Any fail** → repair WO auto-created:
  - Repair created under **TSI internal loaner department** (TSI absorbs cost — customer never had the scope)
  - `lRepairKey` linked on the loaner transaction
  - Status = "Repair"
  - Processor can pick another Available scope from the list or waitlist the request

Evaluation is a gate, not a resting state. There is no "Eval Out" status visible to users — the scope either passes immediately and goes to "Out," or fails and goes to "Repair."

### Check-In (Simple)

When a loaner returns from a client:

1. Processor clicks "Check In" on the loaner list (Out or Overdue rows)
2. Sets `sDateIn` on the loaner tran, optional rack position and tracking#
3. Scope enters the normal Diagnosis & Inspection (D&I) repair pipeline
4. Billing attribution happens at repair WO creation in D&I:
   - **Customer damage** → repair WO under customer's department (FFS or contract consumption)
   - **Normal wear & tear** → repair WO under TSI internal department

No special inbound evaluation UI in the loaner flow — D&I handles it.

---

## Status Model

| Status | Condition | Meaning |
|--------|-----------|---------|
| Available | No active tran, or last tran has sDateIn set | On rack, ready to assign |
| Out | sDateOut set, sDateIn null, no repair link, ≤21 days | Shipped, with client |
| Overdue | Out > 21 days | Past due, needs follow-up |
| Repair | lRepairKey set with valid WO, sDateIn null | Failed eval or in D&I |

No changes to existing status derivation SQL — the CASE logic in LoanersController already handles these states.

---

## Loaner List (Status Dashboard)

The loaner list keeps its current layout: stat strip, search, table, drawer. But the primary action entry point is tasks, not the loaner list.

### Changes to Loaner List

- **Remove** "Check Out" button on Available rows (fulfillment comes from tasks)
- **Keep** "Check In" button on Out/Overdue rows
- **Keep** all stat strip chips, drawer detail, history

### Stat Strip

| Chip | Count |
|------|-------|
| Available | Scopes ready to assign |
| Out | Shipped, with client |
| Overdue | Out > 21 days |
| Repair | Failed eval or in D&I |
| Requests | Unfulfilled task loaner requests (from tblTaskLoaners where no matching tblLoanerTran exists) |

---

## Data Model

### tblLoanerTran — Book Out INSERT

Required fields for a new loaner transaction:

| Column | Source | Notes |
|--------|--------|-------|
| lScopeKey | Processor picks from Available list | FK to tblScope |
| lDepartmentKey | From task (tblTasks.lDepartmentKey) | FK to tblDepartment |
| lSalesRepKey | From department's assigned rep | FK to tblSalesRep |
| lDeliveryMethodKey | Processor selects | FK to tblDeliveryMethod |
| sDateOut | Auto-set to now | Format: YYYYMMDDhhmmss |
| sPurchaseOrder | Processor enters (optional) | nvarchar(50) |
| sTrackingNumber | Processor enters (optional) | nvarchar(50) |
| dtCreateDate | Auto-set to GETDATE() | Audit |
| lCreateUser | Current user session | Audit |
| lCompanyKey | From session/config (verify actual key) | Standard |

### tblLoanerTran — Check In UPDATE

| Column | Value |
|--------|-------|
| sDateIn | Current timestamp (YYYYMMDDhhmmss) |
| sTrackingNumber | Inbound tracking (optional) |
| dtLastUpdate | GETDATE() |
| lLastUpdateUser | Current user session |

### Auto-Created Repair on Eval Fail

When outgoing inspection fails, create a repair:

| tblRepair Column | Value |
|------------------|-------|
| lScopeKey | The loaner scope that failed |
| lDepartmentKey | TSI internal loaner department |
| sWorkOrderNumber | Auto-generated |
| bLoanerRequested | 0 (this IS the loaner) |
| dtCreateDate | GETDATE() |

Then update the loaner tran: SET lRepairKey = new repair key.

### Inspection Results Storage

- **Eval fail** → inspection results stored as sOut* P/F fields on the auto-created repair record, same as FinalInspectionForm writes today
- **Eval pass** → no repair record exists. Store inspection results as a JSON column on tblLoanerTran (new column: `sOutgoingInspection nvarchar(max)`). This captures what was checked without creating a throwaway repair record.

### Schema Changes Required

| Table | Change | Purpose |
|-------|--------|---------|
| tblLoanerTran | ADD `lTaskKey int NULL` | FK linking loaner tran to originating task |
| tblLoanerTran | ADD `sOutgoingInspection nvarchar(max) NULL` | JSON blob of pass/fail results for passing evals |

---

## API Endpoints

### New Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/loaners/available?scopeTypeKey={id} | Available scopes matching a scope type |
| POST | /api/loaners/book-out | Create loaner tran after passing eval |
| POST | /api/loaners/check-in | Set sDateIn, optional rack/tracking |
| POST | /api/loaners/eval-fail | Create repair WO + link to loaner tran |

### Existing Endpoints (no changes)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/loaners | List with stats |
| GET | /api/loaners/{scopeKey} | Detail |
| GET | /api/loaners/{scopeKey}/history | Transaction history |
| GET | /api/loaners/stats | Stat strip counts |

### Lookup Endpoints (needed for forms)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/delivery-methods | Dropdown values |

Department and sales rep come from the task, so no separate lookup needed for book-out.

---

## UI Components

### Task Fulfillment Flow (new)

Where it lives: triggered from the task list (dashboard/workspace), opens as a modal or drawer.

**Step 1 — Scope Picker:**
- Shows Available scopes matching requested type
- Columns: Serial#, Rack Position, On-Site flag
- Click to select

**Step 2 — Outgoing Inspection:**
- Reuses FinalInspectionForm component (or extracted shared InspectionChecklist)
- Filtered by scope type category (Flex/Rigid/Camera)
- All items pass/fail
- "Complete Inspection" button

**Step 3a — Pass: Book Out Form:**
- Delivery method (dropdown)
- PO# (text, optional)
- Tracking# (text, optional)
- "Book Out & Ship" button → creates tblLoanerTran

**Step 3b — Fail: Auto-Repair:**
- Shows which items failed
- "Create Repair" button → auto-creates repair WO under TSI dept
- Option to pick another scope or waitlist

### Check-In (existing, minor update)

Keep the existing inline expand on Out/Overdue rows:
- Rack position (text)
- Tracking# (text)
- "Check In" button → sets sDateIn

---

## What We're NOT Building

- No special inbound evaluation UI (handled by existing D&I repair pipeline)
- No billing logic in loaner flow (handled at repair WO creation in D&I)
- No scope type substitution (exact match or waitlist)
- No "Eval Out" visible status (evaluation is a gate, not a resting state)
- No loaner agreement generation (separate future feature, already stubbed)
- No shipping label generation (separate future feature, already stubbed)

---

## Dependencies

- **FinalInspectionForm** — needs to be extractable/reusable as a shared inspection checklist component
- **Task system** — task list needs "Fulfill Loaner" action wired
- **tblTaskLoaners** — must be migrated to Azure SQL if not already
- **TSI internal department** — need to identify or create the department key used for loaner maintenance repairs
- **Delivery methods lookup** — GET /api/delivery-methods endpoint needed
