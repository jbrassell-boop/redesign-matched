import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

export const DiInspectionForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '20px 0' }}>
      <div className="print-form" style={{ width: '8.5in', background: '#fff', fontFamily: "'Inter', Arial, sans-serif", fontSize: 11, color: '#111' }}>
        {/* Print/Close */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0' }}>
          <button onClick={() => window.print()} style={{ padding: '8px 20px', background: '#2E75B6', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Print / Save PDF</button>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#666', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
        </div>

        <div style={{ padding: '0.5in', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <img src="/logo-color.png" alt="TSI Logo" style={{ height: 44 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1B3A5C' }}>D&amp;I Inspection Report</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#2E75B6', marginTop: 1 }}>Camera System</div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM05-2</div>
            </div>
          </div>

          {/* Camera Information */}
          <Bar>Camera Information</Bar>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', padding: '6px 0 2px' }}>
            <Fld label="Client / Facility" value={repair.client} span2 />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={fl}>Customer Type</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', paddingTop: 3 }}>
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
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#555', letterSpacing: '.04em', marginRight: 4 }}>Received:</span>
            <Cb label="Clean" /><Cb label="Unclean" />
            <span style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 3, padding: '4px 8px', fontSize: 9, color: '#92400E', fontWeight: 600, marginLeft: 8 }}>
              If Unclean — follow OM-22 decontamination protocol before proceeding
            </span>
          </CbRow>

          {/* Camera Inspection */}
          <Bar>Camera Inspection</Bar>
          <PfTable items={['1. Leak Test','2. Focus Test','3. Fog Test','4. White Balance','5. Control Buttons','6. Cable Connector','7. Video Image','8. Edge Card Protector','9. Focus Mechanism','10. Scope Retaining Mechanism']} />

          {/* Coupler Inspection */}
          <Bar>Coupler Inspection <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '8.5px', opacity: .85 }}>(complete if coupler received)</span></Bar>
          <PfTable items={['1. Image Quality','2. Soak Cap Assembly','3. Leak Test','4. Pass Test']} />

          {/* Items in Need of Repair */}
          <Bar>Items in Need of Repair</Bar>
          <TextField h={36} />

          {/* Comments */}
          <Bar>Comments</Bar>
          <TextField h={28} />

          {/* Signatures */}
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <Sig label="Inspected By / Signature" /><Sig label="Date" narrow /><Sig label="Reviewed By / Signature" /><Sig label="Date" narrow />
          </div>

          {/* Footer */}
          <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: '#888' }}>
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
const fl: React.CSSProperties = { fontSize:'8.5px', fontWeight:700, textTransform:'uppercase', color:'#555', letterSpacing:'.04em' };

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background:'#2E75B6', color:'#fff', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', padding:'4px 10px' }}>{children}</div>
);

const Fld = ({ label, value, span2, h }: { label:string; value?:string|null; span2?:boolean; h?:number }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:1, ...(span2 ? { gridColumn:'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ borderBottom:'1px solid #999', minHeight: h ?? 17, fontSize:11, padding:'1px 2px' }}>{value || ''}</div>
  </div>
);

const Cb = ({ label }: { label:string }) => (
  <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:'10.5px' }}>
    <span style={{ width:12, height:12, border:'1px solid #999', borderRadius:2, display:'inline-block', flexShrink:0 }} />{label}
  </span>
);

const CbRow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display:'flex', gap:14, alignItems:'center', padding:'5px 0', flexWrap:'wrap' }}>{children}</div>
);

const TextField = ({ h }: { h:number }) => (
  <div style={{ border:'1px solid #ccc', borderRadius:3, minHeight:h, padding:'3px 6px', marginTop:3, fontSize:'10.5px' }} />
);

const thStyle: React.CSSProperties = { background:'#2E75B6', color:'#fff', fontSize:'8.5px', fontWeight:700, textTransform:'uppercase', padding:'4px 8px', letterSpacing:'.04em', borderRight:'1px solid rgba(255,255,255,.2)' };

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
        <tr key={item} style={i%2===1 ? { background:'#F9FAFB' } : undefined}>
          <td style={{ padding:'4px 8px', fontSize:'10.5px', borderBottom:'1px solid #ddd', borderRight:'1px solid #eee', verticalAlign:'middle' }}>{item}</td>
          <td style={{ padding:'4px 8px', textAlign:'center', borderBottom:'1px solid #ddd', borderRight:'1px solid #eee' }}>
            <span style={{ display:'inline-block', width:26, height:16, border:'1px solid #16A34A', borderRadius:2, textAlign:'center', lineHeight:'16px', fontSize:9, fontWeight:700, color:'#16A34A' }}>Y</span>
          </td>
          <td style={{ padding:'4px 8px', textAlign:'center', borderBottom:'1px solid #ddd', borderRight:'1px solid #eee' }}>
            <span style={{ display:'inline-block', width:26, height:16, border:'1px solid #B71234', borderRadius:2, textAlign:'center', lineHeight:'16px', fontSize:9, fontWeight:700, color:'#B71234' }}>N</span>
          </td>
          <td style={{ padding:'4px 8px', textAlign:'center', borderBottom:'1px solid #ddd' }}>
            <span style={{ display:'inline-block', width:26, height:16, border:'1px solid #aaa', borderRadius:2, textAlign:'center', lineHeight:'16px', fontSize:9, fontWeight:700, color:'#666' }}>N/A</span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const Sig = ({ label, narrow }: { label:string; narrow?:boolean }) => (
  <div style={{ flex: narrow ? undefined : 1, maxWidth: narrow ? 130 : undefined, display:'flex', flexDirection:'column', gap:2 }}>
    <div style={{ borderBottom:'1px solid #999', minHeight:28 }} />
    <div style={{ fontSize:'8.5px', color:'#555', fontWeight:600, marginTop:2 }}>{label}</div>
  </div>
);
