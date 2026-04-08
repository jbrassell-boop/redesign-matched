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
const g = 5;
const cbBoxBase: React.CSSProperties = { display: 'inline-block', width: 9, height: 9, border: '1px solid #ccc', borderRadius: 1 };
const pfBtnBase: React.CSSProperties = { display: 'inline-block', width: 20, height: 12, borderRadius: 2, textAlign: 'center', lineHeight: '12px', fontSize: 7, fontWeight: 700 };

// 33-point table data
type RigidGroup = { cat: string; items: string[] };
const GROUPS: RigidGroup[] = [
  { cat: 'Image Acceptable', items: ['1. Image Quality', '2. Light Transmission', '3. Focus', '4. Color Rendition'] },
  { cat: 'Eyepiece / Ocular', items: ['5. Eyepiece Lens', '6. Ocular Housing', '7. Focus Ring', '8. Diopter Adjustment', '9. Rubber Eye Guard'] },
  { cat: 'Tubing', items: ['10. Insertion Tube Exterior', '11. Tube Straightness', '12. Working Channel', '13. Irrigation Port', '14. Insufflation Port'] },
  { cat: 'Body / Nosecone / Light Post', items: ['15. Body / Barrel', '16. Nosecone', '17. Light Post', '18. Light Post Connector', '19. Sealing / O-Rings', '20. Bridge / Junction', '21. Proximal End Cap'] },
  { cat: 'Objective / Distal End', items: ['22. Objective Lens', '23. Distal Tip', '24. Prism / Deflector', '25. Distal Window'] },
  { cat: 'Light Fibers', items: ['26. Fiber Bundle Transmission', '27. Fiber Breakage Count', '28. Light Cable Interface'] },
  { cat: 'Image Specifications', items: ['29. Sharpness', '30. Contrast', '31. Field of View', '32. Depth of Field', '33. Distortion'] },
];
const DEF_COLS = ['Nicks', 'Scratches', 'Dirt', 'Chips', 'Cracks', 'Missing', 'Loose', 'Other'];

const tdCell: React.CSSProperties = { padding: '1px 4px', fontSize: 8, borderBottom: '1px solid #eee', verticalAlign: 'middle', borderRight: '1px solid #f0f0f0' };

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...sb, marginBottom: 2 }}>{children}</div>
);

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ ...fv, minHeight: h ?? 13 }}>{value ?? em}</div>
  </div>
);

const Cb = ({ label }: { label: string }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5 }}>
    <span style={cbBoxBase} />{label}
  </span>
);

const CbRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '3px 0', flexWrap: 'wrap' as const }}>{children}</div>
);

const Sig = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div style={{ flex: narrow ? undefined : 1, maxWidth: narrow ? 120 : undefined, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
    <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>{label}</div>
  </div>
);

const PfBtn = ({ pass }: { pass?: boolean }) => (
  <span style={{ ...pfBtnBase, background: pass ? '#16a34a' : '#dc2626', color: '#fff' }}>{pass ? 'P' : 'F'}</span>
);

const TextField = ({ h }: { h: number }) => (
  <div style={{ border: '1px solid #e0e0e0', borderRadius: 3, minHeight: h, padding: '3px 6px', fontSize: 8.5, marginBottom: g }} />
);

const RigidTable = () => (
  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8, marginBottom: g }}>
    <thead>
      <tr>
        <th style={{ ...tdCell, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'left', width: '34%' }}>Item</th>
        <th style={{ ...tdCell, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'center', width: 20 }}>P</th>
        <th style={{ ...tdCell, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'center', width: 20 }}>F</th>
        {DEF_COLS.map(c => (
          <th key={c} style={{ ...tdCell, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'center' }}>{c}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {GROUPS.map(g => (
        <>
          <tr key={g.cat}>
            <td colSpan={11} style={{ padding: '2px 4px', fontSize: 7.5, fontWeight: 700, color: '#1B3A5C', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #ddd', textDecoration: 'underline' }}>{g.cat}</td>
          </tr>
          {g.items.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
              <td style={tdCell}>{item}</td>
              <td style={{ ...tdCell, textAlign: 'center' }}><span style={{ ...pfBtnBase, background: '#16a34a', color: '#fff' }}>P</span></td>
              <td style={{ ...tdCell, textAlign: 'center' }}><span style={{ ...pfBtnBase, background: '#dc2626', color: '#fff' }}>F</span></td>
              {DEF_COLS.map(c => (
                <td key={c} style={{ ...tdCell, textAlign: 'center' }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, border: '1px solid #ccc', borderRadius: 1 }} />
                </td>
              ))}
            </tr>
          ))}
        </>
      ))}
    </tbody>
  </table>
);

export const DiRigidForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const model = [repair.scopeType, repair.scopeModel].filter(Boolean).join(' ') || em;

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

      <div
        className="print-form"
        style={{ width: '8.5in', height: '11in', background: '#fff', padding: '0.4in', fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222', boxSizing: 'border-box', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: g }}>
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1B3A5C' }}>D&amp;I Inspection Report</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>Rigid Endoscope</div>
            <div style={{ fontSize: 8, color: '#aaa' }}>OM05-3</div>
          </div>
        </div>

        {/* Scope Information */}
        <Bar>Scope Information</Bar>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', padding: '4px 0', marginBottom: g }}>
          <Fld label="Client / Facility" value={repair.client} span2 />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Customer Type</span>
            <CbRow><Cb label="CAP" /><Cb label="FFS" /><Cb label="N/A" /></CbRow>
          </div>
          <Fld label="Scope Type / Model" value={model} span2 />
          <Fld label="Complaint" value={repair.complaint} h={24} />
          <Fld label="Work Order #" value={repair.wo} />
          <Fld label="Serial #" value={repair.serial} />
          <Fld label="Date" value={today} />
          <Fld label="Rack #" value={repair.rackLocation} />
          <Fld label="Checked In By" value={null} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Shipping Container</span>
            <CbRow><Cb label="Yes" /><Cb label="No" /></CbRow>
          </div>
        </div>

        {/* Item Received Condition */}
        <Bar>Item Received Condition</Bar>
        <div style={{ marginBottom: g }}>
          <CbRow>
            <span style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em', marginRight: 4 }}>Received:</span>
            <Cb label="Clean" /><Cb label="Unclean" />
            <span style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 3, padding: '3px 7px', fontSize: 8, color: '#92400e', fontWeight: 600, marginLeft: 6 }}>
              If Unclean — follow OM-22 decontamination protocol before proceeding
            </span>
          </CbRow>
        </div>

        {/* Diagnosis */}
        <Bar>Diagnosis</Bar>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 14px', padding: '4px 0', marginBottom: g }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={fl}>Scope Drawing</span>
            <CbRow><Cb label="Yes" /><Cb label="No" /></CbRow>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={fl}>Tube System</span>
            <CbRow><Cb label="3" /><Cb label="2" /></CbRow>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={fl}>Lens System</span>
            <CbRow><Cb label="Rod" /><Cb label="Acromat" /><Cb label="IB" /></CbRow>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={fl}>Autoclave Damage</span>
            <CbRow><Cb label="Yes" /><Cb label="No" /></CbRow>
          </div>
          <Fld label="Connectors" value={null} />
          <Fld label="Inspected By" value={null} />
        </div>

        {/* 33-Point Checklist */}
        <Bar>Inspection — 33-Point P/F Checklist</Bar>
        <RigidTable />

        {/* Specifications */}
        <Bar>Specifications</Bar>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '5px 12px', padding: '4px 0', marginBottom: g }}>
          <Fld label="Insertion Tube Length (mm)" value={null} />
          <Fld label="Insertion Tube Diameter (mm)" value={null} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={fl}>Hot Leak Test</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 2 }}>
              <PfBtn pass /><PfBtn />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={fl}>Cold Leak Test</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 2 }}>
              <PfBtn pass /><PfBtn />
            </div>
          </div>
        </div>

        {/* Items in Need of Repair */}
        <Bar>Items in Need of Repair</Bar>
        <TextField h={34} />

        {/* Comments */}
        <Bar>Comments</Bar>
        <TextField h={26} />

        {/* Signatures */}
        <div style={{ display: 'flex', gap: 16, marginBottom: g }}>
          <Sig label="Inspected By / Signature" />
          <Sig label="Date" narrow />
          <Sig label="Reviewed By / Signature" />
          <Sig label="Date" narrow />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', textAlign: 'center' }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            Total Scope, Inc. — ISO 13485 Certified{' '}
            <span style={{ float: 'right', fontWeight: 400 }}>OM05-3</span>
          </div>
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
