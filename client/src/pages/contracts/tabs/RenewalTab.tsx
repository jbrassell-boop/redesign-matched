import type { ContractDetail } from '../types';
import { Field, FormGrid } from '../../../components/shared';
import {
  tabPaddingFlexStyle, panelBodyStyle, panelBodyLargeStyle,
  notesBlockStyle, formLabelStyle, fmtDate, fmtMoney,
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

export const RenewalTab = ({ detail }: { detail: ContractDetail }) => {
  const daysUntilExpiry = detail.terminationDate
    ? Math.ceil((new Date(detail.terminationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const expiryColor = daysUntilExpiry == null ? 'var(--muted)'
    : daysUntilExpiry < 0 ? 'var(--danger)'
    : daysUntilExpiry <= 90 ? 'var(--warning)'
    : 'var(--success)';

  const expiryLabel = daysUntilExpiry == null ? 'No termination date'
    : daysUntilExpiry < 0 ? `Expired ${Math.abs(daysUntilExpiry)}d ago`
    : daysUntilExpiry === 0 ? 'Expires today'
    : `Expires in ${daysUntilExpiry} days`;

  return (
    <div style={tabPaddingFlexStyle}>
      <Panel>
        <PanelHead><span>Renewal Status</span></PanelHead>
        <div style={panelBodyLargeStyle}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: expiryColor }}>{expiryLabel}</div>
            {detail.terminationDate && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Termination: {fmtDate(detail.terminationDate)}
              </div>
            )}
          </div>
          <FormGrid cols={2}>
            <Field label="Start Date" value={fmtDate(detail.effectiveDate)} />
            <Field label="End Date" value={fmtDate(detail.terminationDate)} />
            <Field label="Length (Months)" value={detail.lengthInMonths || '—'} />
            <Field label="Status" value={detail.status} />
            <Field label="Contract Total" value={detail.totalAmount > 0 ? fmtMoney(detail.totalAmount) : '—'} />
            <Field label="Amount Invoiced" value={detail.amtInvoiced > 0 ? fmtMoney(detail.amtInvoiced) : '—'} />
          </FormGrid>
        </div>
      </Panel>
      <Panel>
        <PanelHead><span>Billing Info</span></PanelHead>
        <div style={panelBodyStyle}>
          <FormGrid cols={2}>
            <Field label="Installments Total" value={detail.installmentsTotal || '—'} />
            <Field label="Installments Invoiced" value={detail.installmentsInvoiced || '—'} />
            <Field label="Service Plan" value={detail.servicePlan ? 'Yes' : 'No'} />
            <Field label="Shared Risk" value={detail.sharedRisk ? 'Yes' : 'No'} />
            <Field label="Tax Exempt" value={detail.taxExempt ? 'Yes' : 'No'} />
          </FormGrid>
          {detail.comments && (
            <div style={notesBlockStyle}>
              <div style={formLabelStyle}>Notes</div>
              {detail.comments}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
};
