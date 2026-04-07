import { message } from 'antd';
import type { ParamType } from './types';

/* ── Shared input styles ─────────────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  height: 28, border: '1.5px solid var(--border-dk)', borderRadius: 4,
  padding: '0 8px', fontSize: 11, fontFamily: 'inherit', color: 'var(--text)',
  background: 'var(--card)', outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer', minWidth: 120,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
  letterSpacing: '0.04em', minWidth: 55, textAlign: 'right',
};

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8,
};

const genBtnStyle: React.CSSProperties = {
  height: 28, padding: '0 16px', border: 'none', borderRadius: 4,
  background: 'var(--success)', color: 'var(--card)', fontSize: 11, fontWeight: 700,
  fontFamily: 'inherit', cursor: 'pointer', transition: 'background 0.1s',
};

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
  <div style={rowStyle}>
    <span style={labelStyle}>Date Range</span>
    <input type="date" aria-label="Report start date" style={{ ...inputStyle, width: 130 }} />
    <span style={{ fontSize: 10, color: 'var(--muted)' }}>to</span>
    <input type="date" aria-label="Report end date" style={{ ...inputStyle, width: 130 }} />
  </div>
);

const ClientRow = () => (
  <div style={rowStyle}>
    <span style={labelStyle}>Client</span>
    <select style={selectStyle}><option>All Clients</option></select>
  </div>
);

const DeptRow = () => (
  <div style={rowStyle}>
    <span style={labelStyle}>Department</span>
    <select style={selectStyle}><option>All Departments</option></select>
  </div>
);

const SalesRepRow = () => (
  <div style={rowStyle}>
    <span style={labelStyle}>Sales Rep</span>
    <select style={selectStyle}>{SALES_REPS.map(r => <option key={r}>{r}</option>)}</select>
  </div>
);

const InstTypeRow = () => (
  <div style={rowStyle}>
    <span style={labelStyle}>Inst. Type</span>
    <select style={selectStyle}>{INST_TYPES.map(t => <option key={t}>{t}</option>)}</select>
  </div>
);

/* ── Generate button ─────────────────────────────────────────────── */

const GenerateButton = ({ label, reportId, onGenerate }: { label: string; reportId: string; onGenerate: (id: string) => void }) => (
  <div style={{ ...rowStyle, justifyContent: 'flex-end', marginBottom: 0 }}>
    <button style={genBtnStyle} onClick={() => onGenerate(reportId)}>{label}</button>
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
          <div style={rowStyle}>
            <span style={{ fontSize: 11, color: 'var(--label)' }}>This report runs instantly with no parameters.</span>
          </div>
        );

      case 'repair-list':
        return (
          <>
            <DateRangeRow />
            <div style={rowStyle}>
              <span style={labelStyle}>Status</span>
              <select style={selectStyle}>{REPAIR_STATUSES.map(s => <option key={s}>{s}</option>)}</select>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Sort By</span>
              <select style={selectStyle}>
                <option>Date</option><option>Client</option><option>Status</option><option>Technician</option>
              </select>
            </div>
            <SalesRepRow />
            <InstTypeRow />
            <div style={rowStyle}>
              <span style={labelStyle}>Options</span>
              <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
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
            <div style={rowStyle}>
              <span style={labelStyle}>Options</span>
              <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
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
            <div style={rowStyle}>
              <span style={labelStyle}>Report Type</span>
              <select style={selectStyle}><option>Summary</option><option>By Scope Type</option></select>
            </div>
          </>
        );

      case 'vendor':
        return (
          <>
            <DateRangeRow />
            <ClientRow />
            <div style={rowStyle}>
              <span style={labelStyle}>Vendor</span>
              <input type="text" style={{ ...inputStyle, width: 200 }} placeholder="Enter vendor name..." aria-label="Vendor name filter" />
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
            <div style={rowStyle}>
              <span style={labelStyle}>Lot Number</span>
              <input type="text" style={{ ...inputStyle, width: 160 }} placeholder="Enter lot number..." aria-label="Lot number filter" />
            </div>
          </>
        );

      case 'activity-tracking':
        return (
          <>
            <DateRangeRow />
            <div style={rowStyle}>
              <span style={labelStyle}>Date Field</span>
              <select style={selectStyle}>{DATE_RANGE_FIELDS.map(f => <option key={f}>{f}</option>)}</select>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Repair Items</span>
              <input type="text" style={{ ...inputStyle, width: 160 }} defaultValue="*" title="Wildcard * for all items" />
            </div>
          </>
        );

      case 'client-report-card':
        return (
          <>
            <ClientRow />
            <DeptRow />
            <div style={rowStyle}>
              <span style={labelStyle}>Contract</span>
              <select style={selectStyle}><option>All Contracts</option></select>
            </div>
            <DateRangeRow />
            <div style={rowStyle}>
              <span style={labelStyle}>Report Type</span>
              <select style={selectStyle}>{REPORT_CARD_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Options</span>
              <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: 'var(--primary)' }} /> Include Inactive
              </label>
            </div>
          </>
        );

      case 'at-risk':
        return (
          <>
            <div style={rowStyle}>
              <span style={labelStyle}>Expenses</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Outsource', 'GPO', 'Inventory', 'Commissions', 'Shipping', 'Labor'].map(exp => (
                  <label key={exp} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: 'var(--primary)' }} /> {exp}
                  </label>
                ))}
              </div>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Min Invoices</span>
              <input type="number" style={{ ...inputStyle, width: 80 }} defaultValue={1} min={1} />
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>in past year</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Summary By</span>
              <select style={selectStyle}>{RISK_SUMMARY_BY.map(r => <option key={r}>{r}</option>)}</select>
            </div>
          </>
        );

      case 'trending':
        return (
          <>
            <DateRangeRow />
            <div style={rowStyle}>
              <span style={labelStyle}>Repair Detail</span>
              <input type="text" style={{ ...inputStyle, width: 200 }} placeholder="Filter by repair detail..." aria-label="Filter by repair detail" />
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Client</span>
              <input type="text" style={{ ...inputStyle, width: 200 }} placeholder="Enter client name..." aria-label="Client name filter" />
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Department</span>
              <input type="text" style={{ ...inputStyle, width: 200 }} placeholder="Enter department..." aria-label="Department filter" />
            </div>
          </>
        );

      case 'leaderboard':
        return (
          <>
            <div style={rowStyle}>
              <span style={labelStyle}>Month</span>
              <input type="month" aria-label="Leaderboard month" style={{ ...inputStyle, width: 160 }} />
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Report Type</span>
              <select style={selectStyle}>{LEADERBOARD_TYPES.map(t => <option key={t}>{t}</option>)}</select>
            </div>
          </>
        );

      case 'salesrep-month':
        return (
          <>
            <div style={rowStyle}>
              <span style={labelStyle}>Month</span>
              <input type="month" aria-label="Sales rep report month" style={{ ...inputStyle, width: 160 }} />
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
            <div style={rowStyle}>
              <span style={labelStyle}>View</span>
              <select style={selectStyle}><option>Summary</option><option>Detail</option></select>
            </div>
          </>
        );

      case 'sales':
        return (
          <>
            <DateRangeRow />
            <SalesRepRow />
            <div style={rowStyle}>
              <span style={labelStyle}>Sort By</span>
              <select style={selectStyle}><option>Invoice Date</option><option>Client</option><option>Amount</option></select>
            </div>
          </>
        );

      default:
        return <DateRangeRow />;
    }
  };

  return (
    <div style={{
      marginTop: 8, padding: '10px 12px',
      background: 'var(--neutral-50)', border: '1px solid var(--border)',
      borderRadius: 4,
    }}>
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
