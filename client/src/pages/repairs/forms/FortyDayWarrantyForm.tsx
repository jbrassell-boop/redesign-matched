import React from 'react';
import './print.css';
import './FortyDayWarrantyForm.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

const em = '—';

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div className="fdw-sb">{children}</div>
);

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div className={span2 ? 'fdw-field--span2' : 'fdw-field'}>
    <span className="fdw-fl">{label}</span>
    <div className={h && h > 13 ? 'fdw-fv--tall' : 'fdw-fv'}>{value ?? em}</div>
  </div>
);

const Sig = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div className={narrow ? 'fdw-sig--narrow' : 'fdw-sig'}>
    <div className="fdw-sig-line" />
    <div className="fdw-sig-label">{label}</div>
  </div>
);

const RadioItem = ({ label }: { label: string }) => (
  <div className="fdw-radio">
    <span className="fdw-radio-circle" />
    {label}
  </div>
);

const CodeItem = ({ num, label }: { num: number; label: string }) => (
  <li className="fdw-code-item">
    <span className="fdw-code-num">{num}</span>
    <span className="fdw-code-check" />
    <div className="fdw-code-body">
      <span className="fdw-code-label">{label}</span>
      <div className="fdw-code-line" />
    </div>
  </li>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="fdw-panel">
    <div className="fdw-panel-head">{title}</div>
    <div className="fdw-panel-body">{children}</div>
  </div>
);

export const FortyDayWarrantyForm = ({ repair, onClose }: Props) => {
  const dateStr = repair.dateIn
    ? new Date(repair.dateIn).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : em;
  const daysDisplay = repair.daysLastIn != null ? String(repair.daysLastIn) : em;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fdw-overlay"
    >
      <div className="no-print fdw-action-bar">
        <button onClick={() => window.print()} className="fdw-btn-print">Print</button>
        <button onClick={onClose} className="fdw-btn-close">Close</button>
      </div>

      <div className="print-form fdw-page">
        {/* Header */}
        <div className="fdw-header">
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="fdw-header-logo" />
          <div className="fdw-header-right">
            <div className="fdw-header-title">40-Day Warranty Review</div>
            <div className="fdw-header-sub">Returned Repair Evaluation</div>
            <div className="fdw-header-ref">OM06-2</div>
          </div>
        </div>

        {/* Repair Information */}
        <Bar>Repair Information</Bar>
        <div className="fdw-info-grid">
          <Fld label="Client / Facility" value={repair.client} span2 />
          <Fld label="Department" value={repair.dept} />
          <Fld label="Scope Model" value={repair.scopeModel ?? repair.scopeType} span2 />
          <Fld label="Serial #" value={repair.serial} />
          <Fld label="Complaint / Return Reason" value={repair.complaint} span2 h={28} />
          <Fld label="Current Work Order #" value={repair.wo} />
          <Fld label="Prior Work Order #" value={null} />
          <Fld label="Days Since Last In" value={daysDisplay} />
          <Fld label="Date In" value={dateStr} />
        </div>

        {/* Technician Assessment */}
        <Panel title="Technician Assessment">
          <div className="fdw-assess-q">Is the complaint the result of improper care or handling?</div>
          <div className="fdw-assess-opts">
            <RadioItem label="Yes" />
            <RadioItem label="No" />
            <RadioItem label="Cannot Determine" />
          </div>
          <div className="fdw-assess-notes">
            <div className="fdw-fl fdw-assess-fl">Technician Notes</div>
            <div className="fdw-assess-box" />
          </div>
          <div className="fdw-assess-sigs">
            <Sig label="Technician / Signature" />
            <Sig label="Date" narrow />
          </div>
        </Panel>

        {/* Lab Manager — Failure Code Assignment */}
        <Panel title="Lab Manager — Failure Code Assignment">
          <div className="fdw-fc-q">Select all applicable failure codes. Add notes as needed.</div>
          <ul className="fdw-fc-list">
            <CodeItem num={1} label="Improper care / handling by customer" />
            <CodeItem num={2} label="Part failure unrelated to previous repairs" />
            <CodeItem num={3} label="Cosmetic issue unrelated to previous repairs" />
            <CodeItem num={4} label="Improper repair technique" />
            <CodeItem num={5} label="Failure during previous final inspection" />
            <CodeItem num={6} label="Failure related to previous repairs" />
            <CodeItem num={7} label="Unable to duplicate complaint" />
            <CodeItem num={8} label="No repairs performed previously" />
            <li className="fdw-code-item">
              <span className="fdw-code-num">9</span>
              <span className="fdw-code-check" />
              <div className="fdw-code-body">
                <span className="fdw-code-label">Other</span>
                <div className="fdw-code-line" />
              </div>
            </li>
          </ul>

          {/* NCP Callout */}
          <div className="fdw-ncp">
            <span className="fdw-ncp-icon">{'\u26A0'}</span>
            <div className="fdw-ncp-text">
              Codes 4 or 5 automatically trigger OM23-1 Non-Conforming Product (NCP) form
              <span className="fdw-ncp-sub">
                When either code 4 or code 5 is selected above, complete and attach form OM23-1 before returning this scope to service. Notify Lab Manager immediately.
              </span>
            </div>
          </div>

          <div className="fdw-fc-sigs">
            <Sig label="Lab Manager / Signature" />
            <Sig label="Date" narrow />
            <Sig label="Quality Rep / Signature (if NCP triggered)" />
            <Sig label="Date" narrow />
          </div>
        </Panel>

        {/* Footer */}
        <div className="fdw-footer">
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
          <span>OM06-2</span>
        </div>
      </div>
    </div>
  );
};
