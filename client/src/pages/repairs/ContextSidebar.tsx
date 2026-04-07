import type { ClientSummary, PrimaryContact, RepairScopeHistory, RepairFinancials } from './types';
import { SectionCard } from '../../components/shared';
import { StatusBadge } from '../../components/shared';
import './ContextSidebar.css';

interface ContextSidebarProps {
  clientSummary: ClientSummary | null;
  contact: PrimaryContact | null;
  scopeHistory: RepairScopeHistory[];
  financials: RepairFinancials | null;
  onViewClient?: () => void;
  onViewAllHistory?: () => void;
}

export const ContextSidebar = ({
  clientSummary, contact, scopeHistory, financials,
  onViewClient, onViewAllHistory,
}: ContextSidebarProps) => {
  const contactName = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '—'
    : '—';

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="context-sidebar">
      {/* Client & Pricing */}
      <SectionCard title="Client & Pricing">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>
            <span className="context-sidebar__field-label">Client</span>
            <div className="context-sidebar__field-value" style={{ fontWeight: 600 }}>
              {clientSummary?.name ?? '—'}
            </div>
          </div>
          <div>
            <span className="context-sidebar__field-label">Pricing Tier</span>
            <div className="context-sidebar__field-value">{clientSummary?.pricingCategory || '—'}</div>
          </div>
          <div>
            <span className="context-sidebar__field-label">Payment Terms</span>
            <div className="context-sidebar__field-value">{clientSummary?.paymentTerms || '—'}</div>
          </div>
          <div>
            <span className="context-sidebar__field-label">Sales Rep</span>
            <div className="context-sidebar__field-value">{clientSummary?.salesRep || '—'}</div>
          </div>
          {onViewClient && (
            <span className="context-sidebar__link" onClick={onViewClient} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewClient?.(); } }}>
              View full client &rarr;
            </span>
          )}
        </div>
      </SectionCard>

      {/* Send Estimate To */}
      <SectionCard title="Send Estimate To">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="context-sidebar__field-value" style={{ fontWeight: 600 }}>{contactName}</div>
          {contact?.title && <div className="context-sidebar__field-value">{contact.title}</div>}
          {contact?.email && (
            <a href={`mailto:${contact.email}`} className="context-sidebar__link">{contact.email}</a>
          )}
          {contact?.phone && (
            <div className="context-sidebar__field-value">{contact.phone}</div>
          )}
        </div>
      </SectionCard>

      {/* Scope History */}
      <SectionCard title="Scope History">
        {scopeHistory.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>No prior repairs</div>
        ) : (
          <>
            <table className="context-sidebar__mini-table">
              <thead>
                <tr><th>WO#</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {scopeHistory.slice(0, 5).map(h => (
                  <tr key={h.repairKey}>
                    <td>{h.wo}</td>
                    <td><StatusBadge status={h.status} /></td>
                    <td>{h.dateIn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {scopeHistory.length > 5 && onViewAllHistory && (
              <span className="context-sidebar__link" onClick={onViewAllHistory} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewAllHistory?.(); } }} style={{ marginTop: 4, display: 'inline-block' }}>
                View all {scopeHistory.length} &rarr;
              </span>
            )}
          </>
        )}
      </SectionCard>

      {/* Financial Snapshot */}
      {financials && (
        <SectionCard title="Financial Snapshot">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>
              <span className="context-sidebar__field-label">Revenue</span>
              <div className="context-sidebar__field-value">{fmt(financials.invoiceTotal)}</div>
            </div>
            <div>
              <span className="context-sidebar__field-label">Expenses</span>
              <div className="context-sidebar__field-value">{fmt(financials.totalExpenses)}</div>
            </div>
            <div>
              <span className="context-sidebar__field-label">Margin</span>
              <div className={`context-sidebar__field-value ${
                financials.marginPct >= 0 ? 'context-sidebar__margin--positive' : 'context-sidebar__margin--negative'
              }`} style={{ fontWeight: 700 }}>
                {financials.marginPct.toFixed(1)}%
              </div>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
};
