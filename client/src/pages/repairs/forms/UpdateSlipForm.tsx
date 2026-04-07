import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

export const UpdateSlipForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '20px 0' }}>
      <div className="print-form" style={{ width: '8.5in', background: 'var(--card)', fontFamily: "'Inter', Arial, sans-serif", fontSize: 11, color: '#111' }}>
        {/* Print/Close */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Print / Save PDF</button>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#666', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
        </div>

        <div style={{ padding: '0.5in', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Internal Use Banner */}
          <div style={{ background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: 4, padding: '8px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '.12em' }}>Internal Use Only</div>
            <div style={{ fontSize: 9, color: '#7F1D1D', marginTop: 2, fontWeight: 600 }}>Do not send to customer — for TSI technician use only</div>
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <img src="/logo-color.png" alt="TSI Logo" loading="lazy" style={{ height: 44 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Update Slip</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Technician Update Request</div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM15-2</div>
            </div>
          </div>

          {/* Scope Information */}
          <Bar>Scope Information</Bar>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 12px', padding: '6px 0 2px' }}>
            <Fld label="Update Request Date" value={today} />
            <Fld label="Hospital / Facility" value={repair.client} span2 />
            <Fld label="Model" value={`${repair.scopeType ?? ''} ${repair.scopeModel ?? ''}`.trim()} span2 />
            <Fld label="Serial #" value={repair.serial} />
          </div>

          {/* Reason for Update */}
          <Bar>Reason for Update</Bar>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', padding: '8px 0' }}>
            {['Image', 'Lights', 'Buttons', 'Leaks', 'Angulation', 'Video Features'].map(label => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '.05em', padding: '3px 8px', background: '#EFF6FF', borderLeft: '3px solid var(--primary)' }}>{label}</div>
                <div style={{ border: '1px solid #ccc', borderRadius: 3, minHeight: 52, padding: '4px 8px', fontSize: '10.5px' }} />
              </div>
            ))}
          </div>

          {/* Completed By */}
          <Bar>Completed By</Bar>
          <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
            <Sig label="Technician / Signature" />
            <Sig label="Date" width={130} />
            <Sig label="Reviewed By / Signature" />
            <Sig label="Date" width={130} />
          </div>

          {/* Footer */}
          <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: '#888' }}>
            <span>ISO 13485 Certified — Internal Document</span>
            <span>Total Scope Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
            <span>OM15-2</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Primitives ── */
const fl: React.CSSProperties = { fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: '#555', letterSpacing: '.04em' };

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--primary)', color: '#fff', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', padding: '4px 10px' }}>{children}</div>
);

const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ borderBottom: '1px solid #999', minHeight: 18, fontSize: 11, padding: '1px 2px' }}>{value || ''}</div>
  </div>
);

const Sig = ({ label, width }: { label: string; width?: number }) => (
  <div style={{ flex: width ? undefined : 1, maxWidth: width, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ borderBottom: '1px solid #999', minHeight: 30 }} />
    <div style={{ fontSize: '8.5px', color: '#555', fontWeight: 600, marginTop: 2 }}>{label}</div>
  </div>
);
