import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getContractScopes, getContractRepairs, getContractInvoices, getContractNotes, getContractDocuments, getContractHealth } from '../../api/contracts';
import type { ContractDetail, ContractStats, ContractScope, ContractRepair, ContractInvoice, ContractNote, ContractDocument, ContractHealth } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtMoney = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtMoneyDecimal = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);

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

// Panel section
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

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
    {children}
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

// Table styling
const thStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
  textAlign: 'left', background: 'var(--neutral-50)', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: 12, borderBottom: '1px solid var(--neutral-200)',
  color: 'var(--text)',
};

const repairStatusColor = (s: string) => {
  const lower = s.toLowerCase();
  if (lower.includes('complete') || lower.includes('closed')) return 'var(--success)';
  if (lower.includes('repair') || lower.includes('progress')) return 'var(--warning)';
  return 'var(--muted)';
};

// ===== SCOPES TAB =====
const ScopesTab = ({ contractKey }: { contractKey: number }) => {
  const [scopes, setScopes] = useState<ContractScope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getContractScopes(contractKey).then(setScopes).catch(() => {}).finally(() => setLoading(false));
  }, [contractKey]);

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="small" /></div>;

  const countFlex = scopes.filter(s => s.rigidOrFlexible === 'F').length;
  const countRigid = scopes.filter(s => s.rigidOrFlexible === 'R').length;

  return (
    <div style={{ padding: '10px 14px' }}>
      {/* Mini stat strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'Total', value: scopes.length, color: 'var(--navy)' },
          { label: 'Flexible', value: countFlex, color: 'var(--primary)' },
          { label: 'Rigid', value: countRigid, color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--neutral-200)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <Panel>
        <PanelHead><span>Covered Scopes ({scopes.length})</span></PanelHead>
        <div style={{ padding: 0, maxHeight: 400, overflowY: 'auto' }}>
          {scopes.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>No scopes assigned to this contract</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Serial #</th>
                  <th style={thStyle}>Model</th>
                  <th style={thStyle}>Manufacturer</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Effective</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {scopes.map(s => (
                  <tr key={s.contractScopeKey}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{s.serialNumber || '—'}</td>
                    <td style={tdStyle}>{s.model || '—'}</td>
                    <td style={tdStyle}>{s.manufacturer || '—'}</td>
                    <td style={tdStyle}>{s.rigidOrFlexible === 'F' ? 'Flexible' : s.rigidOrFlexible === 'R' ? 'Rigid' : s.rigidOrFlexible || '—'}</td>
                    <td style={tdStyle}>{fmtDate(s.scopeAdded)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{s.cost > 0 ? fmtMoneyDecimal(s.cost) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
};

// ===== REPAIRS TAB =====
const RepairsTab = ({ contractKey }: { contractKey: number }) => {
  const [repairs, setRepairs] = useState<ContractRepair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getContractRepairs(contractKey).then(setRepairs).catch(() => {}).finally(() => setLoading(false));
  }, [contractKey]);

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="small" /></div>;

  return (
    <div style={{ padding: '10px 14px' }}>
      <Panel>
        <PanelHead><span>Repair History ({repairs.length})</span></PanelHead>
        <div style={{ padding: 0, maxHeight: 500, overflowY: 'auto' }}>
          {repairs.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>No repairs found for this contract</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>W.O. #</th>
                  <th style={thStyle}>Serial #</th>
                  <th style={thStyle}>Model</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Date In</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                  <th style={thStyle}>Tech</th>
                </tr>
              </thead>
              <tbody>
                {repairs.map(r => (
                  <tr key={r.repairKey}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{r.wo || '—'}</td>
                    <td style={tdStyle}>{r.serialNumber || '—'}</td>
                    <td style={tdStyle}>{r.model || '—'}</td>
                    <td style={tdStyle}>{r.repairType || '—'}</td>
                    <td style={tdStyle}>{fmtDate(r.dateIn)}</td>
                    <td style={tdStyle}><span style={{ color: repairStatusColor(r.status), fontWeight: 600 }}>{r.status || '—'}</span></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtMoneyDecimal(r.cost)}</td>
                    <td style={tdStyle}>{r.tech || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
};

// ===== INVOICES TAB =====
const InvoicesTab = ({ contractKey, detail }: { contractKey: number; detail: ContractDetail }) => {
  const [invoices, setInvoices] = useState<ContractInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getContractInvoices(contractKey).then(setInvoices).catch(() => {}).finally(() => setLoading(false));
  }, [contractKey]);

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="small" /></div>;

  const totalInvoiced = invoices.filter(i => i.status === 'Invoiced').reduce((sum, i) => sum + i.amount, 0);
  const countInvoiced = invoices.filter(i => i.status === 'Invoiced').length;

  return (
    <div style={{ padding: '10px 14px' }}>
      {/* Invoice stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'Total Installments', value: invoices.length, color: 'var(--navy)' },
          { label: 'Invoiced', value: countInvoiced, color: 'var(--success)' },
          { label: 'Amount Invoiced', value: fmtMoney(totalInvoiced), color: 'var(--primary)' },
          { label: 'Remaining', value: fmtMoney(detail.totalAmount - totalInvoiced), color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--neutral-200)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <Panel>
        <PanelHead><span>Invoices ({invoices.length})</span></PanelHead>
        <div style={{ padding: 0, maxHeight: 500, overflowY: 'auto' }}>
          {invoices.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>No invoices found for this contract</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Invoice #</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Due Date</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.installmentKey}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{inv.invoiceNumber || '—'}</td>
                    <td style={tdStyle}>{fmtDate(inv.dateCreated)}</td>
                    <td style={tdStyle}>{fmtDate(inv.dateDue)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtMoneyDecimal(inv.amount)}</td>
                    <td style={tdStyle}>
                      <span style={{
                        color: inv.status === 'Invoiced' ? 'var(--success)' : 'var(--warning)',
                        fontWeight: 600,
                      }}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
};

// ===== NOTES TAB =====
const NotesTab = ({ contractKey }: { contractKey: number }) => {
  const [notes, setNotes] = useState<ContractNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getContractNotes(contractKey).then(setNotes).catch(() => {}).finally(() => setLoading(false));
  }, [contractKey]);

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="small" /></div>;

  return (
    <div style={{ padding: '10px 14px' }}>
      <Panel>
        <PanelHead><span>Contract Notes ({notes.length})</span></PanelHead>
        <div style={{ padding: 0, maxHeight: 500, overflowY: 'auto' }}>
          {notes.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>No notes for this contract</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Author</th>
                  <th style={thStyle}>Note</th>
                </tr>
              </thead>
              <tbody>
                {notes.map(n => (
                  <tr key={n.noteKey}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(n.noteDate)}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontWeight: 600 }}>{n.author}</td>
                    <td style={tdStyle}>{n.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
};

// ===== DOCUMENTS TAB =====
const DocumentsTab = ({ contractKey }: { contractKey: number }) => {
  const [docs, setDocs] = useState<ContractDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getContractDocuments(contractKey).then(setDocs).catch(() => {}).finally(() => setLoading(false));
  }, [contractKey]);

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="small" /></div>;

  const fileIcon = (name: string) => {
    const lower = name.toLowerCase();
    const color = lower.endsWith('.pdf') ? 'var(--danger)' : lower.endsWith('.xlsx') || lower.endsWith('.xls') ? 'var(--success)' : 'var(--primary)';
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 4, flexShrink: 0 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  };

  return (
    <div style={{ padding: '10px 14px' }}>
      <Panel>
        <PanelHead><span>Documents ({docs.length})</span></PanelHead>
        <div style={{ padding: 0, maxHeight: 500, overflowY: 'auto' }}>
          {docs.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>No documents attached</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Type</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.documentKey}>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {fileIcon(d.fileName || d.documentName)}
                        {d.documentName}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(d.documentDate)}</td>
                    <td style={tdStyle}>{d.categoryType || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
};

// ===== HEALTH INDICATOR =====
const HealthIndicator = ({ contractKey }: { contractKey: number }) => {
  const [health, setHealth] = useState<ContractHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getContractHealth(contractKey).then(setHealth).catch(() => {}).finally(() => setLoading(false));
  }, [contractKey]);

  if (loading) return null;
  if (!health || (health.revenue === 0 && health.consumption === 0)) return null;

  const gradeColor = health.grade === 'Healthy' ? 'var(--success)' : health.grade === 'At Risk' ? 'var(--warning)' : 'var(--danger)';
  const gradeBg = health.grade === 'Healthy' ? 'rgba(var(--success-rgb), 0.1)' : health.grade === 'At Risk' ? 'rgba(var(--amber-rgb), 0.1)' : 'rgba(var(--danger-rgb), 0.1)';

  return (
    <Panel>
      <PanelHead><span>Contract Health</span></PanelHead>
      <div style={{ padding: '12px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: gradeColor }}>{health.margin}%</div>
        <div style={{
          display: 'inline-block', padding: '2px 12px', borderRadius: 12,
          fontSize: 11, fontWeight: 700, color: gradeColor, background: gradeBg, marginTop: 4,
        }}>
          {health.grade.toUpperCase()}
        </div>
        <div style={{ marginTop: 12, textAlign: 'left' }}>
          {[
            { label: 'Revenue', value: fmtMoneyDecimal(health.revenue), pct: 100, color: 'var(--navy)' },
            { label: 'Consumption', value: fmtMoneyDecimal(health.consumption), pct: health.percentConsumed, color: 'var(--warning)' },
            { label: 'Time Elapsed', value: `${health.percentTimeElapsed}%`, pct: health.percentTimeElapsed, color: 'var(--primary)' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 90, flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{f.label}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--neutral-200)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(f.pct, 100)}%`, height: '100%', background: f.color, borderRadius: 3 }} />
              </div>
              <span style={{ width: 70, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
};

const TABS: TabDef[] = [
  { key: 'specs',       label: 'Specifications' },
  { key: 'departments', label: 'Departments' },
  { key: 'scopes',      label: 'Scopes' },
  { key: 'repairs',     label: 'Repairs' },
  { key: 'notes',       label: 'Notes' },
  { key: 'amendments',  label: 'Amendments' },
  { key: 'renewal',     label: 'Renewal' },
  { key: 'invoices',    label: 'Invoices' },
  { key: 'documents',   label: 'Documents' },
];

export const ContractDetailPane = ({ detail, loading, stats }: ContractDetailPaneProps) => {
  const [activeTab, setActiveTab] = useState('specs');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!detail) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
      Select a contract to view details
    </div>
  );

  const specsContent = (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Contract Information */}
          <Panel>
            <PanelHead><span>Contract Information</span></PanelHead>
            <div style={{ padding: '12px 14px' }}>
              <FormGrid cols={2}>
                <div className="span-2">
                  <Field label="Contract Name" value={detail.name} />
                </div>
                <Field label="Contract #" value={detail.contractNumber} />
                <Field label="Contract ID" value={detail.contractId} />
                <Field label="Contract Type" value={detail.contractType > 0 ? `Type ${detail.contractType}` : '—'} />
                <Field label="Length (Months)" value={detail.lengthInMonths || '—'} />
              </FormGrid>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                {detail.servicePlan && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid rgba(var(--primary-rgb), 0.3)', color: 'var(--primary)' }}>
                    Service Plan
                  </span>
                )}
                {detail.sharedRisk && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: 'rgba(var(--amber-rgb), 0.1)', border: '1px solid rgba(var(--amber-rgb), 0.3)', color: 'var(--warning)' }}>
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
          </Panel>

          {/* Notes */}
          {detail.comments && (
            <Panel>
              <PanelHead><span>Notes</span></PanelHead>
              <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                {detail.comments}
              </div>
            </Panel>
          )}
        </div>

        {/* Right column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Health indicator */}
          <HealthIndicator contractKey={detail.contractKey} />

          {/* Term & Financials */}
          <Panel>
            <PanelHead><span>Term &amp; Financials</span></PanelHead>
            <div style={{ padding: '12px 14px' }}>
              <FormGrid cols={2}>
                <Field label="Start Date" value={fmtDate(detail.effectiveDate)} />
                <Field label="End Date" value={fmtDate(detail.terminationDate)} />
                <Field label="Contract Total" value={detail.totalAmount > 0 ? fmtMoney(detail.totalAmount) : '—'} />
                <Field label="Invoiced" value={detail.amtInvoiced > 0 ? fmtMoney(detail.amtInvoiced) : '—'} />
                <Field label="Installments Total" value={detail.installmentsTotal || '—'} />
                <Field label="Installments Invoiced" value={detail.installmentsInvoiced || '—'} />
              </FormGrid>
            </div>
          </Panel>

          {/* Scope Counts */}
          <Panel>
            <PanelHead><span>Scope Coverage</span></PanelHead>
            <div style={{ padding: '12px 14px' }}>
              <FormGrid cols={4}>
                <Field label="Total" value={detail.countAll || '—'} />
                <Field label="Flexible" value={detail.countFlexible || '—'} />
                <Field label="Rigid" value={detail.countRigid || '—'} />
                <Field label="Camera" value={detail.countCamera || '—'} />
              </FormGrid>
              {detail.countInstrument > 0 && (
                <Field label="Instrument" value={detail.countInstrument} />
              )}
            </div>
          </Panel>

          {/* Bill To */}
          {(detail.billName || detail.billAddress) && (
            <Panel>
              <PanelHead><span>Bill To</span></PanelHead>
              <div style={{ padding: '12px 14px' }}>
                <FormGrid cols={2}>
                  {detail.billName && <div className="span-2"><Field label="Name" value={detail.billName} /></div>}
                  {detail.billAddress && <div className="span-2"><Field label="Address" value={detail.billAddress} /></div>}
                  <Field label="City" value={detail.billCity} />
                  <Field label="State / Zip" value={[detail.billState, detail.billZip].filter(Boolean).join(' ')} />
                  {detail.phone && <Field label="Phone" value={detail.phone} />}
                  {detail.billEmail && <Field label="Bill Email" value={detail.billEmail} />}
                </FormGrid>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DetailHeader
        title={detail.name || '(Unnamed)'}
        subtitle={detail.contractNumber || undefined}
        badges={<StatusBadge status={detail.status} />}
        actions={
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
        }
      />

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

      <TabBar tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'specs'       && specsContent}
        {activeTab === 'departments' && <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Departments coming soon</div>}
        {activeTab === 'scopes'      && <ScopesTab contractKey={detail.contractKey} />}
        {activeTab === 'repairs'     && <RepairsTab contractKey={detail.contractKey} />}
        {activeTab === 'notes'       && <NotesTab contractKey={detail.contractKey} />}
        {activeTab === 'amendments'  && <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Amendments coming soon</div>}
        {activeTab === 'renewal'     && <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Renewal coming soon</div>}
        {activeTab === 'invoices'    && <InvoicesTab contractKey={detail.contractKey} detail={detail} />}
        {activeTab === 'documents'   && <DocumentsTab contractKey={detail.contractKey} />}
      </div>
    </div>
  );
};
