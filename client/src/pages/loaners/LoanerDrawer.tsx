import { useEffect, useState } from 'react';
import { Spin, message } from 'antd';
import { getLoanerDetail, getLoanerHistory } from '../../api/loaners';
import type { LoanerDetail, LoanerHistoryItem } from './types';
import { TabBar, Field, FormGrid, DevNotice } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import './LoanerDrawer.css';

interface LoanerDrawerProps {
  scopeKey: number | null;
  open: boolean;
  onClose: () => void;
}

const DRAWER_TABS: TabDef[] = [
  { key: 'details',    label: 'Details' },
  { key: 'history',    label: 'History' },
  { key: 'evaluation', label: 'Evaluation' },
  { key: 'agreement',  label: 'Agreement' },
  { key: 'shipping',   label: 'Shipping' },
];

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

export const LoanerDrawer = ({ scopeKey, open, onClose }: LoanerDrawerProps) => {
  const [activeTab, setActiveTab] = useState('details');
  const [detail, setDetail] = useState<LoanerDetail | null>(null);
  const [history, setHistory] = useState<LoanerHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!scopeKey || !open) return;
    let cancelled = false;
    setLoading(true);
    setActiveTab('details');
    getLoanerDetail(scopeKey)
      .then(d => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) { message.error('Failed to load loaner detail'); setDetail(null); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [scopeKey, open]);

  useEffect(() => {
    if (!scopeKey || !open) return;
    let cancelled = false;
    setHistoryLoading(true);
    getLoanerHistory(scopeKey)
      .then(d => { if (!cancelled) setHistory(d); })
      .catch(() => { if (!cancelled) { message.error('Failed to load loaner history'); setHistory([]); } })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [scopeKey, open]);

  const daysColor = (days: number) => {
    if (days >= 30) return 'loaner-drawer__history-days--red';
    if (days >= 14) return 'loaner-drawer__history-days--amber';
    return 'loaner-drawer__history-days--green';
  };

  const renderDetails = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;
    if (!detail) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>No details available.</div>;
    return (
      <div className="loaner-drawer__details">
        <FormGrid cols={2}>
          <Field label="Scope Type" value={detail.scopeType} />
          <Field label="Serial #" value={detail.serial} />
          <Field label="Status" value={detail.status} />
          <Field label="Category" value={detail.category} />
          <Field label="Client" value={detail.client} />
          <Field label="Department" value={detail.dept} />
          <Field label="Sales Rep" value={detail.rep} />
          <Field label="Delivery Method" value={detail.deliveryMethod} />
          <Field label="Purchase Order" value={detail.purchaseOrder} />
          <Field label="Tracking #" value={detail.trackingNumber} />
          <Field label="Rack Position" value={detail.rackPosition} />
          <Field label="On-Site Loaner" value={detail.onSiteLoaner ? 'Yes' : 'No'} />
          <Field label="Date Out" value={fmtDate(detail.dateOut)} />
          <Field label="Date In" value={fmtDate(detail.dateIn)} />
          <Field label="Created By" value={detail.createdBy} />
          <Field label="Created Date" value={fmtDate(detail.createdDate)} />
        </FormGrid>
      </div>
    );
  };

  const renderHistory = () => {
    if (historyLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>;
    if (history.length === 0) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>No history records found.</div>;
    return (
      <div className="loaner-drawer__history-list">
        {history.map(h => (
          <div key={h.loanerTranKey} className="loaner-drawer__history-card">
            <div className="loaner-drawer__history-top">
              <span className="loaner-drawer__history-client">{h.client || '\u2014'}</span>
              {h.daysOut > 0 && (
                <span className={`loaner-drawer__history-days ${daysColor(h.daysOut)}`}>
                  {h.daysOut}d
                </span>
              )}
            </div>
            <div className="loaner-drawer__history-dept">{h.dept || '\u2014'}</div>
            <div className="loaner-drawer__history-bottom">
              <span className="loaner-drawer__history-dates">
                {fmtDate(h.dateOut)} &rarr; {fmtDate(h.dateIn)}
              </span>
              {h.agreement && h.agreement !== 'None' && (
                <span className="loaner-drawer__history-agreement" style={{
                  background: h.agreement === 'Signed'
                    ? 'rgba(var(--success-rgb), 0.1)'
                    : 'rgba(var(--amber-rgb), 0.1)',
                  color: h.agreement === 'Signed' ? 'var(--success)' : 'var(--amber)',
                }}>
                  {h.agreement}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details': return renderDetails();
      case 'history': return renderHistory();
      case 'evaluation': return (
        <div className="loaner-drawer__placeholder">
          <div className="loaner-drawer__placeholder-icon">&#128203;</div>
          <div className="loaner-drawer__placeholder-text">Evaluation checklist for outbound and inbound scope inspections.</div>
          <DevNotice
            title="Evaluation Tracking"
            requirement="Create tblLoanerEval table to store pass/fail checklist results per scope per direction (outbound/inbound)."
            sql={'CREATE TABLE tblLoanerEval (\n  lLoanerEvalKey int IDENTITY PRIMARY KEY,\n  lLoanerTranKey int NOT NULL,\n  sDirection nvarchar(10) NOT NULL, -- \'out\' or \'in\'\n  sCheckKey nvarchar(50),\n  sResult nvarchar(10), -- \'pass\' or \'fail\'\n  sNotes nvarchar(500),\n  dtSubmitted datetime DEFAULT GETDATE(),\n  lSubmittedBy int\n)'}
          >
            <button className="loaner-drawer__placeholder-btn">Enable Evaluation</button>
          </DevNotice>
        </div>
      );
      case 'agreement': return (
        <div className="loaner-drawer__placeholder">
          <div className="loaner-drawer__placeholder-icon">&#128203;</div>
          <div className="loaner-drawer__placeholder-text">Loaner agreement generation, email, and tracking.</div>
          <DevNotice
            title="Agreement Tracking"
            requirement="Add agreement tracking columns to tblLoanerTran: dtAgreementSent, dtAgreementReceived, sAgreementEmail."
            sql={'ALTER TABLE tblLoanerTran ADD\n  dtAgreementSent datetime NULL,\n  dtAgreementReceived datetime NULL,\n  sAgreementEmail nvarchar(200) NULL'}
          >
            <button className="loaner-drawer__placeholder-btn">Generate Agreement</button>
          </DevNotice>
          <DevNotice
            title="Email Agreement"
            requirement="Email integration endpoint to send agreement PDF to department contact."
          >
            <button className="loaner-drawer__placeholder-btn">Email Agreement</button>
          </DevNotice>
        </div>
      );
      case 'shipping': return (
        <div className="loaner-drawer__placeholder">
          <div className="loaner-drawer__placeholder-icon">&#128203;</div>
          <div className="loaner-drawer__placeholder-text">UPS shipping label generation from tblShippingUPS_Loaners.</div>
          <DevNotice
            title="Shipping Labels"
            requirement="Migrate tblShippingUPS_Loaners to Azure SQL and create GET /api/loaners/{scopeKey}/shipping endpoint."
            sql="SELECT * FROM tblShippingUPS_Loaners WHERE lLoanerTranKey = @tranKey"
          >
            <button className="loaner-drawer__placeholder-btn">Generate Label</button>
          </DevNotice>
        </div>
      );
      default: return null;
    }
  };

  return (
    <>
      <div
        className={`loaner-drawer-overlay ${open ? 'loaner-drawer-overlay--open' : ''}`}
        onClick={onClose}
      />
      <div className={`loaner-drawer ${open ? 'loaner-drawer--open' : ''}`}>
        <div className="loaner-drawer__header">
          <div>
            <div className="loaner-drawer__title">
              {detail?.serial || 'Loading...'}
            </div>
            <div className="loaner-drawer__subtitle">
              {detail?.scopeType || ''}
            </div>
          </div>
          <button className="loaner-drawer__close" onClick={onClose} aria-label="Close drawer">&times;</button>
        </div>
        <TabBar
          tabs={DRAWER_TABS}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
        <div className="loaner-drawer__tab-content">
          {renderTabContent()}
        </div>
      </div>
    </>
  );
};
