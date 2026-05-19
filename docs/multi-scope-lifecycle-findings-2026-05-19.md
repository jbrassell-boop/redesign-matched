# Multi-Scope WO Lifecycle Walkthrough — 2026-05-19

Follow-on to `smoke-test-findings-2026-05-19.md`. The first pass walked one **Flexible** repair (SR26138019); this pass walked one repair of each scope-type category to surface bugs that only appear on **Rigid** or **Camera** because they pull different forms / tables than Flexible.

Host: <https://happy-plant-03638db0f.6.azurestaticapps.net>
API: <https://tsi-redesign-api.azurewebsites.net>
DB: Azure SQL `tsi-sql-rm-8067.WinscopeWeb`

## Test corpus

| Type | WO | RepairKey | Scope | Client | Status before walk |
| --- | --- | --- | --- | --- | --- |
| Rigid | SR26138008 | 579173 | 171271760 | Total Scope, Inc. (internal) | In Repair Major (9) |
| Camera | NR26135004 | 579125 | 1288-310-130 CAMERA | Surgery Center of Lawrenceville | In Repair Major (9) |
| Flexible | NR26138002 | 579152 | CF HQ190L | Kent Hospital - RI | In Repair Mid Level (11) |

Each was advanced **In Repair → QC (21) → Scheduled to Ship (10)** through the Next Stage button. All three transitions succeeded with proper toasts and timeline updates. Status-log entries written cleanly. The frontend Next Stage label fix from this morning (commit `32912d7`) rendered the correct name on every step.

## Pass / fail by scope type

| Surface | Flexible | Rigid | Camera |
| --- | --- | --- | --- |
| Status: In Repair → QC | PASS | PASS | PASS |
| Status: QC → Scheduled to Ship | PASS | PASS | PASS |
| Inspections tab loads | PASS | PASS | PASS |
| Inspections tab form label | ✓ correct (OM05-1) | **WRONG** — shows OM05-1 Flexible (should be OM05-3 Rigid) | **WRONG** — shows OM05-1 Flexible (should be OM05-2 Camera) |
| Forms dropdown shows scope-specific D&I form | **MISSING** — D&I Flexible (OM07-3), D&I Flex Diagnostic (OM05-1), BI Flexible (OM07-3) | **MISSING** — D&I Rigid (OM05-3), BI Rigid (OM07-5) | **MISSING** — D&I Camera (OM05-2), BI Camera (OM07-4) |
| Forms dropdown shows generic forms | ✓ | ✓ | ✓ |
| Outgoing tab + invoice section | PASS | PASS | PASS |
| Draft Invoice button (UI) | unreliable | unreliable | unreliable |
| Draft Invoice endpoint (direct) | PASS — returns invoiceKey | PASS | PASS |

## Bugs and gaps

### Bug 1 — Inspections tab form label is hard-coded to OM05-1 Flexible regardless of scope type

**Where:** `client/src/pages/repairs/tabs/InspectionsTab.tsx:571-572`

```tsx
<SelectorCard
  title="D&I Intake"
  subtitle="OM05-1 — Flexible Endoscope Diagnostic Report"
  ...
```

The SelectorCard subtitle is a string literal. There's no branch on scope type. So Rigid scopes display the Flexible form label and likewise for Camera. The modal that opens (`InspectionForm`) is also Flexible-flavored regardless.

Right mapping:
| Scope type | Form ID | Title |
| --- | --- | --- |
| Flexible | OM05-1 | Flexible Endoscope Diagnostic Report |
| Rigid | OM05-3 | Rigid endoscope disassembly & inspection form |
| Camera | OM05-2 | Camera endoscope disassembly & inspection form |

**Severity:** medium. Data still saves to the same `tblRepair` columns (with `N/A` placeholders for non-applicable Rigid/Camera fields), but the user-facing form identification is wrong. Could fail an audit.

**Fix path:**
1. Backend: add `sRigidOrFlexible` (char R/F/C from `tblScopeType`) to the `RepairFull` API response. The SQL already joins `tblScopeType` — one extra column in the SELECT and one extra field in `RepairFull` record.
2. Frontend: pass `rigidOrFlexible` from `RepairDetailPane` → `InspectionsTab`. Branch the subtitle (and the modal title/header).

### Bug 2 — `formsForScope()` never matches; scope-specific D&I/BI forms are hidden universally

**Where:** `client/src/pages/repairs/RepairDetailPane.tsx:122-126`

```tsx
function formsForScope<T extends { types?: string[] }>(forms: T[], scopeType: string | undefined): T[] {
  const cat = (scopeType ?? '').toLowerCase();
  return forms.filter(f => !f.types || f.types.some(t => t.toLowerCase() === cat));
}
```

`scopeType` here is `fullRepair.scopeType` — which holds the **model name** like `"CF HQ190L"`, `"171271760"`, `"1288-310-130 CAMERA"`. The form catalog filters by `types: ['Flexible']` / `['Rigid']` / `['Camera']` (full names). The lowercase compare `"cf hq190l"` === `"flexible"` is never true, so the predicate drops every scope-type-tagged form. Forms with no `types` array (generic forms like Amendment, Update Slip, Invoice) survive.

**Impact:** users on every cockpit cannot reach the D&I or BI forms appropriate to their scope. This breaks the documented D&I workflow.

**Fix path:** same plumbing as Bug 1 — pass `rigidOrFlexible` ('R'/'F'/'C') as the discriminator, change the `types` tags in the form catalog to single-char codes, and change `formsForScope` to compare against the discriminator instead of the model-name string.

### Bug 3 — `tblRepair.sInvoiceNumber` never updates when Draft Invoice is created

**Where:** `server/TSI.Api/Controllers/RepairsController.cs:1435-1459` (`CreateDraftInvoice`)

The endpoint INSERTs into `tblInvoice` and returns the new `lInvoiceKey`, but it does NOT update `tblRepair.sInvoiceNumber`. The `GetRepairFull` query reads invoice number from `tblRepair`, so the cockpit invoice display stays empty after a draft invoice is created. Users have no visual confirmation the invoice exists.

**Fix path:** either (a) write the new invoice key/number back to `tblRepair.sInvoiceNumber` inside the same endpoint, or (b) change `GetRepairFull` to look up the latest non-void invoice from `tblInvoice` joined on `lRepairKey`. (b) is the cleaner long-term shape.

### Bug 4 — UI Draft Invoice button click is unreliable; direct API call always works

Multiple clicks on the Outgoing-tab "Draft Invoice" button registered an `OPTIONS` preflight but no follow-up `POST`. Direct `fetch()` to `/api/repairs/{id}/draft-invoice` returned 200 immediately. Likely a UI race condition (button refers to stale closure, or click handler is overwritten on re-render).

**Severity:** low until reproduced consistently. Worth a closer look but not blocking.

### Bug 5 — `Failed to load client flags` toast on Camera repair page load

Surfaced once on `/repairs/579125`. Likely a `/clients/{key}/flags` 500. Not reproduced on the other two repairs — could be data-shape specific to that client.

### Universal observation — inspection data is Flexible-shaped for every type

The cockpit Inspections endpoint reads from `tblRepair` directly (not `tblRepairInspection`) and the column names are Flexible-flavored (`AngInUp`, `sBrokenFibersIn`, `sInsFiberLightTrans`, …). For Rigid and Camera the legacy data is filled with `"N/A"` strings on the inapplicable fields. This is acceptable for read display but means **the modern InspectionForm modal lets you record angulation/fiber data on Rigid and Camera too**, which is meaningless. The form needs to render different field sets per scope type. Bigger refactor — not session-sized.

## Recommended PR sequence

1. **Bug 1 + Bug 2 together** — same plumbing. One PR adds `RigidOrFlexible` to `RepairFull` (backend), threads it through `InspectionsTab`, fixes the form catalog `types` to use `R`/`F`/`C`, and fixes the subtitle render. ~80 lines across 4 files.
2. **Bug 3** — backend-only. Update `GetRepairFull` SQL to LEFT JOIN `tblInvoice` on `(lRepairKey, MAX(InvoiceKey) WHERE bIsVoid = 0)` and project the invoice number. ~20 lines.
3. **Bug 4** — investigate the UI race; punt if not reproducible.
4. **Bug 5** — diagnose with the specific clientKey from NR26135004 (Surgery Center of Lawrenceville).
5. **Universal observation** — design ticket; not a code fix.

## Test artifacts left on happy-plant

Three repairs advanced today (5/19):

| WO | Before walk | After walk |
| --- | --- | --- |
| SR26138019 | Waiting on Inspection → Additional Evaluation Time Needed (5) | unchanged in this pass |
| SR26138008 | In Repair Major (9) | Scheduled to Ship (10) |
| NR26135004 | In Repair Major (9) | Scheduled to Ship (10) |
| NR26138002 | In Repair Mid Level (11) | Scheduled to Ship (10) |

Easy to spot in `tblRepairStatusLog` by `ChangeDate = 2026-05-19` for cleanup.
