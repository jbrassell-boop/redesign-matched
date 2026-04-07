import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

export const AmendmentForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '20px 0' }}>
      <div className="print-form" style={{ width: '8.5in', background: 'var(--card)', fontFamily: "'Inter', Arial, sans-serif", fontSize: 11, color: 'var(--print-text)' }}>
        {/* Print/Close */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Print / Save PDF</button>
          <button onClick={onClose} style={{ padding: '8px 20px', background: 'var(--print-light)', color: 'var(--card)', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
        </div>

        <div style={{ padding: '0.5in', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <img src="/logo-color.png" alt="TSI Logo" loading="lazy" style={{ height: 44 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Amendment to Repair</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Repair Scope Change Document</div>
              <div style={{ fontSize: 10, color: 'var(--print-light)', marginTop: 2 }}>OM07-9</div>
            </div>
          </div>

          {/* Repair Information */}
          <Bar>Repair Information</Bar>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 12px', padding: '6px 0 2px' }}>
            <Fld label="Client / Facility" value={repair.client} span2 />
            <Fld label="Department" value={repair.dept} />
            <Fld label="Scope Model" value={`${repair.scopeType ?? ''} ${repair.scopeModel ?? ''}`.trim()} span2 />
            <Fld label="Date" value={today} />
            <Fld label="Work Order #" value={repair.wo} />
            <Fld label="Serial #" value={repair.serial} />
          </div>

          {/* Amendment Type */}
          <Bar>Amendment Type <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '8.5px', opacity: 0.85 }}>(circle one)</span></Bar>
          <div style={{ display: 'flex', gap: 40, padding: '10px 0 6px' }}>
            <CircleItem label="Additional Findings" large />
            <CircleItem label="Not Repairable" large />
            <CircleItem label="Rework" large />
          </div>

          {/* Amendment Reason */}
          <Bar>Amendment Reason <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '8.5px', opacity: 0.85 }}>(circle one)</span></Bar>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', padding: '8px 0 4px' }}>
            <CircleItem label="Failure found during repair" />
            <CircleItem label="Result of another repair being performed" />
            <CircleItem label="Failure missed during D&I" />
            <CircleItem label="Part failure during repair" />
            <CircleItem label="Failure missed during update" />
            <CircleItem label="Failure found during final QC" />
            <CircleItem label="Misquote by operations" />
          </div>

          {/* Comment */}
          <Bar>Comment</Bar>
          <div style={{ border: '1px solid var(--print-border)', borderRadius: 3, minHeight: 52, padding: '4px 8px', fontSize: '10.5px', width: '100%', marginTop: 3 }} />

          {/* Repair Items Now Needed */}
          <Bar>Repair Items Now Needed</Bar>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, fontSize: 10 }}>
            <thead>
              <tr>
                <th style={{ ...thS, width: '40%' }}>Repair Item</th>
                <th style={thS}>Inventory Used</th>
                <th style={{ ...thS, width: 120, borderRight: 'none' }}>Tech Initials</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} style={i % 2 === 1 ? { background: 'var(--bg)' } : undefined}>
                  <td style={tdS}><div style={{ borderBottom: '1px solid var(--print-placeholder)', minWidth: 40, height: 18 }} /></td>
                  <td style={tdS}><div style={{ borderBottom: '1px solid var(--print-placeholder)', minWidth: 40, height: 18 }} /></td>
                  <td style={{ ...tdS, borderRight: 'none' }}><div style={{ borderBottom: '1px solid var(--print-placeholder)', minWidth: 40, height: 18 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures */}
          <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
            <Sig label="Technician / Signature" />
            <Sig label="Date" width={130} />
            <Sig label="Authorized By / Signature" />
            <Sig label="Date" width={130} />
          </div>

          {/* Footer */}
          <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--print-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: 'var(--print-footer)' }}>
            <span>ISO 13485 Certified</span>
            <span>Total Scope Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
            <span>OM07-9</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Primitives ── */
const fl: React.CSSProperties = { fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--print-muted)', letterSpacing: '.04em' };
const thS: React.CSSProperties = { background: 'var(--primary)', color: 'var(--card)', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', padding: '5px 8px', textAlign: 'left', letterSpacing: '.03em', borderRight: '1px solid rgba(255,255,255,.2)' };
const tdS: React.CSSProperties = { padding: '8px 8px', borderBottom: '1px solid var(--print-cell-border)', verticalAlign: 'bottom', borderRight: '1px solid var(--print-border-xlt)' };

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--primary)', color: 'var(--card)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', padding: '4px 10px' }}>{children}</div>
);

const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 18, fontSize: 11, padding: '1px 2px' }}>{value || ''}</div>
  </div>
);

const CircleItem = ({ label, large }: { label: string; large?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: large ? 12 : '10.5px', fontWeight: large ? 700 : 500 }}>
    <span style={{ width: 16, height: 16, border: '1.5px solid var(--print-check-border)', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
    {label}
  </div>
);

const Sig = ({ label, width }: { label: string; width?: number }) => (
  <div style={{ flex: width ? undefined : 1, maxWidth: width, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 28 }} />
    <div style={{ fontSize: '8.5px', color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 }}>{label}</div>
  </div>
);
