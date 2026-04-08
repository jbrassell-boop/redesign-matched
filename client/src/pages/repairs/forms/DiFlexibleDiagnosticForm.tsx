import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

// ── Shared compact styles ──
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';
const g = 6;

const underline40: React.CSSProperties = { display: 'inline-block', borderBottom: '1px solid #ccc', width: 40, height: 13, verticalAlign: 'bottom', margin: '0 2px' };
const underline60: React.CSSProperties = { ...underline40, width: 60 };
const underline80: React.CSSProperties = { ...underline40, width: 80 };
const underline100: React.CSSProperties = { ...underline40, width: 100 };

const page: React.CSSProperties = {
  width: '8.5in', minHeight: '11in', background: '#fff',
  padding: '0.4in', fontFamily: "'Inter', Arial, sans-serif", fontSize: 9,
  color: '#222', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
};

const subBarStyle: React.CSSProperties = { background: '#f1f5f9', color: '#334155', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '2px 6px', marginTop: 4 };
const pfRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap', fontSize: 8.5 };
const pfBtnGroupStyle: React.CSSProperties = { display: 'inline-flex', gap: 1, flexShrink: 0 };
const passBtnStyle: React.CSSProperties = { display: 'inline-block', width: 20, height: 12, border: '1px solid #16a34a', borderRadius: 2, textAlign: 'center', lineHeight: '12px', fontSize: 7, fontWeight: 700, color: '#16a34a' };
const failBtnStyle: React.CSSProperties = { display: 'inline-block', width: 20, height: 12, border: '1px solid #dc2626', borderRadius: 2, textAlign: 'center', lineHeight: '12px', fontSize: 7, fontWeight: 700, color: '#dc2626' };
const naBtnStyle: React.CSSProperties = { display: 'inline-block', width: 20, height: 12, border: '1px solid #ccc', borderRadius: 2, textAlign: 'center', lineHeight: '12px', fontSize: 7, fontWeight: 700, color: '#aaa' };
const cbxStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8, marginRight: 4 };
const cbxBoxStyle: React.CSSProperties = { width: 10, height: 10, border: '1px solid #ccc', borderRadius: 1, display: 'inline-block', flexShrink: 0 };
const radioStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 8, marginRight: 4 };
const radioCircleStyle: React.CSSProperties = { width: 10, height: 10, border: '1px solid #ccc', borderRadius: '50%', display: 'inline-block', flexShrink: 0 };
const sectionLabelStyle: React.CSSProperties = { fontSize: 8.5, fontWeight: 700, color: '#1B3A5C', marginTop: 5, marginBottom: 2, borderBottom: '1px solid #dde3ee', paddingBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' };

const SubBar = ({ children }: { children: React.ReactNode }) => (
  <div style={subBarStyle}>{children}</div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={sectionLabelStyle}>{children}</div>
);

const Cbx = ({ label }: { label?: string }) => (
  <span style={cbxStyle}><span style={cbxBoxStyle} />{label}</span>
);

const Radio = ({ label }: { label?: string }) => (
  <span style={radioStyle}><span style={radioCircleStyle} />{label}</span>
);

const PfRow = ({ children }: { children: React.ReactNode }) => (
  <div style={pfRowStyle}>
    <span style={pfBtnGroupStyle}>
      <span style={passBtnStyle}>P</span>
      <span style={failBtnStyle}>F</span>
      <span style={naBtnStyle}>N/A</span>
    </span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>{children}</span>
  </div>
);

const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={fv}>{value || ''}</div>
  </div>
);

const FormFooter = ({ formRef }: { formRef: string }) => (
  <div style={{ marginTop: 'auto', paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', textAlign: 'center' }}>
    <div style={{ fontWeight: 600, marginBottom: 2 }}>Total Scope, Inc. — ISO 13485 Certified <span style={{ float: 'right', fontWeight: 400 }}>{formRef}</span></div>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 6.5, color: '#aaa' }}>
      <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
      <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
      <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
    </div>
  </div>
);

export const DiFlexibleDiagnosticForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const wo = repair.wo ?? em;
  const serial = repair.serial ?? em;
  const client = repair.client ?? em;
  const model = `${repair.scopeType ?? ''} ${repair.scopeModel ?? ''}`.trim() || em;
  const complaint = repair.complaint ?? em;
  const rack = repair.rackLocation ?? em;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
    >
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
        <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
        <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
      </div>

      <div className="print-form flex-col" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ══ PAGE 1 ══ */}
        <div className="print-page" style={page}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: g }}>
            <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1B3A5C' }}>Flexible Endoscope Diagnostic Report</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>D&amp;I Flexible — Diagnostic Worksheet</div>
              <div style={{ fontSize: 8, color: '#aaa' }}>OM05-1</div>
            </div>
          </div>

          {/* Section 1: General Information */}
          <SectionLabel>1. General Information</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px 12px', padding: '3px 0', marginBottom: g }}>
            <Fld label="Customer" value={client} span2 />
            <Fld label="Work Order #" value={wo} />
            <Fld label="Inspected By" value="" />
            <Fld label="Date" value={today} />
            <Fld label="Scope Model" value={model} />
            <Fld label="Rack #" value={rack} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={fl}>Customer Type</span>
              <div style={{ display: 'flex', gap: 10, paddingTop: 2 }}>
                <Radio label="FFS" /><Radio label="CAP" />
              </div>
            </div>
            <Fld label="Serial #" value={serial} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={fl}>Package Type</span>
              <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                <Radio label="F" /><Radio label="P" /><Radio label="S" />
              </div>
            </div>
          </div>

          {/* Accessories */}
          <div style={{ marginBottom: g }}>
            <span style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '.04em', marginRight: 8 }}>Accessories Received:</span>
            <span style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 8 }}>
              {['None','ETO Cap','A/W Button','Suction Button','Water Cap','Biopsy Valve','Light Post Adapter'].map(a => (
                <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><span style={cbxBoxStyle} />{a}</span>
              ))}
            </span>
          </div>

          {/* Section 2 */}
          <SectionLabel>2. Item Condition Upon Receipt</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '2px 0', marginBottom: g }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={fl}>External Condition:</span>
              <Radio label="Clean" /><Radio label="Unclean" />
              <span style={{ fontSize: 7.5, color: '#b45309', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 3, padding: '1px 6px', fontWeight: 600 }}>
                (if unclean, follow OM-22 SOP) — Cleaned By: <span style={underline100} />
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={fl}>Model &amp; SN# Confirmed:</span><span style={cbxBoxStyle} /><span style={{ fontSize: 8.5 }}>Yes</span>
            </div>
            <div>
              <span style={fl}>Customer Perceived Problem:</span>
              <div style={{ ...fv, minHeight: 20, marginTop: 2 }}>{complaint}</div>
            </div>
          </div>

          {/* Section 3 */}
          <SectionLabel>3. Functional Checks</SectionLabel>

          {/* 3A */}
          <SubBar>3A. Leak Test &amp; Fluid Invasion</SubBar>
          <PfRow>Leak Test Performed → Result: <span style={underline80} /> &nbsp;&nbsp; Leak Location: <span style={underline80} /></PfRow>
          <PfRow>Fluid Invasion Detected → Location: {['BS','CB','SC','LGC','Lenses','Other'].map(l => <Cbx key={l} label={l} />)}</PfRow>

          {/* 3B */}
          <SubBar>3B. Angulation System</SubBar>
          <PfRow>Angulation Specs U: <span style={underline40} /> D: <span style={underline40} /> R: <span style={underline40} /> L: <span style={underline40} /> <span style={{ fontSize: 7.5, color: '#aaa', marginLeft: 4 }}>(Factory: U180/D180/R160/L160)</span></PfRow>
          <PfRow>Angulation System {['Play','Stiff/Grinding','Broken Cable','Slip Stopper','Orientation Off','Broken Bracket'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Angulation Knobs {['Moving Together','Not Locking'].map(d => <Cbx key={d} label={d} />)} Leaking — Location: <span style={underline60} /></PfRow>
          <PfRow>Angulation Lock {['Too Tight','Too Loose','Brake Not Functioning','Missing'].map(d => <Cbx key={d} label={d} />)}</PfRow>

          {/* 3C */}
          <SubBar>3C. Image &amp; Light Transmission</SubBar>
          <PfRow>Video Image {['No Image','Static','Lens Separation','Imperfection'].map(d => <Cbx key={d} label={d} />)} Error Code Notes: <span style={underline80} /></PfRow>
          <PfRow>Light Bundle {['Slip from Tip'].map(d => <Cbx key={d} label={d} />)} Broken Fibers → % Broken: <span style={underline60} /></PfRow>
          <PfRow>Video Features {['Data','WB','NBI','Dual Focus'].map(d => <Cbx key={d} label={d} />)} Orientation Uses: <span style={underline60} /> &nbsp; Time: <span style={underline60} /></PfRow>
          <PfRow>Control Switches {['Misaligned','Rubber Cut'].map(d => <Cbx key={d} label={d} />)} Inoperative — Switch #: <span style={underline60} /></PfRow>

          {/* 3D */}
          <SubBar>3D. Channel Function</SubBar>
          <PfRow>Suction Channel {['Blocked','Leaking','Impeded'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Forcep/Biopsy Channel {['Blocked','Leaking','Port Seal Damaged'].map(d => <Cbx key={d} label={d} />)} Impeded — Level: <span style={underline60} /></PfRow>
          <PfRow>Auxiliary Water Channel {['Blocked','Leaking','Loose','Weak'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>A/W System Channel {['Kinked','Clogged','Leaking','Nozzle Clogged'].map(d => <Cbx key={d} label={d} />)}</PfRow>

          {/* 3E */}
          <SubBar>3E. Electrical &amp; Connector Integrity</SubBar>
          <PfRow>
            <strong>Light Guide Connector (LGC)</strong>{' '}
            {['Alignment Pin Missing/Leaking','Prong Loose','Lens (Dirty or Broken)','ETO Valve','Bottle','Connector Loose','Cracked','Leaking'].map(d => <Cbx key={d} label={d} />)}
          </PfRow>
          <PfRow>Electrical Pins/Contacts {['Dirty','Corroded','Bent Pins'].map(d => <Cbx key={d} label={d} />)}</PfRow>

          <FormFooter formRef="OM05-1" />
        </div>

        {/* ══ PAGE 2 ══ */}
        <div className="print-page" style={{ ...page, marginTop: 16 }}>

          {/* Mini header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dde3ee', paddingBottom: 4, marginBottom: g }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#1B3A5C' }}>Total Scope, Inc.</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#1B3A5C' }}>Flexible Endoscope Diagnostic Report — continued</div>
            <div style={{ fontSize: 8.5, color: '#aaa' }}>WO# {wo}</div>
          </div>

          {/* 3F */}
          <SubBar>3F. Control Body</SubBar>
          <PfRow>Control Body Housing {['Leaking','Cracked','Loose Mount'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Elevator Function {['Wire Broken','Needs Adjustment','Channel Leaking','Port Leaking'].map(d => <Cbx key={d} label={d} />)}</PfRow>

          {/* 3G */}
          <SubBar>3G. Insertion Tube</SubBar>
          <PfRow>Surface {['Dented','Buckled','Cut','Peeling','Cut Back Too Far'].map(d => <Cbx key={d} label={d} />)} Discolored — Location: <span style={underline80} /></PfRow>
          <PfRow>Tensioner {['Leaking','Nonfunctional','Needs Adjustment','Knob Damage'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Flexibility {['Stiff','Over-flexible','Snaking'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Boot (CB) {['Torn','Loose','Trim Ring'].map(d => <Cbx key={d} label={d} />)}</PfRow>

          {/* 3H */}
          <SubBar>3H. Distal Tip &amp; Adhesive Surfaces</SubBar>
          <PfRow>C-Cover {['Cracked','Loose','RTV Missing','Poor Condition'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>BR Adhesive {['Flaking','Missing','Aged','Oversized'].map(d => <Cbx key={d} label={d} />)} → Measured Size: <span style={underline60} /> &nbsp; Max: 12.82mm</PfRow>
          <PfRow>Bending Rubber {['Aging','Loose','Cut/Hole'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Bending Section Mesh {['Poor Condition'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Lenses {['Cracked','Chipped','Dirty','Glue Missing'].map(d => <Cbx key={d} label={d} />)} Missing Lens — Specify: <span style={underline80} /></PfRow>

          {/* 3I */}
          <SubBar>3I. Universal Cord &amp; Boots</SubBar>
          <PfRow>Cord {['Dented','Buckled','Cut','Peeling'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Boot (CB) {['Torn','Loose','Cracked'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Boot (LGC) {['Torn','Loose','Cracked'].map(d => <Cbx key={d} label={d} />)}</PfRow>

          {/* Section 4 */}
          <SectionLabel>4. Detailed Inspection</SectionLabel>
          <PfRow><strong>Borescope Used</strong></PfRow>
          <PfRow>Internal Channels {['Good','Freckling','Debris','Scratched/Deformed','Other'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Residue {['Biological','Chemical','Staining','Other'].map(d => <Cbx key={d} label={d} />)} → Location: <span style={underline80} /></PfRow>
          <PfRow>Photos Taken <Radio label="Yes" /> <Radio label="No" /></PfRow>

          {/* Scope Condition */}
          <div style={{ margin: '6px 0 4px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ ...fl, marginRight: 4 }}>Scope Condition (select one):</span>
            {['Not Patient Safe','Functional Issue','Cosmetic Only','No Issues Found'].map(c => (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 8.5 }}><Radio />{c}</span>
            ))}
          </div>

          {/* Section 5 */}
          <SectionLabel>5. Repair Assessment</SectionLabel>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 2, minHeight: 52, padding: '4px 8px', fontSize: 8.5, color: '#aaa', marginTop: 2 }}>Tech notes...</div>

          <FormFooter formRef="OM05-1" />
        </div>

      </div>
    </div>
  );
};
