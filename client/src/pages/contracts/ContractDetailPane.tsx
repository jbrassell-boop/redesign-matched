import { useState, useEffect, useCallback } from 'react';
import { Spin, DatePicker, InputNumber, message } from 'antd';
import { getContractScopes, getContractRepairs, getContractInvoices, getContractNotes, getContractDocuments, getContractHealth, getContractDepartments, getContractAmendments, createContractAmendment, getContractAffiliates, updateContract } from '../../api/contracts';
import type { PatchContractPayload } from '../../api/contracts';
import type { ContractDetail, ContractStats, ContractScope, ContractRepair, ContractInvoice, ContractNote, ContractDocument, ContractHealth, ContractDepartment, ContractAmendment, ContractAffiliate } from './types';
import dayjs from 'dayjs';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import { useAutosave } from '../../hooks/useAutosave';
import { AutosaveIndicator } from '../../components/common/AutosaveIndicator';

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

// ── Extracted static styles (performance: avoid re-creating objects each render) ──
const iconSvgStyle: React.CSSProperties = { width: 14, height: 14 };
const spinnerContainerStyle: React.CSSProperties = { padding: 24, textAlign: 'center' };
const emptyStateStyle: React.CSSProperties = { padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' };
const tabPaddingStyle: React.CSSProperties = { padding: '10px 14px' };
const tabPaddingFlexStyle: React.CSSProperties = { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 };
const tableContainerStyle: React.CSSProperties = { padding: 0, maxHeight: 500, overflowY: 'auto' };
const tableContainerShortStyle: React.CSSProperties = { padding: 0, maxHeight: 400, overflowY: 'auto' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
const miniStatStripStyle: React.CSSProperties = { display: 'flex', gap: 8, marginBottom: 10 };
const miniStatLabelStyle: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' };
const panelBodyStyle: React.CSSProperties = { padding: '12px 14px' };
const panelBodyLargeStyle: React.CSSProperties = { padding: '16px 14px' };
const formLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 };
const formGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' };
const formActionsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8 };
const amendCancelBtnStyle: React.CSSProperties = { padding: '5px 14px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 5, background: 'var(--card)', cursor: 'pointer', color: 'var(--text)' };
const amendSaveBtnStyle: React.CSSProperties = { padding: '5px 14px', fontSize: 12, border: 'none', borderRadius: 5, background: 'var(--primary)', color: 'var(--card)', cursor: 'pointer', fontWeight: 600 };
const amendFormContainerStyle: React.CSSProperties = { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 };
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 };
const thStyleRight: React.CSSProperties = { padding: '6px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)', textAlign: 'right', background: 'var(--neutral-50)', whiteSpace: 'nowrap' };
const tdCellPrimaryStyle: React.CSSProperties = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid var(--neutral-200)', color: 'var(--text)', fontWeight: 600, color: 'var(--primary)' };
const tdCellRightStyle: React.CSSProperties = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid var(--neutral-200)', color: 'var(--text)', textAlign: 'right' };
const tdCellRightBoldStyle: React.CSSProperties = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid var(--neutral-200)', color: 'var(--text)', textAlign: 'right', fontWeight: 600 };
const specsSectionGapStyle: React.CSSProperties = { display: 'flex', gap: 12, marginTop: 4 };
const specsColumnStyle: React.CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 };
const specsPaddingStyle: React.CSSProperties = { padding: '14px 16px' };
const specsColumnsWrapStyle: React.CSSProperties = { display: 'flex', gap: 12 };
const detailContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const loadingCenterStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 };
const emptySelectStyle: React.CSSProperties = { padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 };
const statStripContainerStyle: React.CSSProperties = { display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 };
const tabContentScrollStyle: React.CSSProperties = { flex: 1, overflowY: 'auto' };
const headerActionsStyle: React.CSSProperties = { display: 'flex', gap: 6 };
const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  height: 32, padding: '0 12px', fontSize: 12, fontWeight: 500,
  background: 'var(--card)', border: '1px solid var(--neutral-200)',
  borderRadius: 6, cursor: 'pointer', color: 'var(--text)',
};
const actionBtnIconStyle: React.CSSProperties = { width: 13, height: 13 };
const reportMetricContainerStyle: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const reportMetricCardStyle: React.CSSProperties = {
  flex: '1 1 140px', padding: '12px 14px',
  border: '1px solid var(--neutral-200)', borderRadius: 8,
  background: 'var(--card)', textAlign: 'center',
};
const reportMetricLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em', marginBottom: 4 };
const notesLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 };
const notesBlockStyle: React.CSSProperties = { marginTop: 10, fontSize: 13, color: 'var(--text)', lineHeight: 1.5, borderTop: '1px solid var(--neutral-200)', paddingTop: 10 };
const newAmendBtnStyle: React.CSSProperties = { padding: '2px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--primary)', borderRadius: 4, background: 'rgba(var(--primary-rgb), 0.07)', color: 'var(--primary)', cursor: 'pointer' };
const expensePlaceholderStyle: React.CSSProperties = { padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' };
const expenseIconStyle: React.CSSProperties = { width: 40, height: 40, margin: '0 auto', display: 'block', color: 'var(--neutral-300)' };
const expenseTitleStyle: React.CSSProperties = { fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 6 };
const expenseDescStyle: React.CSSProperties = { fontSize: 12, lineHeight: 1.6, maxWidth: 300, margin: '0 auto' };
const healthCenterStyle: React.CSSProperties = { padding: '12px 14px', textAlign: 'center' };
const healthBarBgStyle: React.CSSProperties = { flex: 1, height: 6, background: 'var(--neutral-200)', borderRadius: 3, overflow: 'hidden' };
const healthRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 };
const healthLabelStyle: React.CSSProperties = { width: 90, flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--muted)' };
const healthValueStyle: React.CSSProperties = { width: 70, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text)' };
const noShipAddressStyle: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' };
const noBillAddressStyle: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' };
const miniStatCardStyle: React.CSSProperties = { flex: 1, background: 'var(--card)', border: '1px solid var(--neutral-200)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' };
const servicePlanBadgeStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid rgba(var(--primary-rgb), 0.3)', color: 'var(--primary)' };
const sharedRiskBadgeStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: 'rgba(var(--amber-rgb), 0.1)', border: '1px solid rgba(var(--amber-rgb), 0.3)', color: 'var(--warning)' };
const taxExemptBadgeStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: 'var(--neutral-100)', border: '1px solid var(--neutral-200)', color: 'var(--muted)' };
const inlineFlexIconStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center' };
const notesBodyStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 };

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
    let cancelled = false;
    setLoading(true);
    getContractScopes(contractKey).then(s => { if (!cancelled) setScopes(s); }).catch(() => { if (!cancelled) message.error('Failed to load contract scopes'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  const countFlex = scopes.filter(s => s.rigidOrFlexible === 'F').length;
  const countRigid = scopes.filter(s => s.rigidOrFlexible === 'R').length;

  return (
    <div style={tabPaddingStyle}>
      {/* Mini stat strip */}
      <div style={miniStatStripStyle}>
        {[
          { label: 'Total', value: scopes.length, color: 'var(--navy)' },
          { label: 'Flexible', value: countFlex, color: 'var(--primary)' },
          { label: 'Rigid', value: countRigid, color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} style={miniStatCardStyle}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={miniStatLabelStyle}>{s.label}</div>
          </div>
        ))}
      </div>

      <Panel>
        <PanelHead><span>Covered Scopes ({scopes.length})</span></PanelHead>
        <div style={tableContainerShortStyle}>
          {scopes.length === 0 ? (
            <div style={emptyStateStyle}>No scopes assigned to this contract</div>
          ) : (
            <table style={tableStyle}>
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
    let cancelled = false;
    setLoading(true);
    getContractRepairs(contractKey).then(r => { if (!cancelled) setRepairs(r); }).catch(() => { if (!cancelled) message.error('Failed to load contract repairs'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Repair History ({repairs.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {repairs.length === 0 ? (
            <div style={emptyStateStyle}>No repairs found for this contract</div>
          ) : (
            <table style={tableStyle}>
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
    let cancelled = false;
    setLoading(true);
    getContractInvoices(contractKey).then(inv => { if (!cancelled) setInvoices(inv); }).catch(() => { if (!cancelled) message.error('Failed to load contract invoices'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  const totalInvoiced = invoices.filter(i => i.status === 'Invoiced').reduce((sum, i) => sum + i.amount, 0);
  const countInvoiced = invoices.filter(i => i.status === 'Invoiced').length;

  return (
    <div style={tabPaddingStyle}>
      {/* Invoice stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'Total Installments', value: invoices.length, color: 'var(--navy)' },
          { label: 'Invoiced', value: countInvoiced, color: 'var(--success)' },
          { label: 'Amount Invoiced', value: fmtMoney(totalInvoiced), color: 'var(--primary)' },
          { label: 'Remaining', value: fmtMoney(detail.totalAmount - totalInvoiced), color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} style={miniStatCardStyle}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <Panel>
        <PanelHead><span>Invoices ({invoices.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {invoices.length === 0 ? (
            <div style={emptyStateStyle}>No invoices found for this contract</div>
          ) : (
            <table style={tableStyle}>
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
    let cancelled = false;
    setLoading(true);
    getContractNotes(contractKey).then(n => { if (!cancelled) setNotes(n); }).catch(() => { if (!cancelled) message.error('Failed to load contract notes'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Contract Notes ({notes.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {notes.length === 0 ? (
            <div style={emptyStateStyle}>No notes for this contract</div>
          ) : (
            <table style={tableStyle}>
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
    let cancelled = false;
    setLoading(true);
    getContractDocuments(contractKey).then(d => { if (!cancelled) setDocs(d); }).catch(() => { if (!cancelled) message.error('Failed to load contract documents'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

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
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Documents ({docs.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {docs.length === 0 ? (
            <div style={emptyStateStyle}>No documents attached</div>
          ) : (
            <table style={tableStyle}>
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
                      <span style={inlineFlexIconStyle}>
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
    let cancelled = false;
    setLoading(true);
    getContractHealth(contractKey).then(h => { if (!cancelled) setHealth(h); }).catch(() => { if (!cancelled) message.error('Failed to load contract health'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return null;
  if (!health || (health.revenue === 0 && health.consumption === 0)) return null;

  const gradeColor = health.grade === 'Healthy' ? 'var(--success)' : health.grade === 'At Risk' ? 'var(--warning)' : 'var(--danger)';
  const gradeBg = health.grade === 'Healthy' ? 'rgba(var(--success-rgb), 0.1)' : health.grade === 'At Risk' ? 'rgba(var(--amber-rgb), 0.1)' : 'rgba(var(--danger-rgb), 0.1)';

  return (
    <Panel>
      <PanelHead><span>Contract Health</span></PanelHead>
      <div style={healthCenterStyle}>
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
            <div key={f.label} style={healthRowStyle}>
              <span style={healthLabelStyle}>{f.label}</span>
              <div style={healthBarBgStyle}>
                <div style={{ width: `${Math.min(f.pct, 100)}%`, height: '100%', background: f.color, borderRadius: 3 }} />
              </div>
              <span style={healthValueStyle}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
};

// ===== DEPARTMENTS TAB =====
const DepartmentsTab = ({ contractKey }: { contractKey: number }) => {
  const [depts, setDepts] = useState<ContractDepartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractDepartments(contractKey)
      .then(d => { if (!cancelled) setDepts(d); })
      .catch(() => { if (!cancelled) message.error('Failed to load departments'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Linked Departments ({depts.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {depts.length === 0 ? (
            <div style={emptyStateStyle}>No departments linked to this contract</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Effective</th>
                  <th style={thStyle}>End Date</th>
                  <th style={thStyle}>PO #</th>
                  <th style={thStyle}>Non-Billable</th>
                </tr>
              </thead>
              <tbody>
                {depts.map(d => (
                  <tr key={d.contractDepartmentKey}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{d.departmentName || '—'}</td>
                    <td style={tdStyle}>{fmtDate(d.effectiveDate)}</td>
                    <td style={tdStyle}>{fmtDate(d.endDate)}</td>
                    <td style={tdStyle}>{d.poNumber || '—'}</td>
                    <td style={tdStyle}>
                      {d.nonBillable
                        ? <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 11 }}>Non-Billable</span>
                        : <span style={{ color: 'var(--muted)', fontSize: 11 }}>Billable</span>}
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

// ===== AMENDMENTS TAB =====
const AmendmentsTab = ({ contractKey, detail }: { contractKey: number; detail: ContractDetail }) => {
  const [amendments, setAmendments] = useState<ContractAmendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amendmentDate: dayjs().format('YYYY-MM-DD'),
    previousTotal: detail.totalAmount,
    newTotal: 0,
    previousInvoiceAmount: 0,
    newInvoiceAmount: 0,
    remainingMonths: detail.lengthInMonths,
  });

  const reload = () => {
    setLoading(true);
    getContractAmendments(contractKey)
      .then(setAmendments)
      .catch(() => message.error('Failed to load amendments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractAmendments(contractKey)
      .then(a => { if (!cancelled) setAmendments(a); })
      .catch(() => { if (!cancelled) message.error('Failed to load amendments'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createContractAmendment(contractKey, form);
      message.success('Amendment created');
      setShowForm(false);
      reload();
    } catch {
      message.error('Failed to create amendment');
    } finally {
      setSaving(false);
    }
  };

  const amendStatusColor = (s: string) => {
    const l = s.toLowerCase();
    if (l.includes('approv') || l.includes('active')) return 'var(--success)';
    if (l.includes('pending')) return 'var(--warning)';
    if (l.includes('reject') || l.includes('cancel')) return 'var(--danger)';
    return 'var(--muted)';
  };

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingFlexStyle}>
      {showForm && (
        <Panel>
          <PanelHead>
            <span>New Amendment</span>
            <button onClick={() => setShowForm(false)} style={closeBtnStyle}>✕</button>
          </PanelHead>
          <div style={amendFormContainerStyle}>
            <div style={formGridStyle}>
              <div>
                <div style={formLabelStyle}>Amendment Date</div>
                <DatePicker
                  value={dayjs(form.amendmentDate)}
                  onChange={(d) => d && setForm(f => ({ ...f, amendmentDate: d.format('YYYY-MM-DD') }))}
                  style={{ width: '100%' }}
                  size="small"
                  aria-label="Amendment Date"
                />
              </div>
              <div>
                <div style={formLabelStyle}>Remaining Months</div>
                <InputNumber
                  value={form.remainingMonths}
                  onChange={(v) => setForm(f => ({ ...f, remainingMonths: v ?? 0 }))}
                  min={0} style={{ width: '100%' }} size="small"
                  aria-label="Remaining Months"
                />
              </div>
              <div>
                <div style={formLabelStyle}>Previous Contract Total</div>
                <InputNumber
                  value={form.previousTotal}
                  onChange={(v) => setForm(f => ({ ...f, previousTotal: v ?? 0 }))}
                  min={0} prefix="$" style={{ width: '100%' }} size="small"
                  aria-label="Previous Contract Total"
                />
              </div>
              <div>
                <div style={formLabelStyle}>New Contract Total</div>
                <InputNumber
                  value={form.newTotal}
                  onChange={(v) => setForm(f => ({ ...f, newTotal: v ?? 0 }))}
                  min={0} prefix="$" style={{ width: '100%' }} size="small"
                  aria-label="New Contract Total"
                />
              </div>
              <div>
                <div style={formLabelStyle}>Previous Invoice Amount</div>
                <InputNumber
                  value={form.previousInvoiceAmount}
                  onChange={(v) => setForm(f => ({ ...f, previousInvoiceAmount: v ?? 0 }))}
                  min={0} prefix="$" style={{ width: '100%' }} size="small"
                  aria-label="Previous Invoice Amount"
                />
              </div>
              <div>
                <div style={formLabelStyle}>New Invoice Amount</div>
                <InputNumber
                  value={form.newInvoiceAmount}
                  onChange={(v) => setForm(f => ({ ...f, newInvoiceAmount: v ?? 0 }))}
                  min={0} prefix="$" style={{ width: '100%' }} size="small"
                  aria-label="New Invoice Amount"
                />
              </div>
            </div>
            <div style={formActionsStyle}>
              <button
                onClick={() => setShowForm(false)}
                style={amendCancelBtnStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                style={amendSaveBtnStyle}
              >
                {saving ? 'Saving…' : 'Save Amendment'}
              </button>
            </div>
          </div>
        </Panel>
      )}

      <Panel>
        <PanelHead>
          <span>Amendments ({amendments.length})</span>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={newAmendBtnStyle}
            >
              + New Amendment
            </button>
          )}
        </PanelHead>
        <div style={tableContainerStyle}>
          {amendments.length === 0 ? (
            <div style={emptyStateStyle}>No amendments for this contract</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Prev Total</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>New Total</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Prev Invoice</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>New Invoice</th>
                  <th style={thStyle}>Rem. Months</th>
                </tr>
              </thead>
              <tbody>
                {amendments.map(a => (
                  <tr key={a.amendmentKey}>
                    <td style={tdStyle}>{fmtDate(a.amendmentDate)}</td>
                    <td style={tdStyle}><span style={{ color: amendStatusColor(a.status), fontWeight: 600 }}>{a.status}</span></td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtMoneyDecimal(a.previousTotal)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }}>{fmtMoneyDecimal(a.newTotal)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtMoneyDecimal(a.previousInvoiceAmount)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{fmtMoneyDecimal(a.newInvoiceAmount)}</td>
                    <td style={tdStyle}>{a.remainingMonths || '—'}</td>
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

// ===== RENEWAL TAB =====
const RenewalTab = ({ detail }: { detail: ContractDetail }) => {
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

// ===== AFFILIATES TAB =====
const AffiliatesTab = ({ contractKey }: { contractKey: number }) => {
  const [affiliates, setAffiliates] = useState<ContractAffiliate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractAffiliates(contractKey)
      .then(a => { if (!cancelled) setAffiliates(a); })
      .catch(() => { if (!cancelled) message.error('Failed to load affiliates'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;

  return (
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Affiliated Facilities ({affiliates.length})</span></PanelHead>
        <div style={tableContainerStyle}>
          {affiliates.length === 0 ? (
            <div style={emptyStateStyle}>No affiliates linked to this contract</div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Department</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Start Date</th>
                  <th style={thStyle}>End Date</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map(a => (
                  <tr key={a.affiliateKey}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{a.departmentName || '—'}</td>
                    <td style={tdStyle}>{a.clientName || '—'}</td>
                    <td style={tdStyle}>{fmtDate(a.startDate)}</td>
                    <td style={tdStyle}>{fmtDate(a.endDate)}</td>
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

// ===== ADDRESS TAB =====
const AddressTab = ({ detail }: { detail: ContractDetail }) => (
  <div style={tabPaddingFlexStyle}>
    <Panel>
      <PanelHead><span>Bill To</span></PanelHead>
      <div style={panelBodyStyle}>
        <FormGrid cols={2}>
          {detail.billName && <div className="span-2"><Field label="Name" value={detail.billName} /></div>}
          {detail.billAddress && <div className="span-2"><Field label="Address" value={detail.billAddress} /></div>}
          <Field label="City" value={detail.billCity || '\u2014'} />
          <Field label="State / Zip" value={[detail.billState, detail.billZip].filter(Boolean).join(' ') || '\u2014'} />
          {detail.phone && <Field label="Phone" value={detail.phone} />}
          {detail.billEmail && <Field label="Email" value={detail.billEmail} />}
        </FormGrid>
        {!detail.billName && !detail.billAddress && (
          <div style={noBillAddressStyle}>No billing address on file.</div>
        )}
      </div>
    </Panel>
    <Panel>
      <PanelHead><span>Ship To</span></PanelHead>
      <div style={panelBodyStyle}>
        <div style={noShipAddressStyle}>
          No separate shipping address configured. Shipments default to the billing address above.
        </div>
      </div>
    </Panel>
  </div>
);

// ===== EXPENSE TRENDING TAB =====
const ExpenseTrendingTab = ({ contractKey }: { contractKey: number }) => {
  void contractKey; // reserved for future endpoint wiring
  return (
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Expense Trending</span></PanelHead>
        <div style={expensePlaceholderStyle}>
          <div style={{ marginBottom: 12 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={expenseIconStyle}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div style={expenseTitleStyle}>
            Expense trending data will appear here
          </div>
          <div style={expenseDescStyle}>
            Monthly expense analysis and cost trending for this contract will be shown
            once the reporting endpoint is available.
          </div>
        </div>
      </Panel>
    </div>
  );
};

// ===== REPORT CARD TAB =====
const ContractReportCardTab = ({ detail }: { detail: ContractDetail }) => {
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
                <div style={reportMetricLabelStyle}>
                  {m.label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: m.color, lineHeight: 1.1 }}>
                  {m.value}
                </div>
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

const TABS: TabDef[] = [
  { key: 'specs',       label: 'Specifications' },
  { key: 'departments', label: 'Departments' },
  { key: 'scopes',      label: 'Scopes' },
  { key: 'repairs',     label: 'Repairs' },
  { key: 'notes',       label: 'Notes' },
  { key: 'amendments',  label: 'Amendments' },
  { key: 'renewal',     label: 'Renewal' },
  { key: 'affiliates',  label: 'Affiliates' },
  { key: 'invoices',    label: 'Invoices' },
  { key: 'documents',   label: 'Documents' },
  { key: 'address',     label: 'Address' },
  { key: 'expense',     label: 'Expense Trending' },
  { key: 'reportcard',  label: 'Report Card' },
];

/* ── Inline editable input for contract fields ──────────────── */
const contractInputStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text)',
  background: 'var(--card)',
  border: '1px solid var(--neutral-200)',
  borderRadius: 4,
  padding: '4px 8px',
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

interface CEditFieldProps {
  label: string;
  value: string | number | null | undefined;
  field: keyof PatchContractPayload;
  onChange: (field: keyof PatchContractPayload, value: string) => void;
}

const CEditField = ({ label, value, field, onChange }: CEditFieldProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '3px 0' }}>
    <span style={formLabelStyle}>{label}</span>
    <input
      value={value ?? ''}
      onChange={e => onChange(field, e.target.value)}
      style={contractInputStyle}
      onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
      onBlur={e => (e.target.style.borderColor = 'var(--neutral-200)')}
    />
  </div>
);

export const ContractDetailPane = ({ detail, loading, stats }: ContractDetailPaneProps) => {
  const [activeTab, setActiveTab] = useState('specs');
  const [localDetail, setLocalDetail] = useState<ContractDetail | null>(null);

  useEffect(() => {
    setLocalDetail(detail);
  }, [detail]);

  const saveFn = useCallback(
    async (data: Partial<PatchContractPayload>) => {
      if (!localDetail) return;
      await updateContract(localDetail.contractKey, data as PatchContractPayload);
    },
    [localDetail],
  );

  const { handleChange: autosaveHandleChange, status: autosaveStatus, reset: resetAutosave } = useAutosave<PatchContractPayload>(saveFn);

  useEffect(() => {
    resetAutosave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.contractKey]);

  const handleFieldChange = useCallback((field: keyof PatchContractPayload, value: string) => {
    setLocalDetail(prev => prev ? { ...prev, [field]: value } as ContractDetail : null);
    autosaveHandleChange(field, value);
  }, [autosaveHandleChange]);

  if (loading) return <div style={loadingCenterStyle}><Spin /></div>;
  if (!localDetail) return (
    <div style={emptySelectStyle}>
      Select a contract to view details
    </div>
  );

  // Use localDetail alias for all existing references below
  const d = localDetail;

  const specsContent = (
    <div style={specsPaddingStyle}>
      <div style={specsColumnsWrapStyle}>
        {/* Left column */}
        <div style={specsColumnStyle}>
          {/* Contract Information */}
          <Panel>
            <PanelHead><span>Contract Information</span></PanelHead>
            <div style={panelBodyStyle}>
              <FormGrid cols={2}>
                <div className="span-2">
                  <CEditField label="Contract Name" value={d.name} field="name" onChange={handleFieldChange} />
                </div>
                <CEditField label="Contract #" value={d.contractNumber} field="contractNumber" onChange={handleFieldChange} />
                <CEditField label="Contract ID" value={d.contractId} field="contractId" onChange={handleFieldChange} />
                <Field label="Contract Type" value={d.contractType > 0 ? `Type ${d.contractType}` : '—'} />
                <CEditField label="Length (Months)" value={d.lengthInMonths || ''} field="lengthInMonths" onChange={(f, v) => handleFieldChange(f, v)} />
              </FormGrid>
              <div style={specsSectionGapStyle}>
                {d.servicePlan && (
                  <span style={servicePlanBadgeStyle}>
                    Service Plan
                  </span>
                )}
                {d.sharedRisk && (
                  <span style={sharedRiskBadgeStyle}>
                    Shared Risk
                  </span>
                )}
                {d.taxExempt && (
                  <span style={taxExemptBadgeStyle}>
                    Tax Exempt
                  </span>
                )}
              </div>
            </div>
          </Panel>

          {/* Notes */}
          {d.comments && (
            <Panel>
              <PanelHead><span>Notes</span></PanelHead>
              <div style={notesBodyStyle}>
                {d.comments}
              </div>
            </Panel>
          )}
        </div>

        {/* Right column */}
        <div style={specsColumnStyle}>
          {/* Health indicator */}
          <HealthIndicator contractKey={d.contractKey} />

          {/* Term & Financials */}
          <Panel>
            <PanelHead><span>Term &amp; Financials</span></PanelHead>
            <div style={panelBodyStyle}>
              <FormGrid cols={2}>
                <Field label="Start Date" value={fmtDate(d.effectiveDate)} />
                <Field label="End Date" value={fmtDate(d.terminationDate)} />
                <Field label="Contract Total" value={d.totalAmount > 0 ? fmtMoney(d.totalAmount) : '—'} />
                <Field label="Invoiced" value={d.amtInvoiced > 0 ? fmtMoney(d.amtInvoiced) : '—'} />
                <Field label="Installments Total" value={d.installmentsTotal || '—'} />
                <Field label="Installments Invoiced" value={d.installmentsInvoiced || '—'} />
              </FormGrid>
            </div>
          </Panel>

          {/* Scope Counts */}
          <Panel>
            <PanelHead><span>Scope Coverage</span></PanelHead>
            <div style={panelBodyStyle}>
              <FormGrid cols={4}>
                <Field label="Total" value={d.countAll || '—'} />
                <Field label="Flexible" value={d.countFlexible || '—'} />
                <Field label="Rigid" value={d.countRigid || '—'} />
                <Field label="Camera" value={d.countCamera || '—'} />
              </FormGrid>
              {d.countInstrument > 0 && (
                <Field label="Instrument" value={d.countInstrument} />
              )}
            </div>
          </Panel>

          {/* Bill To */}
          {(d.billName || d.billAddress) && (
            <Panel>
              <PanelHead><span>Bill To</span></PanelHead>
              <div style={panelBodyStyle}>
                <FormGrid cols={2}>
                  {d.billName && <div className="span-2"><Field label="Name" value={d.billName} /></div>}
                  {d.billAddress && <div className="span-2"><Field label="Address" value={d.billAddress} /></div>}
                  <Field label="City" value={d.billCity} />
                  <Field label="State / Zip" value={[d.billState, d.billZip].filter(Boolean).join(' ')} />
                  {d.phone && <Field label="Phone" value={d.phone} />}
                  {d.billEmail && <Field label="Bill Email" value={d.billEmail} />}
                </FormGrid>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={detailContainerStyle}>
      <DetailHeader
        headingLevel="h2"
        title={d.name || '(Unnamed)'}
        subtitle={d.contractNumber || undefined}
        badges={<><StatusBadge status={d.status} /><AutosaveIndicator status={autosaveStatus} /></>}
        actions={
          <div style={headerActionsStyle}>
            <button style={actionBtnStyle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={actionBtnIconStyle}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button style={actionBtnStyle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={actionBtnIconStyle}>
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
      <div style={statStripContainerStyle}>
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
        {activeTab === 'departments' && <DepartmentsTab contractKey={d.contractKey} />}
        {activeTab === 'scopes'      && <ScopesTab contractKey={d.contractKey} />}
        {activeTab === 'repairs'     && <RepairsTab contractKey={d.contractKey} />}
        {activeTab === 'notes'       && <NotesTab contractKey={d.contractKey} />}
        {activeTab === 'amendments'  && <AmendmentsTab contractKey={d.contractKey} detail={d} />}
        {activeTab === 'renewal'     && <RenewalTab detail={d} />}
        {activeTab === 'affiliates'  && <AffiliatesTab contractKey={d.contractKey} />}
        {activeTab === 'invoices'    && <InvoicesTab contractKey={d.contractKey} detail={d} />}
        {activeTab === 'documents'   && <DocumentsTab contractKey={d.contractKey} />}
        {activeTab === 'address'     && <AddressTab detail={d} />}
        {activeTab === 'expense'     && <ExpenseTrendingTab contractKey={d.contractKey} />}
        {activeTab === 'reportcard'  && <ContractReportCardTab detail={d} />}
      </div>
    </div>
  );
};
