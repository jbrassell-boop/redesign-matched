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

const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={fv}>{value ?? em}</div>
  </div>
);

const Sig = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div style={{ flex: narrow ? undefined : 1, maxWidth: narrow ? 130 : undefined, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ borderBottom: '1px solid #ccc', minHeight: 24 }} />
    <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>{label}</div>
  </div>
);

const CbItem = ({ label }: { label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 8.5, fontWeight: 600 }}>
    <span style={{ width: 12, height: 12, border: '1.5px solid #999', borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
    {label}
  </div>
);

const TextField = ({ h }: { h: number }) => (
  <div style={{ border: '1px solid #ccc', borderRadius: 3, minHeight: h, padding: '4px 6px', fontSize: 8.5, marginTop: 3 }} />
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
    <div style={{ background: 'var(--neutral-50)', borderBottom: '1px solid #ddd', padding: '4px 8px', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.05em' }}>{title}</div>
    <div style={{ padding: '7px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
  </div>
);

export const NcpForm = ({ repair, onClose }: Props) => {
  const dateStr = repair.dateIn
    ? new Date(repair.dateIn).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : em;

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Non-Conforming Product</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Quality Non-Conformance Report</div>
            <div style={{ fontSize: 8, color: '#aaa', marginTop: 1 }}>OM23-1</div>
          </div>
        </div>

        {/* NCP Red Stripe */}
        <div style={{ background: 'var(--danger)', color: '#fff', fontSize: 8.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '4px 8px', textAlign: 'center', borderRadius: 3, marginBottom: 4 }}>
          Non-Conforming Product Report (NCP)
        </div>

        {/* Identification */}
        <Bar>Identification</Bar>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', padding: '5px 0 4px', marginBottom: 6 }}>
          <Fld label="NCP #" value={null} />
          <Fld label="Date" value={dateStr} />
          <Fld label="Work Order # / Lot No." value={repair.wo} />
          <Fld label="Customer / Vendor" value={repair.client} span2 />
          <Fld label="Model No." value={repair.scopeModel ?? repair.scopeType} />
          <Fld label="Product Serial No." value={repair.serial} span2 />
        </div>

        {/* Reason for Non-Conformance */}
        <Bar>Reason for Non-Conformance</Bar>
        <TextField h={64} />

        {/* Investigation */}
        <Bar>Investigation</Bar>
        <TextField h={64} />

        {/* Corrective Action */}
        <Panel title="Corrective Action">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--muted)' }}>Corrective Action Required:</span>
            <CbItem label="Yes" />
            <CbItem label="No" />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginLeft: 8 }}>
              <span style={{ ...fl, whiteSpace: 'nowrap' }}>CAR / PAR No.:</span>
              <div style={{ borderBottom: '1px solid #ccc', minWidth: 100, minHeight: 15, display: 'inline-block' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--muted)' }}>Vendor Complaint Required:</span>
            <CbItem label="Yes" />
            <CbItem label="No" />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginLeft: 8 }}>
              <span style={{ ...fl, whiteSpace: 'nowrap' }}>VC No.:</span>
              <div style={{ borderBottom: '1px solid #ccc', minWidth: 100, minHeight: 15, display: 'inline-block' }} />
            </div>
          </div>
        </Panel>

        {/* Disposition */}
        <Bar>Disposition</Bar>
        <div style={{ display: 'flex', gap: 0, border: '1.5px solid var(--primary)', borderRadius: 4, overflow: 'hidden', marginBottom: 4, marginTop: 3 }}>
          {['Rework', 'Use-As-Is', 'RTV', 'Scrap'].map((label, i, arr) => (
            <div key={label} style={{ flex: 1, padding: '7px 8px', borderRight: i < arr.length - 1 ? '1.5px solid var(--primary)' : 'none', display: 'flex', alignItems: 'center', gap: 7, fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span style={{ width: 14, height: 14, border: '1.5px solid #999', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
          <Sig label="Approved By / Signature" />
          <Sig label="Date" narrow />
        </div>

        {/* QA Review */}
        <Panel title="QA Review">
          <div>
            <span style={fl}>QA Review Comments</span>
            <TextField h={46} />
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Sig label="QA Review By / Signature" />
            <Sig label="Date" narrow />
          </div>
        </Panel>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 7, color: '#aaa' }}>
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
          <span>OM23-1</span>
        </div>
      </div>
    </div>
  );
};
