# Remaining Forms — Design Spec
**Date:** 2026-04-08  
**Scope:** Build all 11 missing print/inspection forms and wire them into RepairDetailPane

---

## Background

The repairs cockpit has a Forms dropdown in the command strip. Ten forms are already built. Eleven forms exist in `C:/Projects/tsi-redesign/forms/` that have not yet been implemented in `redesign-matched`. This spec covers building all of them.

---

## Forms Inventory

### Group A — Final Inspection Variants
The existing `FinalInspectionForm.tsx` renders a Flex endoscope inspection only. Two additional scope-type variants must be added.

| Form ID | Title | Reference File |
|---------|-------|----------------|
| OM10-1 | Final Inspection — Rigid Endoscope | `form-om10-1-final-rigid.html` |
| OM10-3 | Final Inspection — Camera System | `form-om10-3-final-camera.html` |

**Implementation:** `FinalInspectionForm.tsx` is refactored to dispatch by `repair.scopeType`. The existing Flex render becomes a sub-render. Rigid and Camera sub-renders are added. The `final-inspection` key in the forms menu is unchanged — no new menu entries needed.

- **Rigid (OM10-1):** Scope Information header fields, 10-item Functional Test Strip (P/F/N/A), two-column Repairs Performed + Approved Items Returned checklists, Pass/Fail result footer, tech + inspector signature block.
- **Camera (OM10-3):** Equipment Information header, Functional Tests table, Scope Includes checklist, Repairs Performed checklist, result footer, signatures.

---

### Group B — Blank Inspection Forms
"BI" forms are mid-repair inspection sheets. They differ from D&I forms: no inspection data is pulled from the DB — only the repair header (client, WO, serial, model, tech, date) is pre-filled. The form body is blank P/F tables for the tech to complete on paper.

| Form ID | Title | Reference File | Scope Filter |
|---------|-------|----------------|-------------|
| OM07-3 | Blank Inspection — Flexible Endoscope | `form-om07-3-bi-flex.html` | Flexible |
| OM07-4 | Blank Inspection — Camera System | `form-om07-4-bi-camera.html` | Camera |
| OM07-5 | Blank Inspection — Rigid Endoscope | `form-om07-5-bi-rigid.html` | Rigid |

**Implementation:** Three new components — `BiFlexForm.tsx`, `BiCameraForm.tsx`, `BiRigidForm.tsx`. Each accepts `repair: RepairFull` and `onClose`. Added to `INTERNAL_FORMS` in `RepairDetailPane.tsx` with `types` scope filter matching the existing D&I pattern. New keys: `bi-flexible`, `bi-camera`, `bi-rigid`.

---

### Group C — Operational Forms

| Form ID | Title | Reference File | Data Sources |
|---------|-------|----------------|-------------|
| OM07-1 | Sub-Assembly QC Requisition | `form-om07-1-subassembly-qc.html` | repair header + line items |
| OM06-2 | 40-Day Warranty Review | `form-om06-2-40day.html` | repair header |
| OM23-1 | Non-Conforming Product | `form-om23-1-ncp.html` | repair header |

**OM07-1 Subassembly QC:** Repair Information header, parts table populated from `lineItems` prop (same data `RequisitionForm` uses), P/F box per part row, Overall QC Result (Pass/Conditional/Fail), Disposition checkboxes, QC Notes area, dual signatures. Parts table pads to minimum 6 rows if fewer line items exist.

**OM06-2 40-Day Warranty Review:** Repair header fields + warranty-period checklist sections. Data source is repair header only — no additional API calls.

**OM23-1 Non-Conforming Product:** Four sections: Identification, Reason for Non-Conformance, Investigation, Disposition. Repair header pre-filled; remaining fields are blank for manual completion.

New keys: `subassembly-qc`, `40-day-warranty`, `ncp`. All added to `INTERNAL_FORMS`.

---

### Group D — Document / Process Forms

| Form ID | Title | Reference File | Data Sources |
|---------|-------|----------------|-------------|
| — | Invoice | `form-invoice.html` | repair header + line items |
| OM03-2 | Repair Request | `form-om03-2-repair-request.html` | repair header |
| OM04-1 | Intake Label | `form-om04-1-intake-label.html` | repair header |

**Invoice:** Services & Items table pulled from `lineItems`, totals row, repair/client header, TSI address footer. Added to `CUSTOMER_FORMS`.

**OM03-2 Repair Request:** Customer-facing intake form — Facility Information, Equipment Information, Additional Information, Quote/Approval Preference sections. Pre-fills from repair header. Added to `CUSTOMER_FORMS`.

**OM04-1 Intake Label:** Compact label layout (designed to print on a small adhesive label or half-sheet). Contains: client name, department, WO#, serial#, scope model, date in. Added to `CUSTOMER_FORMS`.

New keys: `invoice`, `repair-request`, `intake-label`.

---

## RepairDetailPane Integration

### activeForm union type extension
```typescript
useState<
  'di-inspection' | 'di-flexible' | 'di-flex-diagnostic' | 'di-rigid' |
  'bi-flexible' | 'bi-camera' | 'bi-rigid' |
  'requisition' | 'final-inspection' | 'return-verification' |
  'amendment' | 'update-slip' | 'loaner' |
  'subassembly-qc' | '40-day-warranty' | 'ncp' |
  'invoice' | 'repair-request' | 'intake-label' |
  null
>
```

### INTERNAL_FORMS additions
```typescript
{ key: 'bi-flexible',     label: 'BI Flexible (OM07-3)',    title: '...', types: ['Flexible'] },
{ key: 'bi-camera',       label: 'BI Camera (OM07-4)',       title: '...', types: ['Camera'] },
{ key: 'bi-rigid',        label: 'BI Rigid (OM07-5)',        title: '...', types: ['Rigid'] },
{ key: 'subassembly-qc',  label: 'Sub-Assembly QC (OM07-1)', title: '...' },
{ key: '40-day-warranty', label: '40-Day Warranty (OM06-2)', title: '...' },
{ key: 'ncp',             label: 'Non-Conforming (OM23-1)',   title: '...' },
```

### CUSTOMER_FORMS additions
```typescript
{ key: 'invoice',         label: 'Invoice',                  title: '...' },
{ key: 'repair-request',  label: 'Repair Request (OM03-2)',  title: '...' },
{ key: 'intake-label',    label: 'Intake Label (OM04-1)',    title: '...' },
```

---

## Form Component Pattern

All forms follow the established pattern:
- `import './print.css'` — shared print stylesheet
- Props: `repair: RepairFull`, `onClose: () => void`, optional `lineItems?: RepairLineItem[]`
- Full-page overlay (`position: fixed, inset: 0`) with a Close button and Print button
- TSI logo (`assets/logo-color.jpg` via relative path), form title block top-right
- Section bars: `background: var(--primary), color: #fff`
- All colors via CSS variables — zero hardcoded hex
- Footer: "Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838"

**Note:** Company name is **Total Scope Inc.** — not "Technical Services Inc." as appears in some reference HTML files.

---

## Parallelism Plan

Four agents build concurrently, then a fifth wires everything into `RepairDetailPane.tsx`:

| Agent | Responsibility |
|-------|---------------|
| Agent 1 | Refactor `FinalInspectionForm.tsx` — add Rigid + Camera sub-renders |
| Agent 2 | `BiFlexForm.tsx`, `BiCameraForm.tsx`, `BiRigidForm.tsx` |
| Agent 3 | `SubassemblyQcForm.tsx`, `FortyDayWarrantyForm.tsx`, `NcpForm.tsx` |
| Agent 4 | `InvoiceForm.tsx`, `RepairRequestForm.tsx`, `IntakeLabelForm.tsx` |
| Agent 5 | Wire all new forms into `RepairDetailPane.tsx` (imports, union type, render blocks, menu entries) + `npx tsc --noEmit` |

Agents 1–4 write only their form files. Agent 5 runs after all four complete.

---

## Success Criteria

- All 11 forms render when launched from the Forms dropdown on a real repair
- Each form pre-fills correct repair header data from the `repair` prop
- Subassembly QC and Invoice correctly populate from `lineItems`
- Final Inspection dispatches to correct variant by `repair.scopeType`
- BI forms appear only for their matching scope type (scope-filtered)
- `npx tsc --noEmit` exits 0
- Print layout renders cleanly at 8.5×11in
- Footer says "Total Scope Inc." on all forms
