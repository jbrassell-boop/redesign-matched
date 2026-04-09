import React from 'react';
import './print.css';
import './BiFlexForm.css';
import type { RepairFull } from '../types';

interface Props { repair: RepairFull; onClose: () => void; }

const em = '—';

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div className="bf-sb">{children}</div>
);

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div className={span2 ? 'bf-fld-col--s2' : 'bf-fld-col'}>
    <span className="bf-fl">{label}</span>
    <div className="bf-fv" style={h ? { minHeight: h } : undefined}>{value ?? em}</div>
  </div>
);

const Cb = ({ label }: { label: string }) => (
  <span className="bf-cb">
    <span className="bf-cb-box" />{label}
  </span>
);

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

const FINAL_ITEMS: { cat: string; items: string[] }[] = [
  { cat: 'Leak & Pressure', items: ['1. Pressure Test (pass)'] },
  { cat: 'Water & Channels', items: ['2. Auxiliary Water Function', '3. A/W Flow — Air', '4. A/W Flow — Water', '5. Forcep Channel', '6. Suction Channel', '7. Elevator / Forcep Raiser'] },
  { cat: 'Control Body & Switches', items: ['8. Control Body Condition', '9. Control Switches Function'] },
  { cat: 'Angulation', items: ['10. Angulation — Up (factory: 180°)', '11. Angulation — Down (factory: 180°)', '12. Angulation — Right (factory: 160°)', '13. Angulation — Left (factory: 160°)', '14. Angulation Tightness', '15. Angulation Orientation', '16. Angulation Knobs'] },
  { cat: 'Insertion Tube, Cord & Connector', items: ['17. IT Tensioner', '18. Insertion Tube Condition', '19. Universal Cord Condition', '20. Light Guide Connector', '21. Bending Rubber (max epoxy 13.64)'] },
  { cat: 'Optics & Image', items: ['22. Distal Tip Condition', '23. Eyepiece Condition', '24. Light Bundle Transmission'] },
  { cat: 'Video Image', items: ['25. Video Image Quality', '26. Video Features / Functions', '27. Image Bundle — Broken Fibers', '28. Image Bundle — Half Tones'] },
];

const Footer = ({ page }: { page: string }) => (
  <div className="bf-footer">
    <span>ISO 13485 Certified</span>
    <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
    <span>{page}</span>
  </div>
);

const FormHeader = ({ subtitle }: { subtitle: string }) => (
  <div className="bf-header">
    <img src="/assets/logo-color.jpg" alt="TSI Logo" className="bf-header-logo" />
    <div className="bf-header-right">
      <div className="bf-header-title">Blank Inspection Report</div>
      <div className="bf-header-sub">Flexible Endoscope{subtitle ? ` — ${subtitle}` : ''}</div>
      <div className="bf-header-form">OM07-3</div>
    </div>
  </div>
);

export const BiFlexForm = ({ repair, onClose }: Props) => (
  <div className="bf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="no-print bf-action-bar">
      <button onClick={() => window.print()} className="bf-btn-print">Print</button>
      <button onClick={onClose} className="bf-btn-close">Close</button>
    </div>

    {/* PAGE 1 — Items Found / Approved + Comments */}
    <div className="print-form bf-page">
      <FormHeader subtitle="" />

      <Bar>Scope Information</Bar>
      <div className="bf-grid-3col">
        <Fld label="Client / Facility" value={repair.client} span2 />
        <Fld label="Date" value={fmt(repair.dateIn)} />
        <Fld label="Work Order #" value={repair.wo} />
        <Fld label="Serial #" value={repair.serial} />
        <div className="bf-fld-col">
          <span className="bf-fl">Technician</span>
          <div className="bf-fv">{repair.tech ?? '—'}</div>
        </div>
        <Fld label="Scope Model" value={repair.scopeModel} span2 />
        <div className="bf-fld-col">
          <span className="bf-fl">Rack #</span><div className="bf-fv"></div>
        </div>
        <Fld label="Complaint" value={repair.complaint} span2 h={22} />
        <div className="bf-fld-col">
          <span className="bf-fl">Cust. Expected Delivery</span><div className="bf-fv"></div>
        </div>
      </div>

      <Bar>Items Found to be in Need of Repair</Bar>
      <table className="bf-table">
        <thead>
          <tr>
            <th className="bf-th--w20"></th>
            <th className="bf-th">Item</th>
            <th className="bf-th--center74">Est. Cost</th>
            <th className="bf-th--center54">Approved</th>
          </tr>
        </thead>
        <tbody>
          {REPAIR_ITEMS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
              <td className="bf-td--center"><span className="bf-cb-box" /></td>
              <td className="bf-td">{item}</td>
              <td className="bf-td--center"><span className="bf-cost-field" /></td>
              <td className="bf-td--center"><span className="bf-cb-box" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bf-total-wrap">
        <div className="bf-total-inner">
          <span className="bf-fl">Subtotal Estimate</span>
          <div className="bf-total-line"></div>
        </div>
      </div>

      <Bar>Comments / Additional Notes</Bar>
      <div className="bf-notes"></div>

      <div className="bf-sig-row" style={{ marginTop: 4 }}>
        <div className="bf-sig-flex">
          <div className="bf-sig-line" />
          <div className="bf-sig-lbl">Technician / Estimator</div>
        </div>
        <div className="bf-sig-fixed">
          <div className="bf-sig-line" />
          <div className="bf-sig-lbl">Date</div>
        </div>
        <div className="bf-sig-flex">
          <div className="bf-sig-line" />
          <div className="bf-sig-lbl">Customer Authorization</div>
        </div>
        <div className="bf-sig-fixed">
          <div className="bf-sig-line" />
          <div className="bf-sig-lbl">Date</div>
        </div>
      </div>

      <Footer page="OM07-3 | Page 1" />
    </div>

    {/* PAGE 2 — Items Approved and Repaired */}
    <div className="print-form bf-page">
      <FormHeader subtitle="Items Approved & Repaired" />

      <div className="bf-grid-3mini">
        <Fld label="Work Order #" value={repair.wo} />
        <Fld label="Serial #" value={repair.serial} />
        <Fld label="Date" value={fmt(repair.dateIn)} />
      </div>

      <Bar>Items Approved and Repaired</Bar>
      <table className="bf-table">
        <thead>
          <tr>
            <th className="bf-th--w20"></th>
            <th className="bf-th">Item Repaired</th>
            <th className="bf-th--center74">Actual Cost</th>
            <th className="bf-th">Repaired By (Initials)</th>
          </tr>
        </thead>
        <tbody>
          {REPAIR_ITEMS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
              <td className="bf-td--center"><span className="bf-cb-box" /></td>
              <td className="bf-td">{item}</td>
              <td className="bf-td--center"><span className="bf-cost-field" /></td>
              <td className="bf-td"><span className="bf-sig-mini" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bf-total-wrap">
        <div className="bf-total-inner">
          <span className="bf-fl">Total Repair Cost</span>
          <div className="bf-total-bold"></div>
        </div>
      </div>

      <Bar>Additional Repair Notes</Bar>
      <div className="bf-notes--lg"></div>

      <div className="bf-sig-row" style={{ marginTop: 8 }}>
        <div className="bf-sig-flex">
          <div className="bf-sig-line" />
          <div className="bf-sig-lbl">Lead Technician / Signature</div>
        </div>
        <div className="bf-sig-fixed">
          <div className="bf-sig-line" />
          <div className="bf-sig-lbl">Date</div>
        </div>
      </div>

      <Footer page="OM07-3 | Page 2" />
    </div>

    {/* PAGE 3 — Final Inspection */}
    <div className="print-form bf-page">
      <FormHeader subtitle="Final Inspection" />

      <div className="bf-grid-3mini">
        <Fld label="Work Order #" value={repair.wo} />
        <Fld label="Serial #" value={repair.serial} />
        <Fld label="Date" value={fmt(repair.dateIn)} />
      </div>

      <Bar>Final Inspection Checklist — 24-Point</Bar>
      <table className="bf-table" style={{ marginBottom: 6 }}>
        <thead>
          <tr>
            <th className="bf-th--w46pct">Item</th>
            <th className="bf-th--center32">Y</th>
            <th className="bf-th--center32">N</th>
            <th className="bf-th--center38">N/A</th>
            <th className="bf-th">Notes</th>
          </tr>
        </thead>
        <tbody>
          {FINAL_ITEMS.map(g => (
            <React.Fragment key={g.cat}>
              <tr>
                <td colSpan={5} className="bf-cat-row">{g.cat}</td>
              </tr>
              {g.items.map((item, i) => (
                <tr key={item} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
                  <td className="bf-td">{item}</td>
                  <td className="bf-td--center"><span className="bf-pf-p">Y</span></td>
                  <td className="bf-td--center"><span className="bf-pf-f">N</span></td>
                  <td className="bf-td--center"><span className="bf-pf-na">N/A</span></td>
                  <td className="bf-td"></td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      <Bar>Scope Includes</Bar>
      <div className="bf-acc-grid">
        {['Scope Only', 'Light Cable', 'Soak Cap', 'Elevator Cap', 'Suction Valve', 'A/W Valve', 'Biopsy Cap', 'Storage Case', 'Other: ___________'].map(item => (
          <Cb key={item} label={item} />
        ))}
      </div>

      <Bar>QC Sign-Off</Bar>
      <div className="bf-qc-grid">
        <div className="bf-qc-cell">
          <span className="bf-fl">Scope Usable</span>
          <div className="bf-qc-yn">
            <Cb label="Y" /><Cb label="N" />
          </div>
        </div>
        <div className="bf-qc-cell">
          <span className="bf-fl">Rework Required</span>
          <div className="bf-qc-yn">
            <Cb label="Y" /><Cb label="N" />
          </div>
        </div>
        <div className="bf-qc-cell">
          <span className="bf-fl">Alcohol Wipe</span>
          <div className="bf-qc-yn">
            <Cb label="Done" />
          </div>
        </div>
        <div className="bf-qc-cell">
          <span className="bf-fl">Responsible Tech</span>
          <div className="bf-qc-line"></div>
        </div>
        <div className="bf-qc-cell">
          <span className="bf-fl">QC Initials</span>
          <div className="bf-qc-line"></div>
        </div>
        <div className="bf-qc-cell--s2">
          <span className="bf-fl">Test Equipment Used</span>
          <div className="bf-qc-line"></div>
        </div>
        <div className="bf-qc-cell">
          <span className="bf-fl">Commercial QC</span>
          <div style={{ display: 'flex', gap: 6, padding: '2px 0' }}>
            <span className="bf-pf-p">P</span><span className="bf-pf-f">F</span>
          </div>
        </div>
        <div className="bf-qc-cell">
          <span className="bf-fl">Inspected By</span>
          <div className="bf-qc-line"></div>
        </div>
      </div>

      <Footer page="OM07-3 | Page 3" />
    </div>
  </div>
);
