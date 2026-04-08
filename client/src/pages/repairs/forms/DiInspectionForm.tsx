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

const cbBoxStyle: React.CSSProperties = { width: 10, height: 10, border: '1px solid #ccc', borderRadius: 2, display: 'inline-block', flexShrink: 0 };
const cbStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 8 };

const Cb = ({ label }: { label: string }) => (
  <span style={cbStyle}><span style={cbBoxStyle} />{label}</span>
);

const PfTable = ({ items }: { items: string[] }) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'left' }}>Test Item</th>
        <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'center', width: 30 }}>Y</th>
        <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'center', width: 30 }}>N</th>
        <th style={{ fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', padding: '1px 4px', textAlign: 'center', width: 30 }}>N/A</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item, i) => (
        <tr key={item} style={{ background: i % 2 === 1 ? '#f8f9fb' : '#fff' }}>
          <td style={{ padding: '1px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' }}>{item}</td>
          <td style={{ padding: '1px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', textAlign: 'center' }}><span style={{ display: 'inline-block', width: 14, height: 10, border: '1px solid #ccc', borderRadius: 1 }} /></td>
          <td style={{ padding: '1px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', textAlign: 'center' }}><span style={{ display: 'inline-block', width: 14, height: 10, border: '1px solid #ccc', borderRadius: 1 }} /></td>
          <td style={{ padding: '1px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', textAlign: 'center' }}><span style={{ display: 'inline-block', width: 14, height: 10, border: '1px solid #ccc', borderRadius: 1 }} /></td>
        </tr>
      ))}
    </tbody>
  </table>
);

const SigLine = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div style={{ flex: narrow ? undefined : 1, maxWidth: narrow ? 110 : undefined, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ borderBottom: '1px solid #ccc', minHeight: 20 }} />
    <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>{label}</div>
  </div>
);

export const DiInspectionForm = ({ repair, onClose }: Props) => {
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
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1B3A5C' }}>D&amp;I Inspection Report</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>Camera System</div>
            <div style={{ fontSize: 8, color: '#aaa' }}>OM05-2</div>
          </div>
        </div>

        {/* Camera Information */}
        <div style={sb}>Camera Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3px 8px', padding: '3px 0', marginBottom: g }}>
          <div style={{ gridColumn: 'span 2' }}><span style={fl}>Client / Facility</span><div style={fv}>{repair.client ?? em}</div></div>
          <div>
            <span style={fl}>Customer Type</span>
            <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
              <Cb label="CAP" /><Cb label="FFS" />
            </div>
          </div>
          <div><span style={fl}>Date</span><div style={fv}>{today}</div></div>
          <div style={{ gridColumn: 'span 2' }}><span style={fl}>Camera Type / Model</span><div style={fv}>{`${repair.scopeType ?? ''} ${repair.scopeModel ?? ''}`.trim() || em}</div></div>
          <div><span style={fl}>Work Order #</span><div style={fv}>{repair.wo ?? em}</div></div>
          <div><span style={fl}>Serial #</span><div style={fv}>{repair.serial ?? em}</div></div>
          <div style={{ gridColumn: 'span 3' }}><span style={fl}>Complaint</span><div style={{ ...fv, minHeight: 22 }}>{repair.complaint ?? em}</div></div>
          <div><span style={fl}>Rack #</span><div style={fv}>{repair.rackLocation ?? em}</div></div>
          <div style={{ gridColumn: 'span 2' }}><span style={fl}>Inspected By</span><div style={fv}>&nbsp;</div></div>
        </div>

        {/* Accessories Received */}
        <div style={{ ...sb, marginBottom: 3 }}>Accessories Received</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', padding: '3px 0', marginBottom: g }}>
          <Cb label="Camera Head" /><Cb label="Coupler" /><Cb label="Soak Cap" /><Cb label="Edge Card Protector" />
        </div>

        {/* Item Received Condition */}
        <div style={{ ...sb, marginBottom: 3 }}>Item Received Condition</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '3px 0', marginBottom: g, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '.04em' }}>Received:</span>
          <Cb label="Clean" /><Cb label="Unclean" />
          <span style={{ fontSize: 8, color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 3, padding: '1px 6px', fontWeight: 600 }}>
            If Unclean — follow OM-22 decontamination protocol before proceeding
          </span>
        </div>

        {/* Camera Inspection + Coupler Inspection side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 10px', marginBottom: g }}>
          <div>
            <div style={sb}>Camera Inspection</div>
            <PfTable items={['1. Leak Test','2. Focus Test','3. Fog Test','4. White Balance','5. Control Buttons','6. Cable Connector','7. Video Image','8. Edge Card Protector','9. Focus Mechanism','10. Scope Retaining Mechanism']} />
          </div>
          <div>
            <div style={sb}>Coupler Inspection <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 7, opacity: 0.85 }}>(complete if coupler received)</span></div>
            <PfTable items={['1. Image Quality','2. Soak Cap Assembly','3. Leak Test','4. Pass Test']} />
          </div>
        </div>

        {/* Items in Need of Repair */}
        <div style={{ marginBottom: g }}>
          <div style={sb}>Items in Need of Repair</div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 2, minHeight: 36, padding: '3px 6px', marginTop: 2, fontSize: 8.5 }} />
        </div>

        {/* Comments */}
        <div style={{ marginBottom: g }}>
          <div style={sb}>Comments</div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 2, minHeight: 28, padding: '3px 6px', marginTop: 2, fontSize: 8.5 }} />
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', gap: 12, marginBottom: g }}>
          <SigLine label="Inspected By / Signature" />
          <SigLine label="Date" narrow />
          <SigLine label="Reviewed By / Signature" />
          <SigLine label="Date" narrow />
        </div>

        {/* Footer */}
        <div style={{ paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Total Scope, Inc. — ISO 13485 Certified <span style={{ float: 'right', fontWeight: 400 }}>OM05-2</span></div>
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
