import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

// ── Canonical template styles (OM15-2) ──
const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';
const g = 6;

export const UpdateSlipForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
    >
      {/* Action bar */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
        <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
        <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
      </div>

      {/* Printable page */}
      <div className="print-form" style={{ width: '8.5in', height: '11in', background: '#fff', padding: '0.4in', fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222', boxSizing: 'border-box', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Internal Use Banner */}
        <div style={{ background: '#fef2f2', border: '2px solid #b71234', borderRadius: 4, padding: '6px 14px', textAlign: 'center', marginBottom: g }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#b71234', textTransform: 'uppercase', letterSpacing: '.12em' }}>Internal Use Only</div>
          <div style={{ fontSize: 8, color: '#991b1b', marginTop: 2, fontWeight: 600 }}>Do not send to customer — for TSI technician use only</div>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: g }}>
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1B3A5C' }}>Update Slip</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>Technician Update Request</div>
            <div style={{ fontSize: 8, color: '#aaa' }}>OM15-2</div>
          </div>
        </div>

        {/* Scope Information */}
        <div style={sb}>Scope Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 10px', padding: '4px 0', marginBottom: g }}>
          <div>
            <span style={fl}>Update Request Date</span>
            <div style={fv}>{today}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Hospital / Facility</span>
            <div style={fv}>{repair.client ?? em}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Department</span>
            <div style={fv}>{repair.dept ?? em}</div>
          </div>
          <div>
            <span style={fl}>Work Order #</span>
            <div style={fv}>{repair.wo ?? em}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Model</span>
            <div style={fv}>{[repair.scopeType, repair.scopeModel].filter(Boolean).join(' ') || em}</div>
          </div>
          <div>
            <span style={fl}>Serial #</span>
            <div style={fv}>{repair.serial ?? em}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={fl}>Technician</span>
            <div style={fv}>{repair.tech ?? em}</div>
          </div>
        </div>

        {/* Reason for Update */}
        <div style={sb}>Reason for Update</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', padding: '6px 0', marginBottom: g, flex: 1 }}>
          {['Image', 'Lights', 'Buttons', 'Leaks', 'Angulation', 'Video Features'].map(label => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '.05em', padding: '2px 6px', background: '#f0f4fc', borderLeft: '3px solid var(--primary)' }}>{label}</div>
              <div style={{ border: '1px solid #ddd', borderRadius: 3, minHeight: 48, padding: '3px 6px', fontSize: 9 }} />
            </div>
          ))}
        </div>

        {/* Completed By */}
        <div style={sb}>Completed By</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, marginBottom: g }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Technician / Signature</div>
          </div>
          <div style={{ maxWidth: 130, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Reviewed By / Signature</div>
          </div>
          <div style={{ maxWidth: 130, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #ccc', minHeight: 26 }} />
            <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Total Scope, Inc. — ISO 13485 Certified — Internal Document <span style={{ float: 'right', fontWeight: 400 }}>OM15-2</span></div>
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
