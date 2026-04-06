# Spec: OM05-1 Flexible Endoscope Diagnostic Report

**Date:** 2026-04-06
**Status:** Approved
**Source:** Physical form scan (DOC042.PDF) — Form #OM05-1, Revision Pending 01/2026

---

## Summary

Add a new print-only React form component for the **Flexible Endoscope Diagnostic Report (OM05-1)**. This is the D&I (Disassemble & Inspection) form for flexible endoscopes — a 2-page intake diagnostic used when a flexible scope arrives for repair.

The existing `DiFlexibleForm.tsx` is actually OM07-3 (Blank Inspection) and is unrelated. This new form coexists with it.

---

## New File

`client/src/pages/repairs/forms/DiFlexibleDiagnosticForm.tsx`

**Props:**
```ts
interface Props {
  repair: RepairFull;
  onClose: () => void;
}
```

---

## Form Structure (2 pages, print-only)

### Header (both pages)
- **Left:** TSI letterhead — "Total Scope, Inc." + address + phone/fax
- **Right:** "Flexible Endoscope Diagnostic Report" / Form #: OM05-1

### Section 1 — General Information
Grid fields pre-filled from repair prop:

| Label | Source |
|---|---|
| Customer | `repair.client` |
| Work Order # | `repair.wo` |
| Inspected By | blank |
| Date | today |
| Scope Model | `repair.scopeModel` |
| Rack # | `repair.rackLocation` |
| Customer Type | blank (FFS / CAP checkboxes) |
| Serial # | `repair.serial` |
| Package Type | blank |

**Accessories Received** (inline checkboxes):
None / ETO Cap / A/W Button / Suction Button / Water Cap / Biopsy Valve / Light Post Adapter

### Section 2 — Item Condition Upon Receipt
- External Condition: `O Clean` / `O Unclean` + warning "(if unclean, follow OM-22 SOP — Cleaned By:)"
- Model & SN# Confirmed: `□ Yes`
- Customer Perceived Problem: pre-filled from `repair.complaint`

### Section 3 — Functional Checks (9 subsections, each row = P/F/N/A + item + defect checkboxes)

**3A. Leak Test & Fluid Invasion**
- Leak Test Performed → Result: ___ / Leak Location: ___
- Fluid Invasion Detected → Location: □ BS □ CB □ SC □ LGC □ Lenses □ Other

**3B. Angulation System**
- Angulation Specs U: ___ D: ___ R: ___ L: ___ (Factory: U180/D180/R160/L160)
- Angulation System: □ Play □ Stiff/Grinding □ Broken Cable □ Slip Stopper □ Orientation Off □ Broken Bracket
- Angulation Knobs: □ Moving Together □ Not Locking □ Leaking — Location: ___
- Angulation Lock: □ Too Tight □ Too Loose □ Brake Not Functioning □ Missing

**3C. Image & Light Transmission**
- Video Image: □ No Image □ Static □ Lens Separation □ Imperfection □ Error Code Notes: ___
- Light Bundle: □ Slip from Tip □ Broken Fibers → % Broken: ___
- Video Features: □ Data □ WB □ NBI □ Dual Focus □ Orientation / Uses: ___ / Time: ___
- Control Switches: □ Misaligned □ Rubber Cut □ Inoperative — Switch #: ___

**3D. Channel Function**
- Suction Channel: □ Blocked □ Leaking □ Impeded
- Forcep/Biopsy Channel: □ Blocked □ Leaking □ Port Seal Damaged □ Impeded — Level: ___
- Auxiliary Water Channel: □ Blocked □ Leaking □ Loose □ Weak
- A/W System Channel: □ Kinked □ Clogged □ Leaking □ Nozzle Clogged

**3E. Electrical & Connector Integrity**
- Light Guide Connector (LGC): □ Alignment Pin Missing/Leaking □ Prong Loose □ Lens (Dirty or Broken) □ ETO Valve □ Bottle □ Connector Loose □ Cracked □ Leaking
- Electrical Pins/Contacts: □ Dirty □ Corroded □ Bent Pins

*(Page break)*

**3F. Control Body**
- Control Body Housing: □ Leaking □ Cracked □ Loose Mount
- Elevator Function: □ Wire Broken □ Needs Adjustment □ Channel Leaking □ Port Leaking

**3G. Insertion Tube**
- Surface: □ Dented □ Buckled □ Cut □ Peeling □ Cut Back Too Far □ Discolored — Location: ___
- Tensioner: □ Leaking □ Nonfunctional □ Needs Adjustment □ Knob Damage
- Flexibility: □ Stiff □ Over-flexible □ Snaking
- Boot (CB): □ Torn □ Loose □ Trim Ring

**3H. Distal Tip & Adhesive Surfaces**
- C-Cover: □ Cracked □ Loose □ RTV Missing □ Poor Condition
- BR Adhesive: □ Flaking □ Missing □ Aged □ Oversized → Measured Size: ___ / Max: 12.82mm
- Bending Rubber: □ Aging □ Loose □ Cut/Hole
- Bending Section Mesh: □ Poor Condition
- Lenses: □ Cracked □ Chipped □ Dirty □ Glue Missing □ Missing Lens — Specify: ___

**3I. Universal Cord & Boots**
- Cord: □ Dented □ Buckled □ Cut □ Peeling
- Boot (CB): □ Torn □ Loose □ Cracked
- Boot (LGC): □ Torn □ Loose □ Cracked

### Section 4 — Detailed Inspection
- Borescope Used (P/F/N/A only)
- Internal Channels: □ Good □ Freckling □ Debris □ Scratched/Deformed □ Other
- Residue: □ Biological □ Chemical □ Staining □ Other → Location: ___
- Photos Taken: □ Yes □ No

**SCOPE CONDITION (select one):**
`O Not Patient Safe` / `O Functional Issue` / `O Cosmetic Only` / `O No Issues Found`

### Section 5 — Repair Assessment
Free text area: "Tech notes..."

### Footer
`Form #: OM05-1 — Revision Pending (01/2026)`

---

## Rendering Details

- **Modal overlay** — same fixed overlay pattern as DiInspectionForm/DiRigidForm
- **Print/Close buttons** — top center, hidden on print via `.no-print`
- **P/F/N/A** — rendered as three inline bordered boxes (`Op`, `OF`, `ON/A`) in green/red/gray, identical style to existing D&I forms. Not interactive.
- **Checkboxes** — empty `□` boxes, not interactive
- **Radio circles** — rendered as `O` with label, not interactive
- **Width** — `8.5in` matching all other forms
- **Page break** — 3F starts page 2; use `className="print-page"` div with `pageBreakBefore: 'always'`

---

## Wiring Changes — `RepairDetailPane.tsx`

Two locations need updates (lines ~94 and ~364/611):

1. **Type union** — add `'di-flex-diagnostic'` to the `activeForm` state type
2. **Menu entry** — add `{ key: 'di-flex-diagnostic', label: 'D&I Flex Diagnostic (OM05-1)' }` to the D&I section of the forms dropdown (both render paths)
3. **Form render** — add `{activeForm === 'di-flex-diagnostic' && <DiFlexibleDiagnosticForm repair={...} onClose={...} />}` (both render paths)
4. **Import** — add `import { DiFlexibleDiagnosticForm } from './forms/DiFlexibleDiagnosticForm';`

---

## Out of Scope

- No backend changes
- No database saves
- No interactivity (checkboxes/radios are print-only)
- No HTML file in tsi-redesign (Option A — React only for now)
