import './print.css';
import type { RepairFull, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  lineItems?: RepairLineItem[];
  onClose: () => void;
}

// ── Canonical style tokens ──
const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';
const g = 6;
const td: React.CSSProperties = { padding: '1px 4px', fontSize: 8.5, borderBottom: '1px solid #eee', verticalAlign: 'middle' };

const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const pageStyle: React.CSSProperties = {
  width: '8.5in', minHeight: '11in', background: '#fff', padding: '0.4in',
  fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222',
  boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
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

const PF_CATEGORIES = [
  { cat: 'Leak & Pressure', items: ['1. Pressure Test (pass)'] },
  {
    cat: 'Water & Channels', items: [
      '2. Auxiliary Water Function', '3. A/W Flow — Air', '4. A/W Flow — Water',
      '5. Forcep Channel', '6. Suction Channel', '7. Elevator / Forcep Raiser',
    ],
  },
  { cat: 'Control Body & Switches', items: ['8. Control Body Condition', '9. Control Switches Function'] },
  {
    cat: 'Angulation', items: [
      '10. Angulation — Up (factory: 180°)', '11. Angulation — Down (factory: 180°)',
      '12. Angulation — Right (factory: 160°)', '13. Angulation — Left (factory: 160°)',
      '14. Angulation Tightness', '15. Angulation Orientation', '16. Angulation Knobs',
    ],
  },
  {
    cat: 'Insertion Tube, Cord & Connector', items: [
      '17. IT Tensioner', '18. Insertion Tube Condition', '19. Universal Cord Condition',
      '20. Light Guide Connector', '21. Bending Rubber (max epoxy 13.64)',
    ],
  },
  {
    cat: 'Optics & Image', items: [
      '22. Distal Tip Condition', '23. Eyepiece Condition', '24. Light Bundle Transmission',
    ],
  },
  {
    cat: 'Video Image', items: [
      '25. Video Image Quality', '26. Video Features / Functions',
      '27. Image Bundle — Broken Fibers', '28. Image Bundle — Half Tones',
    ],
  },
];

const ACCESSORIES = [
  'Scope Only', 'Light Cable', 'Soak Cap', 'Elevator Cap',
  'Suction Valve', 'A/W Valve', 'Biopsy Cap', 'Storage Case', 'Other: ___________',
];

const cbBox: React.CSSProperties = { display: 'inline-block', width: 9, height: 9, border: '1px solid #ccc', borderRadius: 1 };
const pfBtnBase: React.CSSProperties = { display: 'inline-block', width: 20, height: 12, borderRadius: 2, textAlign: 'center', lineHeight: '12px', fontSize: 7, fontWeight: 700 };

const FormFooter = ({ page }: { page: string }) => (
  <div style={{ marginTop: 'auto', paddingTop: 4, borderTop: '1px solid #ddd', fontSize: 7, color: '#999', textAlign: 'center' }}>
    <div style={{ fontWeight: 600, marginBottom: 2 }}>
      Total Scope, Inc. — ISO 13485 Certified{' '}
      <span style={{ float: 'right', fontWeight: 400 }}>{page}</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 6.5, color: '#aaa' }}>
      <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
      <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
      <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
    </div>
  </div>
);

const PageHeader = ({ subtitle, page }: { subtitle: string; page: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: g }}>
    <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." style={{ height: 44 }} />
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#1B3A5C' }}>D&amp;I Inspection Report</div>
      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--primary)' }}>{subtitle}</div>
      <div style={{ fontSize: 8, color: '#aaa' }}>{page}</div>
    </div>
  </div>
);

const Fld = ({ label, value, span2, minH }: { label: string; value?: string | null; span2?: boolean; minH?: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ ...fv, minHeight: minH ?? 13 }}>{value ?? em}</div>
  </div>
);

export const DiFlexibleForm = ({ repair, lineItems, onClose }: Props) => {
  const woNum = repair.wo ?? em;
  const serialNum = repair.serial ?? em;
  const clientName = repair.client ?? em;
  const model = [repair.scopeType, repair.scopeModel].filter(Boolean).join(' ') || em;
  const complaint = repair.complaint ?? em;
  const rackNum = repair.rackLocation ?? em;
  const techName = repair.tech ?? em;
  const mfg = repair.manufacturer ?? em;
  const estDelivery = repair.estDelivery ?? em;

  // Approved line items for page 2
  const approvedItems = lineItems?.filter(li => li.approved === 'Y') ?? [];
  const MIN_ROWS = 6;
  const blankRows = Math.max(0, MIN_ROWS - approvedItems.length);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
    >
      {/* Action bar */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
        <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
        <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
      </div>

      <div className="print-form flex-col" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ══ PAGE 1 — Items Found / Estimate ══ */}
        <div className="print-page" style={pageStyle}>
          <PageHeader subtitle="Flexible Endoscope" page="OM07-3 | Page 1 of 3" />

          {/* Scope Information */}
          <div style={sb}>Scope Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', padding: '6px 0 2px', marginBottom: g }}>
            <Fld label="Client / Facility" value={clientName} span2 />
            <Fld label="Date" value={today} />
            <Fld label="Work Order #" value={woNum} />
            <Fld label="Serial #" value={serialNum} />
            <Fld label="Scope Model" value={model} span2 />
            <Fld label="Rack #" value={rackNum} />
            <Fld label="Complaint" value={complaint} span2 minH={22} />
            <Fld label="Cust. Expected Delivery" value={estDelivery} />
            <Fld label="Manufacturer" value={mfg} />
            <Fld label="Technician" value={techName} />
          </div>

          {/* Items Found */}
          <div style={{ ...sb, marginBottom: 3 }}>Items Found to be in Need of Repair</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: g }}>
            <thead>
              <tr>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', width: 20 }}></th>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc' }}>Item</th>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'center', width: 70 }}>Est. Cost</th>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'center', width: 55 }}>Approved</th>
              </tr>
            </thead>
            <tbody>
              {REPAIR_ITEMS.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                  <td style={{ ...td, textAlign: 'center' }}><span style={cbBox} /></td>
                  <td style={td}>{item}</td>
                  <td style={{ ...td, textAlign: 'center' }}><span style={{ display: 'inline-block', borderBottom: '1px solid #ccc', width: 55, height: 12 }} /></td>
                  <td style={{ ...td, textAlign: 'center' }}><span style={cbBox} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: g }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
              <span style={fl}>Subtotal Estimate</span>
              <div style={{ borderBottom: '1px solid #ccc', minWidth: 100, height: 14 }} />
            </div>
          </div>

          {/* Comments */}
          <div style={{ ...sb, marginBottom: 3 }}>Comments / Additional Notes</div>
          <div style={{ border: '1px solid #e0e0e0', borderRadius: 3, minHeight: 34, padding: '3px 6px', marginBottom: g }} />

          {/* Signature block */}
          <div style={{ display: 'flex', gap: 16, marginBottom: g }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
              <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Technician / Estimator</div>
            </div>
            <div style={{ flex: 0, maxWidth: 120, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
              <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Date</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
              <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Customer Authorization</div>
            </div>
            <div style={{ flex: 0, maxWidth: 120, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
              <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Date</div>
            </div>
          </div>

          <FormFooter page="OM07-3" />
        </div>

        {/* ══ PAGE 2 — Items Approved and Repaired ══ */}
        <div className="print-page" style={pageStyle}>
          <PageHeader subtitle="Flexible Endoscope — Items Approved &amp; Repaired" page="OM07-3 | Page 2 of 3" />

          {/* Mini header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', padding: '4px 0', marginBottom: g }}>
            <Fld label="Work Order #" value={woNum} />
            <Fld label="Serial #" value={serialNum} />
            <Fld label="Date" value={today} />
          </div>

          {/* Items Approved and Repaired */}
          <div style={{ ...sb, marginBottom: 3 }}>Items Approved and Repaired</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: g }}>
            <thead>
              <tr>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', width: 20 }}></th>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc' }}>Item Repaired</th>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'center', width: 70 }}>Actual Cost</th>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', width: 100 }}>Repaired By</th>
              </tr>
            </thead>
            <tbody>
              {approvedItems.map((li, i) => (
                <tr key={li.tranKey} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                  <td style={{ ...td, textAlign: 'center' }}><span style={{ ...cbBox, background: 'var(--primary)', border: 'none', color: '#fff', lineHeight: '9px', fontSize: 7, fontWeight: 700 }}>✓</span></td>
                  <td style={td}>{li.description || li.itemCode}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{li.amount != null ? `$${li.amount.toFixed(2)}` : em}</td>
                  <td style={td}>{li.tech ?? em}</td>
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`blank-${i}`} style={{ background: (approvedItems.length + i) % 2 === 1 ? '#fafafa' : '#fff' }}>
                  <td style={{ ...td, textAlign: 'center' }}><span style={cbBox} /></td>
                  <td style={td}>&nbsp;</td>
                  <td style={{ ...td, textAlign: 'center' }}><span style={{ display: 'inline-block', borderBottom: '1px solid #ccc', width: 55, height: 12 }} /></td>
                  <td style={td}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: g }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
              <span style={fl}>Total Repair Cost</span>
              <div style={{ borderBottom: '2px solid var(--primary)', minWidth: 100, height: 14, fontWeight: 700 }} />
            </div>
          </div>

          {/* Additional Notes */}
          <div style={{ ...sb, marginBottom: 3 }}>Additional Repair Notes</div>
          <div style={{ border: '1px solid #e0e0e0', borderRadius: 3, minHeight: 46, padding: '3px 6px', marginBottom: g }} />

          {/* Signature */}
          <div style={{ display: 'flex', gap: 16, marginBottom: g }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
              <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Lead Technician / Signature</div>
            </div>
            <div style={{ flex: 0, maxWidth: 120, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
              <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Date</div>
            </div>
          </div>

          <FormFooter page="OM07-3" />
        </div>

        {/* ══ PAGE 3 — Final Inspection ══ */}
        <div className="print-page" style={{ ...pageStyle, minHeight: 'auto' }}>
          <PageHeader subtitle="Flexible Endoscope — Final Inspection" page="OM07-3 | Page 3 of 3" />

          {/* Mini header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', padding: '4px 0', marginBottom: g }}>
            <Fld label="Work Order #" value={woNum} />
            <Fld label="Serial #" value={serialNum} />
            <Fld label="Date" value={today} />
          </div>

          {/* 24-Point Checklist */}
          <div style={{ ...sb, marginBottom: 3 }}>Final Inspection Checklist — 24-Point</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: g }}>
            <thead>
              <tr>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', width: '46%' }}>Item</th>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'center', width: 36 }}>Y</th>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'center', width: 36 }}>N</th>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc', textAlign: 'center', width: 36 }}>N/A</th>
                <th style={{ ...td, fontSize: 7.5, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #ccc' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {PF_CATEGORIES.map(cat => (
                <>
                  <tr key={`cat-${cat.cat}`}>
                    <td colSpan={5} style={{ padding: '2px 4px', fontSize: 7.5, fontWeight: 700, color: '#1B3A5C', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #ddd' }}>{cat.cat}</td>
                  </tr>
                  {cat.items.map((item, ii) => (
                    <tr key={`${cat.cat}-${ii}`} style={{ background: ii % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={td}>{item}</td>
                      <td style={{ ...td, textAlign: 'center' }}><span style={{ ...pfBtnBase, border: '1px solid #ccc' }}>Y</span></td>
                      <td style={{ ...td, textAlign: 'center' }}><span style={{ ...pfBtnBase, border: '1px solid #ccc' }}>N</span></td>
                      <td style={{ ...td, textAlign: 'center' }}><span style={{ ...pfBtnBase, border: '1px solid #ccc', fontSize: 6.5 }}>N/A</span></td>
                      <td style={td}>&nbsp;</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>

          {/* Scope Includes */}
          <div style={{ ...sb, marginBottom: 3 }}>Scope Includes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px 12px', padding: '5px 0', marginBottom: g }}>
            {ACCESSORIES.map((acc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 8.5 }}>
                <span style={cbBox} /> {acc}
              </div>
            ))}
          </div>

          {/* QC Sign-Off */}
          <div style={{ ...sb, marginBottom: 3 }}>QC Sign-Off</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px 10px', padding: '8px 10px', border: '1px solid #eee', borderRadius: 3, marginBottom: g }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={fl}>Scope Usable</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '2px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5 }}><span style={cbBox} /> Y</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5 }}><span style={cbBox} /> N</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={fl}>Rework Required</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '2px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5 }}><span style={cbBox} /> Y</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5 }}><span style={cbBox} /> N</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={fl}>Alcohol Wipe</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '2px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5 }}><span style={cbBox} /> Done</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={fl}>Responsible Tech</span>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={fl}>QC Initials</span>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, gridColumn: 'span 2' }}>
              <span style={fl}>Test Equipment Used</span>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={fl}>Commercial QC</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '2px 0' }}>
                <span style={{ ...pfBtnBase, background: '#16a34a', color: '#fff' }}>P</span>
                <span style={{ ...pfBtnBase, background: '#dc2626', color: '#fff' }}>F</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={fl}>Inspected By</span>
              <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }} />
            </div>
          </div>

          <FormFooter page="OM07-3" />
        </div>

      </div>
    </div>
  );
};
