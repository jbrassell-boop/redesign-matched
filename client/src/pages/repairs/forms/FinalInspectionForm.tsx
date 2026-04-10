import React from 'react';
import './print.css';
import './FinalInspectionForm.css';
import type { RepairFull, RepairInspections, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  inspections?: RepairInspections | null;
  lineItems?: RepairLineItem[];
  onClose: () => void;
}

const em = '—';

// ── Flex endoscope inspection categories (from HTML final inspection) ──
const INSPECTION_CATEGORIES: { name: string; items: { label: string; field: keyof RepairInspections }[] }[] = [
  { name: 'LEAK & PRESSURE TESTING', items: [
    { label: 'Leak Test — Immersion', field: 'insLeakPF' },
    { label: 'Hot / Cold Leak Test', field: 'insHotColdLeakPF' },
    { label: 'Air / Water System', field: 'insAirWaterPF' },
    { label: 'Suction Channel', field: 'insSuctionPF' },
    { label: 'Forcep / Biopsy Channel', field: 'insForcepChannelPF' },
    { label: 'Aux Water Channel', field: 'insAuxWaterPF' },
  ]},
  { name: 'IMAGE & OPTICS', items: [
    { label: 'Image Clarity & Focus', field: 'insImagePF' },
    { label: 'Image Centration', field: 'insImageCentrationPF' },
    { label: 'Focal Distance', field: 'insFocalDistancePF' },
    { label: 'Light Transmission', field: 'insFiberLightTransPF' },
    { label: 'Vision / Field of View', field: 'insVisionPF' },
    { label: 'Eye Piece', field: 'insEyePiecePF' },
    { label: 'Light Fibers', field: 'insLightFibersPF' },
  ]},
  { name: 'ANGULATION & MECHANICAL', items: [
    { label: 'Angulation — All 4 Directions', field: 'insAngulationPF' },
    { label: 'Insertion Tube Integrity', field: 'insInsertionTubePF' },
    { label: 'Alcohol Wipe / External', field: 'insAlcoholWipePF' },
    { label: 'Fog Test', field: 'insFogPF' },
  ]},
];

const ACCESSORY_FIELDS: { label: string; field: keyof RepairFull }[] = [
  { label: 'ETO Cap', field: 'includesETOCap' },
  { label: 'CO₂ Cap', field: 'includesCO2Cap' },
  { label: 'Air/Water Valve', field: 'includesAirWaterValve' },
  { label: 'Suction Valve', field: 'includesSuctionValve' },
  { label: 'Waterproof Cap', field: 'includesWaterProofCap' },
  { label: 'Hood', field: 'includesHood' },
  { label: 'Light Post Adapter', field: 'includesLightPostAdapter' },
  { label: 'Box', field: 'includesBox' },
  { label: 'Case', field: 'includesCase' },
];


function PF({ value }: { value?: string }) {
  const v = (value ?? '').toUpperCase().trim();
  if (v === 'P') return <span className="fi-pf-btn" style={{ background: 'var(--success)', color: '#fff' }}>P</span>;
  if (v === 'F') return <span className="fi-pf-btn" style={{ background: 'var(--danger)', color: '#fff' }}>F</span>;
  return <span className="fi-pf-btn" style={{ background: 'var(--neutral-100)', color: '#aaa' }}>—</span>;
}

// ── Rigid P/F/N/A row ──
const PF_ROW = ({ label }: { label: string }) => (
  <tr>
    <td className="fi-td">{label}</td>
    {['P','F','N/A'].map(v => (
      <td key={v} className="fi-td--center">
        <span style={{ display: 'inline-block', width: v === 'N/A' ? 28 : 20, height: 14, border: `1px solid ${v==='P' ? 'var(--success)' : v==='F' ? 'var(--danger)' : '#aaa'}`, borderRadius: 2, textAlign: 'center', lineHeight: '14px', fontSize: 7.5, fontWeight: 700, color: v==='P' ? 'var(--success)' : v==='F' ? 'var(--danger)' : '#888' }}>{v}</span>
      </td>
    ))}
  </tr>
);

// ── Checklist item ──
const Ci = ({ label }: { label: string }) => (
  <div className="fi-ci">
    <span className="fi-ci-box" />
    {label}
  </div>
);

// ── Result footer radio helper ──
function makeRadio(active: boolean): React.CSSProperties {
  return {
    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
    ...(active ? { background: 'var(--primary)', border: '1.5px solid var(--primary)' } : { border: '1.5px solid #ccc' }),
  };
}

// ═══════════════════════════════════════════════════════════
// Rigid Final Inspection (OM10-1)
// ═══════════════════════════════════════════════════════════
const RIGID_FUNC_TESTS = [
  '1. Optical Clarity / Image Quality',
  '2. Light Transmission',
  '3. Telescope Rod Lens Integrity',
  '4. Working Channel / Sheath',
  '5. Ocular / Eyepiece Integrity',
  '6. Light Post / Connector',
  '7. Sheath / Tube Straightness',
  '8. Coupler / Camera Attachment',
  '9. Irrigation / Insufflation Ports',
  '10. Cosmetic / Exterior Condition',
];

const RIGID_REPAIRS = [
  'Objective Lens Replacement',
  'Ocular / Eyepiece Replacement',
  'Light Post Replacement',
  'Rod Lens System Replacement',
  'Sheath Replacement',
  'Tip Repair / Replacement',
  'Recoating / Barrel Refinish',
  'Prism / Deflector Replacement',
  'Camera Coupler Replacement',
  'O-Ring / Seal Replacement',
  'Full Overhaul',
  'Other: ___________________',
];

const RIGID_RETURNED = [
  'Telescope',
  'Sheath',
  'Obturator',
  'Bridge',
  'Working Element',
  'Light Cable',
  'Camera / Coupler',
  'Storage Case',
  'Other: ___________________',
  'Other: ___________________',
  'Other: ___________________',
];

function RigidFinalInspection({ repair }: { repair: RepairFull }) {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const g = 6;

  return (
    <div className="print-form fi-page">
      {/* Header */}
      <div className="fi-header" style={{ marginBottom: g }}>
        <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="fi-header-logo" />
        <div className="fi-header-right">
          <div className="fi-header-title">Final Inspection Report</div>
          <div className="fi-header-sub">Rigid Endoscope</div>
          <div className="fi-header-form">OM10-1</div>
        </div>
      </div>

      {/* Scope Information */}
      <div className="fi-sb">Scope Information</div>
      <div className="fi-grid-3col-2-1-1" style={{ marginBottom: g }}>
        <div className="fi-span2"><span className="fi-fl">Client / Facility</span><div className="fi-fv">{repair.client ?? em}</div></div>
        <div><span className="fi-fl">Date</span><div className="fi-fv">{repair.dateOut ?? today}</div></div>
        <div><span className="fi-fl">Work Order #</span><div className="fi-fv">{repair.wo ?? em}</div></div>
        <div><span className="fi-fl">Serial #</span><div className="fi-fv">{repair.serial ?? em}</div></div>
        <div><span className="fi-fl">Scope Model</span><div className="fi-fv">{repair.scopeModel ?? repair.scopeType ?? em}</div></div>
      </div>

      {/* Functional Test Strip */}
      <div className="fi-sb">Functional Test Strip</div>
      <table className="fi-table" style={{ marginBottom: g }}>
        <thead>
          <tr>
            <th className="fi-th fi-th--left">Test Item</th>
            {['Pass','Fail','N/A'].map(h => (
              <th key={h} className="fi-th fi-th--center">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RIGID_FUNC_TESTS.map((label, i) => (
            <PF_ROW key={i} label={label} />
          ))}
        </tbody>
      </table>

      {/* Two-column: Repairs Performed + Approved Items Returned */}
      <div className="fi-grid-2col" style={{ marginBottom: g }}>
        <div>
          <div className="fi-sb">Repairs Performed</div>
          <div className="fi-mt3">
            {RIGID_REPAIRS.map((item, i) => <Ci key={i} label={item} />)}
          </div>
        </div>
        <div>
          <div className="fi-sb">Approved Items Returned</div>
          <div className="fi-mt3">
            {RIGID_RETURNED.map((item, i) => <Ci key={i} label={item} />)}
          </div>
        </div>
      </div>

      {/* Condition / Result */}
      <div className="fi-result-bar" style={{ marginBottom: g }}>
        <div className="fi-result-half--border">
          <div className="fi-result-label">Condition</div>
          <div className="fi-result-options">
            <div className="fi-result-option"><div style={makeRadio(false)} />USABLE</div>
            <div className="fi-result-option"><div style={makeRadio(false)} />UNUSABLE</div>
          </div>
        </div>
        <div className="fi-result-half">
          <div className="fi-result-label">Final Result</div>
          <div className="fi-result-options">
            <div className="fi-result-option"><div style={makeRadio(false)} />PASSED</div>
            <div className="fi-result-option"><div style={makeRadio(false)} />FAILED</div>
          </div>
        </div>
      </div>

      {/* Signature Block */}
      <div className="fi-sig-row" style={{ marginBottom: g }}>
        <div className="fi-sig-flex">
          <div className="fi-sig-line--val">{repair.tech ?? ''}</div>
          <div className="fi-sig-lbl">Repair Technician / Signature</div>
        </div>
        <div className="fi-sig-fixed">
          <div className="fi-sig-line" />
          <div className="fi-sig-lbl">Date</div>
        </div>
        <div className="fi-sig-flex">
          <div className="fi-sig-line--val">{repair.inspector ?? ''}</div>
          <div className="fi-sig-lbl">Final Inspector / Signature</div>
        </div>
        <div className="fi-sig-fixed">
          <div className="fi-sig-line" />
          <div className="fi-sig-lbl">Date</div>
        </div>
      </div>

      {/* Footer */}
      <div className="fi-footer">
        <span>ISO 13485 Certified</span>
        <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM10-1</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Camera Final Inspection (OM10-3)
// ═══════════════════════════════════════════════════════════
const CAMERA_FUNC_TESTS: { section?: string; label?: string }[] = [
  { section: 'Camera Head' },
  { label: '1. Image Quality / Resolution' },
  { label: '2. White Balance Function' },
  { label: '3. Zoom / Focus Controls' },
  { label: '4. Light Sensitivity / Gain' },
  { label: '5. Electrical Isolation / Leak' },
  { label: '6. Cable / Connector Integrity' },
  { label: '7. Housing / Body Integrity' },
  { label: '8. Drape Port / Seal Integrity' },
  { label: '9. Buttons / Controls Functional' },
  { label: '10. Display Output (live test)' },
  { label: '11. Sterilization Compatibility' },
  { label: '12. Overall Cosmetic Condition' },
  { section: 'Coupler' },
  { label: '13. Coupler Optical Clarity' },
  { label: '14. Coupler Focus / Adjustment' },
  { label: '15. Coupler Attachment / Lock' },
  { label: '16. Coupler Body / Housing' },
  { label: '17. Coupler Seal Integrity' },
  { label: '18. Full System Live Test' },
];

const CAMERA_SCOPE_INCLUDES = [
  'Camera Head',
  'Coupler',
  'Camera Cable',
  'Light Cable',
  'Storage Case',
  'User Manual',
];

const CAMERA_REPAIRS = [
  'CCD / Sensor Replacement',
  'Cable Replacement',
  'Connector Replacement',
  'Coupler Replacement',
  'Housing Repair',
  'Lens Cleaning / Replacement',
  'Button / Control Repair',
  'Other: ___________________',
];

function CameraFinalInspection({ repair }: { repair: RepairFull }) {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const g = 6;

  return (
    <div className="print-form fi-page">
      {/* Header */}
      <div className="fi-header" style={{ marginBottom: g }}>
        <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="fi-header-logo" />
        <div className="fi-header-right">
          <div className="fi-header-title">Final Inspection Report</div>
          <div className="fi-header-sub">Camera System</div>
          <div className="fi-header-form">OM10-3</div>
        </div>
      </div>

      {/* Equipment Information */}
      <div className="fi-sb">Equipment Information</div>
      <div className="fi-grid-3col-2-1-1" style={{ marginBottom: g }}>
        <div className="fi-span2"><span className="fi-fl">Client / Facility</span><div className="fi-fv">{repair.client ?? em}</div></div>
        <div><span className="fi-fl">Date</span><div className="fi-fv">{repair.dateOut ?? today}</div></div>
        <div><span className="fi-fl">Work Order #</span><div className="fi-fv">{repair.wo ?? em}</div></div>
        <div><span className="fi-fl">Serial #</span><div className="fi-fv">{repair.serial ?? em}</div></div>
        <div><span className="fi-fl">Camera Model</span><div className="fi-fv">{repair.scopeModel ?? repair.scopeType ?? em}</div></div>
      </div>

      {/* Functional Tests */}
      <div className="fi-sb">Functional Tests</div>
      <table className="fi-table" style={{ marginBottom: g }}>
        <thead>
          <tr>
            <th className="fi-th fi-th--left">Test Item</th>
            {['Pass','Fail','N/A'].map(h => (
              <th key={h} className="fi-th fi-th--center">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAMERA_FUNC_TESTS.map((row, i) =>
            row.section ? (
              <tr key={i}>
                <td colSpan={4} className="fi-section-row">{row.section}</td>
              </tr>
            ) : (
              <PF_ROW key={i} label={row.label!} />
            )
          )}
        </tbody>
      </table>

      {/* Two-column: Scope Includes + Repairs Performed */}
      <div className="fi-grid-2col" style={{ marginBottom: g }}>
        <div>
          <div className="fi-sb">Scope Includes</div>
          <div className="fi-mt3">
            {CAMERA_SCOPE_INCLUDES.map((item, i) => <Ci key={i} label={item} />)}
          </div>
        </div>
        <div>
          <div className="fi-sb">Repairs Performed</div>
          <div className="fi-mt3">
            {CAMERA_REPAIRS.map((item, i) => <Ci key={i} label={item} />)}
          </div>
        </div>
      </div>

      {/* Result Banner */}
      <div className="fi-ready-banner">
        Scope Has Been Repaired and Returned to Service-Ready Condition
      </div>

      {/* Condition / Result */}
      <div className="fi-result-bar" style={{ marginBottom: g }}>
        <div className="fi-result-half--border">
          <div className="fi-result-label">Condition</div>
          <div className="fi-result-options">
            <div className="fi-result-option"><div style={makeRadio(false)} />USABLE</div>
            <div className="fi-result-option"><div style={makeRadio(false)} />UNUSABLE</div>
          </div>
        </div>
        <div className="fi-result-half">
          <div className="fi-result-label">Final Result</div>
          <div className="fi-result-options">
            <div className="fi-result-option"><div style={makeRadio(false)} />PASSED</div>
            <div className="fi-result-option"><div style={makeRadio(false)} />FAILED</div>
          </div>
        </div>
      </div>

      {/* Signature Block */}
      <div className="fi-sig-row" style={{ marginBottom: g }}>
        <div className="fi-sig-flex">
          <div className="fi-sig-line--val">{repair.tech ?? ''}</div>
          <div className="fi-sig-lbl">Repair Technician / Signature</div>
        </div>
        <div className="fi-sig-fixed">
          <div className="fi-sig-line" />
          <div className="fi-sig-lbl">Date</div>
        </div>
        <div className="fi-sig-flex">
          <div className="fi-sig-line--val">{repair.inspector ?? ''}</div>
          <div className="fi-sig-lbl">Final Inspector / Signature</div>
        </div>
        <div className="fi-sig-fixed">
          <div className="fi-sig-line" />
          <div className="fi-sig-lbl">Date</div>
        </div>
      </div>

      {/* Footer */}
      <div className="fi-footer">
        <span>ISO 13485 Certified</span>
        <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM10-3</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Flex Final Inspection (OM10-2) — original render wrapped
// ═══════════════════════════════════════════════════════════
function FlexFinalInspection({ repair, inspections, lineItems }: { repair: RepairFull; inspections?: RepairInspections | null; lineItems?: RepairLineItem[] }) {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const ins = inspections ?? {} as RepairInspections;
  const approvedItems = (lineItems ?? []).filter(li => li.approved === 'Y');
  const scopeUsable = (ins.scopeUsable ?? '').toUpperCase().trim();
  const finalPF = (ins.insFinalPF ?? '').toUpperCase().trim();
  const catMid = Math.ceil(INSPECTION_CATEGORIES.length / 2);
  const included = ACCESSORY_FIELDS.filter(a => !!(repair[a.field]));

  const radio = (active: boolean): React.CSSProperties => ({
    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
    ...(active ? { background: 'var(--primary)', border: '1.5px solid var(--primary)' } : { border: '1.5px solid #ccc' }),
  });

  const g = 6;

  return (
    <div className="print-form fi-page--fixed">

      {/* Header */}
      <div className="fi-header" style={{ marginBottom: g }}>
        <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="fi-header-logo" />
        <div className="fi-header-right">
          <div className="fi-header-title">Final Inspection Report</div>
          <div className="fi-header-sub">Flexible Endoscope</div>
          <div className="fi-header-form">OM10-2</div>
        </div>
      </div>

      {/* Scope Information */}
      <div className="fi-sb">Scope Information</div>
      <div className="fi-grid-4col" style={{ marginBottom: g }}>
        <div><span className="fi-fl">Client / Facility</span><div className="fi-fv">{repair.client ?? em}</div></div>
        <div><span className="fi-fl">Work Order #</span><div className="fi-fv">{repair.wo ?? em}</div></div>
        <div><span className="fi-fl">Serial #</span><div className="fi-fv">{repair.serial ?? em}</div></div>
        <div><span className="fi-fl">Date</span><div className="fi-fv">{repair.dateOut ?? today}</div></div>
        <div><span className="fi-fl">Scope Model</span><div className="fi-fv">{repair.scopeModel ?? repair.scopeType ?? em}</div></div>
        <div><span className="fi-fl">Purchase Order</span><div className="fi-fv">{repair.purchaseOrder ?? em}</div></div>
        <div><span className="fi-fl">Repair Reason</span><div className="fi-fv">{repair.repairReason ?? em}</div></div>
        <div><span className="fi-fl">Repair Category</span><div className="fi-fv">{repair.repairReason ?? em}</div></div>
        <div className="fi-span4"><span className="fi-fl">Ship To</span><div className="fi-fv">{[repair.shipName, repair.shipAddr1, [repair.shipCity, repair.shipState, repair.shipZip].filter(Boolean).join(', ')].filter(Boolean).join(' — ') || em}</div></div>
      </div>

      {/* Patient Safety + Scope Includes row */}
      <div className="fi-safety-bar" style={{ marginBottom: g }}>
        <span className="fi-safety-label">Patient Safety</span>
        <span className="fi-safety-level">{repair.psLevel || 'N/A'}</span>
        <span className="fi-safety-arrow">&rarr;</span>
        <span style={{ padding: '2px 10px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: scopeUsable === 'Y' ? 'var(--print-success-bg)' : 'var(--danger-light)', color: scopeUsable === 'Y' ? 'var(--print-success-text)' : 'var(--print-danger-text)', border: scopeUsable === 'Y' ? '1px solid var(--print-success-border)' : '1px solid var(--print-danger-border)' }}>{scopeUsable === 'Y' ? 'USABLE' : scopeUsable === 'N' ? 'UNUSABLE' : 'Pending'}</span>
        <div className="fi-includes-wrap">
          <span className="fi-safety-label">Includes</span>
          {included.length > 0 ? included.map(a => (
            <span key={a.field} className="fi-inc-item">
              <span className="fi-cb-checked">✓</span>{a.label}
            </span>
          )) : <span className="fi-inc-none">None</span>}
        </div>
      </div>

      {/* Inspection Checklist */}
      <div className="fi-sb">Inspection Checklist</div>
      <div className="fi-grid-2col-insp" style={{ marginBottom: g }}>
        {[INSPECTION_CATEGORIES.slice(0, catMid), INSPECTION_CATEGORIES.slice(catMid)].map((col, ci) => (
          <div key={ci}>
            {col.map(cat => (
              <div key={cat.name}>
                <div className="fi-insp-cat">{cat.name}</div>
                <table className="fi-table">
                  <tbody>
                    {cat.items.map((t, i) => (
                      <tr key={t.field} style={{ background: i % 2 === 1 ? 'var(--print-row-alt)' : 'var(--card)' }}>
                        <td className="fi-td">{t.label}</td>
                        <td className="fi-td--w30c"><PF value={ins[t.field] as string | undefined} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Repairs Performed */}
      <div className="fi-repairs-wrap">
        <div className="fi-sb">Repairs Performed</div>
        {approvedItems.length > 0 ? (
          <table className="fi-table">
            <thead><tr><th className="fi-th fi-th--left">Repair Item</th><th className="fi-td--w50c fi-th fi-th--left">Fix</th><th className="fi-td--w160 fi-th fi-th--left">Comments</th></tr></thead>
            <tbody>
              {approvedItems.map((li, i) => (
                <tr key={li.tranKey} style={{ background: i % 2 === 1 ? 'var(--print-row-alt)' : 'var(--card)' }}>
                  <td className="fi-td">{li.description}</td>
                  <td className="fi-td">{li.fixType || em}</td>
                  <td className="fi-td--small">{li.comments || em}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="fi-no-repairs">No approved repair items</div>}
      </div>

      {/* Comments */}
      {repair.complaint && (
        <div style={{ marginBottom: g }}>
          <div className="fi-sb">Comments</div>
          <div className="fi-complaint">{repair.complaint}</div>
        </div>
      )}

      {/* Leak Tester Data */}
      <div style={{ marginBottom: g }}>
        <div className="fi-sb">Leak Tester Data</div>
        <div className="fi-grid-4col-data">
          <div><span className="fi-fl">Tester S/N</span><div className="fi-fv">{em}</div></div>
          <div><span className="fi-fl">Version</span><div className="fi-fv">{em}</div></div>
          <div><span className="fi-fl">Run ID</span><div className="fi-fv">{em}</div></div>
          <div><span className="fi-fl">Test Duration</span><div className="fi-fv">{em}</div></div>
          <div><span className="fi-fl">Leak Result</span><div className="fi-fv">{em}</div></div>
          <div><span className="fi-fl">Fluid Result</span><div className="fi-fv">{em}</div></div>
          <div><span className="fi-fl">Date / Time</span><div className="fi-fv">{em}</div></div>
        </div>
      </div>

      {/* Reprocessing Warning + QC Certification */}
      <div style={{ marginBottom: g }}>
        <div className="fi-reprocess">
          <b>Reprocessing Required:</b> This endoscope must be fully reprocessed per facility policies and manufacturer IFU before patient use. TSI does not perform HLD/sterilization.
        </div>
        <div className="fi-cert-center">
          {finalPF === 'P' ? (
            <>
              <div className="fi-cert-title">SCOPE HAS BEEN REPAIRED</div>
              <div className="fi-cert-sub">Passed final inspection and QC testing per TSI SOPs. Diagnostically <b>USABLE</b> — cleared for return to clinical service.</div>
            </>
          ) : finalPF === 'F' ? (
            <div className="fi-cert-fail">Scope has not passed Final Inspection.</div>
          ) : (
            <div className="fi-cert-pending">Pending inspection.</div>
          )}
        </div>
      </div>

      {/* Condition / Result */}
      <div className="fi-result-bar" style={{ marginBottom: g }}>
        <div className="fi-result-half--border">
          <div className="fi-result-label">Condition</div>
          <div className="fi-result-options">
            <div className="fi-result-option"><div style={radio(scopeUsable === 'Y')} />USABLE</div>
            <div className="fi-result-option"><div style={radio(scopeUsable === 'N')} />UNUSABLE</div>
          </div>
        </div>
        <div className="fi-result-half">
          <div className="fi-result-label">Final Result</div>
          <div className="fi-result-options">
            <div className="fi-result-option"><div style={radio(finalPF === 'P')} />PASSED</div>
            <div className="fi-result-option"><div style={radio(finalPF === 'F')} />FAILED</div>
          </div>
        </div>
      </div>

      {/* Signature Block */}
      <div className="fi-sig-row" style={{ marginBottom: g }}>
        <div className="fi-sig-flex">
          <div className="fi-sig-line--val">{repair.tech ?? ''}</div>
          <div className="fi-sig-lbl">Repair Technician</div>
        </div>
        <div className="fi-sig-fixed">
          <div className="fi-sig-line" />
          <div className="fi-sig-lbl">Date</div>
        </div>
        <div className="fi-sig-flex">
          <div className="fi-sig-line--val">{repair.inspector ?? ''}</div>
          <div className="fi-sig-lbl">Final Inspector</div>
        </div>
        <div className="fi-sig-fixed">
          <div className="fi-sig-line" />
          <div className="fi-sig-lbl">Date</div>
        </div>
      </div>

      {/* Footer */}
      <div className="fi-footer-block">
        <div className="fi-footer-name">Total Scope, Inc. — ISO 13485 Certified <span className="fi-footer-fr">OM10-2</span></div>
        <div className="fi-footer-locs">
          <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
          <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
          <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Exported component — dispatches by scope type
// ═══════════════════════════════════════════════════════════
export const FinalInspectionForm = ({ repair, inspections, lineItems, onClose }: Props) => {
  const type = repair.scopeType ?? '';
  return (
    <div className="fi-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="no-print fi-action-bar">
        <button onClick={() => window.print()} className="fi-btn-print">Print</button>
        <button onClick={onClose} className="fi-btn-close">Close</button>
      </div>
      {type === 'Rigid'  && <RigidFinalInspection repair={repair} />}
      {type === 'Camera' && <CameraFinalInspection repair={repair} />}
      {type !== 'Rigid' && type !== 'Camera' && <FlexFinalInspection repair={repair} inspections={inspections} lineItems={lineItems} />}
    </div>
  );
};
