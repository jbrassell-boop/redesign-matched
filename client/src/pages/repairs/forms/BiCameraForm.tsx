import './print.css';
import type { RepairFull } from '../types';

interface Props { repair: RepairFull; onClose: () => void; }

const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';
const cbBox: React.CSSProperties = { display: 'inline-block', width: 10, height: 10, border: '1px solid #999', borderRadius: 2, verticalAlign: 'middle', flexShrink: 0 };
const costField: React.CSSProperties = { borderBottom: '1px solid #aaa', minWidth: 54, display: 'inline-block', height: 12, verticalAlign: 'middle' };
const sigMini: React.CSSProperties = { borderBottom: '1px solid #aaa', minWidth: 90, display: 'inline-block', height: 12, verticalAlign: 'middle' };
const pfBtnP: React.CSSProperties = { display: 'inline-block', width: 20, height: 13, border: '1px solid var(--success)', borderRadius: 2, textAlign: 'center', lineHeight: '13px', fontSize: 7, fontWeight: 700, color: 'var(--success)', margin: '0 1px' };
const pfBtnF: React.CSSProperties = { display: 'inline-block', width: 20, height: 13, border: '1px solid var(--danger)', borderRadius: 2, textAlign: 'center', lineHeight: '13px', fontSize: 7, fontWeight: 700, color: 'var(--danger)', margin: '0 1px' };
const pfBtnNA: React.CSSProperties = { display: 'inline-block', width: 24, height: 13, border: '1px solid #aaa', borderRadius: 2, textAlign: 'center', lineHeight: '13px', fontSize: 7, fontWeight: 700, color: '#666', margin: '0 1px' };

const pageStyle: React.CSSProperties = {
  width: '8.5in', minHeight: '11in', background: '#fff', padding: '0.4in',
  fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222',
  boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...sb, marginBottom: 3 }}>{children}</div>
);

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ ...fv, minHeight: h ?? 13 }}>{value ?? em}</div>
  </div>
);

const Cb = ({ label }: { label: string }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5 }}>
    <span style={cbBox} />{label}
  </span>
);

const tdC: React.CSSProperties = { padding: '3px 6px', borderBottom: '1px solid #eee', verticalAlign: 'middle', borderRight: '1px solid #eee', fontSize: 8.5 };
const thC: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', padding: '3px 6px', textAlign: 'left', letterSpacing: '0.03em', borderRight: '1px solid rgba(255,255,255,0.2)' };

const REPAIR_ITEMS = [
  'Leak Test / Seal Repair',
  'Focus Adjustment',
  'Fog / Anti-Fog Treatment',
  'White Balance Calibration',
  'Control Button Repair',
  'Cable / Connector Repair',
  'Edge Card Protector Replacement',
  'Scope Retaining Mechanism Repair',
  'Coupler Repair / Replacement',
  'Soak Cap Replacement',
  'Other: _________________________',
];

const CAMERA_TESTS = [
  '1. Leak Test',
  '2. Focus Test',
  '3. Fog Test',
  '4. White Balance',
  '5. Control Buttons',
  '6. Cable Connector',
  '7. Video Image',
  '8. Edge Card Protector',
  '9. Focus Mechanism',
  '10. Scope Retaining Mechanism',
];

const COUPLER_TESTS = [
  '1. Image Quality',
  '2. Soak Cap Assembly',
  '3. Leak Test',
  '4. Pass Test',
  '5. Coupling Attachment / Lock',
  '6. Optical Alignment',
  '7. Overall Condition',
];

export const BiCameraForm = ({ repair, onClose }: Props) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
  >
    <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
      <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
      <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
    </div>

    <div className="print-form" style={pageStyle}>
      {/* Form Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <img src="/assets/logo-color.jpg" alt="TSI Logo" style={{ height: 40 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Blank Inspection Report</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Camera System</div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>OM07-4</div>
        </div>
      </div>

      {/* Camera Information */}
      <Bar>Camera Information</Bar>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 10px', marginBottom: 6 }}>
        <Fld label="Client / Facility" value={repair.client} span2 />
        <Fld label="Date" value={fmt(repair.dateIn)} />
        <Fld label="Complaint" value={repair.complaint} span2 h={22} />
        <Fld label="Work Order #" value={repair.wo} />
        <Fld label="Serial #" value={repair.serial} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Technician</span>
          <div style={fv}>{repair.tech ?? '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Rack #</span><div style={fv}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Cust. Expected Delivery</span><div style={fv}></div>
        </div>
      </div>

      {/* Items Found */}
      <Bar>Items Found to be in Need of Repair</Bar>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5, marginBottom: 6 }}>
        <thead>
          <tr>
            <th style={{ ...thC, width: 20 }}></th>
            <th style={thC}>Item</th>
            <th style={{ ...thC, textAlign: 'center', width: 74 }}>Est. Cost</th>
            <th style={{ ...thC, textAlign: 'center', width: 54 }}>Approved</th>
          </tr>
        </thead>
        <tbody>
          {REPAIR_ITEMS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={cbBox} /></td>
              <td style={tdC}>{item}</td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={costField} /></td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={cbBox} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Items Approved and Repaired */}
      <Bar>Items Approved and Repaired</Bar>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5, marginBottom: 6 }}>
        <thead>
          <tr>
            <th style={{ ...thC, width: 20 }}></th>
            <th style={thC}>Item Repaired</th>
            <th style={{ ...thC, textAlign: 'center', width: 74 }}>Actual Cost</th>
            <th style={thC}>Repaired By (Initials)</th>
          </tr>
        </thead>
        <tbody>
          {REPAIR_ITEMS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={cbBox} /></td>
              <td style={tdC}>{item}</td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={costField} /></td>
              <td style={tdC}><span style={sigMini} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Camera Includes */}
      <Bar>Camera Includes</Bar>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', padding: '5px 0', marginBottom: 6 }}>
        {['Camera Head', 'Soak Cap', 'Edge Card Protector', 'Coupler'].map(item => (
          <Cb key={item} label={item} />
        ))}
      </div>

      {/* Tests Performed — Camera */}
      <Bar>Tests Performed — Camera</Bar>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5, marginBottom: 6 }}>
        <thead>
          <tr>
            <th style={thC}>Test Item</th>
            <th style={{ ...thC, textAlign: 'center', width: 36 }}>Y</th>
            <th style={{ ...thC, textAlign: 'center', width: 36 }}>N</th>
            <th style={{ ...thC, textAlign: 'center', width: 42 }}>N/A</th>
          </tr>
        </thead>
        <tbody>
          {CAMERA_TESTS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
              <td style={tdC}>{item}</td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={pfBtnP}>Y</span></td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={pfBtnF}>N</span></td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={pfBtnNA}>N/A</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tests Performed — Coupler */}
      <Bar>Tests Performed — Coupler <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 7, opacity: 0.85 }}>(complete if coupler received)</span></Bar>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5, marginBottom: 6 }}>
        <thead>
          <tr>
            <th style={thC}>Test Item</th>
            <th style={{ ...thC, textAlign: 'center', width: 36 }}>Y</th>
            <th style={{ ...thC, textAlign: 'center', width: 36 }}>N</th>
            <th style={{ ...thC, textAlign: 'center', width: 42 }}>N/A</th>
          </tr>
        </thead>
        <tbody>
          {COUPLER_TESTS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
              <td style={tdC}>{item}</td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={pfBtnP}>Y</span></td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={pfBtnF}>N</span></td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={pfBtnNA}>N/A</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* QC Sign-Off */}
      <Bar>QC Sign-Off</Bar>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px 10px', border: '1px solid #ddd', borderRadius: 3, padding: '8px 10px', background: '#F9FAFB', marginBottom: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Date</span>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Tech Initials</span>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Inspected By</span>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Rework Required</span>
          <div style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
            <Cb label="Y" /><Cb label="N" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Lab QC Initials</span>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Diagnostically Usable</span>
          <div style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
            <Cb label="Y" /><Cb label="N" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Alcohol Wipe</span>
          <div style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
            <Cb label="Done" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Commercial QC</span>
          <div style={{ display: 'flex', gap: 6, padding: '2px 0' }}>
            <span style={pfBtnP}>P</span><span style={pfBtnF}>F</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: 7.5, color: 'var(--muted)' }}>
        <span>ISO 13485 Certified</span>
        <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM07-4</span>
      </div>
    </div>
  </div>
);
