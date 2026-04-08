import React from 'react';
import './print.css';
import type { RepairFull, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  lineItems?: RepairLineItem[];
  onClose: () => void;
}

// ── Canonical style tokens ──
const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';

const pageStyle: React.CSSProperties = {
  width: '8.5in', minHeight: '11in', background: '#fff', padding: '0.4in',
  fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222',
  boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
};

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...sb, marginBottom: 2 }}>{children}</div>
);

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ ...fv, minHeight: h ?? 13 }}>{value ?? em}</div>
  </div>
);

const Sig = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div style={{ flex: narrow ? undefined : 1, maxWidth: narrow ? 130 : undefined, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ borderBottom: '1px solid #ccc', minHeight: 24 }} />
    <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>{label}</div>
  </div>
);

const MIN_ROWS = 8;

export const SubassemblyQcForm = ({ repair, lineItems, onClose }: Props) => {
  const dateStr = repair.dateIn
    ? new Date(repair.dateIn).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : em;

  // Build row data — pad to MIN_ROWS
  const items = lineItems && lineItems.length > 0 ? lineItems : [];
  const padded: Array<RepairLineItem | null> = [...items];
  while (padded.length < MIN_ROWS) padded.push(null);

  return (
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Sub-Assembly QC Requisition</div>
            <div style={{ fontSize: 8, color: '#aaa', marginTop: 2 }}>OM07-1 (12/2020)</div>
          </div>
        </div>

        {/* Repair Information */}
        <Bar>Repair Information</Bar>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', padding: '5px 0 4px', marginBottom: 4 }}>
          <Fld label="Client" value={repair.client} span2 />
          <Fld label="Work Order #" value={repair.wo} />
          <Fld label="Scope / Model" value={repair.scopeModel ?? repair.scopeType} span2 />
          <Fld label="Serial #" value={repair.serial} />
          <Fld label="Complaint / Reason for Repair" value={repair.complaint} span2 h={20} />
          <Fld label="Technician" value={repair.tech} />
          <Fld label="Date" value={dateStr} />
          <Fld label="QC Inspector" value={null} />
          <Fld label="QC Date" value={null} />
        </div>

        {/* Sub-Assembly Parts Table */}
        <Bar>Sub-Assembly Parts — QC Inspection</Bar>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 3, marginBottom: 4 }}>
          <thead>
            <tr>
              {[
                { label: 'Part #', w: '16%' },
                { label: 'Description', w: '38%' },
                { label: 'Qty', w: '8%', center: true },
                { label: 'Lot / Ref', w: '22%' },
                { label: 'Pass / Fail', w: '16%', center: true },
              ].map(col => (
                <th key={col.label} style={{ background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', padding: '4px 6px', textAlign: col.center ? 'center' : 'left', letterSpacing: '0.04em', width: col.w }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {padded.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
                <td style={{ padding: '3px 6px', fontSize: 8, borderBottom: '1px solid #eee', fontFamily: "'Courier New', monospace", color: 'var(--navy)' }}>
                  {item?.itemCode ?? ''}
                </td>
                <td style={{ padding: '3px 6px', fontSize: 8, borderBottom: '1px solid #eee' }}>
                  {item?.description ?? ''}
                </td>
                <td style={{ padding: '3px 6px', fontSize: 8, borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  {''}
                </td>
                <td style={{ padding: '3px 6px', fontSize: 8, borderBottom: '1px solid #eee', color: 'var(--muted)' }}>
                  {''}
                </td>
                <td style={{ padding: '3px 6px', fontSize: 8, borderBottom: '1px solid #eee', textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', width: 18, height: 13, border: '1px solid var(--success)', borderRadius: 2, textAlign: 'center', lineHeight: '13px', fontSize: 7.5, fontWeight: 700, color: 'var(--success)', margin: '0 2px' }}>P</span>
                  <span style={{ display: 'inline-block', width: 18, height: 13, border: '1px solid var(--danger)', borderRadius: 2, textAlign: 'center', lineHeight: '13px', fontSize: 7.5, fontWeight: 700, color: 'var(--danger)', margin: '0 2px' }}>F</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Overall QC Result */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '5px 8px', background: 'var(--neutral-50)', border: '1px solid #ddd', borderRadius: 3, marginBottom: 4 }}>
          <span style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em', marginRight: 4 }}>Overall QC Result:</span>
          {[
            { label: 'Pass — All parts acceptable, proceed with assembly', color: 'var(--success)' },
            { label: 'Conditional — Proceed with noted exceptions', color: 'var(--warning)' },
            { label: 'Fail — Do not assemble, re-order required', color: 'var(--danger)' },
          ].map(opt => (
            <div key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8.5 }}>
              <span style={{ width: 12, height: 12, border: `1.5px solid ${opt.color}`, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
              {opt.label}
            </div>
          ))}
        </div>

        {/* Disposition */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', padding: '3px 0', marginBottom: 4 }}>
          <span style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em', marginRight: 4, whiteSpace: 'nowrap' }}>Disposition:</span>
          {['Release for Assembly', 'Hold — Pending Re-inspection', 'Reject — Return to Supplier', 'Reject — Scrap'].map(label => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8.5 }}>
              <span style={{ width: 12, height: 12, border: '1.5px solid #999', borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>

        {/* QC Notes */}
        <Bar>QC Notes / Observations</Bar>
        <div style={{ border: '1px solid #ccc', borderRadius: 3, minHeight: 40, padding: '4px 6px', fontSize: 8.5, marginBottom: 6 }} />

        {/* Authorization */}
        <Bar>Authorization</Bar>
        <div style={{ display: 'flex', gap: 20, marginTop: 8, marginBottom: 6 }}>
          <Sig label="Technician Signature" />
          <Sig label="Date" narrow />
          <Sig label="QC Inspector Signature" />
          <Sig label="Date" narrow />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 7, color: '#aaa' }}>
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
          <span>OM07-1 (12/2020)</span>
        </div>
      </div>
    </div>
  );
};
