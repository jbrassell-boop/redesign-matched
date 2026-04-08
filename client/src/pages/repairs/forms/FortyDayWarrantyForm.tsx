import React from 'react';
import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
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

const RadioItem = ({ label }: { label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 8.5, fontWeight: 500 }}>
    <span style={{ width: 12, height: 12, border: '1.5px solid #999', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
    {label}
  </div>
);

const CodeItem = ({ num, label }: { num: number; label: string }) => (
  <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: '1px solid #eee', listStyle: 'none' }}>
    <span style={{ fontSize: 7.5, fontWeight: 800, color: 'var(--primary)', minWidth: 14, paddingTop: 1 }}>{num}</span>
    <span style={{ width: 12, height: 12, border: '1.5px solid #999', borderRadius: 2, display: 'inline-block', flexShrink: 0, marginTop: 1 }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 8.5, fontWeight: 600, color: '#111' }}>{label}</span>
      <div style={{ borderBottom: '1px solid #ddd', minHeight: 14, fontSize: 8.5 }} />
    </div>
  </li>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
    <div style={{ background: 'var(--neutral-50)', borderBottom: '1px solid #ddd', padding: '4px 8px', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.05em' }}>{title}</div>
    <div style={{ padding: '7px 10px' }}>{children}</div>
  </div>
);

export const FortyDayWarrantyForm = ({ repair, onClose }: Props) => {
  const dateStr = repair.dateIn
    ? new Date(repair.dateIn).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : em;
  const daysDisplay = repair.daysLastIn != null ? String(repair.daysLastIn) : em;

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
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>40-Day Warranty Review</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Returned Repair Evaluation</div>
            <div style={{ fontSize: 8, color: '#aaa', marginTop: 1 }}>OM06-2</div>
          </div>
        </div>

        {/* Repair Information */}
        <Bar>Repair Information</Bar>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', padding: '5px 0 4px', marginBottom: 6 }}>
          <Fld label="Client / Facility" value={repair.client} span2 />
          <Fld label="Department" value={repair.dept} />
          <Fld label="Scope Model" value={repair.scopeModel ?? repair.scopeType} span2 />
          <Fld label="Serial #" value={repair.serial} />
          <Fld label="Complaint / Return Reason" value={repair.complaint} span2 h={28} />
          <Fld label="Current Work Order #" value={repair.wo} />
          <Fld label="Prior Work Order #" value={null} />
          <Fld label="Days Since Last In" value={daysDisplay} />
          <Fld label="Date In" value={dateStr} />
        </div>

        {/* Technician Assessment */}
        <Panel title="Technician Assessment">
          <div style={{ fontSize: 8.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Is the complaint the result of improper care or handling?</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '6px 0' }}>
            <RadioItem label="Yes" />
            <RadioItem label="No" />
            <RadioItem label="Cannot Determine" />
          </div>
          <div style={{ marginTop: 5 }}>
            <div style={{ ...fl, marginBottom: 2 }}>Technician Notes</div>
            <div style={{ border: '1px solid #ddd', borderRadius: 3, minHeight: 34, padding: '3px 6px', fontSize: 8.5, width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <Sig label="Technician / Signature" />
            <Sig label="Date" narrow />
          </div>
        </Panel>

        {/* Lab Manager — Failure Code Assignment */}
        <Panel title="Lab Manager — Failure Code Assignment">
          <div style={{ fontSize: 8.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 5 }}>Select all applicable failure codes. Add notes as needed.</div>
          <ul style={{ padding: 0, margin: 0 }}>
            <CodeItem num={1} label="Improper care / handling by customer" />
            <CodeItem num={2} label="Part failure unrelated to previous repairs" />
            <CodeItem num={3} label="Cosmetic issue unrelated to previous repairs" />
            <CodeItem num={4} label="Improper repair technique" />
            <CodeItem num={5} label="Failure during previous final inspection" />
            <CodeItem num={6} label="Failure related to previous repairs" />
            <CodeItem num={7} label="Unable to duplicate complaint" />
            <CodeItem num={8} label="No repairs performed previously" />
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', listStyle: 'none' }}>
              <span style={{ fontSize: 7.5, fontWeight: 800, color: 'var(--primary)', minWidth: 14, paddingTop: 1 }}>9</span>
              <span style={{ width: 12, height: 12, border: '1.5px solid #999', borderRadius: 2, display: 'inline-block', flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 8.5, fontWeight: 600, color: '#111' }}>Other</span>
                <div style={{ borderBottom: '1px solid #ddd', minHeight: 14, fontSize: 8.5 }} />
              </div>
            </li>
          </ul>

          {/* NCP Callout */}
          <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 4, padding: '7px 10px', display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>&#9888;</span>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--danger)', lineHeight: 1.5 }}>
              Codes 4 or 5 automatically trigger OM23-1 Non-Conforming Product (NCP) form
              <span style={{ fontWeight: 400, color: '#7F1D1D', display: 'block', marginTop: 2, fontSize: 8 }}>
                When either code 4 or code 5 is selected above, complete and attach form OM23-1 before returning this scope to service. Notify Lab Manager immediately.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <Sig label="Lab Manager / Signature" />
            <Sig label="Date" narrow />
            <Sig label="Quality Rep / Signature (if NCP triggered)" />
            <Sig label="Date" narrow />
          </div>
        </Panel>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 7, color: '#aaa' }}>
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
          <span>OM06-2</span>
        </div>
      </div>
    </div>
  );
};
