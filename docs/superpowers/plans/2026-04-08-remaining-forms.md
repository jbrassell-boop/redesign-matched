# Remaining Forms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all 11 missing print/inspection forms and wire them into the RepairDetailPane forms dropdown.

**Architecture:** Each form is a standalone React component that accepts a `repair: RepairFull` prop (and optionally `lineItems`) — same pattern as existing forms. `FinalInspectionForm` is refactored internally to dispatch by `repair.scopeType`. All new forms follow the same overlay + print.css pattern. Tasks 1–4 are fully independent and can run in parallel. Task 5 wires everything together and must run after 1–4 are complete.

**Tech Stack:** React 19, TypeScript, print.css (existing), `RepairFull` / `RepairLineItem` types from `client/src/pages/repairs/types.ts`

---

## Canonical Form Pattern

Every form uses this exact pattern. Read an existing form (e.g. `DiRigidForm.tsx`) before starting any task to internalize the structure.

```tsx
import './print.css';
import type { RepairFull } from '../types';

interface Props { repair: RepairFull; onClose: () => void; }

// Style tokens — copy these exactly
const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';

const pageStyle: React.CSSProperties = {
  width: '8.5in', minHeight: '11in', background: '#fff', padding: '0.4in',
  fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222',
  boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
};

// Shared helper components (define in each file):
const Bar = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...sb, marginBottom: 2 }}>{children}</div>
);
const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ ...fv }}>{value ?? em}</div>
  </div>
);

export const MyForm = ({ repair, onClose }: Props) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
  >
    <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
      <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
      <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
    </div>
    <div className="print-form" style={pageStyle}>
      {/* FORM HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <img src="/assets/logo-color.jpg" alt="TSI Logo" style={{ height: 40 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Form Title</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Subtitle</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>OM##-#</div>
        </div>
      </div>
      {/* ... sections ... */}
      {/* FORM FOOTER */}
      <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: 7.5, color: 'var(--muted)' }}>
        <span>ISO 13485 Certified</span>
        <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM##-#</span>
      </div>
    </div>
  </div>
);
```

**Key rules:**
- Footer always says **"Total Scope Inc."** — not "Technical Services Inc." (some reference HTML files have the wrong name)
- All colors via CSS variables — no hardcoded hex in TSX
- `var(--primary)` = blue section bars; `var(--navy)` = title text
- Reference HTML files live at `C:/Projects/tsi-redesign/forms/` — read them for exact section content

---

## RepairFull field reference

```
repair.client        → client/facility name
repair.dept          → department name
repair.wo            → work order number
repair.serial        → serial number
repair.scopeModel    → scope model
repair.scopeType     → 'Flexible' | 'Rigid' | 'Camera' | other
repair.dateIn        → ISO date string (format: new Date(repair.dateIn).toLocaleDateString('en-US', {month:'2-digit',day:'2-digit',year:'numeric'}))
repair.tech          → primary technician name
repair.inspector     → inspector name
repair.complaint     → complaint/reason for repair
repair.daysLastIn    → number of days since last repair (for 40-day form)
repair.billAddr1/billAddr2/billCity/billState/billZip  → billing address
repair.shipAddr1/shipAddr2/shipCity/shipState/shipZip  → ship address
```

## RepairLineItem field reference

```
item.itemCode        → part number / SKU
item.description     → item description
item.amount          → unit amount (number)
item.tech            → technician assigned
```

---

## Task 1: Final Inspection — Rigid + Camera variants

**Files:**
- Modify: `client/src/pages/repairs/forms/FinalInspectionForm.tsx`

This task refactors `FinalInspectionForm` to dispatch by scope type. The existing Flex render becomes a sub-component. Two new sub-renders are added for Rigid (OM10-1) and Camera (OM10-3). The exported `FinalInspectionForm` function is unchanged — callers don't change.

- [ ] **Step 1: Read the existing FinalInspectionForm**

```bash
cat client/src/pages/repairs/forms/FinalInspectionForm.tsx
```

Understand the current Flex render structure before modifying.

- [ ] **Step 2: Read the reference HTML for Rigid and Camera**

```bash
cat C:/Projects/tsi-redesign/forms/form-om10-1-final-rigid.html
cat C:/Projects/tsi-redesign/forms/form-om10-3-final-camera.html
```

Note each form's: functional test items, checklist items in each column, result footer structure.

- [ ] **Step 3: Refactor FinalInspectionForm to dispatch by scope type**

Wrap the current Flex content into a local `FlexFinalInspection` component. Add `RigidFinalInspection` and `CameraFinalInspection` components. The exported function dispatches:

```tsx
export const FinalInspectionForm = ({ repair, inspections, lineItems, onClose }: Props) => {
  const type = repair.scopeType ?? '';
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
    >
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
        <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
        <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
      </div>
      {type === 'Rigid'  && <RigidFinalInspection repair={repair} />}
      {type === 'Camera' && <CameraFinalInspection repair={repair} lineItems={lineItems} />}
      {type !== 'Rigid' && type !== 'Camera' && <FlexFinalInspection repair={repair} inspections={inspections} lineItems={lineItems} />}
    </div>
  );
};
```

The overlay and button strip lives in the wrapper. Each sub-component receives no `onClose` — only the data it needs.

- [ ] **Step 4: Build RigidFinalInspection sub-component**

10-item functional test strip, two-column Repairs Performed + Approved Items Returned checklists. Match `form-om10-1-final-rigid.html` exactly.

Functional tests (from HTML):
```
1. Optical Clarity / Image Quality
2. Light Transmission
3. Telescope Rod Lens Integrity
4. Working Channel / Sheath
5. Ocular / Eyepiece Integrity
6. Light Post / Connector
7. Sheath / Tube Straightness
8. Coupler / Camera Attachment
9. Irrigation / Insufflation Ports
10. Cosmetic / Exterior Condition
```

P/F/N/A table row pattern:
```tsx
const PF_ROW = ({ label }: { label: string }) => (
  <tr>
    <td style={tdRow}>{label}</td>
    {['P','F','N/A'].map(v => (
      <td key={v} style={{ ...tdRow, textAlign: 'center', width: 44 }}>
        <span style={{ display: 'inline-block', width: v === 'N/A' ? 28 : 20, height: 14, border: `1px solid ${v==='P' ? 'var(--success)' : v==='F' ? 'var(--danger)' : '#aaa'}`, borderRadius: 2, textAlign: 'center', lineHeight: '14px', fontSize: 7.5, fontWeight: 700, color: v==='P' ? 'var(--success)' : v==='F' ? 'var(--danger)' : '#888' }}>{v}</span>
      </td>
    ))}
  </tr>
);
```

Checklist item pattern:
```tsx
const Ci = ({ label }: { label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, padding: '2px 0', borderBottom: '1px solid #f5f5f5' }}>
    <span style={{ display: 'inline-block', width: 10, height: 10, border: '1px solid #bbb', borderRadius: 1, flexShrink: 0 }} />
    {label}
  </div>
);
```

Repairs Performed checklist (from HTML):
```
Objective Lens Replacement, Ocular / Eyepiece Replacement, Light Post Replacement,
Rod Lens System Replacement, Sheath Replacement, Tip Repair / Replacement,
Recoating / Barrel Refinish, Prism / Deflector Replacement, Camera Coupler Replacement,
O-Ring / Seal Replacement, Full Overhaul, Other: ___________________
```

Approved Items Returned checklist:
```
Telescope, Sheath, Obturator, Bridge, Working Element,
Light Cable, Camera / Coupler, Storage Case,
Other: ___________________, Other: ___________________, Other: ___________________
```

Result footer: Condition (USABLE / UNUSABLE) + Final Result (PASSED / FAILED) side by side, then dual Technician + Inspector signature blocks.

Footer: `"Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838"` + form number `OM10-1`.

- [ ] **Step 5: Build CameraFinalInspection sub-component**

Match `form-om10-3-final-camera.html`. Sections:
- Equipment Information header (Client, Date, WO#, Serial#, Scope Model — 3-col grid)
- Functional Tests table (functional test items from HTML)
- Two-column: Scope Includes + Repairs Performed (both checkbox lists)
- Result footer (same USABLE/UNUSABLE + PASSED/FAILED pattern)
- Signatures
- Footer: `"Total Scope Inc. ..."` + `OM10-3`

Scope Includes items: Camera Head, Coupler, Camera Cable, Light Cable, Storage Case, User Manual

Repairs Performed items: CCD / Sensor Replacement, Cable Replacement, Connector Replacement, Coupler Replacement, Control Box Repair, Full Overhaul, Other: ___________________

- [ ] **Step 6: Run TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors. Fix any TS6133 unused import errors or type mismatches before continuing.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/repairs/forms/FinalInspectionForm.tsx
git commit -m "feat: add Rigid and Camera variants to FinalInspectionForm"
```

---

## Task 2: Blank Inspection forms (BI Flex / Camera / Rigid)

**Files:**
- Create: `client/src/pages/repairs/forms/BiFlexForm.tsx`
- Create: `client/src/pages/repairs/forms/BiCameraForm.tsx`
- Create: `client/src/pages/repairs/forms/BiRigidForm.tsx`

BI = Blank Inspection. These are printable inspection sheets where the tech fills in P/F values manually. They pre-fill only the repair header (client, WO, serial, model, tech, date). The body is blank checkboxes/P/F tables.

- [ ] **Step 1: Read the reference HTML files**

```bash
cat C:/Projects/tsi-redesign/forms/form-om07-3-bi-flex.html
cat C:/Projects/tsi-redesign/forms/form-om07-4-bi-camera.html
cat C:/Projects/tsi-redesign/forms/form-om07-5-bi-rigid.html
```

These are the ground truth for every section, checklist item, and test row.

- [ ] **Step 2: Create BiFlexForm.tsx**

Props: `repair: RepairFull`, `onClose: () => void`. Mirrors `form-om07-3-bi-flex.html` exactly.

```tsx
import './print.css';
import type { RepairFull } from '../types';

interface Props { repair: RepairFull; onClose: () => void; }

// Style tokens (canonical)
const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';
const pageStyle: React.CSSProperties = { width: '8.5in', minHeight: '11in', background: '#fff', padding: '0.4in', fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' };

const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : today;

export const BiFlexForm = ({ repair, onClose }: Props) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
  >
    <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
      <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
      <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
    </div>
    <div className="print-form" style={pageStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <img src="/assets/logo-color.jpg" alt="TSI Logo" style={{ height: 40 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Blank Inspection Report</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Flexible Endoscope</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>OM07-3</div>
        </div>
      </div>
      {/* Scope Information header fields */}
      <div style={{ ...sb, marginBottom: 2 }}>Scope Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 10px', marginBottom: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: 'span 2' }}>
          <span style={fl}>Client / Facility</span>
          <div style={fv}>{repair.client ?? em}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Work Order #</span>
          <div style={fv}>{repair.wo ?? em}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Scope Model</span>
          <div style={fv}>{repair.scopeModel ?? em}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Serial #</span>
          <div style={fv}>{repair.serial ?? em}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Technician</span>
          <div style={fv}>{repair.tech ?? em}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Date</span>
          <div style={fv}>{fmt(repair.dateIn)}</div>
        </div>
      </div>
      {/* Sections from form-om07-3-bi-flex.html: Items Found / Comments / Items Repaired / Additional Notes */}
      {/* ... mirror the HTML sections exactly ... */}
      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: 7.5, color: 'var(--muted)' }}>
        <span>ISO 13485 Certified</span>
        <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM07-3</span>
      </div>
    </div>
  </div>
);
```

Fill in all sections by reading `form-om07-3-bi-flex.html` — copy every section bar, checklist, and P/F table row. The HTML is the spec.

- [ ] **Step 3: Create BiCameraForm.tsx**

Same pattern. Read `form-om07-4-bi-camera.html` for exact sections. Props: `repair: RepairFull`, `onClose: () => void`. Form number: `OM07-4`. Subtitle: `Camera System`. Footer: `Total Scope Inc. ...` + `OM07-4`.

- [ ] **Step 4: Create BiRigidForm.tsx**

Same pattern. Read `form-om07-5-bi-rigid.html` for exact sections. Props: `repair: RepairFull`, `onClose: () => void`. Form number: `OM07-5`. Subtitle: `Rigid Endoscope`. Footer: `Total Scope Inc. ...` + `OM07-5`.

- [ ] **Step 5: Run TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors. Fix any unused imports.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/repairs/forms/BiFlexForm.tsx client/src/pages/repairs/forms/BiCameraForm.tsx client/src/pages/repairs/forms/BiRigidForm.tsx
git commit -m "feat: add Blank Inspection forms BI Flex / Camera / Rigid (OM07-3/4/5)"
```

---

## Task 3: Operational forms (Subassembly QC, 40-Day Warranty, NCP)

**Files:**
- Create: `client/src/pages/repairs/forms/SubassemblyQcForm.tsx`
- Create: `client/src/pages/repairs/forms/FortyDayWarrantyForm.tsx`
- Create: `client/src/pages/repairs/forms/NcpForm.tsx`

- [ ] **Step 1: Read the reference HTML files**

```bash
cat C:/Projects/tsi-redesign/forms/form-om07-1-subassembly-qc.html
cat C:/Projects/tsi-redesign/forms/form-om06-2-40day.html
cat C:/Projects/tsi-redesign/forms/form-om23-1-ncp.html
```

- [ ] **Step 2: Create SubassemblyQcForm.tsx**

Props: `repair: RepairFull`, `lineItems?: RepairLineItem[]`, `onClose: () => void`.

```tsx
import './print.css';
import type { RepairFull, RepairLineItem } from '../types';

interface Props { repair: RepairFull; lineItems?: RepairLineItem[]; onClose: () => void; }
```

Sections (from HTML):
1. **Repair Information** — Client (span 2), WO# , Scope/Model (span 2), Serial#, Complaint (span 2, minHeight 20), Technician, Date, QC Inspector (blank), QC Date (blank)
2. **Sub-Assembly Parts — QC Inspection** — table with columns: Part # | Description | Qty | Lot/Ref | Pass/Fail. Populate from `lineItems` prop. If `lineItems` is empty/undefined, render 8 blank rows.

Parts table row pattern:
```tsx
const parts = lineItems && lineItems.length > 0 ? lineItems : Array(8).fill(null);
// For each part row:
<tr key={i} style={{ background: i % 2 === 1 ? '#F9FAFB' : undefined }}>
  <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: 8.5, color: 'var(--navy)' }}>{item?.itemCode ?? ''}</span></td>
  <td style={tdStyle}>{item?.description ?? ''}</td>
  <td style={{ ...tdStyle, textAlign: 'center' }}></td>
  <td style={{ ...tdStyle, fontSize: 9, color: 'var(--muted)' }}></td>
  <td style={{ ...tdStyle, textAlign: 'center' }}>
    <span style={{ display: 'inline-block', width: 18, height: 13, border: '1px solid var(--success)', borderRadius: 2, textAlign: 'center', lineHeight: '13px', fontSize: 7.5, fontWeight: 700, color: 'var(--success)', margin: '0 2px' }}>P</span>
    <span style={{ display: 'inline-block', width: 18, height: 13, border: '1px solid var(--danger)', borderRadius: 2, textAlign: 'center', lineHeight: '13px', fontSize: 7.5, fontWeight: 700, color: 'var(--danger)', margin: '0 2px' }}>F</span>
  </td>
</tr>
```

3. **Overall QC Result** — three options in a row: ○ Pass — All parts acceptable | ○ Conditional — Proceed with noted exceptions | ○ Fail — Do not assemble
4. **Disposition** — four checkboxes in a row: □ Release for Assembly | □ Hold — Pending Re-inspection | □ Reject — Return to Supplier | □ Reject — Scrap
5. **QC Notes / Observations** — blank lined area (border box, minHeight 40)
6. **Authorization** — 4-field signature block: Technician Sig | Date | QC Inspector Sig | Date

Footer: `Total Scope Inc. ...` + `OM07-1 (12/2020)`

- [ ] **Step 3: Create FortyDayWarrantyForm.tsx**

Props: `repair: RepairFull`, `onClose: () => void`.

Read `form-om06-2-40day.html` for full section content. Pre-fill:
- `repair.client` → Client/Facility
- `repair.dept` → Department
- `repair.scopeModel` → Scope Model
- `repair.serial` → Serial #
- `repair.complaint` → Complaint / Return Reason
- `repair.wo` → Current Work Order #
- Prior Work Order # → blank (no field in RepairFull for this)
- Days Since Last In → `repair.daysLastIn != null ? String(repair.daysLastIn) : em`
- `repair.dateIn` → formatted date

Mirror all warranty checklist sections from the HTML exactly.

Footer: `Total Scope Inc. ...` + `OM06-2`

- [ ] **Step 4: Create NcpForm.tsx**

Props: `repair: RepairFull`, `onClose: () => void`.

Four sections (from HTML): Identification, Reason for Non-Conformance, Investigation, Disposition.

Pre-fill Identification section with: `repair.client`, `repair.wo`, `repair.serial`, `repair.scopeModel`, `repair.dateIn` (formatted), `repair.tech`.

All other sections are blank text areas / checkbox grids for manual completion. Mirror the HTML content exactly.

Footer: `Total Scope Inc. ...` + `OM23-1`

- [ ] **Step 5: Run TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/repairs/forms/SubassemblyQcForm.tsx client/src/pages/repairs/forms/FortyDayWarrantyForm.tsx client/src/pages/repairs/forms/NcpForm.tsx
git commit -m "feat: add Subassembly QC, 40-Day Warranty, and NCP forms (OM07-1/OM06-2/OM23-1)"
```

---

## Task 4: Document forms (Invoice, Repair Request, Intake Label)

**Files:**
- Create: `client/src/pages/repairs/forms/InvoiceForm.tsx`
- Create: `client/src/pages/repairs/forms/RepairRequestForm.tsx`
- Create: `client/src/pages/repairs/forms/IntakeLabelForm.tsx`

- [ ] **Step 1: Read the reference HTML files**

```bash
cat C:/Projects/tsi-redesign/forms/form-invoice.html
cat C:/Projects/tsi-redesign/forms/form-om03-2-repair-request.html
cat C:/Projects/tsi-redesign/forms/form-om04-1-intake-label.html
```

- [ ] **Step 2: Create InvoiceForm.tsx**

Props: `repair: RepairFull`, `lineItems?: RepairLineItem[]`, `onClose: () => void`.

Structure:
- Header: TSI logo left, "Invoice" title right
- Billing info block: `repair.billName`/`billAddr1`/`billAddr2`/`billCity`/`billState`/`billZip` (bill-to address) + WO#, Invoice#, Date
- Section bar: **Services & Items**
- Line items table: columns = Description | Amount. Populate from `lineItems`. Each row: `{item.description}` | `${item.amount.toFixed(2)}`. If no items, show one blank row.
- Totals row: sum of `lineItems.reduce((acc, i) => acc + i.amount, 0)`, formatted as `$${total.toFixed(2)}`
- Footer: `Total Scope Inc. ...` (no form number for invoice)

```tsx
const total = (lineItems ?? []).reduce((acc, i) => acc + (i.amount ?? 0), 0);
```

- [ ] **Step 3: Create RepairRequestForm.tsx**

Props: `repair: RepairFull`, `onClose: () => void`. Form number: `OM03-2`.

Five sections (from HTML): Facility Information, Equipment Information, Additional Information, Quote / Approval Preference, Return / Pickup Method.

Pre-fill from repair:
- Facility Information: `repair.client` → Facility/Hospital Name, `repair.dept` → Department
- Equipment Information: `repair.scopeModel`, `repair.serial`, `repair.scopeType` (as Scope Type), `repair.complaint` → Problem Description
- Additional Information: blank fields
- Quote / Approval Preference: blank checkboxes
- Return / Pickup Method: blank checkboxes

All other fields are blank for manual completion. Mirror HTML sections exactly.

Footer: `Total Scope Inc. ...` + `OM03-2`

- [ ] **Step 4: Create IntakeLabelForm.tsx**

Props: `repair: RepairFull`, `onClose: () => void`.

This is a compact 4in × 2in label layout (not a full letter page). The `pageStyle` override:

```tsx
const labelStyle: React.CSSProperties = {
  width: '4in', height: '2in', padding: '8px 10px',
  display: 'flex', flexDirection: 'column', gap: 3,
  border: '1px dashed #ccc', margin: '0 auto', overflow: 'hidden',
  fontFamily: 'Arial, sans-serif', background: '#fff', color: '#000',
};
```

Print CSS override for label (add inline style or a `<style>` tag inside the component for `@media print`):

```tsx
// Add this before the overlay div — it injects print-only page size CSS:
// <style>{`@media print { @page { size: 4in 2in landscape; margin: 0; } }`}</style>
```

Content (from HTML):
```
[WO# large] ............... [Date received]
Client: [repair.client]
Model:  [repair.scopeModel]
Serial: [repair.serial]
[barcode area — render WO# in large monospace font as Code 39 placeholder]
```

```tsx
const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

export const IntakeLabelForm = ({ repair, onClose }: Props) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
  >
    <style>{`@media print { @page { size: 4in 2in landscape; margin: 0; } }`}</style>
    <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
      <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print Label</button>
      <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
    </div>
    <div className="print-form" style={labelStyle}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1.5px solid #000', paddingBottom: 4, marginBottom: 2 }}>
        <span style={{ fontSize: 20, fontWeight: 900 }}>{repair.wo ?? '—'}</span>
        <div style={{ fontSize: 9, textAlign: 'right' }}>
          <strong style={{ display: 'block', fontSize: 10 }}>{fmt(repair.dateIn)}</strong>
          Date Received
        </div>
      </div>
      {[['Client', repair.client], ['Model', repair.scopeModel], ['Serial', repair.serial]].map(([lbl, val]) => (
        <div key={lbl} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#555', width: 44, flexShrink: 0 }}>{lbl}</span>
          <span style={{ fontSize: 11, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val ?? '—'}</span>
        </div>
      ))}
      <div style={{ marginTop: 'auto', textAlign: 'center' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 28, lineHeight: 1, letterSpacing: 2 }}>*{repair.wo ?? ''}*</div>
        <div style={{ fontSize: 7.5, color: '#555', letterSpacing: '0.08em', marginTop: 1 }}>{repair.wo ?? ''}</div>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 5: Run TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/repairs/forms/InvoiceForm.tsx client/src/pages/repairs/forms/RepairRequestForm.tsx client/src/pages/repairs/forms/IntakeLabelForm.tsx
git commit -m "feat: add Invoice, Repair Request (OM03-2), and Intake Label (OM04-1) forms"
```

---

## Task 5: Wire all new forms into RepairDetailPane (run AFTER Tasks 1–4)

**Files:**
- Modify: `client/src/pages/repairs/RepairDetailPane.tsx`

This task adds imports, menu entries, union type extensions, and render blocks for all 9 new form keys.

- [ ] **Step 1: Read the current RepairDetailPane to understand existing wiring**

```bash
grep -n "activeForm\|INTERNAL_FORMS\|CUSTOMER_FORMS\|import.*Form\|setActiveForm\|&& <" client/src/pages/repairs/RepairDetailPane.tsx | head -60
```

Note: the `activeForm` union type is at line ~162. `INTERNAL_FORMS` at ~126. `CUSTOMER_FORMS` at ~141. Render blocks at ~472 and ~689 (the component has two render paths for cockpit vs split-layout mode).

- [ ] **Step 2: Add new imports at the top of RepairDetailPane.tsx**

After the existing form imports, add:

```tsx
import { BiFlexForm }           from './forms/BiFlexForm';
import { BiCameraForm }         from './forms/BiCameraForm';
import { BiRigidForm }          from './forms/BiRigidForm';
import { SubassemblyQcForm }    from './forms/SubassemblyQcForm';
import { FortyDayWarrantyForm } from './forms/FortyDayWarrantyForm';
import { NcpForm }              from './forms/NcpForm';
import { InvoiceForm }          from './forms/InvoiceForm';
import { RepairRequestForm }    from './forms/RepairRequestForm';
import { IntakeLabelForm }      from './forms/IntakeLabelForm';
```

- [ ] **Step 3: Extend the activeForm union type**

Find the `useState<'di-inspection' | ...>` declaration and extend it:

```tsx
const [activeForm, setActiveForm] = useState<
  'di-inspection' | 'di-flexible' | 'di-flex-diagnostic' | 'di-rigid' |
  'bi-flexible' | 'bi-camera' | 'bi-rigid' |
  'requisition' | 'final-inspection' | 'return-verification' |
  'amendment' | 'update-slip' | 'loaner' |
  'subassembly-qc' | '40-day-warranty' | 'ncp' |
  'invoice' | 'repair-request' | 'intake-label' |
  null
>(null);
```

- [ ] **Step 4: Add new entries to INTERNAL_FORMS**

```tsx
const INTERNAL_FORMS = [
  { key: 'di-inspection'   as const, label: 'D&I Camera (OM05-2)',        title: 'Camera endoscope disassembly & inspection form',            types: ['Camera'] },
  { key: 'di-flexible'     as const, label: 'D&I Flexible (OM07-3)',      title: 'Flexible endoscope disassembly & inspection form',          types: ['Flexible'] },
  { key: 'di-flex-diagnostic' as const, label: 'D&I Flex Diagnostic (OM05-1)', title: 'Flexible endoscope diagnostic disassembly & inspection form', types: ['Flexible'] },
  { key: 'di-rigid'        as const, label: 'D&I Rigid (OM05-3)',         title: 'Rigid endoscope disassembly & inspection form',             types: ['Rigid'] },
  { key: 'bi-flexible'     as const, label: 'BI Flexible (OM07-3)',       title: 'Blank inspection — flexible endoscope',                     types: ['Flexible'] },
  { key: 'bi-camera'       as const, label: 'BI Camera (OM07-4)',         title: 'Blank inspection — camera system',                          types: ['Camera'] },
  { key: 'bi-rigid'        as const, label: 'BI Rigid (OM07-5)',          title: 'Blank inspection — rigid endoscope',                        types: ['Rigid'] },
  { key: 'amendment'       as const, label: 'Amendment (OM07-9)',         title: 'Repair order amendment form' },
  { key: 'update-slip'     as const, label: 'Update Slip (OM15-2)',       title: 'Customer update communication slip' },
  { key: 'subassembly-qc'  as const, label: 'Sub-Assembly QC (OM07-1)',   title: 'Sub-assembly parts QC requisition' },
  { key: '40-day-warranty' as const, label: '40-Day Warranty (OM06-2)',   title: '40-day warranty review form' },
  { key: 'ncp'             as const, label: 'Non-Conforming (OM23-1)',     title: 'Non-conforming product report' },
];
```

- [ ] **Step 5: Add new entries to CUSTOMER_FORMS**

```tsx
const CUSTOMER_FORMS = [
  { key: 'requisition'        as const, label: 'Requisition (OM07-2)',     title: 'Customer repair requisition form' },
  { key: 'final-inspection'   as const, label: 'Final Inspection (OM10)',  title: 'Final quality inspection report (dispatches by scope type)' },
  { key: 'return-verification' as const, label: 'Return Verification (OM14-1)', title: 'Return shipment verification form' },
  { key: 'loaner'             as const, label: 'Loaner (OM17-1)',          title: 'Loaner scope request and tracking form' },
  { key: 'invoice'            as const, label: 'Invoice',                  title: 'Billing invoice for repair services' },
  { key: 'repair-request'     as const, label: 'Repair Request (OM03-2)', title: 'Customer-facing repair intake form' },
  { key: 'intake-label'       as const, label: 'Intake Label (OM04-1)',   title: 'Printable 4×2 intake label with barcode' },
];
```

- [ ] **Step 6: Add render blocks — first render location (~line 472)**

After the existing render blocks, add:

```tsx
{activeForm === 'bi-flexible'     && <BiFlexForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
{activeForm === 'bi-camera'       && <BiCameraForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
{activeForm === 'bi-rigid'        && <BiRigidForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
{activeForm === 'subassembly-qc'  && <SubassemblyQcForm repair={fullRepair} lineItems={lineItems} onClose={() => setActiveForm(null)} />}
{activeForm === '40-day-warranty' && <FortyDayWarrantyForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
{activeForm === 'ncp'             && <NcpForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
{activeForm === 'invoice'         && <InvoiceForm repair={fullRepair} lineItems={lineItems} onClose={() => setActiveForm(null)} />}
{activeForm === 'repair-request'  && <RepairRequestForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
{activeForm === 'intake-label'    && <IntakeLabelForm repair={fullRepair} onClose={() => setActiveForm(null)} />}
```

- [ ] **Step 7: Add identical render blocks — second render location (~line 689)**

```tsx
{activeForm === 'bi-flexible'     && <BiFlexForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
{activeForm === 'bi-camera'       && <BiCameraForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
{activeForm === 'bi-rigid'        && <BiRigidForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
{activeForm === 'subassembly-qc'  && <SubassemblyQcForm repair={detail as unknown as RepairFull} lineItems={lineItems} onClose={() => setActiveForm(null)} />}
{activeForm === '40-day-warranty' && <FortyDayWarrantyForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
{activeForm === 'ncp'             && <NcpForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
{activeForm === 'invoice'         && <InvoiceForm repair={detail as unknown as RepairFull} lineItems={lineItems} onClose={() => setActiveForm(null)} />}
{activeForm === 'repair-request'  && <RepairRequestForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
{activeForm === 'intake-label'    && <IntakeLabelForm repair={detail as unknown as RepairFull} onClose={() => setActiveForm(null)} />}
```

- [ ] **Step 8: Run TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors. Fix every TS6133 unused import error and every type mismatch before the commit.

- [ ] **Step 9: Commit and push**

```bash
git add client/src/pages/repairs/RepairDetailPane.tsx
git commit -m "feat: wire all 11 new forms into RepairDetailPane forms menu"
git push
```

- [ ] **Step 10: Smoke test after deploy**

Wait for both CI pipelines to go green, then:

```bash
curl "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/repairs/577712/full"
```

Confirm the API returns data. Then load `https://happy-plant-03638db0f.6.azurestaticapps.net`, open any repair, open the Forms dropdown, and verify:
- All new forms appear in the menu
- BI forms only show for their correct scope type
- Each form opens, pre-fills repair data, and has a working Print + Close button
- Footer on every form says "Total Scope Inc." (not "Technical Services Inc.")
