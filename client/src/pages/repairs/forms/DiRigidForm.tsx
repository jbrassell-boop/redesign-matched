import './print.css';
import type { RepairFull } from '../types';

// ── Extracted static styles ──
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '20px 0' };
const formSheetStyle: React.CSSProperties = { width: '8.5in', background: 'var(--card)', fontFamily: "'Inter', Arial, sans-serif", fontSize: 11, color: 'var(--print-text)' };
const actionBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' };
const printBtnStyle: React.CSSProperties = { padding: '8px 20px', background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const closeBtnStyle: React.CSSProperties = { padding: '8px 20px', background: 'var(--print-light)', color: 'var(--card)', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const pageContentStyle: React.CSSProperties = { padding: '0.5in', display: 'flex', flexDirection: 'column', gap: 7 };
const headerRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 };
const logoImgStyle: React.CSSProperties = { height: 44 };
const headerRightStyle: React.CSSProperties = { textAlign: 'right' };
const headerTitleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: 'var(--navy)' };
const headerSubtitleStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 };
const headerFormNumStyle: React.CSSProperties = { fontSize: 10, color: 'var(--print-light)', marginTop: 2 };
const scopeInfoGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', padding: '6px 0 2px' };
const flexColGap1Style: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1 };
const flexColGap2Style: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 };
const cbGap10Style: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', paddingTop: 3 };
const receivedLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--print-muted)', letterSpacing: '.04em', marginRight: 4 };
const uncleanBadgeStyle: React.CSSProperties = { background: 'var(--amber-subtle)', border: '1px solid var(--amber-border)', borderRadius: 3, padding: '4px 8px', fontSize: 9, color: 'var(--badge-amber-text)', fontWeight: 600, marginLeft: 8 };
const diagnosisGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', padding: '6px 0 2px' };
const specsGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px 12px', padding: '4px 0' };
const leakTestRowStyle: React.CSSProperties = { display: 'flex', gap: 6, alignItems: 'center', paddingTop: 2 };
const signatureRowStyle: React.CSSProperties = { display: 'flex', gap: 20, marginTop: 6 };
const footerStyle: React.CSSProperties = { marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--print-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: 'var(--print-footer)' };
const barStyle: React.CSSProperties = { background: 'var(--primary)', color: 'var(--card)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', padding: '4px 10px' };
const fldBaseStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1 };
const fldValueBaseStyle: React.CSSProperties = { borderBottom: '1px solid var(--print-check-border)', fontSize: 11, padding: '1px 2px' };
const cbSpanStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: '10.5px' };
const cbBoxStyle: React.CSSProperties = { width: 12, height: 12, border: '1px solid var(--print-check-border)', borderRadius: 2, display: 'inline-block', flexShrink: 0 };
const cbRowStyle: React.CSSProperties = { display: 'flex', gap: 14, alignItems: 'center', padding: '5px 0', flexWrap: 'wrap' };
const sigLineStyle: React.CSSProperties = { borderBottom: '1px solid var(--print-check-border)', minHeight: 26 };
const sigLabelStyle: React.CSSProperties = { fontSize: '8.5px', color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 };
const rigidTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginTop: 4, fontSize: '9.5px' };
const catRowBgStyle: React.CSSProperties = { background: 'var(--primary-light)' };
const catCellStyle: React.CSSProperties = { fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '.04em', padding: '3px 5px' };
const itemCellStyle: React.CSSProperties = { padding: '2px 5px', borderBottom: '1px solid var(--print-border-md)', borderRight: '1px solid var(--print-border-xlt)', verticalAlign: 'middle' };
const pfCellStyle: React.CSSProperties = { padding: '2px 5px', textAlign: 'center', borderBottom: '1px solid var(--print-border-md)', borderRight: '1px solid var(--print-border-xlt)' };
const passBtnInlineStyle: React.CSSProperties = { display: 'inline-block', width: 22, height: 14, border: '1px solid var(--success)', borderRadius: 2, textAlign: 'center', lineHeight: '14px', fontSize: 8, fontWeight: 700, color: 'var(--success)' };
const failBtnInlineStyle: React.CSSProperties = { display: 'inline-block', width: 22, height: 14, border: '1px solid var(--danger)', borderRadius: 2, textAlign: 'center', lineHeight: '14px', fontSize: 8, fontWeight: 700, color: 'var(--danger)' };
const altRowStyle: React.CSSProperties = { background: 'var(--bg)' };

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

export const DiRigidForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div style={overlayStyle}>
      <div className="print-form" style={formSheetStyle}>
        {/* Print/Close */}
        <div className="no-print" style={actionBarStyle}>
          <button onClick={() => window.print()} style={printBtnStyle}>Print / Save PDF</button>
          <button onClick={onClose} style={closeBtnStyle}>Close</button>
        </div>

        <div style={pageContentStyle}>
          {/* Header */}
          <div style={headerRowStyle}>
            <img src="/logo-color.png" alt="TSI Logo" loading="lazy" style={logoImgStyle} />
            <div style={headerRightStyle}>
              <div style={headerTitleStyle}>D&amp;I Inspection Report</div>
              <div style={headerSubtitleStyle}>Rigid Endoscope</div>
              <div style={headerFormNumStyle}>OM05-3</div>
            </div>
          </div>

          {/* Scope Information */}
          <Bar>Scope Information</Bar>
          <div style={scopeInfoGridStyle}>
            <Fld label="Client / Facility" value={repair.client} span2 />
            <div style={flexColGap1Style}>
              <span style={fl}>Customer Type</span>
              <div style={cbGap10Style}>
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
            <div style={flexColGap1Style}>
              <span style={fl}>Shipping Container</span>
              <div style={cbGap10Style}>
                <Cb label="Yes" /><Cb label="No" />
              </div>
            </div>
          </div>

          {/* Item Received Condition */}
          <Bar>Item Received Condition</Bar>
          <CbRow>
            <span style={receivedLabelStyle}>Received:</span>
            <Cb label="Clean" /><Cb label="Unclean" />
            <span style={uncleanBadgeStyle}>
              If Unclean — follow OM-22 decontamination protocol before proceeding
            </span>
          </CbRow>

          {/* Diagnosis */}
          <Bar>Diagnosis</Bar>
          <div style={diagnosisGridStyle}>
            <div style={flexColGap2Style}>
              <span style={fl}>Scope Drawing</span>
              <CbRow><Cb label="Yes" /><Cb label="No" /></CbRow>
            </div>
            <div style={flexColGap2Style}>
              <span style={fl}>Tube System</span>
              <CbRow><Cb label="3" /><Cb label="2" /></CbRow>
            </div>
            <div style={flexColGap2Style}>
              <span style={fl}>Lens System</span>
              <CbRow><Cb label="Rod" /><Cb label="Acromat" /><Cb label="IB" /></CbRow>
            </div>
            <div style={flexColGap2Style}>
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
          <div style={specsGridStyle}>
            <Fld label="Insertion Tube Length (mm)" value="" />
            <Fld label="Insertion Tube Diameter (mm)" value="" />
            <div style={flexColGap2Style}>
              <span style={fl}>Hot Leak Test</span>
              <div style={leakTestRowStyle}>
                <PfBtn pass /><PfBtn fail />
              </div>
            </div>
            <div style={flexColGap2Style}>
              <span style={fl}>Cold Leak Test</span>
              <div style={leakTestRowStyle}>
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
          <div style={signatureRowStyle}>
            <Sig label="Inspected By / Signature" />
            <Sig label="Date" narrow />
            <Sig label="Reviewed By / Signature" />
            <Sig label="Date" narrow />
          </div>

          {/* Footer */}
          <div style={footerStyle}>
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
const fl: React.CSSProperties = { fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--print-muted)', letterSpacing: '.04em' };

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div style={barStyle}>{children}</div>
);

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div style={{ ...fldBaseStyle, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ ...fldValueBaseStyle, minHeight: h ?? 17 }}>{value || ''}</div>
  </div>
);

const Cb = ({ label }: { label: string }) => (
  <span style={cbSpanStyle}>
    <span style={cbBoxStyle} />{label}
  </span>
);

const CbRow = ({ children }: { children: React.ReactNode }) => (
  <div style={cbRowStyle}>{children}</div>
);

const TextField = ({ h }: { h: number }) => (
  <div style={{ border: '1px solid var(--print-border)', borderRadius: 3, minHeight: h, padding: '3px 6px', marginTop: 3, fontSize: '10.5px' }} />
);

const Sig = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div style={{ flex: narrow ? undefined : 1, maxWidth: narrow ? 130 : undefined, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div style={sigLineStyle} />
    <div style={sigLabelStyle}>{label}</div>
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
const defBox = { display: 'inline-block', width: 10, height: 10, border: '1px solid var(--print-border)', borderRadius: 1, verticalAlign: 'middle' } as React.CSSProperties;
const thS: React.CSSProperties = { background: 'var(--primary)', color: 'var(--card)', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', padding: '3px 5px', textAlign: 'center', letterSpacing: '.03em', borderRight: '1px solid rgba(255,255,255,.2)' };
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
  <table style={rigidTableStyle}>
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
          <tr key={g.cat} style={catRowBgStyle}>
            <td colSpan={11} style={catCellStyle}>{g.cat}</td>
          </tr>
          {g.items.map((item, i) => (
            <tr key={item} style={i % 2 === 1 ? altRowStyle : undefined}>
              <td style={itemCellStyle}>{item}</td>
              <td style={pfCellStyle}>
                <span style={passBtnInlineStyle}>P</span>
              </td>
              <td style={pfCellStyle}>
                <span style={failBtnInlineStyle}>F</span>
              </td>
              {defCols.map(c => (
                <td key={c} style={pfCellStyle}>
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
