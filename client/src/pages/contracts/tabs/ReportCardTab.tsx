import type { ContractDetail } from '../types';
import { Field, FormGrid } from '../../../components/shared';
import {
  tabPaddingFlexStyle, panelBodyStyle,
  reportMetricContainerStyle, reportMetricCardStyle, reportMetricLabelStyle,
  fmtDate, fmtMoney,
} from './shared';

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
    {children}
  </div>
);

const PanelHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: 'var(--neutral-50)', padding: '7px 12px',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>
    {children}
  </div>
);

export const ReportCardTab = ({ detail }: { detail: ContractDetail }) => {
  const daysUntilExpiry = detail.terminationDate
    ? Math.ceil((new Date(detail.terminationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const metrics = [
    { label: 'Contract Status', value: detail.status, color: detail.status === 'Active' ? 'var(--success)' : detail.status === 'Expiring' ? 'var(--warning)' : 'var(--danger)' },
    { label: 'Total Value', value: detail.totalAmount > 0 ? fmtMoney(detail.totalAmount) : '—', color: 'var(--navy)' },
    { label: 'Invoiced', value: detail.amtInvoiced > 0 ? fmtMoney(detail.amtInvoiced) : '—', color: 'var(--primary)' },
    { label: 'Scopes Covered', value: detail.countAll > 0 ? String(detail.countAll) : '—', color: 'var(--navy)' },
    {
      label: 'Days Remaining',
      value: daysUntilExpiry != null ? (daysUntilExpiry < 0 ? 'Expired' : `${daysUntilExpiry}d`) : '—',
      color: daysUntilExpiry == null ? 'var(--muted)' : daysUntilExpiry < 0 ? 'var(--danger)' : daysUntilExpiry <= 90 ? 'var(--warning)' : 'var(--success)',
    },
  ];

  return (
    <div style={tabPaddingFlexStyle}>
      <Panel>
        <PanelHead><span>Performance Summary</span></PanelHead>
        <div style={panelBodyStyle}>
          <div style={reportMetricContainerStyle}>
            {metrics.map(m => (
              <div key={m.label} style={reportMetricCardStyle}>
                <div style={reportMetricLabelStyle}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: m.color, lineHeight: 1.1 }}>{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <Panel>
        <PanelHead><span>Contract Details</span></PanelHead>
        <div style={panelBodyStyle}>
          <FormGrid cols={2}>
            <Field label="Contract #" value={detail.contractNumber || '\u2014'} />
            <Field label="Contract ID" value={detail.contractId || '\u2014'} />
            <Field label="Start Date" value={fmtDate(detail.effectiveDate)} />
            <Field label="End Date" value={fmtDate(detail.terminationDate)} />
            <Field label="Length" value={detail.lengthInMonths ? `${detail.lengthInMonths} months` : '\u2014'} />
            <Field label="Service Plan" value={detail.servicePlan ? 'Yes' : 'No'} />
          </FormGrid>
        </div>
      </Panel>
    </div>
  );
};
