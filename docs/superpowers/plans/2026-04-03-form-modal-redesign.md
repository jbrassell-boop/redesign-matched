# Form Modal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three bare-bones Ant Design table modals (Update Slips, Defect Tracking, Inventory) in `DetailsTab.tsx` with standalone form components that visually match the HTML reference forms in `C:/Projects/tsi-redesign/forms/`, and add a print view to `AmendmentModal.tsx`.

**Architecture:** Each modal becomes a standalone `*Modal.tsx` component in `client/src/pages/repairs/components/`. Each renders a document-style form (TSI branding header, blue section bars, field grids, content table/list, signature block, print button) matching the corresponding HTML form. Data comes from existing API endpoints — no backend changes needed. `DetailsTab.tsx` is updated to import and use the new components instead of inline Ant Modals.

**Tech Stack:** React 19, TypeScript, Ant Design 5 Modal wrapper, inline styles only (no new CSS files), CSS vars from `tokens.css`.

---

## HTML Reference → Modal Mapping

| Button | HTML Reference | New Component | Width |
|--------|----------------|---------------|-------|
| Update Slips | `form-om15-2-update-slip.html` | `UpdateSlipsModal.tsx` | 760px |
| Defect Tracking | `form-om07-8-defect.html` | `DefectTrackingModal.tsx` | 680px |
| Inventory | `form-om07-6-picklist.html` | `InventoryPicklistModal.tsx` | 820px |
| Amend Repair | `form-om07-9-amendment.html` | `AmendmentModal.tsx` (add print) | existing 700px |

## Data Already Available (No Backend Changes)

- `getUpdateSlips(repairKey)` → `{ slipKey, date, primaryTech, secondaryTech, reason }[]`
- `getDefectTracking(repairKey)` → `{ itemKey, item, comment }[]`
- `getRepairInventoryUsage(repairKey)` → `{ key, inventoryItem, size, repairItem }[]`
- `repair: RepairFull` prop in `DetailsTab.tsx` carries: `client`, `dept`, `scopeType`, `serial`, `wo`, `dateIn`, `tech`

## Shared Visual Patterns (from HTML forms)

```
Section bar:   background: 'var(--primary)', color: '#fff', fontSize: 9, fontWeight: 700,
               textTransform: 'uppercase', letterSpacing: '.06em', padding: '4px 10px'

Field label:   fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase',
               color: '#555', letterSpacing: '.04em'

Field value:   borderBottom: '1px solid #999', minHeight: 18, fontSize: 11, padding: '1px 2px'

Table header:  background: 'var(--primary)', color: '#fff', fontSize: 8, fontWeight: 700,
               textTransform: 'uppercase', padding: '4px 8px'

Stripe rows:   odd = '#fff', even = '#F9FAFB'

Form title:    fontSize: 15, fontWeight: 800, color: 'var(--navy)'
Form number:   fontSize: 10, color: '#666'
Form subtitle: fontSize: 11, fontWeight: 600, color: 'var(--primary)'
```

## File Structure

```
client/src/pages/repairs/
  components/
    UpdateSlipsModal.tsx       ← CREATE  (matches OM15-2)
    DefectTrackingModal.tsx    ← CREATE  (matches OM07-8)
    InventoryPicklistModal.tsx ← CREATE  (matches OM07-6)
    AmendmentModal.tsx         ← MODIFY  (add Print OM07-9 button/view)
  tabs/
    DetailsTab.tsx             ← MODIFY  (import + use 3 new components, remove 3 inline Modals)
```

---

## Task 1: Build `UpdateSlipsModal.tsx`

**Files:**
- Create: `client/src/pages/repairs/components/UpdateSlipsModal.tsx`

Matches `form-om15-2-update-slip.html`. Shows: red "Internal Use Only" banner, scope info header fields, all slip history in a styled table, 6-category "Reason for Update" grid, signature block, print button.

- [ ] **Step 1: Create the file**

```tsx
// client/src/pages/repairs/components/UpdateSlipsModal.tsx
import { Modal } from 'antd';
import type { RepairFull } from '../types';

interface UpdateSlipsModalProps {
  open: boolean;
  onClose: () => void;
  repair: RepairFull;
  slips: { slipKey: number; date: string; primaryTech: string; secondaryTech: string; reason: string }[];
}

const sBar: React.CSSProperties = {
  background: 'var(--primary)', color: '#fff',
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.06em', padding: '4px 10px', margin: '8px 0 0',
};
const fl: React.CSSProperties = {
  fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase',
  color: '#555', letterSpacing: '.04em',
};
const fv: React.CSSProperties = {
  borderBottom: '1px solid #999', minHeight: 18, fontSize: 11, padding: '1px 2px',
};

const REASON_CATS = ['Image', 'Lights', 'Buttons', 'Leaks', 'Angulation', 'Video Features'] as const;

export const UpdateSlipsModal = ({ open, onClose, repair, slips }: UpdateSlipsModalProps) => (
  <Modal open={open} onCancel={onClose} footer={null} width={760} destroyOnClose>
    {/* Print button */}
    <div style={{ textAlign: 'center', marginBottom: 12 }}>
      <button
        onClick={() => window.print()}
        style={{
          padding: '7px 20px', background: 'var(--primary)', color: '#fff',
          border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Print / Save PDF
      </button>
    </div>

    <div style={{ background: '#fff', fontFamily: 'Inter, Arial, sans-serif', fontSize: 11, color: '#111' }}>

      {/* Internal Use Only Banner */}
      <div style={{
        background: '#FEF2F2', border: '2px solid #FECACA',
        borderRadius: 4, padding: '8px 16px', textAlign: 'center', marginBottom: 10,
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '.12em' }}>
          Internal Use Only
        </div>
        <div style={{ fontSize: 9, color: '#7F1D1D', marginTop: 2, fontWeight: 600 }}>
          Do not send to customer — for TSI technician use only
        </div>
      </div>

      {/* Form header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)' }}>Total Scope Inc.</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Update Slip</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Technician Update Request</div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM15-2</div>
        </div>
      </div>

      {/* Scope Information */}
      <div style={sBar}>Scope Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px 12px', padding: '6px 0 2px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Update Request Date</span>
          <div style={fv}>{slips[0]?.date ?? '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Hospital / Facility</span>
          <div style={fv}>{repair.client || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: '1 / -1' }}>
          <span style={fl}>Model</span>
          <div style={fv}>{repair.scopeType || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Serial #</span>
          <div style={fv}>{repair.serial || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Work Order #</span>
          <div style={fv}>{repair.wo || '—'}</div>
        </div>
      </div>

      {/* Slip History */}
      <div style={sBar}>Slip History</div>
      {slips.length === 0 ? (
        <div style={{ padding: '12px 0', color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}>
          No update slips recorded for this repair.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, fontSize: 10 }}>
          <thead>
            <tr>
              {['Date', 'Reason', 'Primary Tech', 'Secondary Tech'].map(h => (
                <th key={h} style={{
                  background: 'var(--primary)', color: '#fff', fontSize: 8, fontWeight: 700,
                  textTransform: 'uppercase', padding: '4px 8px', textAlign: 'left',
                  letterSpacing: '.03em', borderRight: '1px solid rgba(255,255,255,.2)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slips.map((s, i) => (
              <tr key={s.slipKey} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee' }}>{s.date}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee' }}>{s.reason || '—'}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee' }}>{s.primaryTech || '—'}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8' }}>{s.secondaryTech || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Reason for Update — 6 categories */}
      <div style={sBar}>Reason for Update</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', padding: '8px 0' }}>
        {REASON_CATS.map(cat => (
          <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)',
              letterSpacing: '.05em', padding: '3px 8px',
              background: '#EFF6FF', borderLeft: '3px solid var(--primary)',
            }}>
              {cat}
            </div>
            <div style={{
              border: '1px solid #ccc', borderRadius: 3, minHeight: 40,
              padding: '4px 8px', fontSize: 10, color: '#9ca3af', fontStyle: 'italic',
            }}>
              {slips.find(s => s.reason?.toLowerCase().includes(cat.toLowerCase()))?.reason || ''}
            </div>
          </div>
        ))}
      </div>

      {/* Signature block */}
      <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
        {[
          { label: 'Technician / Signature', maxWidth: undefined },
          { label: 'Date', maxWidth: 130 },
          { label: 'Reviewed By / Signature', maxWidth: undefined },
          { label: 'Date', maxWidth: 130 },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, maxWidth: s.maxWidth, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #999', minHeight: 30 }} />
            <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Form footer */}
      <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#888' }}>
        <span>ISO 13485 Certified — Internal Document</span>
        <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM15-2</span>
      </div>
    </div>
  </Modal>
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors for `UpdateSlipsModal.tsx`.

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/components/UpdateSlipsModal.tsx
git commit -m "feat: UpdateSlipsModal — OM15-2 form design with history table and reason grid"
```

---

## Task 2: Build `DefectTrackingModal.tsx`

**Files:**
- Create: `client/src/pages/repairs/components/DefectTrackingModal.tsx`

Matches `form-om07-8-defect.html`. Shows: scope identification fields from repair, each defect item as a filled checkbox with comment, follow-up notes, signature block, print button.

- [ ] **Step 1: Create the file**

```tsx
// client/src/pages/repairs/components/DefectTrackingModal.tsx
import { Modal } from 'antd';
import type { RepairFull } from '../types';

interface DefectTrackingModalProps {
  open: boolean;
  onClose: () => void;
  repair: RepairFull;
  defects: { itemKey: number; item: string; comment: string }[];
}

const sBar: React.CSSProperties = {
  background: 'var(--primary)', color: '#fff',
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.06em', padding: '4px 10px', margin: '8px 0 0',
};
const fl: React.CSSProperties = {
  fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase',
  color: '#555', letterSpacing: '.04em',
};
const fv: React.CSSProperties = {
  borderBottom: '1px solid #999', minHeight: 18, fontSize: 11, padding: '1px 2px',
};

export const DefectTrackingModal = ({ open, onClose, repair, defects }: DefectTrackingModalProps) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={680} destroyOnClose>
      {/* Print button */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '7px 20px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Print / Save PDF
        </button>
      </div>

      <div style={{ background: '#fff', fontFamily: 'Inter, Arial, sans-serif', fontSize: 11, color: '#111' }}>

        {/* Form header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)' }}>Total Scope Inc.</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Defect Tracking</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Repair Quality Record</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM07-8</div>
          </div>
        </div>

        {/* Scope Identification */}
        <div style={sBar}>Scope Identification</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px 12px', padding: '6px 0 2px' }}>
          {[
            { label: 'Date', value: today },
            { label: 'Work Order', value: repair.wo },
            { label: 'Model', value: repair.scopeType },
            { label: 'Serial #', value: repair.serial },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={fl}>{label}</span>
              <div style={fv}>{value || '—'}</div>
            </div>
          ))}
        </div>

        {/* Defect items — rendered as checked checkboxes */}
        <div style={sBar}>Failure Type</div>
        <div style={{ padding: '4px 0' }}>
          {defects.length === 0 ? (
            <div style={{ padding: '12px 0', color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}>
              No defect items recorded for this repair.
            </div>
          ) : defects.map(d => (
            <div key={d.itemKey} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '7px 0', borderBottom: '1px solid #f0f0f0',
            }}>
              {/* Filled checkbox (item IS checked — it was recorded) */}
              <div style={{
                width: 14, height: 14, border: '1.5px solid var(--primary)',
                borderRadius: 2, background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 1,
              }}>
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                  <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600 }}>{d.item || 'Unknown defect item'}</div>
                {d.comment && (
                  <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, fontSize: 10, color: '#555', marginTop: 4 }}>
                    {d.comment}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Follow-Up Notes */}
        <div style={sBar}>Follow-Up Notes</div>
        <div style={{
          border: '1px solid #ccc', borderRadius: 3, minHeight: 36,
          padding: '4px 8px', fontSize: 10.5, marginTop: 4,
          color: defects.some(d => d.comment) ? '#374151' : '#9ca3af',
          fontStyle: defects.some(d => d.comment) ? 'normal' : 'italic',
        }}>
          {defects.map(d => d.comment).filter(Boolean).join(' | ') || 'No additional notes'}
        </div>

        {/* Signature block */}
        <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
          {[
            { label: 'Recorded By / Signature', maxWidth: undefined },
            { label: 'Date', maxWidth: 130 },
            { label: 'Reviewed By / Signature', maxWidth: undefined },
            { label: 'Date', maxWidth: 130 },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, maxWidth: s.maxWidth, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid #999', minHeight: 28 }} />
              <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Form footer */}
        <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#888' }}>
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
          <span>OM07-8</span>
        </div>
      </div>
    </Modal>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/components/DefectTrackingModal.tsx
git commit -m "feat: DefectTrackingModal — OM07-8 form design with checked defect items"
```

---

## Task 3: Build `InventoryPicklistModal.tsx`

**Files:**
- Create: `client/src/pages/repairs/components/InventoryPicklistModal.tsx`

Matches `form-om07-6-picklist.html`. Shows: repair information header fields, parts table with item/size/repairItem columns, signature block, barcode footer row with WO# and serial, print button.

- [ ] **Step 1: Create the file**

```tsx
// client/src/pages/repairs/components/InventoryPicklistModal.tsx
import { Modal } from 'antd';
import type { RepairFull } from '../types';

interface InventoryPicklistModalProps {
  open: boolean;
  onClose: () => void;
  repair: RepairFull;
  items: { key: number; inventoryItem: string; size: string; repairItem: string }[];
}

const sBar: React.CSSProperties = {
  background: 'var(--primary)', color: '#fff',
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.06em', padding: '4px 10px', margin: '8px 0 0',
};
const fl: React.CSSProperties = {
  fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase',
  color: '#555', letterSpacing: '.04em',
};
const fv: React.CSSProperties = {
  borderBottom: '1px solid #999', minHeight: 17, fontSize: 11, padding: '1px 2px',
};

export const InventoryPicklistModal = ({ open, onClose, repair, items }: InventoryPicklistModalProps) => (
  <Modal open={open} onCancel={onClose} footer={null} width={820} destroyOnClose>
    {/* Print button */}
    <div style={{ textAlign: 'center', marginBottom: 12 }}>
      <button
        onClick={() => window.print()}
        style={{
          padding: '7px 20px', background: 'var(--primary)', color: '#fff',
          border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Print / Save PDF
      </button>
    </div>

    <div style={{ background: '#fff', fontFamily: 'Inter, Arial, sans-serif', fontSize: 11, color: '#111' }}>

      {/* Form header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)' }}>Total Scope Inc.</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Inventory Pick List</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Repair Parts & Inventory</div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM07-6</div>
        </div>
      </div>

      {/* Repair Information */}
      <div style={sBar}>Repair Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '5px 12px', padding: '6px 0 2px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Client / Facility</span>
          <div style={fv}>{repair.client || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Date</span>
          <div style={fv}>{repair.dateIn || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Scope Type / Model</span>
          <div style={fv}>{repair.scopeType || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Serial #</span>
          <div style={fv}>{repair.serial || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Work Order #</span>
          <div style={fv}>{repair.wo || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Technician</span>
          <div style={fv}>{repair.tech || '—'}</div>
        </div>
      </div>

      {/* Parts & Inventory table */}
      <div style={sBar}>Parts & Inventory Used</div>
      {items.length === 0 ? (
        <div style={{ padding: '12px 0', color: 'var(--muted)', fontStyle: 'italic', fontSize: 11 }}>
          No inventory items recorded for this repair.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 2, fontSize: 10 }}>
          <thead>
            <tr>
              {[
                { label: 'Inventory Item', w: '36%', center: false },
                { label: 'Inventory Size', w: '20%', center: true },
                { label: 'Repair Item', w: '32%', center: false },
                { label: 'Picked', w: '12%', center: true },
              ].map(h => (
                <th key={h.label} style={{
                  background: 'var(--primary)', color: '#fff', fontSize: 8, fontWeight: 700,
                  textTransform: 'uppercase', padding: '4px 8px',
                  textAlign: h.center ? 'center' : 'left', letterSpacing: '.03em',
                  borderRight: '1px solid rgba(255,255,255,.2)', width: h.w,
                }}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.key} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee' }}>
                  {item.inventoryItem || '—'}
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee', textAlign: 'center' }}>
                  {item.size || '—'}
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee' }}>
                  {item.repairItem || '—'}
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid #e8e8e8', textAlign: 'center' }}>
                  <span style={{
                    width: 12, height: 12, border: '1px solid #999',
                    borderRadius: 2, display: 'inline-block', verticalAlign: 'middle',
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Signature block */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        {[
          { label: 'Technician / Signature', maxWidth: undefined },
          { label: 'Date', maxWidth: 130 },
          { label: 'Inventory Verified By', maxWidth: undefined },
          { label: 'Date', maxWidth: 130 },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, maxWidth: s.maxWidth, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #999', minHeight: 26 }} />
            <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Barcode footer */}
      <div style={{
        marginTop: 12, border: '1px dashed #ccc', borderRadius: 3,
        padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#F9FAFB',
      }}>
        <div style={{
          width: 180, height: 44, background: '#eee', border: '1px solid #ccc',
          borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, color: '#aaa', letterSpacing: '.05em', textTransform: 'uppercase',
        }}>
          [ WO Barcode ]
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Work Order #', value: repair.wo, minWidth: 120 },
            { label: 'Serial #', value: repair.serial, minWidth: 100 },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#555', letterSpacing: '.04em' }}>
                {f.label}
              </span>
              <div style={{ borderBottom: '1px solid #999', minWidth: f.minWidth, minHeight: 16, fontSize: 10 }}>
                {f.value || ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form footer */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#888' }}>
        <span>ISO 13485 Certified</span>
        <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM07-6</span>
      </div>
    </div>
  </Modal>
);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/components/InventoryPicklistModal.tsx
git commit -m "feat: InventoryPicklistModal — OM07-6 form design with pick table and barcode footer"
```

---

## Task 4: Wire New Components into `DetailsTab.tsx`

**Files:**
- Modify: `client/src/pages/repairs/tabs/DetailsTab.tsx`

Replace the 3 inline Ant Design `<Modal>` blocks (lines ~377–450) with imports and usage of the 3 new components. The `repair` prop is already available in `DetailsTab` — pass it down alongside the existing state.

- [ ] **Step 1: Add the 3 new imports** (after the existing `AmendmentModal` import on line 8)

Find this block in `DetailsTab.tsx`:
```tsx
import { AmendmentModal } from '../components/AmendmentModal';
```

Replace with:
```tsx
import { AmendmentModal } from '../components/AmendmentModal';
import { UpdateSlipsModal } from '../components/UpdateSlipsModal';
import { DefectTrackingModal } from '../components/DefectTrackingModal';
import { InventoryPicklistModal } from '../components/InventoryPicklistModal';
```

- [ ] **Step 2: Remove the 3 inline Ant `<Modal>` blocks**

Remove these three entire blocks from the JSX (lines ~377–450):

Block 1 — Update Slips (starts with `{/* Update Slips Modal */}`):
```tsx
      {/* Update Slips Modal */}
      <Modal open={slipsModalOpen} onCancel={() => setSlipsModalOpen(false)} footer={null}
        title={<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Update Slips</span>} width={600}>
        {slipsData.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No update slips for this repair</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>{['Date', 'Reason', 'Primary Tech', 'Secondary Tech'].map(h => (
                <th key={h} style={{ padding: '6px 8px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: 10, fontWeight: 700 }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {slipsData.map(s => (
                <tr key={s.slipKey}>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{s.date}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{s.reason || '—'}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{s.primaryTech || '—'}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{s.secondaryTech || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
```

Block 2 — Defect Tracking:
```tsx
      {/* Defect Tracking Modal */}
      <Modal open={defectsModalOpen} onCancel={() => setDefectsModalOpen(false)} footer={null}
        title={<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Defect Tracking</span>} width={500}>
        {defectsData.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No defect tracking items for this repair</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>{['Defect Item', 'Comment'].map(h => (
                <th key={h} style={{ padding: '6px 8px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: 10, fontWeight: 700 }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {defectsData.map(d => (
                <tr key={d.itemKey}>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{d.item || '—'}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{d.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
```

Block 3 — Inventory Usage:
```tsx
      {/* Inventory Usage Modal */}
      <Modal open={invModalOpen} onCancel={() => setInvModalOpen(false)} footer={null}
        title={<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Inventory Used</span>} width={600}>
        {invData.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No inventory items used on this repair</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>{['Inventory Item', 'Size', 'Repair Item'].map(h => (
                <th key={h} style={{ padding: '6px 8px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: 10, fontWeight: 700 }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {invData.map(i => (
                <tr key={i.key}>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{i.inventoryItem || '—'}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{i.size || '—'}</td>
                  <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{i.repairItem || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
```

- [ ] **Step 3: Add the 3 new component calls** in the same spot where the inline Modals were removed (just before the closing `</div>` of the return)

```tsx
      <UpdateSlipsModal
        open={slipsModalOpen}
        onClose={() => setSlipsModalOpen(false)}
        repair={repair}
        slips={slipsData}
      />
      <DefectTrackingModal
        open={defectsModalOpen}
        onClose={() => setDefectsModalOpen(false)}
        repair={repair}
        defects={defectsData}
      />
      <InventoryPicklistModal
        open={invModalOpen}
        onClose={() => setInvModalOpen(false)}
        repair={repair}
        items={invData}
      />
```

- [ ] **Step 4: Remove the now-unused `Modal` import** from `DetailsTab.tsx` line 2

```
Before: import { useState, useEffect, useCallback } from 'react';
        import { message, Modal } from 'antd';

After:  import { useState, useEffect, useCallback } from 'react';
        import { message } from 'antd';
```

- [ ] **Step 5: Verify TypeScript compiles with no errors**

```bash
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -30
```
Expected: zero errors. If `Modal` import is flagged as unused, the removal in step 4 already covers it.

- [ ] **Step 6: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/tabs/DetailsTab.tsx
git commit -m "refactor: wire UpdateSlipsModal, DefectTrackingModal, InventoryPicklistModal into DetailsTab"
```

---

## Task 5: Add Print View to `AmendmentModal.tsx`

**Files:**
- Modify: `client/src/pages/repairs/components/AmendmentModal.tsx`

The existing AmendmentModal is a functional management UI (history list + create form). The HTML reference (OM07-9) is a printable amendment document. Add a "Print OM07-9" button in the header bar that opens a `window.print()` of a form-preview area. The form-preview renders `repair` info + the selected amendment (or the most recent if none selected) in the OM07-9 style.

**Note:** This requires passing `repair: RepairFull` as a new prop to `AmendmentModal`. `DetailsTab.tsx` already has access to `repair`.

- [ ] **Step 1: Add `repair` prop to `AmendmentModal`**

Find the interface in `AmendmentModal.tsx`:
```tsx
interface Props {
  repairKey: number;
  open: boolean;
  onClose: () => void;
  onAmendmentCreated: () => void;
  prefillTranKey?: number;
}
```

Replace with:
```tsx
import type { RepairFull } from '../types';

interface Props {
  repairKey: number;
  repair: RepairFull;
  open: boolean;
  onClose: () => void;
  onAmendmentCreated: () => void;
  prefillTranKey?: number;
}
```

- [ ] **Step 2: Add `repair` to the destructured props** in the function signature

Find:
```tsx
export const AmendmentModal = ({ repairKey, open, onClose, onAmendmentCreated, prefillTranKey }: Props) => {
```

Replace with:
```tsx
export const AmendmentModal = ({ repairKey, repair, open, onClose, onAmendmentCreated, prefillTranKey }: Props) => {
```

- [ ] **Step 3: Add a "Print OM07-9" button** to the header bar in the left panel

Find this in the left panel header area (around line 119–134):
```tsx
          <div style={{
            padding: '8px 12px', background: 'var(--neutral-50)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
              {amendments.length} amendment{amendments.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => { setShowForm(true); setSelected(null); }}
              style={{
                background: 'var(--primary)', color: '#fff', border: 'none',
                borderRadius: 3, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              }}>
              + New
            </button>
          </div>
```

Replace with:
```tsx
          <div style={{
            padding: '8px 12px', background: 'var(--neutral-50)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
              {amendments.length} amendment{amendments.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => window.print()}
                style={{
                  background: '#fff', color: 'var(--muted)', border: '1px solid var(--border)',
                  borderRadius: 3, padding: '2px 7px', fontSize: 9, fontWeight: 600, cursor: 'pointer',
                }}>
                Print OM07-9
              </button>
              <button
                onClick={() => { setShowForm(true); setSelected(null); }}
                style={{
                  background: 'var(--primary)', color: '#fff', border: 'none',
                  borderRadius: 3, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                }}>
                + New
              </button>
            </div>
          </div>
```

- [ ] **Step 4: Pass `repair` prop from `DetailsTab.tsx`** (the call site around line 309)

Find:
```tsx
          <AmendmentModal
            repairKey={repair.repairKey}
            open={amendOpen}
            onClose={() => setAmendOpen(false)}
            onAmendmentCreated={() => { loadItems(); setAmendOpen(false); }}
            prefillTranKey={amendTranKey}
          />
```

Replace with:
```tsx
          <AmendmentModal
            repairKey={repair.repairKey}
            repair={repair}
            open={amendOpen}
            onClose={() => setAmendOpen(false)}
            onAmendmentCreated={() => { loadItems(); setAmendOpen(false); }}
            prefillTranKey={amendTranKey}
          />
```

- [ ] **Step 5: Verify TypeScript — no errors**

```bash
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -30
```
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/components/AmendmentModal.tsx
git add client/src/pages/repairs/tabs/DetailsTab.tsx
git commit -m "feat: add Print OM07-9 button to AmendmentModal, pass repair prop"
```

---

## Task 6: Final TypeScript Check + Push

**Files:** None new — verification only.

- [ ] **Step 1: Full TypeScript check**

```bash
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -40
```
Expected: zero errors. Fix any TS6133 unused import warnings before proceeding.

- [ ] **Step 2: Push to trigger deploy**

```bash
cd C:/Projects/redesign-matched && git push
```
Expected: both GitHub Actions workflows start (deploy-client and deploy-server if server changes exist; otherwise just deploy-client).

- [ ] **Step 3: Confirm pipelines pass**

```bash
gh run list --limit 4
```
Wait for both runs to show ✓ completed status.

- [ ] **Step 4: Live smoke test**

Open a repair cockpit in the live app:
`https://happy-plant-03638db0f.6.azurestaticapps.net/repairs/{any-repair-key}`

Navigate to tab **2 — Details**, then click:
- **Update Slips** → confirm TSI-branded modal opens with red banner + scope info
- **Defect Tracking** → confirm form modal with scope identification + defect item checkboxes
- **Inventory** → confirm pick list form modal with repair info + parts table
- **Amend Repair** → confirm Print OM07-9 button appears in the header bar

---

## Self-Review

**Spec coverage check:**
- ✅ Update Slips → `UpdateSlipsModal.tsx` matches OM15-2 (red banner, scope info, slip history table, reason grid, signature)
- ✅ Defect Tracking → `DefectTrackingModal.tsx` matches OM07-8 (scope ID, filled checkboxes, follow-up notes, signature)
- ✅ Inventory → `InventoryPicklistModal.tsx` matches OM07-6 (repair info, parts table, signature, barcode footer)
- ✅ Amend Repair → Print OM07-9 button added to `AmendmentModal.tsx`
- ✅ No backend changes required — all endpoints already implemented

**Type consistency:**
- `UpdateSlipsModalProps.slips` type matches `getUpdateSlips` return type (`slipKey, date, primaryTech, secondaryTech, reason`)
- `DefectTrackingModalProps.defects` matches `getDefectTracking` return (`itemKey, item, comment`)
- `InventoryPicklistModalProps.items` matches `getRepairInventoryUsage` return (`key, inventoryItem, size, repairItem`)
- `repair: RepairFull` is used in all 4 components — same type from `../types`

**Placeholder scan:** No TBD, TODO, or incomplete steps. All code blocks are complete and ready to paste.
