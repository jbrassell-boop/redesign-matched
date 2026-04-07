import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

// Shared inline styles matching OM07-3 exactly
const s = {
  page: {
    width: '8.5in',
    minHeight: '11in',
    background: 'var(--card)',
    padding: '0.5in',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    fontFamily: "'Inter', Arial, sans-serif",
    fontSize: 11,
    color: 'var(--print-text)',
    boxSizing: 'border-box' as const,
  },
  formHeader: {
    display: 'flex',
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 6,
  },
  formTitle: { fontSize: 15, fontWeight: 800, color: 'var(--navy)' },
  formSubtitle: { fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 },
  formNumber: { fontSize: 10, color: 'var(--print-light)', marginTop: 2 },
  sectionBar: {
    background: 'var(--primary)',
    color: 'var(--card)',
    fontSize: 9,
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    padding: '4px 10px',
  },
  fl: {
    fontSize: 8.5,
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    color: 'var(--print-muted)',
    letterSpacing: '0.04em',
  },
  fv: {
    borderBottom: '1px solid var(--print-check-border)',
    minHeight: 17,
    fontSize: 11,
    padding: '1px 2px',
  },
  cbBox: {
    width: 12,
    height: 12,
    border: '1px solid var(--print-check-border)',
    borderRadius: 2,
    display: 'inline-block' as const,
    flexShrink: 0,
    verticalAlign: 'middle' as const,
  },
  costField: {
    borderBottom: '1px solid var(--print-placeholder)',
    minWidth: 60,
    display: 'inline-block' as const,
    height: 14,
    verticalAlign: 'middle' as const,
  },
  sigMini: {
    borderBottom: '1px solid var(--print-placeholder)',
    minWidth: 100,
    display: 'inline-block' as const,
    height: 14,
    verticalAlign: 'middle' as const,
  },
  textField: {
    border: '1px solid var(--print-border)',
    borderRadius: 3,
    minHeight: 28,
    padding: '3px 6px',
    fontSize: 10.5,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  formFooter: {
    marginTop: 'auto' as const,
    paddingTop: 8,
    borderTop: '1px solid var(--print-border)',
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    fontSize: 8,
    color: 'var(--print-footer)',
  },
};

const REPAIR_ITEMS = [
  'Pressure Test / Leak Test',
  'Angulation Repair (U/D/R/L)',
  'Bending Rubber Replacement',
  'Distal Tip Repair / Replacement',
  'Insertion Tube Repair / Replacement',
  'Universal Cord Repair / Replacement',
  'Light Guide Connector Repair',
  'Control Body Repair',
  'A/W Channel Repair',
  'Suction / Forcep Channel Repair',
  'Image Bundle Repair',
  'Light Bundle Repair',
  'Elevator / Forcep Raiser Repair',
  'IT Tensioner Adjustment',
  'Eyepiece Repair / Replacement',
  'Video Component Repair',
  'Control Knob / Switch Repair',
  'Other: _________________________',
];

// P/F inspection checklist items for page 3 (24-point)
const PF_CATEGORIES = [
  {
    cat: 'Leak & Pressure',
    items: ['1. Pressure Test (pass)'],
  },
  {
    cat: 'Water & Channels',
    items: [
      '2. Auxiliary Water Function',
      '3. A/W Flow — Air',
      '4. A/W Flow — Water',
      '5. Forcep Channel',
      '6. Suction Channel',
      '7. Elevator / Forcep Raiser',
    ],
  },
  {
    cat: 'Control Body & Switches',
    items: [
      '8. Control Body Condition',
      '9. Control Switches Function',
    ],
  },
  {
    cat: 'Angulation',
    items: [
      '10. Angulation — Up (factory: 180°)',
      '11. Angulation — Down (factory: 180°)',
      '12. Angulation — Right (factory: 160°)',
      '13. Angulation — Left (factory: 160°)',
      '14. Angulation Tightness',
      '15. Angulation Orientation',
      '16. Angulation Knobs',
    ],
  },
  {
    cat: 'Insertion Tube, Cord & Connector',
    items: [
      '17. IT Tensioner',
      '18. Insertion Tube Condition',
      '19. Universal Cord Condition',
      '20. Light Guide Connector',
      '21. Bending Rubber (max epoxy 13.64)',
    ],
  },
  {
    cat: 'Optics & Image',
    items: [
      '22. Distal Tip Condition',
      '23. Eyepiece Condition',
      '24. Light Bundle Transmission',
    ],
  },
  {
    cat: 'Video Image',
    items: [
      '25. Video Image Quality',
      '26. Video Features / Functions',
      '27. Image Bundle — Broken Fibers',
      '28. Image Bundle — Half Tones',
    ],
  },
];

const ACCESSORIES = [
  'Scope Only',
  'Light Cable',
  'Soak Cap',
  'Elevator Cap',
  'Suction Valve',
  'A/W Valve',
  'Biopsy Cap',
  'Storage Case',
  'Other: ___________',
];

const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const repairTableTh: React.CSSProperties = {
  background: 'var(--primary)',
  color: 'var(--card)',
  fontSize: 8,
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '4px 8px',
  textAlign: 'left',
  letterSpacing: '0.03em',
  borderRight: '1px solid rgba(255,255,255,0.2)',
};

const repairTableTd: React.CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid #e8e8e8',
  verticalAlign: 'middle',
  borderRight: '1px solid #eee',
  fontSize: 10,
};

const pfTableTh: React.CSSProperties = {
  background: 'var(--primary)',
  color: 'var(--card)',
  fontSize: 8,
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '3px 8px',
  textAlign: 'left',
  letterSpacing: '0.03em',
  borderRight: '1px solid rgba(255,255,255,0.2)',
};

const pfTableTd: React.CSSProperties = {
  padding: '3px 8px',
  borderBottom: '1px solid #e8e8e8',
  verticalAlign: 'middle',
  borderRight: '1px solid #eee',
  fontSize: 10,
};

const pfBtn = (type: 'p' | 'f' | 'na') => ({
  display: 'inline-block' as const,
  width: 24,
  height: 15,
  border: type === 'p' ? '1px solid var(--success)' : type === 'f' ? '1px solid var(--danger)' : '1px solid #aaa',
  borderRadius: 2,
  textAlign: 'center' as const,
  lineHeight: '15px',
  fontSize: 8,
  fontWeight: 700 as const,
  margin: '0 1px',
  color: type === 'p' ? 'var(--success)' : type === 'f' ? 'var(--danger)' : 'var(--print-light)',
});

const LogoBlock = () => (
  <img src="/logo-color.png" alt="Total Scope Inc." loading="lazy" style={{ height: 44 }} />
);

const FormFooter = ({ page }: { page: string }) => (
  <div style={s.formFooter}>
    <span>ISO 13485 Certified</span>
    <span>Total Scope Inc.&nbsp;|&nbsp;17 Creek Pkwy, Upper Chichester PA 19061&nbsp;|&nbsp;(610) 485-3838</span>
    <span>{page}</span>
  </div>
);

export const DiFlexibleForm = ({ repair, onClose }: Props) => {
  const woNum = repair.wo ?? '';
  const serialNum = repair.serial ?? '';
  const clientName = repair.client ?? '';
  const model = repair.scopeModel ?? repair.scopeType ?? '';
  const complaint = repair.complaint ?? '';

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
    >
      {/* Action bar */}
      <div className="no-print" style={{
        position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200,
      }}>
        <button
          onClick={() => window.print()}
          style={{
            height: 32, padding: '0 16px', border: 'none', borderRadius: 5,
            background: 'var(--primary)', color: 'var(--card)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Print</button>
        <button
          onClick={onClose}
          style={{
            height: 32, padding: '0 14px', border: '1px solid var(--print-border)', borderRadius: 5,
            background: 'var(--card)', color: 'var(--print-muted)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Close</button>
      </div>

      <div className="print-form flex-col" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ══════════════════════════════════════════════════════
            PAGE 1 — Items Found / Approved + Comments
        ══════════════════════════════════════════════════════ */}
        <div className="print-page" style={s.page}>
          {/* Header */}
          <div style={s.formHeader}>
            <LogoBlock />
            <div style={{ textAlign: 'right' }}>
              <div style={s.formTitle}>Blank Inspection Report</div>
              <div style={s.formSubtitle}>Flexible Endoscope</div>
              <div style={s.formNumber}>OM07-3 &nbsp;|&nbsp; Page 1 of 3</div>
            </div>
          </div>

          {/* Scope Information */}
          <div style={s.sectionBar}>Scope Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', padding: '6px 0 2px' }}>
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Client / Facility</span>
              <div style={s.fv}>{clientName}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Date</span>
              <div style={s.fv}>{today}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Work Order #</span>
              <div style={s.fv}>{woNum}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Serial #</span>
              <div style={s.fv}>{serialNum}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: 'span 2' }}>
              <span style={s.fl}>Scope Model</span>
              <div style={s.fv}>{model}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Rack #</span>
              <div style={s.fv}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: 'span 2' }}>
              <span style={s.fl}>Complaint</span>
              <div style={{ ...s.fv, minHeight: 24 }}>{complaint}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Cust. Expected Delivery</span>
              <div style={s.fv}></div>
            </div>
          </div>

          {/* Items Found to be in Need of Repair */}
          <div style={s.sectionBar}>Items Found to be in Need of Repair</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, fontSize: 10 }}>
            <thead>
              <tr>
                <th style={{ ...repairTableTh, width: 22 }}></th>
                <th style={repairTableTh}>Item</th>
                <th style={{ ...repairTableTh, textAlign: 'center', width: 80 }}>Est. Cost</th>
                <th style={{ ...repairTableTh, textAlign: 'center', width: 60 }}>Approved</th>
              </tr>
            </thead>
            <tbody>
              {REPAIR_ITEMS.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? 'var(--bg)' : 'var(--card)' }}>
                  <td style={{ ...repairTableTd, borderRight: '1px solid #eee' }}><span style={s.cbBox}></span></td>
                  <td style={repairTableTd}>{item}</td>
                  <td style={{ ...repairTableTd, textAlign: 'center' }}><span style={s.costField}></span></td>
                  <td style={{ ...repairTableTd, textAlign: 'center', borderRight: 'none' }}><span style={s.cbBox}></span></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
              <span style={s.fl}>Subtotal Estimate</span>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minWidth: 100, height: 17 }}></div>
            </div>
          </div>

          {/* Comments */}
          <div style={s.sectionBar}>Comments / Additional Notes</div>
          <div style={{ ...s.textField, minHeight: 36 }}></div>

          {/* Signature block */}
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 26 }}></div>
              <div style={{ fontSize: 8.5, color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 }}>Technician / Estimator</div>
            </div>
            <div style={{ flex: 1, maxWidth: 130, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 26 }}></div>
              <div style={{ fontSize: 8.5, color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 }}>Date</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 26 }}></div>
              <div style={{ fontSize: 8.5, color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 }}>Customer Authorization</div>
            </div>
            <div style={{ flex: 1, maxWidth: 130, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 26 }}></div>
              <div style={{ fontSize: 8.5, color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 }}>Date</div>
            </div>
          </div>

          <FormFooter page="OM07-3 | Page 1" />
        </div>

        {/* ══════════════════════════════════════════════════════
            PAGE 2 — Items Approved and Repaired
        ══════════════════════════════════════════════════════ */}
        <div className="print-page" style={s.page}>
          {/* Header */}
          <div style={s.formHeader}>
            <LogoBlock />
            <div style={{ textAlign: 'right' }}>
              <div style={s.formTitle}>Blank Inspection Report</div>
              <div style={s.formSubtitle}>Flexible Endoscope — Items Approved &amp; Repaired</div>
              <div style={s.formNumber}>OM07-3 &nbsp;|&nbsp; Page 2 of 3</div>
            </div>
          </div>

          {/* Mini header fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', padding: '4px 0 6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Work Order #</span>
              <div style={s.fv}>{woNum}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Serial #</span>
              <div style={s.fv}>{serialNum}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Date</span>
              <div style={s.fv}>{today}</div>
            </div>
          </div>

          {/* Items Approved and Repaired */}
          <div style={s.sectionBar}>Items Approved and Repaired</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, fontSize: 10 }}>
            <thead>
              <tr>
                <th style={{ ...repairTableTh, width: 22 }}></th>
                <th style={repairTableTh}>Item Repaired</th>
                <th style={{ ...repairTableTh, textAlign: 'center', width: 80 }}>Actual Cost</th>
                <th style={repairTableTh}>Repaired By (Initials)</th>
              </tr>
            </thead>
            <tbody>
              {REPAIR_ITEMS.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? 'var(--bg)' : 'var(--card)' }}>
                  <td style={{ ...repairTableTd, borderRight: '1px solid #eee' }}><span style={s.cbBox}></span></td>
                  <td style={repairTableTd}>{item}</td>
                  <td style={{ ...repairTableTd, textAlign: 'center' }}><span style={s.costField}></span></td>
                  <td style={{ ...repairTableTd, borderRight: 'none' }}><span style={s.sigMini}></span></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
              <span style={s.fl}>Total Repair Cost</span>
              <div style={{ borderBottom: '2px solid var(--primary)', minWidth: 100, height: 17, fontWeight: 700 }}></div>
            </div>
          </div>

          {/* Additional Notes */}
          <div style={s.sectionBar}>Additional Repair Notes</div>
          <div style={{ ...s.textField, minHeight: 48 }}></div>

          {/* Signature */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 26 }}></div>
              <div style={{ fontSize: 8.5, color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 }}>Lead Technician / Signature</div>
            </div>
            <div style={{ flex: 1, maxWidth: 130, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 26 }}></div>
              <div style={{ fontSize: 8.5, color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 }}>Date</div>
            </div>
          </div>

          <FormFooter page="OM07-3 | Page 2" />
        </div>

        {/* ══════════════════════════════════════════════════════
            PAGE 3 — Final Inspection
        ══════════════════════════════════════════════════════ */}
        <div className="print-page" style={{ ...s.page, minHeight: 'auto' }}>
          {/* Header */}
          <div style={s.formHeader}>
            <LogoBlock />
            <div style={{ textAlign: 'right' }}>
              <div style={s.formTitle}>Blank Inspection Report</div>
              <div style={s.formSubtitle}>Flexible Endoscope — Final Inspection</div>
              <div style={s.formNumber}>OM07-3 &nbsp;|&nbsp; Page 3 of 3</div>
            </div>
          </div>

          {/* Mini header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', padding: '4px 0 6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Work Order #</span>
              <div style={s.fv}>{woNum}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Serial #</span>
              <div style={s.fv}>{serialNum}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={s.fl}>Date</span>
              <div style={s.fv}>{today}</div>
            </div>
          </div>

          {/* 24-Point Checklist */}
          <div style={s.sectionBar}>Final Inspection Checklist — 24-Point</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, fontSize: 10 }}>
            <thead>
              <tr>
                <th style={{ ...pfTableTh, width: '46%' }}>Item</th>
                <th style={{ ...pfTableTh, textAlign: 'center', width: 40 }}>Y</th>
                <th style={{ ...pfTableTh, textAlign: 'center', width: 40 }}>N</th>
                <th style={{ ...pfTableTh, textAlign: 'center', width: 40 }}>N/A</th>
                <th style={pfTableTh}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {PF_CATEGORIES.map(cat => (
                <>
                  <tr key={`cat-${cat.cat}`} style={{ background: 'var(--primary-light)' }}>
                    <td colSpan={5} style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy)', letterSpacing: '0.04em', padding: '3px 8px' }}>{cat.cat}</td>
                  </tr>
                  {cat.items.map((item, ii) => (
                    <tr key={`${cat.cat}-${ii}`} style={{ background: ii % 2 === 1 ? 'var(--bg)' : 'var(--card)' }}>
                      <td style={pfTableTd}>{item}</td>
                      <td style={{ ...pfTableTd, textAlign: 'center' }}><span style={pfBtn('p')}>Y</span></td>
                      <td style={{ ...pfTableTd, textAlign: 'center' }}><span style={pfBtn('f')}>N</span></td>
                      <td style={{ ...pfTableTd, textAlign: 'center' }}><span style={pfBtn('na')}>N/A</span></td>
                      <td style={{ ...pfTableTd, borderRight: 'none' }}></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>

          {/* Scope Includes */}
          <div style={s.sectionBar}>Scope Includes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px 12px', padding: '5px 0' }}>
            {ACCESSORIES.map((acc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
                <span style={s.cbBox}></span> {acc}
              </div>
            ))}
          </div>

          {/* QC Sign-Off */}
          <div style={s.sectionBar}>QC Sign-Off</div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px 10px',
            padding: '8px 10px', border: '1px solid #ddd', borderRadius: 3,
            background: 'var(--bg)', marginTop: 6,
          }}>
            {/* Scope Usable */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={s.fl}>Scope Usable</span>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '2px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={s.cbBox}></span> Y</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={s.cbBox}></span> N</span>
              </div>
            </div>
            {/* Rework Required */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={s.fl}>Rework Required</span>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '2px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={s.cbBox}></span> Y</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={s.cbBox}></span> N</span>
              </div>
            </div>
            {/* Alcohol Wipe */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={s.fl}>Alcohol Wipe</span>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '2px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><span style={s.cbBox}></span> Done</span>
              </div>
            </div>
            {/* Responsible Tech */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={s.fl}>Responsible Tech</span>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 18, marginTop: 2 }}></div>
            </div>
            {/* QC Initials */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={s.fl}>QC Initials</span>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 18, marginTop: 2 }}></div>
            </div>
            {/* Test Equipment — span 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, gridColumn: 'span 2' }}>
              <span style={s.fl}>Test Equipment Used</span>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 18, marginTop: 2 }}></div>
            </div>
            {/* Commercial QC */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={s.fl}>Commercial QC</span>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '2px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                  <span style={{ ...pfBtn('p'), width: 20, height: 13, lineHeight: '13px', fontSize: 8 }}>P</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                  <span style={{ ...pfBtn('f'), width: 20, height: 13, lineHeight: '13px', fontSize: 8 }}>F</span>
                </span>
              </div>
            </div>
            {/* Inspected By */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={s.fl}>Inspected By</span>
              <div style={{ borderBottom: '1px solid var(--print-check-border)', minHeight: 18, marginTop: 2 }}></div>
            </div>
          </div>

          <FormFooter page="OM07-3 | Page 3" />
        </div>

      </div>
    </div>
  );
};
