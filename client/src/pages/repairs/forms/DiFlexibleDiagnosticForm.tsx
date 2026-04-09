import './print.css';
import './DiFlexibleDiagnosticForm.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

const em = '—';
const g = 6;

const SubBar = ({ children }: { children: React.ReactNode }) => (
  <div className="difd-subbar">{children}</div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="difd-section-label">{children}</div>
);

const Cbx = ({ label }: { label?: string }) => (
  <span className="difd-cbx"><span className="difd-cbx-box" />{label}</span>
);

const Radio = ({ label }: { label?: string }) => (
  <span className="difd-radio"><span className="difd-radio-circle" />{label}</span>
);

const PfRow = ({ children }: { children: React.ReactNode }) => (
  <div className="difd-pf-row">
    <span className="difd-pf-btn-group">
      <span className="difd-pf-pass">P</span>
      <span className="difd-pf-fail">F</span>
      <span className="difd-pf-na">N/A</span>
    </span>
    <span className="difd-pf-content">{children}</span>
  </div>
);

const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div className={span2 ? 'difd-field--span2' : 'difd-field'}>
    <span className="difd-fl">{label}</span>
    <div className="difd-fv">{value || ''}</div>
  </div>
);

const FormFooter = ({ formRef }: { formRef: string }) => (
  <div className="difd-footer">
    <div className="difd-footer-title">Total Scope, Inc. — ISO 13485 Certified <span className="difd-footer-ref">{formRef}</span></div>
    <div className="difd-footer-locs">
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
      className="difd-overlay"
    >
      <div className="no-print difd-action-bar">
        <button onClick={() => window.print()} className="difd-btn-print">Print</button>
        <button onClick={onClose} className="difd-btn-close">Close</button>
      </div>

      <div className="print-form difd-print-wrap">

        {/* ══ PAGE 1 ══ */}
        <div className="print-page difd-page">

          {/* Header */}
          <div className="difd-header difd-mb-g">
            <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="difd-header-logo" />
            <div className="difd-header-right">
              <div className="difd-header-title">Flexible Endoscope Diagnostic Report</div>
              <div className="difd-header-sub">D&amp;I Flexible — Diagnostic Worksheet</div>
              <div className="difd-header-ref">OM05-1</div>
            </div>
          </div>

          {/* Section 1: General Information */}
          <SectionLabel>1. General Information</SectionLabel>
          <div className="difd-info-grid difd-mb-g">
            <Fld label="Customer" value={client} span2 />
            <Fld label="Work Order #" value={wo} />
            <Fld label="Inspected By" value="" />
            <Fld label="Date" value={today} />
            <Fld label="Scope Model" value={model} />
            <Fld label="Rack #" value={rack} />
            <div className="difd-field">
              <span className="difd-fl">Customer Type</span>
              <div className="difd-radio-type-row">
                <Radio label="FFS" /><Radio label="CAP" />
              </div>
            </div>
            <Fld label="Serial #" value={serial} />
            <div className="difd-field">
              <span className="difd-fl">Package Type</span>
              <div className="difd-radio-type-row-sm">
                <Radio label="F" /><Radio label="P" /><Radio label="S" />
              </div>
            </div>
          </div>

          {/* Accessories */}
          <div className="difd-acc-block">
            <span className="difd-acc-label">Accessories Received:</span>
            <span className="difd-acc-row">
              {['None','ETO Cap','A/W Button','Suction Button','Water Cap','Biopsy Valve','Light Post Adapter'].map(a => (
                <span key={a} className="difd-acc-item"><span className="difd-cbx-box" />{a}</span>
              ))}
            </span>
          </div>

          {/* Section 2 */}
          <SectionLabel>2. Item Condition Upon Receipt</SectionLabel>
          <div className="difd-cond-col difd-mb-g">
            <div className="difd-cond-row">
              <span className="difd-fl">External Condition:</span>
              <Radio label="Clean" /><Radio label="Unclean" />
              <span className="difd-warn-badge">
                (if unclean, follow OM-22 SOP) — Cleaned By: <span className="difd-ul100" />
              </span>
            </div>
            <div className="difd-cond-sn-row">
              <span className="difd-fl">Model &amp; SN# Confirmed:</span><span className="difd-cbx-box" /><span className="difd-yes-label">Yes</span>
            </div>
            <div>
              <span className="difd-fl">Customer Perceived Problem:</span>
              <div className="difd-fv--tall">{complaint}</div>
            </div>
          </div>

          {/* Section 3 */}
          <SectionLabel>3. Functional Checks</SectionLabel>

          {/* 3A */}
          <SubBar>3A. Leak Test &amp; Fluid Invasion</SubBar>
          <PfRow>Leak Test Performed → Result: <span className="difd-ul80" /> &nbsp;&nbsp; Leak Location: <span className="difd-ul80" /></PfRow>
          <PfRow>Fluid Invasion Detected → Location: {['BS','CB','SC','LGC','Lenses','Other'].map(l => <Cbx key={l} label={l} />)}</PfRow>

          {/* 3B */}
          <SubBar>3B. Angulation System</SubBar>
          <PfRow>Angulation Specs U: <span className="difd-ul40" /> D: <span className="difd-ul40" /> R: <span className="difd-ul40" /> L: <span className="difd-ul40" /> <span className="difd-ang-note">(Factory: U180/D180/R160/L160)</span></PfRow>
          <PfRow>Angulation System {['Play','Stiff/Grinding','Broken Cable','Slip Stopper','Orientation Off','Broken Bracket'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Angulation Knobs {['Moving Together','Not Locking'].map(d => <Cbx key={d} label={d} />)} Leaking — Location: <span className="difd-ul60" /></PfRow>
          <PfRow>Angulation Lock {['Too Tight','Too Loose','Brake Not Functioning','Missing'].map(d => <Cbx key={d} label={d} />)}</PfRow>

          {/* 3C */}
          <SubBar>3C. Image &amp; Light Transmission</SubBar>
          <PfRow>Video Image {['No Image','Static','Lens Separation','Imperfection'].map(d => <Cbx key={d} label={d} />)} Error Code Notes: <span className="difd-ul80" /></PfRow>
          <PfRow>Light Bundle {['Slip from Tip'].map(d => <Cbx key={d} label={d} />)} Broken Fibers → % Broken: <span className="difd-ul60" /></PfRow>
          <PfRow>Video Features {['Data','WB','NBI','Dual Focus'].map(d => <Cbx key={d} label={d} />)} Orientation Uses: <span className="difd-ul60" /> &nbsp; Time: <span className="difd-ul60" /></PfRow>
          <PfRow>Control Switches {['Misaligned','Rubber Cut'].map(d => <Cbx key={d} label={d} />)} Inoperative — Switch #: <span className="difd-ul60" /></PfRow>

          {/* 3D */}
          <SubBar>3D. Channel Function</SubBar>
          <PfRow>Suction Channel {['Blocked','Leaking','Impeded'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Forcep/Biopsy Channel {['Blocked','Leaking','Port Seal Damaged'].map(d => <Cbx key={d} label={d} />)} Impeded — Level: <span className="difd-ul60" /></PfRow>
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
        <div className="print-page difd-page--p2">

          {/* Mini header */}
          <div className="difd-p2-header difd-mb-g">
            <div className="difd-p2-title-l">Total Scope, Inc.</div>
            <div className="difd-p2-title-r">Flexible Endoscope Diagnostic Report — continued</div>
            <div className="difd-p2-wo">WO# {wo}</div>
          </div>

          {/* 3F */}
          <SubBar>3F. Control Body</SubBar>
          <PfRow>Control Body Housing {['Leaking','Cracked','Loose Mount'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Elevator Function {['Wire Broken','Needs Adjustment','Channel Leaking','Port Leaking'].map(d => <Cbx key={d} label={d} />)}</PfRow>

          {/* 3G */}
          <SubBar>3G. Insertion Tube</SubBar>
          <PfRow>Surface {['Dented','Buckled','Cut','Peeling','Cut Back Too Far'].map(d => <Cbx key={d} label={d} />)} Discolored — Location: <span className="difd-ul80" /></PfRow>
          <PfRow>Tensioner {['Leaking','Nonfunctional','Needs Adjustment','Knob Damage'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Flexibility {['Stiff','Over-flexible','Snaking'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Boot (CB) {['Torn','Loose','Trim Ring'].map(d => <Cbx key={d} label={d} />)}</PfRow>

          {/* 3H */}
          <SubBar>3H. Distal Tip &amp; Adhesive Surfaces</SubBar>
          <PfRow>C-Cover {['Cracked','Loose','RTV Missing','Poor Condition'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>BR Adhesive {['Flaking','Missing','Aged','Oversized'].map(d => <Cbx key={d} label={d} />)} → Measured Size: <span className="difd-ul60" /> &nbsp; Max: 12.82mm</PfRow>
          <PfRow>Bending Rubber {['Aging','Loose','Cut/Hole'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Bending Section Mesh {['Poor Condition'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Lenses {['Cracked','Chipped','Dirty','Glue Missing'].map(d => <Cbx key={d} label={d} />)} Missing Lens — Specify: <span className="difd-ul80" /></PfRow>

          {/* 3I */}
          <SubBar>3I. Universal Cord &amp; Boots</SubBar>
          <PfRow>Cord {['Dented','Buckled','Cut','Peeling'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Boot (CB) {['Torn','Loose','Cracked'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Boot (LGC) {['Torn','Loose','Cracked'].map(d => <Cbx key={d} label={d} />)}</PfRow>

          {/* Section 4 */}
          <SectionLabel>4. Detailed Inspection</SectionLabel>
          <PfRow><strong>Borescope Used</strong></PfRow>
          <PfRow>Internal Channels {['Good','Freckling','Debris','Scratched/Deformed','Other'].map(d => <Cbx key={d} label={d} />)}</PfRow>
          <PfRow>Residue {['Biological','Chemical','Staining','Other'].map(d => <Cbx key={d} label={d} />)} → Location: <span className="difd-ul80" /></PfRow>
          <PfRow>Photos Taken <Radio label="Yes" /> <Radio label="No" /></PfRow>

          {/* Scope Condition */}
          <div className="difd-scope-cond">
            <span className="difd-fl difd-scope-fl">Scope Condition (select one):</span>
            {['Not Patient Safe','Functional Issue','Cosmetic Only','No Issues Found'].map(c => (
              <span key={c} className="difd-scope-opt"><Radio />{c}</span>
            ))}
          </div>

          {/* Section 5 */}
          <SectionLabel>5. Repair Assessment</SectionLabel>
          <div className="difd-assess-box">Tech notes...</div>

          <FormFooter formRef="OM05-1" />
        </div>

      </div>
    </div>
  );
};
