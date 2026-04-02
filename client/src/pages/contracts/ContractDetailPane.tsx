import { Tabs, Spin } from 'antd';
import type { ContractDetail, ContractStats } from './types';

interface FieldProps { label: string; value: string | number | null | undefined; }
const Field = ({ label, value }: FieldProps) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13, color: 'var(--text)', padding: '4px 8px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, minHeight: 28 }}>{value ?? '—'}</div>
  </div>
);

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const statusStyle = (status: ContractDetail['status']): React.CSSProperties => {
  if (status === 'Active') return { background: '#F0FDF4', border: '1px solid #BBF7D0', color: 'var(--success)' };
  if (status === 'Expiring') return { background: '#FFFBEB', border: '1px solid #FDE68A', color: 'var(--warning)' };
  return { background: '#FEF2F2', border: '1px solid #FECACA', color: 'var(--danger)' };
};

// Stat strip chip
interface StatChipProps {
  label: string;
  value: string | number;
  iconColor: string;
  iconBg: string;
  icon: React.ReactNode;
  valueColor?: string;
}
const StatChip = ({ label, value, iconColor, iconBg, icon, valueColor }: StatChipProps) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8, flex: 1,
    padding: '8px 12px', borderRight: '1px solid var(--neutral-200)',
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
      background: iconBg, color: iconColor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 15, fontWeight: 800, color: valueColor ?? 'var(--navy)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  </div>
);

interface ContractDetailPaneProps {
  detail: ContractDetail | null;
  loading: boolean;
  stats: ContractStats | null;
}

const IconDoc = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
    <rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 5h6M5 8h6M5 11h4" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
    <circle cx="8" cy="8" r="5.5" /><polyline points="5.5 8 7 10 10.5 6" />
  </svg>
);
const IconWarn = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
    <path d="M7.13 2.5L1.5 12.5a1 1 0 0 0 .87 1.5h11.26a1 1 0 0 0 .87-1.5L8.87 2.5a1 1 0 0 0-1.74 0z" />
    <line x1="8" y1="6" x2="8" y2="9" /><circle cx="8" cy="11.5" r=".5" fill="currentColor" stroke="none" />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
    <circle cx="8" cy="8" r="5.5" />
    <line x1="5.5" y1="5.5" x2="10.5" y2="10.5" /><line x1="10.5" y1="5.5" x2="5.5" y2="10.5" />
  </svg>
);
const IconDollar = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
    <line x1="8" y1="1.5" x2="8" y2="14.5" />
    <path d="M11 4.5H6.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H5" />
  </svg>
);

const ComingSoon = ({ label }: { label: string }) => (
  <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
    {label} coming soon
  </div>
);

export const ContractDetailPane = ({ detail, loading, stats }: ContractDetailPaneProps) => {
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!detail) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
      Select a contract to view details
    </div>
  );

  const specsTab = (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Contract Information */}
          <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            <div style={{
              background: 'var(--neutral-50)', padding: '7px 12px',
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
            }}>
              Contract Information
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <Field label="Contract Name" value={detail.name} />
                </div>
                <Field label="Contract #" value={detail.contractNumber} />
                <Field label="Contract ID" value={detail.contractId} />
                <Field label="Contract Type" value={detail.contractType > 0 ? `Type ${detail.contractType}` : '—'} />
                <Field label="Length (Months)" value={detail.lengthInMonths || '—'} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                {detail.servicePlan && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: '#EFF6FF', border: '1px solid #BFDBFE', color: 'var(--primary)' }}>
                    Service Plan
                  </span>
                )}
                {detail.sharedRisk && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: '#FFFBEB', border: '1px solid #FDE68A', color: 'var(--warning)' }}>
                    Shared Risk
                  </span>
                )}
                {detail.taxExempt && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: 'var(--neutral-100)', border: '1px solid var(--neutral-200)', color: 'var(--muted)' }}>
                    Tax Exempt
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {detail.comments && (
            <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              <div style={{
                background: 'var(--neutral-50)', padding: '7px 12px',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
              }}>Notes</div>
              <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                {detail.comments}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Term & Financials */}
          <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            <div style={{
              background: 'var(--neutral-50)', padding: '7px 12px',
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
            }}>
              Term &amp; Financials
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <Field label="Start Date" value={fmtDate(detail.effectiveDate)} />
                <Field label="End Date" value={fmtDate(detail.terminationDate)} />
                <Field label="Contract Total" value={detail.totalAmount > 0 ? fmtMoney(detail.totalAmount) : '—'} />
                <Field label="Invoiced" value={detail.amtInvoiced > 0 ? fmtMoney(detail.amtInvoiced) : '—'} />
                <Field label="Installments Total" value={detail.installmentsTotal || '—'} />
                <Field label="Installments Invoiced" value={detail.installmentsInvoiced || '—'} />
              </div>
            </div>
          </div>

          {/* Scope Counts */}
          <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
            <div style={{
              background: 'var(--neutral-50)', padding: '7px 12px',
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
            }}>
              Scope Coverage
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 8px' }}>
                <Field label="Total" value={detail.countAll || '—'} />
                <Field label="Flexible" value={detail.countFlexible || '—'} />
                <Field label="Rigid" value={detail.countRigid || '—'} />
                <Field label="Camera" value={detail.countCamera || '—'} />
              </div>
              {detail.countInstrument > 0 && (
                <Field label="Instrument" value={detail.countInstrument} />
              )}
            </div>
          </div>

          {/* Bill To */}
          {(detail.billName || detail.billAddress) && (
            <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
              <div style={{
                background: 'var(--neutral-50)', padding: '7px 12px',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
              }}>
                Bill To
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  {detail.billName && <div style={{ gridColumn: 'span 2' }}><Field label="Name" value={detail.billName} /></div>}
                  {detail.billAddress && <div style={{ gridColumn: 'span 2' }}><Field label="Address" value={detail.billAddress} /></div>}
                  <Field label="City" value={detail.billCity} />
                  <Field label="State / Zip" value={[detail.billState, detail.billZip].filter(Boolean).join(' ')} />
                  {detail.phone && <Field label="Phone" value={detail.phone} />}
                  {detail.billEmail && <Field label="Bill Email" value={detail.billEmail} />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Detail header */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--neutral-200)',
        background: 'var(--card)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>{detail.name || '(Unnamed)'}</span>
          {detail.contractNumber && (
            <span style={{
              background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)',
              borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, color: 'var(--steel)',
            }}>
              {detail.contractNumber}
            </span>
          )}
          <span style={{
            display: 'inline-flex', padding: '3px 12px', borderRadius: 12,
            fontSize: 11, fontWeight: 700,
            ...statusStyle(detail.status),
          }}>
            {detail.status.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500,
            background: 'var(--card)', border: '1px solid var(--neutral-200)',
            borderRadius: 6, cursor: 'pointer', color: 'var(--text)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500,
            background: 'var(--card)', border: '1px solid var(--neutral-200)',
            borderRadius: 6, cursor: 'pointer', color: 'var(--text)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Generate CSA
          </button>
        </div>
      </div>

      {/* KPI Stat Strip */}
      <div style={{
        display: 'flex', background: 'var(--card)',
        borderBottom: '1px solid var(--neutral-200)', flexShrink: 0,
      }}>
        <StatChip
          label="Total Contracts"
          value={stats?.total ?? '—'}
          iconColor="var(--primary)"
          iconBg="rgba(var(--primary-rgb), 0.13)"
          icon={<IconDoc />}
        />
        <StatChip
          label="Active"
          value={stats?.active ?? '—'}
          iconColor="var(--success)"
          iconBg="rgba(var(--success-rgb), 0.13)"
          icon={<IconCheck />}
          valueColor="var(--success)"
        />
        <StatChip
          label="Expiring ≤90d"
          value={stats?.expiring ?? '—'}
          iconColor="var(--warning)"
          iconBg="rgba(var(--amber-rgb), 0.13)"
          icon={<IconWarn />}
          valueColor="var(--warning)"
        />
        <StatChip
          label="Expired"
          value={stats?.expired ?? '—'}
          iconColor="var(--danger)"
          iconBg="rgba(var(--danger-rgb), 0.13)"
          icon={<IconX />}
          valueColor="var(--danger)"
        />
        <StatChip
          label="Annual Value"
          value={stats ? fmtMoney(stats.totalACV) : '—'}
          iconColor="var(--navy)"
          iconBg="rgba(var(--navy-rgb), 0.13)"
          icon={<IconDollar />}
        />
      </div>

      {/* Tab bar */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          size="small"
          tabBarStyle={{ margin: 0, padding: '0 12px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          items={[
            { key: 'specs', label: 'Specifications', children: <div style={{ flex: 1, overflowY: 'auto' }}>{specsTab}</div> },
            { key: 'departments', label: 'Departments', children: <ComingSoon label="Departments" /> },
            { key: 'scopes', label: 'Scopes', children: <ComingSoon label="Scopes" /> },
            { key: 'repairs', label: 'Repairs', children: <ComingSoon label="Repairs" /> },
            { key: 'notes', label: 'Notes', children: <ComingSoon label="Notes" /> },
            { key: 'amendments', label: 'Amendments', children: <ComingSoon label="Amendments" /> },
            { key: 'renewal', label: 'Renewal', children: <ComingSoon label="Renewal" /> },
          ]}
        />
      </div>
    </div>
  );
};
