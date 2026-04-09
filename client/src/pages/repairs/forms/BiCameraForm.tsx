import React from 'react';
import './BiCameraForm.css';
import './print.css';
import type { RepairFull } from '../types';

interface Props { repair: RepairFull; onClose: () => void; }

const em = '—';

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div className="bic-sb">{children}</div>
);

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div className="bic-field" style={span2 ? { gridColumn: 'span 2' } : undefined}>
    <span className="bic-fl">{label}</span>
    <div className="bic-fv" style={h != null ? { minHeight: h } : undefined}>{value ?? em}</div>
  </div>
);

const Cb = ({ label }: { label: string }) => (
  <span className="bic-cb-item">
    <span className="bic-cb-box" />{label}
  </span>
);

const REPAIR_ITEMS = [
  'Leak Test / Seal Repair',
  'Focus Adjustment',
  'Fog / Anti-Fog Treatment',
  'White Balance Calibration',
  'Control Button Repair',
  'Cable / Connector Repair',
  'Edge Card Protector Replacement',
  'Scope Retaining Mechanism Repair',
  'Coupler Repair / Replacement',
  'Soak Cap Replacement',
  'Other: _________________________',
];

const CAMERA_TESTS = [
  '1. Leak Test',
  '2. Focus Test',
  '3. Fog Test',
  '4. White Balance',
  '5. Control Buttons',
  '6. Cable Connector',
  '7. Video Image',
  '8. Edge Card Protector',
  '9. Focus Mechanism',
  '10. Scope Retaining Mechanism',
];

const COUPLER_TESTS = [
  '1. Image Quality',
  '2. Soak Cap Assembly',
  '3. Leak Test',
  '4. Pass Test',
  '5. Coupling Attachment / Lock',
  '6. Optical Alignment',
  '7. Overall Condition',
];

export const BiCameraForm = ({ repair, onClose }: Props) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    className="bic-overlay"
  >
    <div className="no-print bic-action-bar">
      <button onClick={() => window.print()} className="bic-btn-print">Print</button>
      <button onClick={onClose} className="bic-btn-close">Close</button>
    </div>

    <div className="print-form bic-page">
      {/* Form Header */}
      <div className="bic-form-header">
        <img src="/assets/logo-color.jpg" alt="TSI Logo" className="bic-logo" />
        <div className="bic-form-title">
          <div className="bic-form-title-h">Blank Inspection Report</div>
          <div className="bic-form-title-sub">Camera System</div>
          <div className="bic-form-title-doc">OM07-4</div>
        </div>
      </div>

      {/* Camera Information */}
      <Bar>Camera Information</Bar>
      <div className="bic-info-grid">
        <Fld label="Client / Facility" value={repair.client} span2 />
        <Fld label="Date" value={fmt(repair.dateIn)} />
        <Fld label="Complaint" value={repair.complaint} span2 h={22} />
        <Fld label="Work Order #" value={repair.wo} />
        <Fld label="Serial #" value={repair.serial} />
        <div className="bic-field">
          <span className="bic-fl">Technician</span>
          <div className="bic-fv">{repair.tech ?? '—'}</div>
        </div>
        <div className="bic-field">
          <span className="bic-fl">Rack #</span><div className="bic-fv"></div>
        </div>
        <div className="bic-field">
          <span className="bic-fl">Cust. Expected Delivery</span><div className="bic-fv"></div>
        </div>
      </div>

      {/* Items Found */}
      <Bar>Items Found to be in Need of Repair</Bar>
      <table className="bic-table">
        <thead>
          <tr>
            <th className="bic-th" style={{ width: 20 }}></th>
            <th className="bic-th">Item</th>
            <th className="bic-th bic-th--center" style={{ width: 74 }}>Est. Cost</th>
            <th className="bic-th bic-th--center" style={{ width: 54 }}>Approved</th>
          </tr>
        </thead>
        <tbody>
          {REPAIR_ITEMS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
              <td className="bic-td bic-td--center"><span className="bic-cb-box" /></td>
              <td className="bic-td">{item}</td>
              <td className="bic-td bic-td--center"><span className="bic-cost-field" /></td>
              <td className="bic-td bic-td--center"><span className="bic-cb-box" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Items Approved and Repaired */}
      <Bar>Items Approved and Repaired</Bar>
      <table className="bic-table">
        <thead>
          <tr>
            <th className="bic-th" style={{ width: 20 }}></th>
            <th className="bic-th">Item Repaired</th>
            <th className="bic-th bic-th--center" style={{ width: 74 }}>Actual Cost</th>
            <th className="bic-th">Repaired By (Initials)</th>
          </tr>
        </thead>
        <tbody>
          {REPAIR_ITEMS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
              <td className="bic-td bic-td--center"><span className="bic-cb-box" /></td>
              <td className="bic-td">{item}</td>
              <td className="bic-td bic-td--center"><span className="bic-cost-field" /></td>
              <td className="bic-td"><span className="bic-sig-mini" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Camera Includes */}
      <Bar>Camera Includes</Bar>
      <div className="bic-includes-row">
        {['Camera Head', 'Soak Cap', 'Edge Card Protector', 'Coupler'].map(item => (
          <Cb key={item} label={item} />
        ))}
      </div>

      {/* Tests Performed — Camera */}
      <Bar>Tests Performed — Camera</Bar>
      <table className="bic-table">
        <thead>
          <tr>
            <th className="bic-th">Test Item</th>
            <th className="bic-th bic-th--center" style={{ width: 36 }}>Y</th>
            <th className="bic-th bic-th--center" style={{ width: 36 }}>N</th>
            <th className="bic-th bic-th--center" style={{ width: 42 }}>N/A</th>
          </tr>
        </thead>
        <tbody>
          {CAMERA_TESTS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
              <td className="bic-td">{item}</td>
              <td className="bic-td bic-td--center"><span className="bic-pf-p">Y</span></td>
              <td className="bic-td bic-td--center"><span className="bic-pf-f">N</span></td>
              <td className="bic-td bic-td--center"><span className="bic-pf-na">N/A</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Tests Performed — Coupler */}
      <Bar>Tests Performed — Coupler <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 7, opacity: 0.85 }}>(complete if coupler received)</span></Bar>
      <table className="bic-table">
        <thead>
          <tr>
            <th className="bic-th">Test Item</th>
            <th className="bic-th bic-th--center" style={{ width: 36 }}>Y</th>
            <th className="bic-th bic-th--center" style={{ width: 36 }}>N</th>
            <th className="bic-th bic-th--center" style={{ width: 42 }}>N/A</th>
          </tr>
        </thead>
        <tbody>
          {COUPLER_TESTS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
              <td className="bic-td">{item}</td>
              <td className="bic-td bic-td--center"><span className="bic-pf-p">Y</span></td>
              <td className="bic-td bic-td--center"><span className="bic-pf-f">N</span></td>
              <td className="bic-td bic-td--center"><span className="bic-pf-na">N/A</span></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* QC Sign-Off */}
      <Bar>QC Sign-Off</Bar>
      <div className="bic-qc-box">
        <div className="bic-qc-field">
          <span className="bic-fl">Date</span>
          <div className="bic-qc-line"></div>
        </div>
        <div className="bic-qc-field">
          <span className="bic-fl">Tech Initials</span>
          <div className="bic-qc-line"></div>
        </div>
        <div className="bic-qc-field">
          <span className="bic-fl">Inspected By</span>
          <div className="bic-qc-line"></div>
        </div>
        <div className="bic-qc-field">
          <span className="bic-fl">Rework Required</span>
          <div className="bic-qc-cb-row">
            <Cb label="Y" /><Cb label="N" />
          </div>
        </div>
        <div className="bic-qc-field">
          <span className="bic-fl">Lab QC Initials</span>
          <div className="bic-qc-line"></div>
        </div>
        <div className="bic-qc-field">
          <span className="bic-fl">Diagnostically Usable</span>
          <div className="bic-qc-cb-row">
            <Cb label="Y" /><Cb label="N" />
          </div>
        </div>
        <div className="bic-qc-field">
          <span className="bic-fl">Alcohol Wipe</span>
          <div className="bic-qc-cb-row">
            <Cb label="Done" />
          </div>
        </div>
        <div className="bic-qc-field">
          <span className="bic-fl">Commercial QC</span>
          <div className="bic-qc-pf-row">
            <span className="bic-pf-p">P</span><span className="bic-pf-f">F</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bic-footer">
        <span>ISO 13485 Certified</span>
        <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM07-4</span>
      </div>
    </div>
  </div>
);
