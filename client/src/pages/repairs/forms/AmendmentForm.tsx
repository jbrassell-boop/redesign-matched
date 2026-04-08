import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';
const g = 6;

const thS: React.CSSProperties = { fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '2px 6px', textAlign: 'left', letterSpacing: '0.03em' };
const tdS: React.CSSProperties = { padding: '4px 6px', borderBottom: '1px solid #f0f0f0', verticalAlign: 'bottom' };

const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={fv}>{value || ''}</div>
  </div>
);

const CircleItem = ({ label, large }: { label: string; large?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: large ? 10 : 8.5, fontWeight: large ? 700 : 500 }}>
    <span style={{ width: 14, height: 14, border: '1.5px solid #ccc', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
    {label}
  </div>
);

const SigLine = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div style={{ flex: narrow ? undefined : 1, maxWidth: narrow ? 120 : undefined, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
    <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>{label}</div>
  </div>
);

export const AmendmentForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
    >
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
        <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
        <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
      </div>

      <div className="print-form" style={{ width: '8.5in', height: '11in', background: '#fff', padding: '0.4in', fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222', boxSizing: 'border-box', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: g }}>
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1B3A5C' }}>Amendment to Repair</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>Repair Scope Change Document</div>
            <div style={{ fontSize: 8, color: '#aaa' }}>OM07-9</div>
          </div>
        </div>

        {/* Repair Information */}
        <div style={sb}>Repair Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px 8px', padding: '3px 0', marginBottom: g }}>
          <Fld label="Client / Facility" value={repair.client ?? em} span2 />
          <Fld label="Department" value={repair.dept ?? em} />
          <Fld label="Scope Model" value={`${repair.scopeType ?? ''} ${repair.scopeModel ?? ''}`.trim() || em} span2 />
          <Fld label="Manufacturer" value={repair.manufacturer ?? em} />
          <Fld label="Work Order #" value={repair.wo ?? em} />
          <Fld label="Serial #" value={repair.serial ?? em} />
          <Fld label="Date" value={today} />
        </div>

        {/* Amendment Type */}
        <div style={sb}>
          Amendment Type <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 7, opacity: 0.85 }}>(circle one)</span>
        </div>
        <div style={{ display: 'flex', gap: 40, padding: '8px 0 5px', marginBottom: g }}>
          <CircleItem label="Additional Findings" large />
          <CircleItem label="Not Repairable" large />
          <CircleItem label="Rework" large />
        </div>

        {/* Amendment Reason */}
        <div style={sb}>
          Amendment Reason <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 7, opacity: 0.85 }}>(circle one)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 20px', padding: '6px 0 4px', marginBottom: g }}>
          <CircleItem label="Failure found during repair" />
          <CircleItem label="Result of another repair being performed" />
          <CircleItem label="Failure missed during D&I" />
          <CircleItem label="Part failure during repair" />
          <CircleItem label="Failure missed during update" />
          <CircleItem label="Failure found during final QC" />
          <CircleItem label="Misquote by operations" />
        </div>

        {/* Comment */}
        <div style={{ marginBottom: g }}>
          <div style={sb}>Comment</div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 2, minHeight: 44, padding: '3px 6px', marginTop: 2, fontSize: 8.5 }} />
        </div>

        {/* Repair Items Now Needed */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: g }}>
          <div style={sb}>Repair Items Now Needed</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 3, fontSize: 8.5 }}>
            <thead>
              <tr>
                <th style={{ ...thS, width: '40%' }}>Repair Item</th>
                <th style={thS}>Inventory Used</th>
                <th style={{ ...thS, width: 110 }}>Tech Initials</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={i % 2 === 1 ? { background: '#f8f9fb' } : undefined}>
                  <td style={tdS}><div style={{ borderBottom: '1px solid #e5e7eb', minHeight: 16 }} /></td>
                  <td style={tdS}><div style={{ borderBottom: '1px solid #e5e7eb', minHeight: 16 }} /></td>
                  <td style={tdS}><div style={{ borderBottom: '1px solid #e5e7eb', minHeight: 16 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', gap: 12, marginBottom: g }}>
          <SigLine label="Technician / Signature" />
          <SigLine label="Date" narrow />
          <SigLine label="Authorized By / Signature" />
          <SigLine label="Date" narrow />
        </div>

        {/* Footer */}
        <div style={{ paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Total Scope, Inc. — ISO 13485 Certified <span style={{ float: 'right', fontWeight: 400 }}>OM07-9</span></div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 6.5, color: '#aaa' }}>
            <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
            <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
            <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
          </div>
        </div>
      </div>
    </div>
  );
};
