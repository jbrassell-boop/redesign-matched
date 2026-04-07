import './print.css';
import type { RepairFull } from '../types';

// ── Extracted static styles ──
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '20px 0' };
const printFormStyle: React.CSSProperties = { width: '8.5in', background: 'var(--card)', fontFamily: "'Inter', Arial, sans-serif", fontSize: 11, color: 'var(--print-text)' };
const printCloseRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' };
const printBtnStyle: React.CSSProperties = { padding: '8px 20px', background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const closeBtnStyle: React.CSSProperties = { padding: '8px 20px', background: 'var(--print-light)', color: 'var(--card)', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const formBodyStyle: React.CSSProperties = { padding: '0.5in', display: 'flex', flexDirection: 'column', gap: 8 };
const headerRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 };
const headerTitleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: 'var(--navy)' };
const headerSubtitleStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 };
const headerDocRefStyle: React.CSSProperties = { fontSize: 10, color: 'var(--print-light)', marginTop: 2 };
const cameraGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', padding: '6px 0 2px' };
const flexColGap1Style: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1 };
const customerTypeRowStyle: React.CSSProperties = { display: 'flex', gap: 10, alignItems: 'center', paddingTop: 3 };
const receivedLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--print-muted)', letterSpacing: '.04em', marginRight: 4 };
const uncleanWarningStyle: React.CSSProperties = { background: 'var(--amber-subtle)', border: '1px solid var(--amber-border)', borderRadius: 3, padding: '4px 8px', fontSize: 9, color: 'var(--badge-amber-text)', fontWeight: 600, marginLeft: 8 };
const couplerSubheadStyle: React.CSSProperties = { fontWeight: 400, textTransform: 'none', fontSize: '8.5px', opacity: .85 };
const sigRowStyle: React.CSSProperties = { display: 'flex', gap: 20, marginTop: 8 };
const footerStyle: React.CSSProperties = { marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--print-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: 'var(--print-footer)' };

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

export const DiInspectionForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div style={overlayStyle}>
      <div className="print-form" style={printFormStyle}>
        {/* Print/Close */}
        <div className="no-print" style={printCloseRowStyle}>
          <button onClick={() => window.print()} style={printBtnStyle}>Print / Save PDF</button>
          <button onClick={onClose} style={closeBtnStyle}>Close</button>
        </div>

        <div style={formBodyStyle}>
          {/* Header */}
          <div style={headerRowStyle}>
            <img src="/logo-color.png" alt="TSI Logo" loading="lazy" style={{ height: 44 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={headerTitleStyle}>D&amp;I Inspection Report</div>
              <div style={headerSubtitleStyle}>Camera System</div>
              <div style={headerDocRefStyle}>OM05-2</div>
            </div>
          </div>

          {/* Camera Information */}
          <Bar>Camera Information</Bar>
          <div style={cameraGridStyle}>
            <Fld label="Client / Facility" value={repair.client} span2 />
            <div style={flexColGap1Style}>
              <span style={fl}>Customer Type</span>
              <div style={customerTypeRowStyle}>
                <Cb label="CAP" /><Cb label="FFS" />
              </div>
            </div>
            <Fld label="Camera Type / Model" value={`${repair.scopeType ?? ''} ${repair.scopeModel ?? ''}`.trim()} span2 />
            <Fld label="Complaint" value={repair.complaint} h={28} />
            <Fld label="Work Order #" value={repair.wo} />
            <Fld label="Serial #" value={repair.serial} />
            <Fld label="Date" value={today} />
            <Fld label="Rack #" value={repair.rackLocation} />
            <Fld label="Inspected By" value="" />
          </div>

          {/* Accessories Received */}
          <Bar>Accessories Received</Bar>
          <CbRow><Cb label="Camera Head" /><Cb label="Coupler" /><Cb label="Soak Cap" /><Cb label="Edge Card Protector" /></CbRow>

          {/* Item Received Condition */}
          <Bar>Item Received Condition</Bar>
          <CbRow>
            <span style={receivedLabelStyle}>Received:</span>
            <Cb label="Clean" /><Cb label="Unclean" />
            <span style={uncleanWarningStyle}>
              If Unclean — follow OM-22 decontamination protocol before proceeding
            </span>
          </CbRow>

          {/* Camera Inspection */}
          <Bar>Camera Inspection</Bar>
          <PfTable items={['1. Leak Test','2. Focus Test','3. Fog Test','4. White Balance','5. Control Buttons','6. Cable Connector','7. Video Image','8. Edge Card Protector','9. Focus Mechanism','10. Scope Retaining Mechanism']} />

          {/* Coupler Inspection */}
          <Bar>Coupler Inspection <span style={couplerSubheadStyle}>(complete if coupler received)</span></Bar>
          <PfTable items={['1. Image Quality','2. Soak Cap Assembly','3. Leak Test','4. Pass Test']} />

          {/* Items in Need of Repair */}
          <Bar>Items in Need of Repair</Bar>
          <TextField h={36} />

          {/* Comments */}
          <Bar>Comments</Bar>
          <TextField h={28} />

          {/* Signatures */}
          <div style={sigRowStyle}>
            <Sig label="Inspected By / Signature" /><Sig label="Date" narrow /><Sig label="Reviewed By / Signature" /><Sig label="Date" narrow />
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <span>ISO 13485 Certified</span>
            <span>Total Scope, Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
            <span>OM05-2</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Shared primitives — pixel-match the HTML CSS ── */
const fl: React.CSSProperties = { fontSize:'8.5px', fontWeight:700, textTransform:'uppercase', color:'var(--print-muted)', letterSpacing:'.04em' };

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background:'var(--primary)', color:'var(--card)', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', padding:'4px 10px' }}>{children}</div>
);

const Fld = ({ label, value, span2, h }: { label:string; value?:string|null; span2?:boolean; h?:number }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:1, ...(span2 ? { gridColumn:'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ borderBottom:'1px solid var(--print-check-border)', minHeight: h ?? 17, fontSize:11, padding:'1px 2px' }}>{value || ''}</div>
  </div>
);

const Cb = ({ label }: { label:string }) => (
  <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:'10.5px' }}>
    <span style={{ width:12, height:12, border:'1px solid var(--print-check-border)', borderRadius:2, display:'inline-block', flexShrink:0 }} />{label}
  </span>
);

const CbRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display:'flex', gap:14, alignItems:'center', padding:'5px 0', flexWrap:'wrap' }}>{children}</div>
);

const TextField = ({ h }: { h:number }) => (
  <div style={{ border:'1px solid var(--print-border)', borderRadius:3, minHeight:h, padding:'3px 6px', marginTop:3, fontSize:'10.5px' }} />
);

const thStyle: React.CSSProperties = { background:'var(--primary)', color:'var(--card)', fontSize:'8.5px', fontWeight:700, textTransform:'uppercase', padding:'4px 8px', letterSpacing:'.04em', borderRight:'1px solid rgba(255,255,255,.2)' };

const PfTable = ({ items }: { items:string[] }) => (
  <table style={{ width:'100%', borderCollapse:'collapse', marginTop:4 }}>
    <thead><tr>
      <th style={{ ...thStyle, textAlign:'left' }}>Test Item</th>
      <th style={{ ...thStyle, textAlign:'center', width:44 }}>Y</th>
      <th style={{ ...thStyle, textAlign:'center', width:44 }}>N</th>
      <th style={{ ...thStyle, textAlign:'center', width:44, borderRight:'none' }}>N/A</th>
    </tr></thead>
    <tbody>
      {items.map((item, i) => (
        <tr key={item} style={i%2===1 ? { background:'var(--bg)' } : undefined}>
          <td style={{ padding:'4px 8px', fontSize:'10.5px', borderBottom:'1px solid var(--print-border-lt)', borderRight:'1px solid var(--print-border-xlt)', verticalAlign:'middle' }}>{item}</td>
          <td style={{ padding:'4px 8px', textAlign:'center', borderBottom:'1px solid var(--print-border-lt)', borderRight:'1px solid var(--print-border-xlt)' }}>
            <span style={{ display:'inline-block', width:26, height:16, border:'1px solid var(--success)', borderRadius:2, textAlign:'center', lineHeight:'16px', fontSize:9, fontWeight:700, color:'var(--success)' }}>Y</span>
          </td>
          <td style={{ padding:'4px 8px', textAlign:'center', borderBottom:'1px solid var(--print-border-lt)', borderRight:'1px solid var(--print-border-xlt)' }}>
            <span style={{ display:'inline-block', width:26, height:16, border:'1px solid var(--danger)', borderRadius:2, textAlign:'center', lineHeight:'16px', fontSize:9, fontWeight:700, color:'var(--danger)' }}>N</span>
          </td>
          <td style={{ padding:'4px 8px', textAlign:'center', borderBottom:'1px solid var(--print-border-lt)' }}>
            <span style={{ display:'inline-block', width:26, height:16, border:'1px solid var(--print-placeholder)', borderRadius:2, textAlign:'center', lineHeight:'16px', fontSize:9, fontWeight:700, color:'var(--print-light)' }}>N/A</span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Sig = ({ label, narrow }: { label:string; narrow?:boolean }) => (
  <div style={{ flex: narrow ? undefined : 1, maxWidth: narrow ? 130 : undefined, display:'flex', flexDirection:'column', gap:2 }}>
    <div style={{ borderBottom:'1px solid var(--print-check-border)', minHeight:28 }} />
    <div style={{ fontSize:'8.5px', color:'var(--print-muted)', fontWeight:600, marginTop:2 }}>{label}</div>
  </div>
);
