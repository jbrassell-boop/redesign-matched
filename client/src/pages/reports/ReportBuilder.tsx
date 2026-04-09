import { message } from 'antd';
import type { ParamType } from './types';
import './ReportBuilder.css';

/* ── Dropdown option lists ───────────────────────────────────────── */

const SALES_REPS = ['All Reps', 'Joe Repso', 'Brian Kenney', 'Susan Oravits', 'Deanna Craven', 'Timothy Reilly', 'Alfred Zieniatz', 'House Account'];
const INST_TYPES = ['All Types', 'Flexible', 'Rigid', 'Camera', 'Instrument'];
const REPAIR_STATUSES = ['Open', 'Closed', 'All'];
const LEADERBOARD_TYPES = ['Summary', 'Net New Customers', 'Work Orders'];
const DATE_RANGE_FIELDS = ['Date In', 'Date Out', 'Invoice Date', 'Completion Date'];
const REPORT_CARD_TYPES = ['Monthly Breakdown: No Serial Number', 'Monthly Breakdown: With Serial Number', 'Total Counts By Serial Number', 'Loaner Requests'];
const RISK_SUMMARY_BY = ['Department', 'Client', 'Sales Rep'];

/* ── Reusable param rows ─────────────────────────────────────────── */

const DateRangeRow = () => (
  <div className="rb-row">
    <span className="rb-label">Date Range</span>
    <input type="date" aria-label="Report start date" className="rb-input rb-date" />
    <span className="rb-date-sep">to</span>
    <input type="date" aria-label="Report end date" className="rb-input rb-date" />
  </div>
);

const ClientRow = () => (
  <div className="rb-row">
    <span className="rb-label">Client</span>
    <select className="rb-select" aria-label="Client filter"><option>All Clients</option></select>
  </div>
);

const DeptRow = () => (
  <div className="rb-row">
    <span className="rb-label">Department</span>
    <select className="rb-select" aria-label="Department filter"><option>All Departments</option></select>
  </div>
);

const SalesRepRow = () => (
  <div className="rb-row">
    <span className="rb-label">Sales Rep</span>
    <select className="rb-select" aria-label="Sales rep filter">{SALES_REPS.map(r => <option key={r}>{r}</option>)}</select>
  </div>
);

const InstTypeRow = () => (
  <div className="rb-row">
    <span className="rb-label">Inst. Type</span>
    <select className="rb-select" aria-label="Instrument type filter">{INST_TYPES.map(t => <option key={t}>{t}</option>)}</select>
  </div>
);

/* ── Generate button ─────────────────────────────────────────────── */

const GenerateButton = ({ label, reportId, onGenerate }: { label: string; reportId: string; onGenerate: (id: string) => void }) => (
  <div className="rb-row--end">
    <button className="rb-gen-btn" onClick={() => onGenerate(reportId)}>{label}</button>
  </div>
);

/* ── Parameter panels by type ────────────────────────────────────── */

interface BuilderProps {
  reportId: string;
  paramType: ParamType;
  extractOnly?: boolean;
  onGenerate: (id: string) => void;
}

export const ReportBuilder = ({ reportId, paramType, extractOnly, onGenerate }: BuilderProps) => {
  const genLabel = extractOnly ? 'Generate Extract' : 'Generate Report';

  const renderParams = () => {
    switch (paramType) {
      case 'instant':
        return (
          <div className="rb-row">
            <span className="rb-instant-text">This report runs instantly with no parameters.</span>
          </div>
        );

      case 'repair-list':
        return (
          <>
            <DateRangeRow />
            <div className="rb-row">
              <span className="rb-label">Status</span>
              <select className="rb-select" aria-label="Status filter">{REPAIR_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
            </div>
            <div className="rb-row">
              <span className="rb-label">Sort By</span>
              <select className="rb-select" aria-label="Sort by">
                <option>Date</option><option>Client</option><option>Status</option><option>Technician</option>
              </select>
            </div>
            <SalesRepRow />
            <InstTypeRow />
            <div className="rb-row">
              <span className="rb-label">Options</span>
              <label className="rb-check-label">
                <input type="checkbox" defaultChecked style={{ accentColor: 'var(--primary)' }} /> Include Amounts
              </label>
            </div>
          </>
        );

      case 'client-dept':
        return (
          <>
            <DateRangeRow />
            <ClientRow />
            <DeptRow />
          </>
        );

      case 'client-date':
        return (
          <>
            <DateRangeRow />
            <ClientRow />
          </>
        );

      case 'repair-counts':
        return (
          <>
            <DateRangeRow />
            <ClientRow />
            <InstTypeRow />
            <div className="rb-row">
              <span className="rb-label">Options</span>
              <label className="rb-check-label">
                <input type="checkbox" style={{ accentColor: 'var(--primary)' }} /> High Level Summary
              </label>
            </div>
          </>
        );

      case 'billable':
        return (
          <>
            <DateRangeRow />
            <ClientRow />
            <div className="rb-row">
              <span className="rb-label">Report Type</span>
              <select className="rb-select" aria-label="Report type"><option>Summary</option><option>By Scope Type</option></select>
            </div>
          </>
        );

      case 'vendor':
        return (
          <>
            <DateRangeRow />
            <ClientRow />
            <div className="rb-row">
              <span className="rb-label">Vendor</span>
              <input type="text" className="rb-input" style={{ width: 200 }} placeholder="Enter vendor name..." aria-label="Vendor name filter" />
            </div>
          </>
        );

      case 'quality-std':
        return (
          <>
            <DateRangeRow />
            <InstTypeRow />
          </>
        );

      case 'po-receipts':
        return (
          <>
            <DateRangeRow />
            <div className="rb-row">
              <span className="rb-label">Lot Number</span>
              <input type="text" className="rb-input" style={{ width: 160 }} placeholder="Enter lot number..." aria-label="Lot number filter" />
            </div>
          </>
        );

      case 'activity-tracking':
        return (
          <>
            <DateRangeRow />
            <div className="rb-row">
              <span className="rb-label">Date Field</span>
              <select className="rb-select" aria-label="Date field">{DATE_RANGE_FIELDS.map(f => <option key={f}>{f}</option>)}</select>
            </div>
            <div className="rb-row">
              <span className="rb-label">Repair Items</span>
              <input type="text" className="rb-input" style={{ width: 160 }} defaultValue="*" title="Wildcard * for all items" aria-label="Repair items filter" />
            </div>
          </>
        );

      case 'client-report-card':
        return (
          <>
            <ClientRow />
            <DeptRow />
            <div className="rb-row">
              <span className="rb-label">Contract</span>
              <select className="rb-select" aria-label="Contract filter"><option>All Contracts</option></select>
            </div>
            <DateRangeRow />
            <div className="rb-row">
              <span className="rb-label">Report Type</span>
              <select className="rb-select" aria-label="Report type">{REPORT_CARD_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            </div>
            <div className="rb-row">
              <span className="rb-label">Options</span>
              <label className="rb-check-label">
                <input type="checkbox" style={{ accentColor: 'var(--primary)' }} /> Include Inactive
              </label>
            </div>
          </>
        );

      case 'at-risk':
        return (
          <>
            <div className="rb-row">
              <span className="rb-label">Expenses</span>
              <div className="rb-check-group">
                {['Outsource', 'GPO', 'Inventory', 'Commissions', 'Shipping', 'Labor'].map(exp => (
                  <label key={exp} className="rb-check-label">
                    <input type="checkbox" defaultChecked style={{ accentColor: 'var(--primary)' }} /> {exp}
                  </label>
                ))}
              </div>
            </div>
            <div className="rb-row">
              <span className="rb-label">Min Invoices</span>
              <input type="number" className="rb-input" style={{ width: 80 }} defaultValue={1} min={1} aria-label="Minimum invoices" />
              <span className="rb-row-text">in past year</span>
            </div>
            <div className="rb-row">
              <span className="rb-label">Summary By</span>
              <select className="rb-select" aria-label="Summary by">{RISK_SUMMARY_BY.map(r => <option key={r}>{r}</option>)}</select>
            </div>
          </>
        );

      case 'trending':
        return (
          <>
            <DateRangeRow />
            <div className="rb-row">
              <span className="rb-label">Repair Detail</span>
              <input type="text" className="rb-input" style={{ width: 200 }} placeholder="Filter by repair detail..." aria-label="Filter by repair detail" />
            </div>
            <div className="rb-row">
              <span className="rb-label">Client</span>
              <input type="text" className="rb-input" style={{ width: 200 }} placeholder="Enter client name..." aria-label="Client name filter" />
            </div>
            <div className="rb-row">
              <span className="rb-label">Department</span>
              <input type="text" className="rb-input" style={{ width: 200 }} placeholder="Enter department..." aria-label="Department filter" />
            </div>
          </>
        );

      case 'leaderboard':
        return (
          <>
            <div className="rb-row">
              <span className="rb-label">Month</span>
              <input type="month" aria-label="Leaderboard month" className="rb-input" style={{ width: 160 }} />
            </div>
            <div className="rb-row">
              <span className="rb-label">Report Type</span>
              <select className="rb-select" aria-label="Report type">{LEADERBOARD_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            </div>
          </>
        );

      case 'salesrep-month':
        return (
          <>
            <div className="rb-row">
              <span className="rb-label">Month</span>
              <input type="month" aria-label="Sales rep report month" className="rb-input" style={{ width: 160 }} />
            </div>
            <SalesRepRow />
          </>
        );

      case 'salesrep':
        return (
          <>
            <DateRangeRow />
            <SalesRepRow />
          </>
        );

      case 'salesrep-detail':
        return (
          <>
            <DateRangeRow />
            <SalesRepRow />
            <div className="rb-row">
              <span className="rb-label">View</span>
              <select className="rb-select" aria-label="View"><option>Summary</option><option>Detail</option></select>
            </div>
          </>
        );

      case 'sales':
        return (
          <>
            <DateRangeRow />
            <SalesRepRow />
            <div className="rb-row">
              <span className="rb-label">Sort By</span>
              <select className="rb-select" aria-label="Sort by"><option>Invoice Date</option><option>Client</option><option>Amount</option></select>
            </div>
          </>
        );

      default:
        return <DateRangeRow />;
    }
  };

  return (
    <div className="rb-panel">
      {renderParams()}
      <GenerateButton label={genLabel} reportId={reportId} onGenerate={onGenerate} />
    </div>
  );
};

/* ── Default generate handler ────────────────────────────────────── */

const REPORT_ENDPOINTS: Record<string, string> = {
  // Repair Reports
  'repair-volume': '/reports/repair-volume',
  'repair-tat': '/reports/tat-analysis',
  'tech-productivity': '/reports/tech-productivity',
  'repair-cost': '/reports/revenue-client',
  'warranty-claims': '/reports/warranty-claims',
  'scope-repair-list': '/reports/scope-repair-list',
  'scope-repair-hist': '/reports/scope-repair-list',
  'repair-metrics': '/reports/client-scorecard',
  'repair-counts-item': '/reports/warranty-claims',
  'billable-report': '/reports/revenue-client',
  'repairs-40-days': '/reports/scope-repair-list',
  'repair-amendments': '/reports/scope-repair-list',
  'repairs-non-tsi': '/reports/scope-repair-list',
  'repairs-no-tracking': '/reports/scope-repair-list',
  'parent-child-items': '/reports/warranty-claims',
  'true-repair-costs': '/reports/revenue-client',
  'sub-assy-model': '/reports/warranty-claims',
  'sub-assy-tech': '/reports/tech-productivity',
  'insert-tube-comp': '/reports/warranty-claims',
  // Financial Reports
  'revenue-client': '/reports/revenue-client',
  'outstanding-aging': '/reports/revenue-client',
  'monthly-revenue': '/reports/repair-volume',
  'monthly-sales': '/reports/repair-volume',
  'cash-receipts': '/reports/revenue-client',
  'invoice-list': '/reports/revenue-client',
  'sales-invoices': '/reports/revenue-client',
  'profit-margin': '/reports/revenue-client',
  'cogs': '/reports/revenue-client',
  'commissions-xref': '/reports/tech-productivity',
  // Client Reports
  'client-report-card': '/reports/client-scorecard',
  'client-activity': '/reports/client-scorecard',
  'client-sales-summ': '/reports/client-scorecard',
  'active-customers': '/reports/client-scorecard',
  'new-customers': '/reports/client-scorecard',
  'net-new-customers': '/reports/client-scorecard',
  // Sales Reports
  'revenue-per-rep': '/reports/tech-productivity',
  'sales-leaderboard': '/reports/tech-productivity',
  'revenue-per-state': '/reports/revenue-client',
  'sales-by-account': '/reports/revenue-client',
  // Contract Reports
  'contract-expiry': '/reports/client-scorecard',
  'contract-util': '/reports/client-scorecard',
  'contract-value': '/reports/revenue-client',
  // Inventory Reports
  'stock-level': '/reports/warranty-claims',
  'reorder-point': '/reports/warranty-claims',
  'parts-usage': '/reports/warranty-claims',
  'used-inventory': '/reports/warranty-claims',
  'dead-stock': '/reports/warranty-claims',
  // GPO Reports
  'hpg-report': '/reports/revenue-client',
  'vizient-report': '/reports/revenue-client',
  'gsa-report': '/reports/revenue-client',
  // Operations Reports
  'sla-compliance': '/reports/tat-analysis',
  'defect-tracking': '/reports/warranty-claims',
  'trending-workflow': '/reports/repair-volume',
  'inspection-signoff': '/reports/scope-repair-list',
  'loaner-requests': '/reports/scope-repair-list',
};

export const handleGenerate = async (id: string) => {
  const endpoint = REPORT_ENDPOINTS[id];
  if (!endpoint) {
    message.info('This report type is not yet available for export');
    return;
  }
  message.loading({ content: 'Generating report...', key: 'report', duration: 0 });
  try {
    const token = localStorage.getItem('tsi_token');
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const resp = await fetch(`${baseUrl}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error('Failed');
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resp.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `${id}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    message.success({ content: 'Report downloaded', key: 'report' });
  } catch {
    message.error({ content: 'Failed to generate report', key: 'report' });
  }
};
