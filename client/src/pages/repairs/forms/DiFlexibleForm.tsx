import React from 'react';
import './print.css';
import './DiFlexibleForm.css';
import type { RepairFull, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  lineItems?: RepairLineItem[];
  onClose: () => void;
}

const em = '—';
const g = 6;

const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

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

const FormFooter = ({ page }: { page: string }) => (
  <div className="dif-footer">
    <div className="dif-footer-name">
      Total Scope, Inc. — ISO 13485 Certified{' '}
      <span className="dif-footer-fr">{page}</span>
    </div>
    <div className="dif-footer-locs">
      <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
      <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
      <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
    </div>
  </div>
);

const PageHeader = ({ subtitle, page }: { subtitle: string; page: string }) => (
  <div className="dif-header" style={{ marginBottom: g }}>
    <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="dif-header-logo" />
    <div className="dif-header-right">
      <div className="dif-header-title">D&amp;I Inspection Report</div>
      <div className="dif-header-sub">{subtitle}</div>
      <div className="dif-header-form">{page}</div>
    </div>
  </div>
);

const Fld = ({ label, value, span2, minH }: { label: string; value?: string | null; span2?: boolean; minH?: number }) => (
  <div className={span2 ? 'dif-fld-col dif-span2' : 'dif-fld-col'}>
    <span className="dif-fl">{label}</span>
    <div className="dif-fv" style={minH ? { minHeight: minH } : undefined}>{value ?? em}</div>
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
    <div className="dif-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Action bar */}
      <div className="no-print dif-action-bar">
        <button onClick={() => window.print()} className="dif-btn-print">Print</button>
        <button onClick={onClose} className="dif-btn-close">Close</button>
      </div>

      <div className="print-form dif-form-col">

        {/* ══ PAGE 1 — Items Found / Estimate ══ */}
        <div className="print-page dif-page">
          <PageHeader subtitle="Flexible Endoscope" page="OM07-3 | Page 1 of 3" />

          {/* Scope Information */}
          <div className="dif-sb">Scope Information</div>
          <div className="dif-grid-3col" style={{ marginBottom: g }}>
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
          <div className="dif-sb--mb">Items Found to be in Need of Repair</div>
          <table className="dif-table" style={{ marginBottom: g }}>
            <thead>
              <tr>
                <th className="dif-th--w20"></th>
                <th className="dif-th">Item</th>
                <th className="dif-th--center70">Est. Cost</th>
                <th className="dif-th--center55">Approved</th>
              </tr>
            </thead>
            <tbody>
              {REPAIR_ITEMS.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : 'var(--card)' }}>
                  <td className="dif-td--center"><span className="dif-cb-box" /></td>
                  <td className="dif-td">{item}</td>
                  <td className="dif-td--center"><span className="dif-cost-stub" /></td>
                  <td className="dif-td--center"><span className="dif-cb-box" /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Subtotal */}
          <div className="dif-total-wrap" style={{ marginBottom: g }}>
            <div className="dif-total-inner">
              <span className="dif-fl">Subtotal Estimate</span>
              <div className="dif-total-line" />
            </div>
          </div>

          {/* Comments */}
          <div className="dif-sb--mb">Comments / Additional Notes</div>
          <div className="dif-notes" style={{ marginBottom: g }} />

          {/* Signature block */}
          <div className="dif-sig-row" style={{ marginBottom: g }}>
            <div className="dif-sig-flex">
              <div className="dif-sig-line" />
              <div className="dif-sig-lbl">Technician / Estimator</div>
            </div>
            <div className="dif-sig-fixed">
              <div className="dif-sig-line" />
              <div className="dif-sig-lbl">Date</div>
            </div>
            <div className="dif-sig-flex">
              <div className="dif-sig-line" />
              <div className="dif-sig-lbl">Customer Authorization</div>
            </div>
            <div className="dif-sig-fixed">
              <div className="dif-sig-line" />
              <div className="dif-sig-lbl">Date</div>
            </div>
          </div>

          <FormFooter page="OM07-3" />
        </div>

        {/* ══ PAGE 2 — Items Approved and Repaired ══ */}
        <div className="print-page dif-page">
          <PageHeader subtitle="Flexible Endoscope — Items Approved &amp; Repaired" page="OM07-3 | Page 2 of 3" />

          {/* Mini header */}
          <div className="dif-grid-3mini" style={{ marginBottom: g }}>
            <Fld label="Work Order #" value={woNum} />
            <Fld label="Serial #" value={serialNum} />
            <Fld label="Date" value={today} />
          </div>

          {/* Items Approved and Repaired */}
          <div className="dif-sb--mb">Items Approved and Repaired</div>
          <table className="dif-table" style={{ marginBottom: g }}>
            <thead>
              <tr>
                <th className="dif-th--w20"></th>
                <th className="dif-th">Item Repaired</th>
                <th className="dif-th--center70">Actual Cost</th>
                <th className="dif-th--w100">Repaired By</th>
              </tr>
            </thead>
            <tbody>
              {approvedItems.map((li, i) => (
                <tr key={li.tranKey} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : 'var(--card)' }}>
                  <td className="dif-td--center"><span style={{ display: 'inline-block', width: 9, height: 9, background: 'var(--primary)', border: 'none', color: '#fff', lineHeight: '9px', fontSize: 7, fontWeight: 700, borderRadius: 1, textAlign: 'center' }}>✓</span></td>
                  <td className="dif-td">{li.description || li.itemCode}</td>
                  <td className="dif-td--center">{li.amount != null ? `$${li.amount.toFixed(2)}` : em}</td>
                  <td className="dif-td">{li.tech ?? em}</td>
                </tr>
              ))}
              {Array.from({ length: blankRows }).map((_, i) => (
                <tr key={`blank-${i}`} style={{ background: (approvedItems.length + i) % 2 === 1 ? 'var(--neutral-50)' : 'var(--card)' }}>
                  <td className="dif-td--center"><span className="dif-cb-box" /></td>
                  <td className="dif-td">&nbsp;</td>
                  <td className="dif-td--center"><span className="dif-cost-stub" /></td>
                  <td className="dif-td">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className="dif-total-wrap" style={{ marginBottom: g }}>
            <div className="dif-total-inner">
              <span className="dif-fl">Total Repair Cost</span>
              <div className="dif-total-bold" />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="dif-sb--mb">Additional Repair Notes</div>
          <div className="dif-notes--lg" style={{ marginBottom: g }} />

          {/* Signature */}
          <div className="dif-sig-row" style={{ marginBottom: g }}>
            <div className="dif-sig-flex">
              <div className="dif-sig-line" />
              <div className="dif-sig-lbl">Lead Technician / Signature</div>
            </div>
            <div className="dif-sig-fixed">
              <div className="dif-sig-line" />
              <div className="dif-sig-lbl">Date</div>
            </div>
          </div>

          <FormFooter page="OM07-3" />
        </div>

        {/* ══ PAGE 3 — Final Inspection ══ */}
        <div className="print-page dif-page--auto">
          <PageHeader subtitle="Flexible Endoscope — Final Inspection" page="OM07-3 | Page 3 of 3" />

          {/* Mini header */}
          <div className="dif-grid-3mini" style={{ marginBottom: g }}>
            <Fld label="Work Order #" value={woNum} />
            <Fld label="Serial #" value={serialNum} />
            <Fld label="Date" value={today} />
          </div>

          {/* 24-Point Checklist */}
          <div className="dif-sb--mb">Final Inspection Checklist — 24-Point</div>
          <table className="dif-table" style={{ marginBottom: g }}>
            <thead>
              <tr>
                <th className="dif-th--w46pct">Item</th>
                <th className="dif-th--center36">Y</th>
                <th className="dif-th--center36">N</th>
                <th className="dif-th--center36">N/A</th>
                <th className="dif-th">Notes</th>
              </tr>
            </thead>
            <tbody>
              {PF_CATEGORIES.map(cat => (
                <React.Fragment key={`cat-${cat.cat}`}>
                  <tr>
                    <td colSpan={5} className="dif-pfcat-td">{cat.cat}</td>
                  </tr>
                  {cat.items.map((item, ii) => (
                    <tr key={`${cat.cat}-${ii}`} style={{ background: ii % 2 === 1 ? 'var(--neutral-50)' : 'var(--card)' }}>
                      <td className="dif-td">{item}</td>
                      <td className="dif-td--center"><span className="dif-pf-yn">Y</span></td>
                      <td className="dif-td--center"><span className="dif-pf-yn">N</span></td>
                      <td className="dif-td--center"><span className="dif-pf-yn" style={{ fontSize: 6.5 }}>N/A</span></td>
                      <td className="dif-td">&nbsp;</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Scope Includes */}
          <div className="dif-sb--mb">Scope Includes</div>
          <div className="dif-acc-grid" style={{ marginBottom: g }}>
            {ACCESSORIES.map((acc, i) => (
              <div key={i} className="dif-acc-item">
                <span className="dif-cb-box" /> {acc}
              </div>
            ))}
          </div>

          {/* QC Sign-Off */}
          <div className="dif-sb--mb">QC Sign-Off</div>
          <div className="dif-qc-grid" style={{ marginBottom: g }}>
            <div className="dif-qc-cell">
              <span className="dif-fl">Scope Usable</span>
              <div className="dif-qc-yn">
                <span className="dif-qc-ynitem"><span className="dif-cb-box" /> Y</span>
                <span className="dif-qc-ynitem"><span className="dif-cb-box" /> N</span>
              </div>
            </div>
            <div className="dif-qc-cell">
              <span className="dif-fl">Rework Required</span>
              <div className="dif-qc-yn">
                <span className="dif-qc-ynitem"><span className="dif-cb-box" /> Y</span>
                <span className="dif-qc-ynitem"><span className="dif-cb-box" /> N</span>
              </div>
            </div>
            <div className="dif-qc-cell">
              <span className="dif-fl">Alcohol Wipe</span>
              <div className="dif-qc-yn">
                <span className="dif-qc-ynitem"><span className="dif-cb-box" /> Done</span>
              </div>
            </div>
            <div className="dif-qc-cell">
              <span className="dif-fl">Responsible Tech</span>
              <div className="dif-qc-line" />
            </div>
            <div className="dif-qc-cell">
              <span className="dif-fl">QC Initials</span>
              <div className="dif-qc-line" />
            </div>
            <div className="dif-qc-cell--s2">
              <span className="dif-fl">Test Equipment Used</span>
              <div className="dif-qc-line" />
            </div>
            <div className="dif-qc-cell">
              <span className="dif-fl">Commercial QC</span>
              <div className="dif-qc-pf">
                <span className="dif-pf-btn" style={{ background: 'var(--success)', color: '#fff' }}>P</span>
                <span className="dif-pf-btn" style={{ background: 'var(--danger)', color: '#fff' }}>F</span>
              </div>
            </div>
            <div className="dif-qc-cell">
              <span className="dif-fl">Inspected By</span>
              <div className="dif-qc-line" />
            </div>
          </div>

          <FormFooter page="OM07-3" />
        </div>

      </div>
    </div>
  );
};
