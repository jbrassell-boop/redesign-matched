import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

export const DiRigidForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '20px 0' }}>
      <div className="print-form" style={{ width: '8.5in', background: 'var(--card)', fontFamily: "'Inter', Arial, sans-serif", fontSize: 11, color: '#111' }}>
        {/* Print/Close */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Print / Save PDF</button>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#666', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
        </div>

        <div style={{ padding: '0.5in', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <img src="/logo-color.png" alt="TSI Logo" style={{ height: 44 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>D&amp;I Inspection Report</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Rigid Endoscope</div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM05-3</div>
            </div>
          </div>

          {/* Scope Information */}
          <Bar>Scope Information</Bar>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', padding: '6px 0 2px' }}>
            <Fld label="Client / Facility" value={repair.client} span2 />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={fl}>Customer Type</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 3 }}>
                <Cb label="CAP" /><Cb label="FFS" /><Cb label="N/A" />
              </div>
            </div>
            <Fld label="Scope Type / Model" value={`${repair.scopeType ?? ''} ${repair.scopeModel ?? ''}`.trim()} span2 />
            <Fld label="Complaint" value={repair.complaint} h={28} />
            <Fld label="Work Order #" value={repair.wo} />
            <Fld label="Serial #" value={repair.serial} />
            <Fld label="Date" value={today} />
            <Fld label="Rack #" value={repair.rackLocation} />
            <Fld label="Checked In By" value="" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={fl}>Shipping Container</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 3 }}>
                <Cb label="Yes" /><Cb label="No" />
              </div>
            </div>
          </div>

          {/* Item Received Condition */}
          <Bar>Item Received Condition</Bar>
          <CbRow>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#555', letterSpacing: '.04em', marginRight: 4 }}>Received:</span>
            <Cb label="Clean" /><Cb label="Unclean" />
            <span style={{ background: 'var(--amber-subtle)', border: '1px solid var(--amber-border)', borderRadius: 3, padding: '4px 8px', fontSize: 9, color: '#92400E', fontWeight: 600, marginLeft: 8 }}>
              If Unclean — follow OM-22 decontamination protocol before proceeding
            </span>
          </CbRow>

          {/* Diagnosis */}
          <Bar>Diagnosis</Bar>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', padding: '6px 0 2px' }}>
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
            <Fld label="Connectors" value="" />
            <Fld label="Inspected By" value="" />
          </div>

          {/* 33-Point Checklist */}
          <Bar>Inspection — 33-Point P/F Checklist</Bar>
          <RigidTable />

          {/* Specifications */}
          <Bar>Specifications</Bar>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px 12px', padding: '4px 0' }}>
            <Fld label="Insertion Tube Length (mm)" value="" />
            <Fld label="Insertion Tube Diameter (mm)" value="" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={fl}>Hot Leak Test</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 2 }}>
                <PfBtn pass /><PfBtn fail />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={fl}>Cold Leak Test</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 2 }}>
                <PfBtn pass /><PfBtn fail />
              </div>
            </div>
          </div>

          {/* Items in Need of Repair */}
          <Bar>Items in Need of Repair</Bar>
          <TextField h={36} />

          {/* Comments */}
          <Bar>Comments</Bar>
          <TextField h={28} />

          {/* Signatures */}
          <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
            <Sig label="Inspected By / Signature" />
            <Sig label="Date" narrow />
            <Sig label="Reviewed By / Signature" />
            <Sig label="Date" narrow />
          </div>

          {/* Footer */}
          <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: '#888' }}>
            <span>ISO 13485 Certified</span>
            <span>Total Scope, Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
            <span>OM05-3</span>
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

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ borderBottom: '1px solid #999', minHeight: h ?? 17, fontSize: 11, padding: '1px 2px' }}>{value || ''}</div>
  </div>
);

const Cb = ({ label }: { label: string }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10.5px' }}>
    <span style={{ width: 12, height: 12, border: '1px solid #999', borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />{label}
  </span>
);

const CbRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '5px 0', flexWrap: 'wrap' }}>{children}</div>
);

const TextField = ({ h }: { h: number }) => (
  <div style={{ border: '1px solid #ccc', borderRadius: 3, minHeight: h, padding: '3px 6px', marginTop: 3, fontSize: '10.5px' }} />
);

const Sig = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div style={{ flex: narrow ? undefined : 1, maxWidth: narrow ? 130 : undefined, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={{ borderBottom: '1px solid #999', minHeight: 26 }} />
    <div style={{ fontSize: '8.5px', color: '#555', fontWeight: 600, marginTop: 2 }}>{label}</div>
  </div>
);

const PfBtn = ({ pass, fail: _fail }: { pass?: boolean; fail?: boolean }) => (
  <span style={{
    display: 'inline-block', width: 22, height: 14, border: `1px solid ${pass ? 'var(--success)' : 'var(--danger)'}`,
    borderRadius: 2, textAlign: 'center', lineHeight: '14px', fontSize: 8, fontWeight: 700,
    color: pass ? 'var(--success)' : 'var(--danger)',
  }}>{pass ? 'P' : 'F'}</span>
);

/* 33-point rigid table */
const defBox = { display: 'inline-block', width: 10, height: 10, border: '1px solid #bbb', borderRadius: 1, verticalAlign: 'middle' } as React.CSSProperties;
const thS: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', padding: '3px 5px', textAlign: 'center', letterSpacing: '.03em', borderRight: '1px solid rgba(255,255,255,.2)' };
const defCols = ['Nicks', 'Scratches', 'Dirt', 'Chips', 'Cracks', 'Missing', 'Loose', 'Other'];

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

const RigidTable = () => (
  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, fontSize: '9.5px' }}>
    <thead>
      <tr>
        <th style={{ ...thS, textAlign: 'left', width: '36%' }}>Item</th>
        <th style={{ ...thS, width: 22 }}>P</th>
        <th style={{ ...thS, width: 22 }}>F</th>
        {defCols.map(c => <th key={c} style={thS}>{c}</th>)}
      </tr>
    </thead>
    <tbody>
      {GROUPS.map(g => (
        <>
          <tr key={g.cat} style={{ background: 'var(--primary-light)' }}>
            <td colSpan={11} style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '.04em', padding: '3px 5px' }}>{g.cat}</td>
          </tr>
          {g.items.map((item, i) => (
            <tr key={item} style={i % 2 === 1 ? { background: 'var(--bg)' } : undefined}>
              <td style={{ padding: '2px 5px', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee', verticalAlign: 'middle' }}>{item}</td>
              <td style={{ padding: '2px 5px', textAlign: 'center', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee' }}>
                <span style={{ display: 'inline-block', width: 22, height: 14, border: '1px solid var(--success)', borderRadius: 2, textAlign: 'center', lineHeight: '14px', fontSize: 8, fontWeight: 700, color: 'var(--success)' }}>P</span>
              </td>
              <td style={{ padding: '2px 5px', textAlign: 'center', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee' }}>
                <span style={{ display: 'inline-block', width: 22, height: 14, border: '1px solid var(--danger)', borderRadius: 2, textAlign: 'center', lineHeight: '14px', fontSize: 8, fontWeight: 700, color: 'var(--danger)' }}>F</span>
              </td>
              {defCols.map(c => (
                <td key={c} style={{ padding: '2px 5px', textAlign: 'center', borderBottom: '1px solid #e8e8e8', borderRight: '1px solid #eee' }}>
                  <span style={defBox} />
                </td>
              ))}
            </tr>
          ))}
        </>
      ))}
    </tbody>
  </table>
);
