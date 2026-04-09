import React from 'react';
import './print.css';
import './SubassemblyQcForm.css';
import type { RepairFull, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  lineItems?: RepairLineItem[];
  onClose: () => void;
}

const em = '—';

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div className="saq-sb">{children}</div>
);

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div className="saq-fld" style={span2 ? { gridColumn: 'span 2' } : undefined}>
    <span className="saq-fl">{label}</span>
    <div className="saq-fv" style={h !== undefined ? { minHeight: h } : undefined}>{value ?? em}</div>
  </div>
);

const Sig = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div className={`saq-sig ${narrow ? 'saq-sig--narrow' : 'saq-sig--flex'}`}>
    <div className="saq-sig__line" />
    <div className="saq-sig__label">{label}</div>
  </div>
);

const MIN_ROWS = 8;

export const SubassemblyQcForm = ({ repair, lineItems, onClose }: Props) => {
  const dateStr = repair.dateIn
    ? new Date(repair.dateIn).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : em;

  // Build row data — pad to MIN_ROWS
  const items = lineItems && lineItems.length > 0 ? lineItems : [];
  const padded: Array<RepairLineItem | null> = [...items];
  while (padded.length < MIN_ROWS) padded.push(null);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="saq-overlay"
    >
      <div className="no-print saq-action-bar">
        <button onClick={() => window.print()} className="saq-btn-print">Print</button>
        <button onClick={onClose} className="saq-btn-close">Close</button>
      </div>

      <div className="print-form saq-page">
        {/* Header */}
        <div className="saq-header">
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="saq-header__logo" />
          <div className="saq-header__right">
            <div className="saq-header__title">Sub-Assembly QC Requisition</div>
            <div className="saq-header__doc">OM07-1 (12/2020)</div>
          </div>
        </div>

        {/* Repair Information */}
        <Bar>Repair Information</Bar>
        <div className="saq-info-grid">
          <Fld label="Client" value={repair.client} span2 />
          <Fld label="Work Order #" value={repair.wo} />
          <Fld label="Scope / Model" value={repair.scopeModel ?? repair.scopeType} span2 />
          <Fld label="Serial #" value={repair.serial} />
          <Fld label="Complaint / Reason for Repair" value={repair.complaint} span2 h={24} />
          <Fld label="Technician" value={repair.tech} />
          <Fld label="Date" value={dateStr} />
          <Fld label="QC Inspector" value={null} />
          <Fld label="QC Date" value={null} />
        </div>

        {/* Sub-Assembly Parts Table */}
        <Bar>Sub-Assembly Parts — QC Inspection</Bar>
        <table className="saq-table">
          <thead>
            <tr>
              {[
                { label: 'Part #', w: '16%', center: false },
                { label: 'Description', w: '38%', center: false },
                { label: 'Qty', w: '8%', center: true },
                { label: 'Lot / Ref', w: '22%', center: false },
                { label: 'Pass / Fail', w: '16%', center: true },
              ].map(col => (
                <th
                  key={col.label}
                  className={`saq-th ${col.center ? 'saq-th--center' : 'saq-th--left'}`}
                  style={{ width: col.w }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {padded.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
                <td className="saq-td saq-td--mono">
                  {item?.itemCode ?? ''}
                </td>
                <td className="saq-td">
                  {item?.description ?? ''}
                </td>
                <td className="saq-td saq-td--center">
                  {''}
                </td>
                <td className="saq-td saq-td--muted">
                  {''}
                </td>
                <td className="saq-td saq-td--center">
                  <span className="saq-badge-pass">P</span>
                  <span className="saq-badge-fail">F</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Overall QC Result */}
        <div className="saq-qc-result">
          <span className="saq-qc-result__label">Overall QC Result:</span>
          {[
            { label: 'Pass — All parts acceptable, proceed with assembly', color: 'var(--success)' },
            { label: 'Conditional — Proceed with noted exceptions', color: 'var(--warning)' },
            { label: 'Fail — Do not assemble, re-order required', color: 'var(--danger)' },
          ].map(opt => (
            <div key={opt.label} className="saq-qc-option">
              <span style={{ width: 12, height: 12, border: `1.5px solid ${opt.color}`, borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
              {opt.label}
            </div>
          ))}
        </div>

        {/* Disposition */}
        <div className="saq-disposition">
          <span className="saq-disposition__label">Disposition:</span>
          {['Release for Assembly', 'Hold — Pending Re-inspection', 'Reject — Return to Supplier', 'Reject — Scrap'].map(label => (
            <div key={label} className="saq-disposition-item">
              <span className="saq-disposition-box" />
              {label}
            </div>
          ))}
        </div>

        {/* QC Notes */}
        <Bar>QC Notes / Observations</Bar>
        <div className="saq-notes-box" />

        {/* Authorization */}
        <Bar>Authorization</Bar>
        <div className="saq-auth-row">
          <Sig label="Technician Signature" />
          <Sig label="Date" narrow />
          <Sig label="QC Inspector Signature" />
          <Sig label="Date" narrow />
        </div>

        {/* Footer */}
        <div className="saq-footer">
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
          <span>OM07-1 (12/2020)</span>
        </div>
      </div>
    </div>
  );
};
