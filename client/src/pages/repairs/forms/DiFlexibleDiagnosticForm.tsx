import './print.css';
import type { RepairFull } from '../types';

// ── Extracted static styles ──
const flexOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1100,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '24px 16px', overflowY: 'auto',
};
const flexActionBarStyle: React.CSSProperties = { position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 };
const flexPrintBtnStyle: React.CSSProperties = { height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: 'var(--card)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const flexCloseBtnStyle: React.CSSProperties = { height: 32, padding: '0 14px', border: '1px solid var(--print-border)', borderRadius: 5, background: 'var(--card)', color: 'var(--print-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
const flexFormWrapStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 0 };
const flexHeaderRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, borderBottom: '2px solid var(--print-text)', paddingBottom: 6 };
const flexLogoGroupStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };
const flexLogoImgStyle: React.CSSProperties = { height: 44 };
const flexAddressLineStyle: React.CSSProperties = { fontSize: 9, color: 'var(--print-subtle)' };
const flexHeaderRightStyle: React.CSSProperties = { textAlign: 'right' };
const flexHeaderTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: 'var(--print-text)' };
const flexFormNumStyle: React.CSSProperties = { fontSize: 10, color: 'var(--print-muted)', marginTop: 2 };
const flexIsoLineStyle: React.CSSProperties = { fontSize: 9, color: 'var(--print-subtext)', marginTop: 1 };
const flexGenInfoGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 16px', padding: '5px 0 3px' };
const flexColGap1Style: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1 };
const flexRadioRowStyle: React.CSSProperties = { display: 'flex', gap: 12, paddingTop: 3 };
const flexAccessoriesWrapStyle: React.CSSProperties = { marginTop: 4 };
const flexAccessoriesLabelStyle: React.CSSProperties = { fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--print-muted)', letterSpacing: '.04em', marginRight: 8 };
const flexAccessoriesListStyle: React.CSSProperties = { display: 'inline-flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: '10.5px' };
const flexAccessoryItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4 };
const flexConditionSectionStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, padding: '3px 0' };
const flexConditionRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' };
const flexUncleanBadgeStyle: React.CSSProperties = { fontSize: 9, color: 'var(--badge-amber-text)', background: 'var(--amber-subtle)', border: '1px solid var(--amber-border)', borderRadius: 3, padding: '2px 7px', fontWeight: 600 };
const flexModelConfirmRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 };
const flexYesLabelStyle: React.CSSProperties = { fontSize: 10 };
const flexScopeConditionWrapStyle: React.CSSProperties = { margin: '8px 0 4px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' };
const flexScopeCondOptionStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5 };
const flexRepairAssessBoxStyle: React.CSSProperties = { border: '1px solid var(--print-border)', borderRadius: 3, minHeight: 60, padding: '4px 8px', fontSize: 10.5, color: 'var(--print-placeholder)', marginTop: 3 };
const flexPage2HeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--print-border)', paddingBottom: 4, marginBottom: 6 };
const flexPage2TitleStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--navy)' };
const flexPage2SubtitleStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700 };
const flexPage2WoStyle: React.CSSProperties = { fontSize: 10, color: 'var(--print-light)' };
const flexSectionLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--print-text)', marginTop: 5, marginBottom: 2, borderBottom: '1px solid var(--print-border-lt)', paddingBottom: 2 };
const flexSubBarStyle: React.CSSProperties = { background: 'var(--neutral-100)', color: 'var(--label)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', padding: '3px 8px', marginTop: 4 };
const flexCbxStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, marginRight: 6 };
const flexCbxBoxStyle: React.CSSProperties = { width: 11, height: 11, border: '1px solid var(--print-footer)', borderRadius: 1, display: 'inline-block', flexShrink: 0 };
const flexRadioStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, marginRight: 6 };
const flexRadioCircleStyle: React.CSSProperties = { width: 11, height: 11, border: '1px solid var(--print-footer)', borderRadius: '50%', display: 'inline-block', flexShrink: 0 };
const flexPfRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid var(--print-row-divider)', flexWrap: 'wrap', fontSize: 10.5 };
const flexPfBtnGroupStyle: React.CSSProperties = { display: 'inline-flex', gap: 1, flexShrink: 0 };
const flexPassBtnStyle: React.CSSProperties = { display: 'inline-block', width: 22, height: 14, border: '1px solid var(--success)', borderRadius: 2, textAlign: 'center', lineHeight: '14px', fontSize: 8, fontWeight: 700, color: 'var(--success)' };
const flexFailBtnStyle: React.CSSProperties = { display: 'inline-block', width: 22, height: 14, border: '1px solid var(--danger)', borderRadius: 2, textAlign: 'center', lineHeight: '14px', fontSize: 8, fontWeight: 700, color: 'var(--danger)' };
const flexNaBtnStyle: React.CSSProperties = { display: 'inline-block', width: 22, height: 14, border: '1px solid var(--print-placeholder)', borderRadius: 2, textAlign: 'center', lineHeight: '14px', fontSize: 8, fontWeight: 700, color: 'var(--print-light)' };
const flexPfChildrenWrapStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' };
const flexFldBaseStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1 };
const flexFormFooterStyle: React.CSSProperties = { marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--print-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 8, color: 'var(--print-footer)' };
const flexAngulationHintStyle: React.CSSProperties = { fontSize: 9, color: 'var(--print-light)', marginLeft: 6 };
const flexNotesCardStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' };

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

export const DiFlexibleDiagnosticForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const wo = repair.wo ?? '';
  const serial = repair.serial ?? '';
  const client = repair.client ?? '';
  const model = `${repair.scopeType ?? ''} ${repair.scopeModel ?? ''}`.trim();
  const complaint = repair.complaint ?? '';
  const rack = repair.rackLocation ?? '';

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={flexOverlayStyle}
    >
      {/* Action bar */}
      <div className="no-print" style={flexActionBarStyle}>
        <button onClick={() => window.print()} style={flexPrintBtnStyle}>Print</button>
        <button onClick={onClose} style={flexCloseBtnStyle}>Close</button>
      </div>

      <div className="print-form flex-col" style={flexFormWrapStyle}>

        {/* ══ PAGE 1 ══ */}
        <div className="print-page" style={page}>

          {/* Header */}
          <div style={flexHeaderRowStyle}>
            <div style={flexLogoGroupStyle}>
              <img src="/logo-color.png" alt="Total Scope Inc." loading="lazy" style={flexLogoImgStyle} />
              <div>
                <div style={flexAddressLineStyle}>17 Creek Parkway | Upper Chichester, PA 19061</div>
                <div style={flexAddressLineStyle}>Phone: (610) 485-3838 | Fax: (610) 485-0404</div>
              </div>
            </div>
            <div style={flexHeaderRightStyle}>
              <div style={flexHeaderTitleStyle}>Flexible Endoscope Diagnostic Report</div>
              <div style={flexFormNumStyle}>Form #: OM05-1</div>
              <div style={flexIsoLineStyle}>An ISO 13485:2016 Certified Company</div>
            </div>
          </div>

          {/* Section 1: General Information */}
          <SectionLabel>1. General Information</SectionLabel>
          <div style={flexGenInfoGridStyle}>
            <Fld label="Customer" value={client} span2 />
            <Fld label="Work Order #" value={wo} />
            <Fld label="Inspected By" value="" />
            <Fld label="Date" value={today} />
            <Fld label="Scope Model" value={model} />
            <Fld label="Rack #" value={rack} />
            <div style={flexColGap1Style}>
              <span style={fl}>Customer Type</span>
              <div style={flexRadioRowStyle}>
                <Radio label="FFS" /><Radio label="CAP" />
              </div>
            </div>
            <Fld label="Serial #" value={serial} />
            <div style={flexColGap1Style}>
              <span style={fl}>Package Type</span>
              <div style={flexRadioRowStyle}>
                <Radio label="F" /><Radio label="P" /><Radio label="S" />
              </div>
            </div>
          </div>

          {/* Accessories */}
          <div style={flexAccessoriesWrapStyle}>
            <span style={flexAccessoriesLabelStyle}>Accessories Received:</span>
            <span style={flexAccessoriesListStyle}>
              {['None','ETO Cap','A/W Button','Suction Button','Water Cap','Biopsy Valve','Light Post Adapter'].map(a => (
                <span key={a} style={flexAccessoryItemStyle}><Cbx />{a}</span>
              ))}
            </span>
          </div>

          {/* Section 2 */}
          <SectionLabel>2. Item Condition Upon Receipt</SectionLabel>
          <div style={flexConditionSectionStyle}>
            <div style={flexConditionRowStyle}>
              <span style={fl}>External Condition:</span>
              <Radio label="Clean" /><Radio label="Unclean" />
              <span style={flexUncleanBadgeStyle}>
                (if unclean, follow OM-22 SOP) — Cleaned By: <span style={underline100} />
              </span>
            </div>
            <div style={flexModelConfirmRowStyle}>
              <span style={fl}>Model &amp; SN# Confirmed:</span><Cbx /><span style={flexYesLabelStyle}>Yes</span>
            </div>
            <div>
              <span style={fl}>Customer Perceived Problem:</span>
              <div style={{ ...fv, minHeight: 22, marginTop: 2 }}>{complaint}</div>
            </div>
          </div>

          {/* Section 3 header */}
          <SectionLabel>3. Functional Checks</SectionLabel>

          {/* 3A */}
          <SubBar>3A. Leak Test &amp; Fluid Invasion</SubBar>
          <PfRow>Leak Test Performed → Result: <span style={underline80} /> &nbsp;&nbsp; Leak Location: <span style={underline80} /></PfRow>
          <PfRow>Fluid Invasion Detected → Location: {['BS','CB','SC','LGC','Lenses','Other'].map(l=><Cbx key={l} label={l} />)}</PfRow>

          {/* 3B */}
          <SubBar>3B. Angulation System</SubBar>
          <PfRow>Angulation Specs U: <span style={underline40} /> D: <span style={underline40} /> R: <span style={underline40} /> L: <span style={underline40} /> <span style={flexAngulationHintStyle}>(Factory: U180/D180/R160/L160)</span></PfRow>
          <PfRow>Angulation System {['Play','Stiff/Grinding','Broken Cable','Slip Stopper','Orientation Off','Broken Bracket'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Angulation Knobs {['Moving Together','Not Locking'].map(d=><Cbx key={d} label={d} />)} Leaking — Location: <span style={underline60} /></PfRow>
          <PfRow>Angulation Lock {['Too Tight','Too Loose','Brake Not Functioning','Missing'].map(d=><Cbx key={d} label={d} />)}</PfRow>

          {/* 3C */}
          <SubBar>3C. Image &amp; Light Transmission</SubBar>
          <PfRow>Video Image {['No Image','Static','Lens Separation','Imperfection'].map(d=><Cbx key={d} label={d} />)} Error Code Notes: <span style={underline80} /></PfRow>
          <PfRow>Light Bundle {['Slip from Tip'].map(d=><Cbx key={d} label={d} />)} Broken Fibers → % Broken: <span style={underline60} /></PfRow>
          <PfRow>Video Features {['Data','WB','NBI','Dual Focus'].map(d=><Cbx key={d} label={d} />)} Orientation Uses: <span style={underline60} /> &nbsp; Time: <span style={underline60} /></PfRow>
          <PfRow>Control Switches {['Misaligned','Rubber Cut'].map(d=><Cbx key={d} label={d} />)} Inoperative — Switch #: <span style={underline60} /></PfRow>

          {/* 3D */}
          <SubBar>3D. Channel Function</SubBar>
          <PfRow>Suction Channel {['Blocked','Leaking','Impeded'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Forcep/Biopsy Channel {['Blocked','Leaking','Port Seal Damaged'].map(d=><Cbx key={d} label={d} />)} Impeded — Level: <span style={underline60} /></PfRow>
          <PfRow>Auxiliary Water Channel {['Blocked','Leaking','Loose','Weak'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>A/W System Channel {['Kinked','Clogged','Leaking','Nozzle Clogged'].map(d=><Cbx key={d} label={d} />)}</PfRow>

          {/* 3E */}
          <SubBar>3E. Electrical &amp; Connector Integrity</SubBar>
          <PfRow>
            <strong>Light Guide Connector (LGC)</strong>{' '}
            {['Alignment Pin Missing/Leaking','Prong Loose','Lens (Dirty or Broken)','ETO Valve','Bottle','Connector Loose','Cracked','Leaking'].map(d=><Cbx key={d} label={d} />)}
          </PfRow>
          <PfRow>Electrical Pins/Contacts {['Dirty','Corroded','Bent Pins'].map(d=><Cbx key={d} label={d} />)}</PfRow>

          <FormFooter page="OM05-1" />
        </div>

        {/* ══ PAGE 2 ══ */}
        <div className="print-page" style={page}>

          {/* Mini header repeat */}
          <div style={flexPage2HeaderStyle}>
            <div style={flexPage2TitleStyle}>Total Scope, Inc.</div>
            <div style={flexPage2SubtitleStyle}>Flexible Endoscope Diagnostic Report — continued</div>
            <div style={flexPage2WoStyle}>WO# {wo}</div>
          </div>

          {/* 3F */}
          <SubBar>3F. Control Body</SubBar>
          <PfRow>Control Body Housing {['Leaking','Cracked','Loose Mount'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Elevator Function {['Wire Broken','Needs Adjustment','Channel Leaking','Port Leaking'].map(d=><Cbx key={d} label={d} />)}</PfRow>

          {/* 3G */}
          <SubBar>3G. Insertion Tube</SubBar>
          <PfRow>Surface {['Dented','Buckled','Cut','Peeling','Cut Back Too Far'].map(d=><Cbx key={d} label={d} />)} Discolored — Location: <span style={underline80} /></PfRow>
          <PfRow>Tensioner {['Leaking','Nonfunctional','Needs Adjustment','Knob Damage'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Flexibility {['Stiff','Over-flexible','Snaking'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Boot (CB) {['Torn','Loose','Trim Ring'].map(d=><Cbx key={d} label={d} />)}</PfRow>

          {/* 3H */}
          <SubBar>3H. Distal Tip &amp; Adhesive Surfaces</SubBar>
          <PfRow>C-Cover {['Cracked','Loose','RTV Missing','Poor Condition'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>BR Adhesive {['Flaking','Missing','Aged','Oversized'].map(d=><Cbx key={d} label={d} />)} → Measured Size: <span style={underline60} /> &nbsp; Max: 12.82mm</PfRow>
          <PfRow>Bending Rubber {['Aging','Loose','Cut/Hole'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Bending Section Mesh {['Poor Condition'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Lenses {['Cracked','Chipped','Dirty','Glue Missing'].map(d=><Cbx key={d} label={d} />)} Missing Lens — Specify: <span style={underline80} /></PfRow>

          {/* 3I */}
          <SubBar>3I. Universal Cord &amp; Boots</SubBar>
          <PfRow>Cord {['Dented','Buckled','Cut','Peeling'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Boot (CB) {['Torn','Loose','Cracked'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Boot (LGC) {['Torn','Loose','Cracked'].map(d=><Cbx key={d} label={d} />)}</PfRow>

          {/* Section 4 */}
          <SectionLabel>4. Detailed Inspection</SectionLabel>
          <PfRow><strong>Borescope Used</strong></PfRow>
          <PfRow>Internal Channels {['Good','Freckling','Debris','Scratched/Deformed','Other'].map(d=><Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Residue {['Biological','Chemical','Staining','Other'].map(d=><Cbx key={d} label={d} />)} → Location: <span style={underline80} /></PfRow>
          <PfRow>Photos Taken <Radio label="Yes" /> <Radio label="No" /></PfRow>

          {/* Scope Condition */}
          <div style={flexScopeConditionWrapStyle}>
            <span style={{ ...fl, marginRight: 4 }}>Scope Condition (select one):</span>
            {['Not Patient Safe','Functional Issue','Cosmetic Only','No Issues Found'].map(c=>(
              <span key={c} style={flexScopeCondOptionStyle}><Radio />{c}</span>
            ))}
          </div>

          {/* Section 5 */}
          <SectionLabel>5. Repair Assessment</SectionLabel>
          <div style={flexRepairAssessBoxStyle}>Tech notes...</div>

          <FormFooter page="Form #: OM05-1 — Revision Pending (01/2026)" />
        </div>

      </div>
    </div>
  );
};

/* ── Shared primitives ── */

const page: React.CSSProperties = {
  width: '8.5in', minHeight: '11in', background: 'var(--card)',
  padding: '0.5in', display: 'flex', flexDirection: 'column', gap: 5,
  fontFamily: "'Inter', Arial, sans-serif", fontSize: 11, color: 'var(--print-text)',
  boxSizing: 'border-box',
};

const fl: React.CSSProperties = {
  fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase',
  color: 'var(--print-muted)', letterSpacing: '.04em',
};

const fv: React.CSSProperties = {
  borderBottom: '1px solid var(--print-check-border)', minHeight: 17, fontSize: 11, padding: '1px 2px',
};

const underline40: React.CSSProperties = { display: 'inline-block', borderBottom: '1px solid var(--print-check-border)', width: 40, height: 14, verticalAlign: 'bottom', margin: '0 2px' };
const underline60: React.CSSProperties = { ...underline40, width: 60 };
const underline80: React.CSSProperties = { ...underline40, width: 80 };
const underline100: React.CSSProperties = { ...underline40, width: 100 };

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={flexSectionLabelStyle}>{children}</div>
);

const SubBar = ({ children }: { children: React.ReactNode }) => (
  <div style={flexSubBarStyle}>{children}</div>
);

const Cbx = ({ label }: { label?: string }) => (
  <span style={flexCbxStyle}>
    <span style={flexCbxBoxStyle} />
    {label}
  </span>
);

const Radio = ({ label }: { label?: string }) => (
  <span style={flexRadioStyle}>
    <span style={flexRadioCircleStyle} />
    {label}
  </span>
);

const PfRow = ({ children }: { children: React.ReactNode }) => (
  <div style={flexPfRowStyle}>
    <span style={flexPfBtnGroupStyle}>
      <span style={flexPassBtnStyle}>P</span>
      <span style={flexFailBtnStyle}>F</span>
      <span style={flexNaBtnStyle}>N/A</span>
    </span>
    <span style={flexPfChildrenWrapStyle}>{children}</span>
  </div>
);

const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div style={{ ...flexFldBaseStyle, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={fv}>{value || ''}</div>
  </div>
);

const FormFooter = ({ page: pageLabel }: { page: string }) => (
  <div style={flexFormFooterStyle}>
    <span>ISO 13485 Certified</span>
    <span>Total Scope, Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-1616</span>
    <span>{pageLabel}</span>
  </div>
);
