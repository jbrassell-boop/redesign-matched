import React from 'react';
import './print.css';
import './BiRigidForm.css';
import type { RepairFull } from '../types';

interface Props { repair: RepairFull; onClose: () => void; }

const em = '—';

const REPAIR_ITEMS = [
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
  'Working Channel Repair',
  'Full Overhaul',
  'Other: _________________________',
];

const INSPECTION_GROUPS: { cat: string; items: string[] }[] = [
  { cat: 'Image Acceptable', items: ['1. Image Quality', '2. Light Transmission', '3. Focus', '4. Color Rendition'] },
  { cat: 'Eyepiece / Ocular', items: ['5. Eyepiece Lens', '6. Ocular Housing', '7. Focus Ring', '8. Diopter Adjustment', '9. Rubber Eye Guard'] },
  { cat: 'Tubing', items: ['10. Insertion Tube Exterior', '11. Tube Straightness', '12. Working Channel', '13. Irrigation Port', '14. Insufflation Port'] },
  { cat: 'Body / Nosecone / Light Post', items: ['15. Body / Barrel', '16. Nosecone', '17. Light Post', '18. Light Post Connector', '19. Sealing / O-Rings', '20. Bridge / Junction', '21. Proximal End Cap'] },
  { cat: 'Objective / Distal End', items: ['22. Objective Lens', '23. Distal Tip', '24. Prism / Deflector', '25. Distal Window'] },
  { cat: 'Light Fibers', items: ['26. Fiber Bundle Transmission', '27. Fiber Breakage Count', '28. Light Cable Interface'] },
  { cat: 'Image Specifications', items: ['29. Sharpness', '30. Contrast', '31. Field of View', '32. Depth of Field', '33. Distortion'] },
];

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div className="bir-sb">{children}</div>
);

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div className={span2 ? 'bir-fld--span2' : 'bir-fld'}>
    <span className="bir-fl">{label}</span>
    <div className="bir-fv" style={h ? { minHeight: h } : undefined}>{value ?? em}</div>
  </div>
);

const Cb = ({ label }: { label: string }) => (
  <span className="bir-cb-label">
    <span className="bir-cb-box" />{label}
  </span>
);

export const BiRigidForm = ({ repair, onClose }: Props) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    className="bir-overlay"
  >
    <div className="no-print bir-action-bar">
      <button onClick={() => window.print()} className="bir-btn-print">Print</button>
      <button onClick={onClose} className="bir-btn-close">Close</button>
    </div>

    <div className="print-form bir-page">
      {/* Form Header */}
      <div className="bir-header">
        <img src="/assets/logo-color.jpg" alt="TSI Logo" className="bir-logo" />
        <div className="bir-title-block">
          <div className="bir-title">Blank Inspection Report</div>
          <div className="bir-subtitle">Rigid Endoscope</div>
          <div className="bir-doc-num">OM07-5</div>
        </div>
      </div>

      {/* Scope Information */}
      <Bar>Scope Information</Bar>
      <div className="bir-info-grid">
        <Fld label="Client / Facility" value={repair.client} span2 />
        <Fld label="Date" value={fmt(repair.dateIn)} />
        <Fld label="Complaint" value={repair.complaint} span2 h={22} />
        <Fld label="Work Order #" value={repair.wo} />
        <Fld label="Serial #" value={repair.serial} />
        <div className="bir-fld">
          <span className="bir-fl">Technician</span>
          <div className="bir-fv">{repair.tech ?? '—'}</div>
        </div>
        <Fld label="Scope Model" value={repair.scopeModel} span2 />
        <div className="bir-fld">
          <span className="bir-fl">Rack #</span><div className="bir-fv"></div>
        </div>
        <div className="bir-fld">
          <span className="bir-fl">Cust. Expected Delivery</span><div className="bir-fv"></div>
        </div>
      </div>

      {/* Items Found */}
      <Bar>Items Found to be in Need of Repair</Bar>
      <table className="bir-items-table">
        <thead>
          <tr>
            <th className="bir-th" style={{ width: 20 }}></th>
            <th className="bir-th">Item</th>
            <th className="bir-th--center" style={{ width: 74 }}>Est. Cost</th>
            <th className="bir-th--center" style={{ width: 54 }}>Approved</th>
          </tr>
        </thead>
        <tbody>
          {REPAIR_ITEMS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
              <td className="bir-td--center"><span className="bir-cb-box" /></td>
              <td className="bir-td">{item}</td>
              <td className="bir-td--center"><span className="bir-cost-field" /></td>
              <td className="bir-td--center"><span className="bir-cb-box" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Items Approved and Repaired */}
      <Bar>Items Approved and Repaired</Bar>
      <table className="bir-items-table">
        <thead>
          <tr>
            <th className="bir-th" style={{ width: 20 }}></th>
            <th className="bir-th">Item Repaired</th>
            <th className="bir-th--center" style={{ width: 74 }}>Actual Cost</th>
            <th className="bir-th">Repaired By (Initials)</th>
          </tr>
        </thead>
        <tbody>
          {REPAIR_ITEMS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
              <td className="bir-td--center"><span className="bir-cb-box" /></td>
              <td className="bir-td">{item}</td>
              <td className="bir-td--center"><span className="bir-cost-field" /></td>
              <td className="bir-td"><span className="bir-sig-mini" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 33-Point Inspection Checklist */}
      <Bar>Inspection Checklist — 33-Point P/F</Bar>
      <table className="bir-items-table">
        <thead>
          <tr>
            <th className="bir-th" style={{ width: '56%' }}>Item</th>
            <th className="bir-th--center" style={{ width: 42 }}>Pass</th>
            <th className="bir-th--center" style={{ width: 42 }}>Fail</th>
          </tr>
        </thead>
        <tbody>
          {INSPECTION_GROUPS.map(grp => (
            <React.Fragment key={grp.cat}>
              <tr>
                <td colSpan={3} className="bir-group-row">{grp.cat}</td>
              </tr>
              {grp.items.map((item, i) => (
                <tr key={item} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
                  <td className="bir-td">{item}</td>
                  <td className="bir-td--center"><span className="bir-pf-btn-p">P</span></td>
                  <td className="bir-td--center"><span className="bir-pf-btn-f">F</span></td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Leak / Autoclave Tests */}
      <div className="bir-test-grid">
        {[['Hot Leak Test'], ['Cold Leak Test'], ['Autoclave Test']].map(([label]) => (
          <div key={label} className="bir-test-col">
            <span className="bir-fl">{label}</span>
            <div className="bir-pf-row">
              <span className="bir-pf-btn-p">P</span><span className="bir-pf-btn-f">F</span>
            </div>
          </div>
        ))}
      </div>

      {/* QC Sign-Off */}
      <Bar>QC Sign-Off</Bar>
      <div className="bir-qc-grid">
        <div className="bir-qc-col">
          <span className="bir-fl">Commercial QC</span>
          <div className="bir-qc-pf-row">
            <span className="bir-pf-btn-p">P</span><span className="bir-pf-btn-f">F</span>
          </div>
        </div>
        <div className="bir-qc-col">
          <span className="bir-fl">Inspected By</span>
          <div className="bir-qc-sig-line"></div>
        </div>
        <div className="bir-qc-col">
          <span className="bir-fl">Rework Required</span>
          <div className="bir-qc-yn-row">
            <Cb label="Y" /><Cb label="N" />
          </div>
        </div>
        <div className="bir-qc-col">
          <span className="bir-fl">Date</span>
          <div className="bir-qc-sig-line"></div>
        </div>
      </div>

      {/* Footer */}
      <div className="bir-footer">
        <span>ISO 13485 Certified</span>
        <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM07-5</span>
      </div>
    </div>
  </div>
);
