# Repair Items Fast Entry & Amendment Design
**Date:** 2026-04-03
**Status:** Approved for implementation

---

## Goal

Replace the current clunky add row (free-text code + description + cause + comments) with a flow-state-optimized entry experience. Processors build price quotes under time pressure — every unnecessary field is friction. The target: pick an item, confirm fix type, hit Enter. Done. Move to the next one.

---

## Schema Reference

| Table | Key Columns | Role |
|-------|------------|------|
| `tblRepairItem` | `lRepairItemKey`, `sProblemID` (code), `sItemDescription`, `bActive` | Master item catalog |
| `tblPricingDetail` | `lRepairItemKey`, `lPricingCategoryKey`, `dblRepairPrice` | Price per item per client category |
| `tblClient` | `lPricingCategoryKey` | Client's pricing tier |
| `tblRepairItemTran` | `dblRepairPrice` (charged), `dblRepairPriceBase` (list), `sFixType`, `sProblemID` (cause), `sComments` | Line item transaction |
| `tblAmendRepairComments` | `lRepairKey`, `lAmendRepairTypeKey`, `lAmendRepairReasonKey`, `sAmendRepairComment`, `lAmendmentNumber`, `dtAmendmentDate` | Amendment audit trail |
| `tblAmendRepairTypes` | `lAmendRepairTypeKey`, `sAmendRepairType` | Amendment type lookup |
| `tblAmendRepairReasons` | `lAmendRepairReasonKey`, `lAmendRepairTypeKey`, `sAmendRepairReason` | Amendment reason lookup (filtered by type) |

---

## Part 1 — Fast Add Row

### UX Flow

1. **Search input** (full width, spans Code + Description columns) — type item name or code, dropdown shows matches from the predefined catalog for this repair's pricing category
2. **Select item** → code, description, and `defaultPrice` auto-fill (from `tblPricingDetail` via client's `lPricingCategoryKey`)
3. **Cause** — two toggle buttons: `UA` and `NW`. Default: neither selected. One tap to set, tap again to clear. User Avoidable / Normal Wear.
4. **Fix Type** — defaults to **C** (customer charge). Quick-tap buttons: `W` | `NC` | `C` | `A`. One tap to change.
5. **Amount** — pre-filled from pricing, editable. When Fix Type = W, amount displays as $0 (see warranty logic below).
6. **Comment** — optional short text input (80 char max, matches DB column).
7. **Enter** (or click `+`) → saves immediately → cursor snaps back to search input for next item.

Cause and Comments are included in the add row but are not required and do not block entry.

### Warranty Logic

When Fix Type is set to W:
- `dblRepairPrice` (charged) = **$0**
- `dblRepairPriceBase` (list value) = standard price from `tblPricingDetail`
- Both values written on INSERT — warranty items capture their value for reporting, charge nothing

When Fix Type is not W:
- `dblRepairPrice` = amount entered
- `dblRepairPriceBase` = same as `dblRepairPrice` (or standard price — store standard price always as base)

### What's Removed from the Add Row

- Free-text Code input (replaced by autocomplete selection)
- Free-text Description input (auto-fills from selected item)
- The current cause select dropdown (replaced by toggle buttons)
- The obligation to fill in cause before saving (it's optional)

---

## Part 2 — Inline Row Editing

Cause and Comments on existing rows can be edited directly without triggering the amendment flow:
- Click cause badge → small dropdown (UA / NW / clear)
- Click comments cell → inline text input, blur to save
- PATCH `/api/repairs/{key}/items/{tranKey}` with updated fields

**Amount and Fix Type changes on existing rows require the amendment flow** (see Part 3).

---

## Part 3 — Amendment Flow

### Access Points

1. **"Amendments" button** in the Details tab action bar — opens the amendment panel for the repair
2. **Click amount or fix type on an existing row** — opens the amendment panel pre-focused on a new amendment for that item

### Amendment Panel Layout

The panel is a drawer (600px, right side) or an inline section below the items table.

**Left column — Amendment history list**
- All amendments for this repair, newest first
- Each row: amendment #, date, type, reason (truncated), and user initials
- Click any row to view its detail on the right
- Highlighted row = currently selected amendment

**Right column — Amendment detail / new amendment form**

*Viewing a past amendment (read-only):*
- Amendment #, date, user
- Type label, Reason label
- Comment (full text)
- Which item was affected (item code + description)
- Old value → New value (fix type and/or amount)

*Creating a new amendment (triggered from row or "+ New Amendment" button):*
- Item selector (pre-filled if triggered from a row, else dropdown)
- Amend Type select — populated from `tblAmendRepairTypes`
- Amend Reason select — filtered to reasons matching selected type (`tblAmendRepairReasons.lAmendRepairTypeKey`)
- New Fix Type (optional — only if changing fix type)
- New Amount (optional — only if changing amount)
- Comment (optional free text)
- Save button → writes `tblRepairItemTran` (updated values) + inserts `tblAmendRepairComments` in a DB transaction. Amendment number = MAX(lAmendmentNumber) + 1 for this repair.

---

## Backend Endpoints

### New: `GET /api/repair-items?repairKey={key}`
Returns the item catalog with prices for this repair's client pricing category.

```sql
SELECT ri.lRepairItemKey, ri.sProblemID, ri.sItemDescription,
       ISNULL(pd.dblRepairPrice, 0) AS dblDefaultPrice
FROM tblRepairItem ri
LEFT JOIN tblRepairItemTran rit_dummy ON 1=0  -- just for join path
LEFT JOIN tblRepair r ON r.lRepairKey = @repairKey
LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
LEFT JOIN tblPricingDetail pd ON pd.lRepairItemKey = ri.lRepairItemKey
    AND pd.lPricingCategoryKey = c.lPricingCategoryKey
WHERE ri.bActive = 1
ORDER BY ri.sItemDescription
```

Response model: `{ itemKey, itemCode, description, defaultPrice }`

### Update: `POST /api/repairs/{key}/items`
Add `dblRepairPriceBase` parameter — always write the standard price as base, `dblRepairPrice` = 0 if warranty.

### Update: `PATCH /api/repairs/{key}/items/{tranKey}` (cause/comments only)
Lightweight patch for cause (`sProblemID`) and comments (`sComments`) — no amendment record needed.

### New: `GET /api/repairs/{key}/amendments`
Returns all amendments for a repair, newest first.
```sql
SELECT a.lAmendRepairCommentKey, a.lAmendmentNumber, a.dtAmendmentDate,
       at.sAmendRepairType, ar.sAmendRepairReason, a.sAmendRepairComment
FROM tblAmendRepairComments a
JOIN tblAmendRepairTypes at ON at.lAmendRepairTypeKey = a.lAmendRepairTypeKey
JOIN tblAmendRepairReasons ar ON ar.lAmendRepairReasonKey = a.lAmendRepairReasonKey
WHERE a.lRepairKey = @repairKey
ORDER BY a.lAmendmentNumber DESC
```

### New: `POST /api/repairs/{key}/amendments`
Creates an amendment — updates `tblRepairItemTran` AND inserts `tblAmendRepairComments` in a single transaction.

### New: `GET /api/amend-types`
Returns `tblAmendRepairTypes` list for the amendment form dropdowns.

### New: `GET /api/amend-reasons?typeKey={key}`
Returns `tblAmendRepairReasons` filtered by type.

---

## Frontend Changes

### `RepairItemsTable.tsx`
- Replace Code + Description text inputs with a single `<AutocompleteSearch>` component
- Add Cause toggle buttons (UA / NW) in the add row
- Fix Type row: change from `<select>` to button group (W | NC | C | A)
- Warranty auto-zero logic: when fixType === 'W', set amount to 0, store defaultPrice as base
- Add "Amendments" button to trigger the amendment panel

### New: `RepairItemAutoComplete.tsx`
- Calls `GET /api/repair-items?repairKey={key}` on mount (cached)
- Renders a search input with dropdown list
- On select: fires `onSelect({ itemKey, itemCode, description, defaultPrice })`

### New: `AmendmentPanel.tsx`
- Drawer component (600px)
- Left: amendment history list from `GET /api/repairs/{key}/amendments`
- Right: selected amendment detail (read-only) or new amendment form
- Form: type → reason (filtered) → new fix type / amount → comment → save

### `repairs.ts` (API)
- Add `getRepairItems(repairKey)`
- Add `getAmendments(repairKey)`
- Add `createAmendment(repairKey, body)`
- Add `getAmendTypes()`
- Add `getAmendReasons(typeKey)`
- Update `addRepairLineItem` to include `baseAmount`

---

## Implementation Tasks

1. **Backend — `GET /api/repair-items`** — items + prices for repair's pricing category
2. **Backend — `GET /api/repairs/{key}/amendments` + `POST`** — amendment read/write
3. **Backend — `GET /api/amend-types` + `GET /api/amend-reasons`** — lookup endpoints
4. **Backend — update `POST /api/repairs/{key}/items`** — write `dblRepairPriceBase`
5. **Frontend — `RepairItemAutoComplete.tsx`** — search/select component
6. **Frontend — update `RepairItemsTable.tsx`** — new add row (autocomplete + cause toggles + fix type buttons + warranty logic)
7. **Frontend — `AmendmentPanel.tsx`** — history list + detail/form drawer
8. **Frontend — wire amendment button** in DetailsTab action bar
9. **Frontend — update `repairs.ts`** — new API functions
10. **Smoke test** — add 3 items to a real repair via Azure, confirm prices, try warranty item (check $0 charged + base stored), open amendment panel

---

## Success Criteria

- Processor can add 5 repair items in under 30 seconds
- Selecting an item auto-fills description and price — no typing required
- Warranty items save $0 charged with the list price captured in base
- Amendment history shows all changes with type, reason, and date
- Clicking a past amendment shows its full detail read-only
- No silent error swallowing — all API failures show a message
