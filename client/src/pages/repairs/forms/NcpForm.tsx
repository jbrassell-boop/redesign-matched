import React from 'react';
import './print.css';
import './NcpForm.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

const em = '—';

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div className="ncp-sb">{children}</div>
);

const Fld = ({ label, value, span2 }: { label: string; value?: string | null; span2?: boolean }) => (
  <div className="ncp-fld" style={span2 ? { gridColumn: 'span 2' } : undefined}>
    <span className="ncp-fl">{label}</span>
    <div className="ncp-fv">{value ?? em}</div>
  </div>
);

const Sig = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div
    className={`ncp-sig ${narrow ? 'ncp-sig--narrow' : 'ncp-sig--flex'}`}
  >
    <div className="ncp-sig__line" />
    <div className="ncp-sig__label">{label}</div>
  </div>
);

const CbItem = ({ label }: { label: string }) => (
  <div className="ncp-cb-item">
    <span className="ncp-cb-box" />
    {label}
  </div>
);

const TextField = ({ h }: { h: number }) => (
  <div className="ncp-text-field" style={{ minHeight: h }} />
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="ncp-panel">
    <div className="ncp-panel__head">{title}</div>
    <div className="ncp-panel__body">{children}</div>
  </div>
);

export const NcpForm = ({ repair, onClose }: Props) => {
  const dateStr = repair.dateIn
    ? new Date(repair.dateIn).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : em;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="ncp-overlay"
    >
      <div className="no-print ncp-action-bar">
        <button onClick={() => window.print()} className="ncp-btn-print">Print</button>
        <button onClick={onClose} className="ncp-btn-close">Close</button>
      </div>

      <div className="print-form ncp-page">
        {/* Header */}
        <div className="ncp-header">
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="ncp-header__logo" />
          <div className="ncp-header__right">
            <div className="ncp-header__title">Non-Conforming Product</div>
            <div className="ncp-header__subtitle">Quality Non-Conformance Report</div>
            <div className="ncp-header__doc">OM23-1</div>
          </div>
        </div>

        {/* NCP Red Stripe */}
        <div className="ncp-stripe">
          Non-Conforming Product Report (NCP)
        </div>

        {/* Identification */}
        <Bar>Identification</Bar>
        <div className="ncp-id-grid">
          <Fld label="NCP #" value={null} />
          <Fld label="Date" value={dateStr} />
          <Fld label="Work Order # / Lot No." value={repair.wo} />
          <Fld label="Customer / Vendor" value={repair.client} span2 />
          <Fld label="Model No." value={repair.scopeModel ?? repair.scopeType} />
          <Fld label="Product Serial No." value={repair.serial} span2 />
        </div>

        {/* Reason for Non-Conformance */}
        <Bar>Reason for Non-Conformance</Bar>
        <TextField h={64} />

        {/* Investigation */}
        <Bar>Investigation</Bar>
        <TextField h={64} />

        {/* Corrective Action */}
        <Panel title="Corrective Action">
          <div className="ncp-ca-row">
            <span className="ncp-ca-label">Corrective Action Required:</span>
            <CbItem label="Yes" />
            <CbItem label="No" />
            <div className="ncp-ca-ref">
              <span className="ncp-ca-ref-label">CAR / PAR No.:</span>
              <div className="ncp-ca-ref-line" />
            </div>
          </div>
          <div className="ncp-ca-row">
            <span className="ncp-ca-label">Vendor Complaint Required:</span>
            <CbItem label="Yes" />
            <CbItem label="No" />
            <div className="ncp-ca-ref">
              <span className="ncp-ca-ref-label">VC No.:</span>
              <div className="ncp-ca-ref-line" />
            </div>
          </div>
        </Panel>

        {/* Disposition */}
        <Bar>Disposition</Bar>
        <div className="ncp-disposition-strip">
          {['Rework', 'Use-As-Is', 'RTV', 'Scrap'].map((label, i, arr) => (
            <div
              key={label}
              style={{
                flex: 1,
                padding: '7px 8px',
                borderRight: i < arr.length - 1 ? '1.5px solid var(--primary)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 8.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <span className="ncp-disposition-circle" />
              {label}
            </div>
          ))}
        </div>
        <div className="ncp-sig-row">
          <Sig label="Approved By / Signature" />
          <Sig label="Date" narrow />
        </div>

        {/* QA Review */}
        <Panel title="QA Review">
          <div>
            <span className="ncp-fl">QA Review Comments</span>
            <TextField h={46} />
          </div>
          <div className="ncp-qa-sig-row">
            <Sig label="QA Review By / Signature" />
            <Sig label="Date" narrow />
          </div>
        </Panel>

        {/* Footer */}
        <div className="ncp-footer">
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc. &nbsp;|&nbsp; 17 Creek Pkwy, Upper Chichester PA 19061 &nbsp;|&nbsp; (610) 485-3838</span>
          <span>OM23-1</span>
        </div>
      </div>
    </div>
  );
};
