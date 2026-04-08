import './print.css';
import type { RepairFull, RepairInspections, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  inspections?: RepairInspections | null;
  lineItems?: RepairLineItem[];
  onClose: () => void;
}

// ── Shared compact styles ──
const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';

const pageStyle: React.CSSProperties = { width: '8.5in', minHeight: '11in', background: '#fff', padding: '0.4in', fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' };

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

const tdRow: React.CSSProperties = { padding: '1px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' };
const pfBtnBase: React.CSSProperties = { display: 'inline-block', width: 20, height: 12, borderRadius: 2, textAlign: 'center', lineHeight: '12px', fontSize: 7, fontWeight: 700 };
const cbChecked: React.CSSProperties = { display: 'inline-block', width: 9, height: 9, background: 'var(--primary)', borderRadius: 1, color: '#fff', textAlign: 'center', lineHeight: '9px', fontSize: 7, fontWeight: 700 };

function PF({ value }: { value?: string }) {
  const v = (value ?? '').toUpperCase().trim();
  if (v === 'P') return <span style={{ ...pfBtnBase, background: 'var(--success)', color: '#fff' }}>P</span>;
  if (v === 'F') return <span style={{ ...pfBtnBase, background: 'var(--danger)', color: '#fff' }}>F</span>;
  return <span style={{ ...pfBtnBase, background: '#f3f4f6', color: '#aaa' }}>—</span>;
}

// ── Rigid P/F/N/A row ──
const PF_ROW = ({ label }: { label: string }) => (
  <tr>
    <td style={tdRow}>{label}</td>
    {['P','F','N/A'].map(v => (
      <td key={v} style={{ ...tdRow, textAlign: 'center', width: 44 }}>
        <span style={{ display: 'inline-block', width: v === 'N/A' ? 28 : 20, height: 14, border: `1px solid ${v==='P' ? 'var(--success)' : v==='F' ? 'var(--danger)' : '#aaa'}`, borderRadius: 2, textAlign: 'center', lineHeight: '14px', fontSize: 7.5, fontWeight: 700, color: v==='P' ? 'var(--success)' : v==='F' ? 'var(--danger)' : '#888' }}>{v}</span>
      </td>
    ))}
  </tr>
);

// ── Checklist item ──
const Ci = ({ label }: { label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, padding: '2px 0', borderBottom: '1px solid #f5f5f5' }}>
    <span style={{ display: 'inline-block', width: 10, height: 10, border: '1px solid #bbb', borderRadius: 1, flexShrink: 0 }} />
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
    <div className="print-form" style={{ ...pageStyle, boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: g }}>
        <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Final Inspection Report</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>Rigid Endoscope</div>
          <div style={{ fontSize: 8, color: '#aaa' }}>OM10-1</div>
        </div>
      </div>

      {/* Scope Information */}
      <div style={sb}>Scope Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '3px 8px', padding: '3px 0', marginBottom: g }}>
        <div style={{ gridColumn: 'span 2' }}><span style={fl}>Client / Facility</span><div style={fv}>{repair.client ?? em}</div></div>
        <div><span style={fl}>Date</span><div style={fv}>{repair.dateOut ?? today}</div></div>
        <div><span style={fl}>Work Order #</span><div style={fv}>{repair.wo ?? em}</div></div>
        <div><span style={fl}>Serial #</span><div style={fv}>{repair.serial ?? em}</div></div>
        <div><span style={fl}>Scope Model</span><div style={fv}>{repair.scopeModel ?? repair.scopeType ?? em}</div></div>
      </div>

      {/* Functional Test Strip */}
      <div style={sb}>Functional Test Strip</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: g }}>
        <thead>
          <tr>
            <th style={{ ...tdRow, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'left' }}>Test Item</th>
            {['Pass','Fail','N/A'].map(h => (
              <th key={h} style={{ ...tdRow, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'center', width: 44 }}>{h}</th>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px', marginBottom: g }}>
        <div>
          <div style={sb}>Repairs Performed</div>
          <div style={{ marginTop: 3 }}>
            {RIGID_REPAIRS.map((item, i) => <Ci key={i} label={item} />)}
          </div>
        </div>
        <div>
          <div style={sb}>Approved Items Returned</div>
          <div style={{ marginTop: 3 }}>
            {RIGID_RETURNED.map((item, i) => <Ci key={i} label={item} />)}
          </div>
        </div>
      </div>

      {/* Condition / Result */}
      <div style={{ display: 'flex', border: '2px solid var(--primary)', borderRadius: 3, overflow: 'hidden', marginBottom: g }}>
        <div style={{ flex: 1, padding: '5px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderRight: '2px solid var(--primary)' }}>
          <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em' }}>Condition</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={makeRadio(false)} />USABLE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={makeRadio(false)} />UNUSABLE</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '5px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em' }}>Final Result</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={makeRadio(false)} />PASSED</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={makeRadio(false)} />FAILED</div>
          </div>
        </div>
      </div>

      {/* Signature Block */}
      <div style={{ display: 'flex', gap: 12, marginBottom: g }}>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22, fontSize: 9, padding: '6px 2px 1px' }}>{repair.tech ?? ''}</div>
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Repair Technician / Signature</div>
        </div>
        <div style={{ minWidth: 90 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22, fontSize: 9, padding: '6px 2px 1px' }}>{repair.inspector ?? ''}</div>
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Final Inspector / Signature</div>
        </div>
        <div style={{ minWidth: 90 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
    <div className="print-form" style={{ ...pageStyle, boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: g }}>
        <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Final Inspection Report</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>Camera System</div>
          <div style={{ fontSize: 8, color: '#aaa' }}>OM10-3</div>
        </div>
      </div>

      {/* Equipment Information */}
      <div style={sb}>Equipment Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '3px 8px', padding: '3px 0', marginBottom: g }}>
        <div style={{ gridColumn: 'span 2' }}><span style={fl}>Client / Facility</span><div style={fv}>{repair.client ?? em}</div></div>
        <div><span style={fl}>Date</span><div style={fv}>{repair.dateOut ?? today}</div></div>
        <div><span style={fl}>Work Order #</span><div style={fv}>{repair.wo ?? em}</div></div>
        <div><span style={fl}>Serial #</span><div style={fv}>{repair.serial ?? em}</div></div>
        <div><span style={fl}>Camera Model</span><div style={fv}>{repair.scopeModel ?? repair.scopeType ?? em}</div></div>
      </div>

      {/* Functional Tests */}
      <div style={sb}>Functional Tests</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: g }}>
        <thead>
          <tr>
            <th style={{ ...tdRow, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'left' }}>Test Item</th>
            {['Pass','Fail','N/A'].map(h => (
              <th key={h} style={{ ...tdRow, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'center', width: 44 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAMERA_FUNC_TESTS.map((row, i) =>
            row.section ? (
              <tr key={i}>
                <td colSpan={4} style={{ background: 'var(--primary-light)', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.04em', padding: '3px 4px' }}>{row.section}</td>
              </tr>
            ) : (
              <PF_ROW key={i} label={row.label!} />
            )
          )}
        </tbody>
      </table>

      {/* Two-column: Scope Includes + Repairs Performed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px', marginBottom: g }}>
        <div>
          <div style={sb}>Scope Includes</div>
          <div style={{ marginTop: 3 }}>
            {CAMERA_SCOPE_INCLUDES.map((item, i) => <Ci key={i} label={item} />)}
          </div>
        </div>
        <div>
          <div style={sb}>Repairs Performed</div>
          <div style={{ marginTop: 3 }}>
            {CAMERA_REPAIRS.map((item, i) => <Ci key={i} label={item} />)}
          </div>
        </div>
      </div>

      {/* Result Banner */}
      <div style={{ background: 'var(--primary)', color: '#fff', textAlign: 'center', padding: '5px 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', margin: '8px 0' }}>
        Scope Has Been Repaired and Returned to Service-Ready Condition
      </div>

      {/* Condition / Result */}
      <div style={{ display: 'flex', border: '2px solid var(--primary)', borderRadius: 3, overflow: 'hidden', marginBottom: g }}>
        <div style={{ flex: 1, padding: '5px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderRight: '2px solid var(--primary)' }}>
          <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em' }}>Condition</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={makeRadio(false)} />USABLE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={makeRadio(false)} />UNUSABLE</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '5px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em' }}>Final Result</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={makeRadio(false)} />PASSED</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={makeRadio(false)} />FAILED</div>
          </div>
        </div>
      </div>

      {/* Signature Block */}
      <div style={{ display: 'flex', gap: 12, marginBottom: g }}>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22, fontSize: 9, padding: '6px 2px 1px' }}>{repair.tech ?? ''}</div>
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Repair Technician / Signature</div>
        </div>
        <div style={{ minWidth: 90 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22, fontSize: 9, padding: '6px 2px 1px' }}>{repair.inspector ?? ''}</div>
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Final Inspector / Signature</div>
        </div>
        <div style={{ minWidth: 90 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
  const td: React.CSSProperties = { padding: '1px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' };

  const radio = (active: boolean): React.CSSProperties => ({
    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
    ...(active ? { background: 'var(--primary)', border: '1.5px solid var(--primary)' } : { border: '1.5px solid #ccc' }),
  });

  const g = 6;

  return (
    <div className="print-form" style={{ width: '8.5in', height: '11in', background: '#fff', padding: '0.4in', fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222', boxSizing: 'border-box', boxShadow: '0 4px 24px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: g }}>
        <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Final Inspection Report</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>Flexible Endoscope</div>
          <div style={{ fontSize: 8, color: '#aaa' }}>OM10-2</div>
        </div>
      </div>

      {/* Scope Information */}
      <div style={sb}>Scope Information</div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3px 8px', padding: '3px 0', marginBottom: g }}>
        <div><span style={fl}>Client / Facility</span><div style={fv}>{repair.client ?? em}</div></div>
        <div><span style={fl}>Work Order #</span><div style={fv}>{repair.wo ?? em}</div></div>
        <div><span style={fl}>Serial #</span><div style={fv}>{repair.serial ?? em}</div></div>
        <div><span style={fl}>Date</span><div style={fv}>{repair.dateOut ?? today}</div></div>
        <div><span style={fl}>Scope Model</span><div style={fv}>{repair.scopeModel ?? repair.scopeType ?? em}</div></div>
        <div><span style={fl}>Purchase Order</span><div style={fv}>{repair.purchaseOrder ?? em}</div></div>
        <div><span style={fl}>Repair Reason</span><div style={fv}>{repair.repairReason ?? em}</div></div>
        <div><span style={fl}>Repair Category</span><div style={fv}>{repair.repairReason ?? em}</div></div>
        <div style={{ gridColumn: 'span 4' }}><span style={fl}>Ship To</span><div style={fv}>{[repair.shipName, repair.shipAddr1, [repair.shipCity, repair.shipState, repair.shipZip].filter(Boolean).join(', ')].filter(Boolean).join(' — ') || em}</div></div>
      </div>

      {/* Patient Safety + Scope Includes row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 8px', background: '#f7f9fc', border: '1px solid #dde3ee', borderRadius: 3, marginBottom: g }}>
        <span style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Patient Safety</span>
        <span style={{ padding: '2px 10px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}>{repair.psLevel || 'N/A'}</span>
        <span style={{ fontSize: 11, color: '#5A6F8A' }}>&rarr;</span>
        <span style={{ padding: '2px 10px', borderRadius: 3, fontSize: 9, fontWeight: 700, background: scopeUsable === 'Y' ? '#f0fdf4' : '#fef2f2', color: scopeUsable === 'Y' ? '#166534' : '#991b1b', border: scopeUsable === 'Y' ? '1px solid #bbf7d0' : '1px solid #fca5a5' }}>{scopeUsable === 'Y' ? 'USABLE' : scopeUsable === 'N' ? 'UNUSABLE' : 'Pending'}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Includes</span>
          {included.length > 0 ? included.map(a => (
            <span key={a.field} style={{ fontSize: 8, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <span style={cbChecked}>✓</span>{a.label}
            </span>
          )) : <span style={{ fontSize: 8, color: '#888' }}>None</span>}
        </div>
      </div>

      {/* Inspection Checklist */}
      <div style={sb}>Inspection Checklist</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px', marginBottom: g }}>
        {[INSPECTION_CATEGORIES.slice(0, catMid), INSPECTION_CATEGORIES.slice(catMid)].map((col, ci) => (
          <div key={ci}>
            {col.map(cat => (
              <div key={cat.name}>
                <div style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', padding: '3px 4px 1px', borderBottom: '1px solid var(--navy)', marginTop: 3 }}>{cat.name}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {cat.items.map((t, i) => (
                      <tr key={t.field} style={{ background: i % 2 === 1 ? '#f8f9fb' : '#fff' }}>
                        <td style={td}>{t.label}</td>
                        <td style={{ ...td, textAlign: 'center', width: 30 }}><PF value={ins[t.field] as string | undefined} /></td>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={sb}>Repairs Performed</div>
        {approvedItems.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc' }}>Repair Item</th><th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', width: 50 }}>Fix</th><th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', width: 160 }}>Comments</th></tr></thead>
            <tbody>
              {approvedItems.map((li, i) => (
                <tr key={li.tranKey} style={{ background: i % 2 === 1 ? '#f8f9fb' : '#fff' }}>
                  <td style={td}>{li.description}</td>
                  <td style={td}>{li.fixType || em}</td>
                  <td style={{ ...td, fontSize: 8 }}>{li.comments || em}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ padding: '3px 0', fontSize: 8.5, color: '#888', fontStyle: 'italic' }}>No approved repair items</div>}
      </div>

      {/* Comments */}
      {repair.complaint && (
        <div style={{ marginBottom: g }}>
          <div style={sb}>Comments</div>
          <div style={{ padding: '3px 0', fontSize: 8.5, whiteSpace: 'pre-wrap' }}>{repair.complaint}</div>
        </div>
      )}

      {/* Leak Tester Data */}
      <div style={{ marginBottom: g }}>
        <div style={sb}>Leak Tester Data</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '3px 8px', padding: '3px 0' }}>
          <div><span style={fl}>Tester S/N</span><div style={fv}>{em}</div></div>
          <div><span style={fl}>Version</span><div style={fv}>{em}</div></div>
          <div><span style={fl}>Run ID</span><div style={fv}>{em}</div></div>
          <div><span style={fl}>Test Duration</span><div style={fv}>{em}</div></div>
          <div><span style={fl}>Leak Result</span><div style={fv}>{em}</div></div>
          <div><span style={fl}>Fluid Result</span><div style={fv}>{em}</div></div>
          <div><span style={fl}>Date / Time</span><div style={fv}>{em}</div></div>
        </div>
      </div>

      {/* Reprocessing Warning + QC Certification */}
      <div style={{ marginBottom: g }}>
        <div style={{ fontSize: 7.5, color: '#991b1b', fontStyle: 'italic', padding: '4px 8px', background: '#fef2f2', borderLeft: '2px solid #991b1b', borderRadius: '0 3px 3px 0', marginBottom: 4 }}>
          <b>Reprocessing Required:</b> This endoscope must be fully reprocessed per facility policies and manufacturer IFU before patient use. TSI does not perform HLD/sterilization.
        </div>
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          {finalPF === 'P' ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', letterSpacing: '.3px' }}>SCOPE HAS BEEN REPAIRED</div>
              <div style={{ fontSize: 8, color: '#222', marginTop: 2 }}>Passed final inspection and QC testing per TSI SOPs. Diagnostically <b>USABLE</b> — cleared for return to clinical service.</div>
            </>
          ) : finalPF === 'F' ? (
            <div style={{ fontSize: 9, fontWeight: 600, color: '#991b1b' }}>Scope has not passed Final Inspection.</div>
          ) : (
            <div style={{ fontSize: 9, color: '#888' }}>Pending inspection.</div>
          )}
        </div>
      </div>

      {/* Condition / Result */}
      <div style={{ display: 'flex', border: '2px solid var(--primary)', borderRadius: 3, overflow: 'hidden', marginBottom: g }}>
        <div style={{ flex: 1, padding: '5px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, borderRight: '2px solid var(--primary)' }}>
          <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em' }}>Condition</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={radio(scopeUsable === 'Y')} />USABLE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={radio(scopeUsable === 'N')} />UNUSABLE</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '5px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em' }}>Final Result</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={radio(finalPF === 'P')} />PASSED</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700 }}><div style={radio(finalPF === 'F')} />FAILED</div>
          </div>
        </div>
      </div>

      {/* Signature Block */}
      <div style={{ display: 'flex', gap: 12, marginBottom: g }}>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22, fontSize: 9, padding: '6px 2px 1px' }}>{repair.tech ?? ''}</div>
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Repair Technician</div>
        </div>
        <div style={{ minWidth: 90 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22, fontSize: 9, padding: '6px 2px 1px' }}>{repair.inspector ?? ''}</div>
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Final Inspector</div>
        </div>
        <div style={{ minWidth: 90 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7, color: '#888', fontWeight: 600, marginTop: 1 }}>Date</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', textAlign: 'center' }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>Total Scope, Inc. — ISO 13485 Certified <span style={{ float: 'right', fontWeight: 400 }}>OM10-2</span></div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 6.5, color: '#aaa' }}>
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
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
    >
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
        <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
        <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
      </div>
      {type === 'Rigid'  && <RigidFinalInspection repair={repair} />}
      {type === 'Camera' && <CameraFinalInspection repair={repair} lineItems={lineItems} />}
      {type !== 'Rigid' && type !== 'Camera' && <FlexFinalInspection repair={repair} inspections={inspections} lineItems={lineItems} />}
    </div>
  );
};
