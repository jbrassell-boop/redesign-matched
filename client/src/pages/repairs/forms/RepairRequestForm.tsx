import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

// Canonical style tokens
const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };

const checkBox: React.CSSProperties = { width: 14, height: 14, border: '1.5px solid #999', borderRadius: 2, flexShrink: 0, marginTop: 1 };
const radioCircle: React.CSSProperties = { width: 14, height: 14, border: '1.5px solid #999', borderRadius: '50%', flexShrink: 0 };

export const RepairRequestForm = ({ repair, onClose }: Props) => (
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
    <div className="print-form" style={{ width: '8.5in', minHeight: '11in', background: '#fff', padding: '0.4in', fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222', boxSizing: 'border-box', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Form Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <img src="/logo-horizontal.jpg" alt="Total Scope Inc." style={{ height: 44 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Repair Request Form</div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM03-2</div>
        </div>
      </div>

      {/* 1. Facility Information */}
      <div style={sb}>Facility Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px', marginTop: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: 'span 2' }}>
          <span style={fl}>Facility / Hospital Name</span>
          <div style={fv}>{repair.client ?? ''}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: 'span 2' }}>
          <span style={fl}>Department</span>
          <div style={fv}>{repair.dept ?? ''}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: 'span 2' }}>
          <span style={fl}>Address</span>
          <div style={fv}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>City</span>
          <div style={fv}></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0 10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>State</span>
            <div style={fv}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Zip</span>
            <div style={fv}></div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Contact Name</span>
          <div style={fv}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Phone / Extension</span>
          <div style={fv}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Email</span>
          <div style={fv}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>PO Number</span>
          <div style={fv}></div>
        </div>
      </div>

      {/* 2. Equipment Information */}
      <div style={sb}>Equipment Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 14px', marginTop: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: 'span 2' }}>
          <span style={fl}>Scope / Equipment Model</span>
          <div style={fv}>{repair.scopeModel ?? ''}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Manufacturer</span>
          <div style={fv}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Serial Number</span>
          <div style={fv}>{repair.serial ?? ''}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Equipment Type</span>
          <div style={fv}>{repair.scopeType ?? ''}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Last Repair WO#</span>
          <div style={fv}>{repair.wo ?? ''}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: 'span 3' }}>
          <span style={fl}>Complaint / Reason for Repair</span>
          <div style={{ ...fv, minHeight: 32 }}>{repair.complaint ?? ''}</div>
        </div>
      </div>

      {/* 3. Additional Information */}
      <div style={sb}>Additional Information</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, padding: '8px 12px', background: '#F9FAFB', border: '1px solid #eee', borderRadius: 3 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11, lineHeight: 1.4 }}>
          <div style={checkBox} />
          <div style={{ flex: 1 }}>
            <strong>Failure During Case / Patient Involvement</strong>
            <div style={{ fontSize: 9.5, color: '#666', marginTop: 1 }}>Scope failed while in use on a patient. Incident report may be required.</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11, lineHeight: 1.4 }}>
          <div style={checkBox} />
          <div style={{ flex: 1 }}>
            <strong>Equipment Has Been Cleaned and Disinfected</strong>
            <div style={{ fontSize: 9.5, color: '#666', marginTop: 1 }}>I confirm this equipment has been properly cleaned and high-level disinfected prior to shipment.</div>
          </div>
        </div>
      </div>

      {/* 4. Quote / Approval Preference */}
      <div style={sb}>Quote / Approval Preference</div>
      <div style={{ display: 'flex', gap: 24, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><div style={radioCircle} /> Repair without quote (PO on file)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><div style={radioCircle} /> Send written quote first</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><div style={radioCircle} /> Call before proceeding</div>
      </div>
      <div style={{ marginTop: 6, fontSize: 9.5, color: '#666' }}>
        Quote contact (if different from above):&nbsp;
        <span style={{ display: 'inline-block', width: 220, borderBottom: '1px solid #999', marginLeft: 4 }}>&nbsp;</span>
      </div>

      {/* 5. Return / Pickup Method */}
      <div style={sb}>Return / Pickup Method</div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' as const, marginTop: 6 }}>
        {['TSI Will Pick Up', 'FedEx (TSI Account)', 'UPS (TSI Account)', 'Customer Arranges'].map(opt => (
          <div key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 10px', border: '1px solid #ddd', borderRadius: 3, flex: 1, minWidth: 120 }}>
            <div style={radioCircle} /> {opt}
          </div>
        ))}
      </div>

      {/* Return Address */}
      <div style={{ marginTop: 8, padding: '10px 14px', background: '#F0F6FF', border: '1.5px solid var(--primary)', borderRadius: 4 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, color: 'var(--navy)', letterSpacing: '0.06em', marginBottom: 4 }}>Return Address — Ship Equipment To:</div>
        <div style={{ fontSize: 11, color: 'var(--navy)', fontWeight: 600, lineHeight: 1.6 }}>
          Total Scope Inc.<br />
          17 Creek Pkwy, Upper Chichester, PA 19061<br />
          Attn: Receiving / Repair Department<br />
          Phone: (610) 485-3838
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: '#888' }}>
        <span>ISO 13485 Certified</span>
        <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM03-2</span>
      </div>
    </div>
  </div>
);
