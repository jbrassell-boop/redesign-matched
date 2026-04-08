import { useState, useEffect, useCallback } from 'react';
import { Input, Spin, Modal, message } from 'antd';
import { SearchOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getLoaners, getLoanerDetail, getLoanerStats, getLoanerRequests, fulfillLoanerRequest, declineLoanerRequest, bulkUpdateLoanerRequests, getLoanerScopeNeeds } from '../../api/loaners';
import type { LoanerListItem, LoanerDetail, LoanerStats, LoanerRequest, LoanerScopeNeedItem } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import { ExportButton } from '../../components/common/ExportButton';
import { useBulkSelect } from '../../components/common/useBulkSelect';
import { StatStrip } from '../../components/shared/StatStrip';
import type { StatChipDef } from '../../components/shared/StatStrip';
import './LoanersPage.css';



/* ── Days Out Chip ───────────────────────────────────────────── */
const DaysChip = ({ days, status }: { days: number; status: string }) => {
  let bg = 'rgba(var(--success-rgb), 0.1)'; let color = 'var(--success)';
  if (status === 'Overdue') { bg = 'rgba(var(--danger-rgb), 0.1)'; color = 'var(--danger)'; }
  else if (days >= 14) { bg = 'rgba(var(--amber-rgb), 0.1)'; color = 'var(--amber)'; }
  return (
    <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.04em', background: bg, color }}>
      {days}d
    </span>
  );
};


// ── Extracted static styles (performance: avoid re-creating objects each render) ──
const loanerPageContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' };
const loanerToolbarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexWrap: 'wrap', flexShrink: 0 };
const loanerSubToolbarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)' };
const loanerSeparatorStyle: React.CSSProperties = { width: 1, height: 22, background: 'var(--border-dk)' };
const loanerThStyle: React.CSSProperties = {
  background: 'var(--neutral-50)', color: 'var(--muted)', fontWeight: 600, padding: '8px 10px',
  textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid rgba(var(--primary-rgb), 0.15)',
  borderBottom: '1px solid var(--neutral-200)', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11,
};
const loanerCheckboxThStyle: React.CSSProperties = {
  background: 'var(--neutral-50)', padding: '8px 6px', borderBottom: '1px solid var(--neutral-200)',
  borderRight: '1px solid rgba(var(--primary-rgb), 0.15)', width: 36, textAlign: 'center',
};
const loanerFooterStyle: React.CSSProperties = { background: 'var(--card)', borderTop: '1px solid var(--border)', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 };
const loanerTabContentStyle: React.CSSProperties = { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' };
const loanerTabInnerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const loanerFilterLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const loanerDetailLoadingStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 };
const loanerDetailScrollStyle: React.CSSProperties = { overflow: 'auto', height: '100%' };
const loanerDetailHeaderBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 };
const loanerDetailTitleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--navy)' };
const loanerDetailCloseBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: '0 4px' };
const loanerDetailBodyStyle: React.CSSProperties = { padding: '0 0 16px' };
const loanerDetailFieldsStyle: React.CSSProperties = { padding: '0 16px' };
const loanerDetailPanelStyle: React.CSSProperties = { width: 400, minWidth: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--card)' };
const loadingCellStyle: React.CSSProperties = { textAlign: 'center', padding: 24 };
const emptyCellStyle: React.CSSProperties = { textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 12 };
const woLinkStyle: React.CSSProperties = { fontWeight: 600, color: 'var(--primary-dark)' };
const serialMonoStyle: React.CSSProperties = { fontFamily: 'monospace', fontSize: 11 };
const fulfillBtnStyle: React.CSSProperties = { width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' };
const declineBtnStyle: React.CSSProperties = { width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'rgba(var(--danger-rgb), 0.1)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' };
const actionCenterStyle: React.CSSProperties = { display: 'flex', gap: 4, justifyContent: 'center' };
const statusSmallStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' };
const scopeTypeNameStyle: React.CSSProperties = { fontWeight: 600, color: 'var(--navy)' };

const ACTIVE_COLS = [
  { key: 'workOrder', label: 'Work Order', width: 130 },
  { key: 'scopeType', label: 'Scope Type', width: 180 },
  { key: 'serial', label: 'Serial #', width: 120 },
  { key: 'client', label: 'Client', width: 160 },
  { key: 'dept', label: 'Department', width: 140 },
  { key: 'status', label: 'Status', width: 100 },
  { key: 'dateOut', label: 'Date Out', width: 100 },
  { key: 'daysOut', label: 'Days', width: 70 },
  { key: 'trackingNumber', label: 'Tracking #', width: 130 },
];

const SCOPE_NEEDS_COLS = [
  { key: 'scopeType', label: 'Scope Type', width: 200 },
  { key: 'clientName', label: 'Client', width: 180 },
  { key: 'deptName', label: 'Department', width: 160 },
  { key: 'repairsInProgress', label: 'Repairs In Progress', width: 140, align: 'center' as const },
  { key: 'avgTat', label: 'Avg TAT (days)', width: 120, align: 'center' as const },
  { key: 'estimatedNeedDate', label: 'Est. Need Date', width: 120 },
];

const REQ_COLS = [
  { key: 'select', label: '', width: 36 },
  { key: 'workOrder', label: 'Work Order', width: 140 },
  { key: 'scopeType', label: 'Scope Type', width: 180 },
  { key: 'serialNumber', label: 'Serial #', width: 120 },
  { key: 'client', label: 'Client', width: 160 },
  { key: 'department', label: 'Department', width: 140 },
  { key: 'dateRequested', label: 'Date Requested', width: 120 },
  { key: 'status', label: 'Status', width: 100 },
  { key: 'actions', label: 'Actions', width: 110 },
];

const MAIN_COLS = [
  { key: 'workOrder', label: 'Work Order', width: 130 },
  { key: 'scopeType', label: 'Scope Type', width: 180 },
  { key: 'serial', label: 'Serial #', width: 120 },
  { key: 'client', label: 'Client', width: 160 },
  { key: 'dept', label: 'Department', width: 140 },
  { key: 'status', label: 'Status', width: 100 },
  { key: 'dateOut', label: 'Date Out', width: 100 },
  { key: 'dateIn', label: 'Date In', width: 100 },
  { key: 'daysOut', label: 'Days', width: 70 },
  { key: 'trackingNumber', label: 'Tracking #', width: 130 },
];

/* ── SVG Icons ───────────────────────────────────────────────── */

const LOANER_EXPORT_COLS = [
  { key: 'workOrder', label: 'Work Order' },
  { key: 'scopeType', label: 'Scope Type' },
  { key: 'serial', label: 'Serial #' },
  { key: 'client', label: 'Client' },
  { key: 'dept', label: 'Department' },
  { key: 'status', label: 'Status' },
  { key: 'dateOut', label: 'Date Out' },
  { key: 'dateIn', label: 'Date In' },
  { key: 'daysOut', label: 'Days Out' },
  { key: 'trackingNumber', label: 'Tracking #' },
];

/* ═════════════════════════════════════════════════════════════ */
/*  ACTIVE LOANERS TAB                                          */
/* ═════════════════════════════════════════════════════════════ */
const ActiveLoanersTab = ({ onRowClick }: { onRowClick: (item: LoanerListItem) => void }) => {
  const [items, setItems] = useState<LoanerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadActive = useCallback(async (s: string, cancelled: () => boolean) => {
    setLoading(true);
    try {
      const result = await getLoaners({ search: s, page: 1, pageSize: 200, statusFilter: 'Out' });
      if (!cancelled()) setItems(result.items);
    } catch {
      if (!cancelled()) message.error('Failed to load active loaners');
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => loadActive(search, () => cancelled), search ? 300 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, loadActive]);

  return (
    <div style={loanerTabInnerStyle}>
      <div style={loanerSubToolbarStyle}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
          placeholder="Search active loaners..."
          aria-label="Search active loaners"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ height: 30, width: 260, fontSize: 12 }}
          allowClear
        />
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }} aria-live="polite">
          <strong style={{ color: 'var(--text)' }}>{items.length}</strong> active loaners
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr>
              {ACTIVE_COLS.map(col => (
                <th key={col.key} style={{ ...loanerThStyle, width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={ACTIVE_COLS.length} style={loadingCellStyle}><Spin size="small" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={ACTIVE_COLS.length} style={emptyCellStyle}>No active loaners currently out</td></tr>
            ) : items.map((item, idx) => (
              <tr
                key={item.loanerTranKey}
                onClick={() => onRowClick(item)}
                className="hover-row-light"
                style={{ cursor: 'pointer', background: idx % 2 === 0 ? 'var(--card)' : 'var(--neutral-50)' }}
              >
                <td style={activeTdStyle}><span style={woLinkStyle}>{item.workOrder || '\u2014'}</span></td>
                <td style={activeTdStyle}>{item.scopeType || '\u2014'}</td>
                <td style={activeTdStyle}><span style={serialMonoStyle}>{item.serial || '\u2014'}</span></td>
                <td style={activeTdStyle}>{item.client || '\u2014'}</td>
                <td style={activeTdStyle}>{item.dept || '\u2014'}</td>
                <td style={activeTdStyle}><StatusBadge status={item.status} /></td>
                <td style={activeTdStyle}>{item.dateOut || '\u2014'}</td>
                <td style={activeTdStyle}>{item.dateOut ? <DaysChip days={item.daysOut} status={item.status} /> : '\u2014'}</td>
                <td style={activeTdStyle}>{item.trackingNumber || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const activeTdStyle: React.CSSProperties = {
  padding: '6px 8px', fontSize: 12, borderBottom: '1px solid var(--border)', verticalAlign: 'middle', color: 'var(--text)',
};

/* ═════════════════════════════════════════════════════════════ */
/*  SCOPE NEEDS TAB                                             */
/* ═════════════════════════════════════════════════════════════ */

const ScopeNeedsTab = () => {
  const [items, setItems] = useState<LoanerScopeNeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLoanerScopeNeeds()
      .then(data => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) message.error('Failed to load scope needs'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={loanerTabInnerStyle}>
      <div style={loanerSubToolbarStyle}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          Scope types currently in repair with loaner requests — estimated need dates based on average turnaround time.
        </span>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--text)' }}>{items.length}</strong> scope types
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr>
              {SCOPE_NEEDS_COLS.map(col => (
                <th key={col.key} style={{ ...loanerThStyle, width: col.width, textAlign: col.align || 'left' }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={SCOPE_NEEDS_COLS.length} style={loadingCellStyle}><Spin size="small" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={SCOPE_NEEDS_COLS.length} style={emptyCellStyle}>No active loaner-requested repairs in progress</td></tr>
            ) : items.map((item, idx) => (
              <tr
                key={`${item.scopeType}-${item.deptName}-${idx}`}
                className="hover-row-light"
                style={{ background: idx % 2 === 0 ? 'var(--card)' : 'var(--neutral-50)' }}
              >
                <td style={needsTdStyle}><span style={scopeTypeNameStyle}>{item.scopeType}</span></td>
                <td style={needsTdStyle}>{item.clientName || '\u2014'}</td>
                <td style={needsTdStyle}>{item.deptName || '\u2014'}</td>
                <td style={{ ...needsTdStyle, textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block', padding: '1px 8px', borderRadius: 4,
                    fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                    background: item.repairsInProgress >= 3
                      ? 'rgba(var(--danger-rgb), 0.1)'
                      : item.repairsInProgress >= 2
                        ? 'rgba(var(--amber-rgb), 0.1)'
                        : 'rgba(var(--success-rgb), 0.1)',
                    color: item.repairsInProgress >= 3
                      ? 'var(--danger)'
                      : item.repairsInProgress >= 2
                        ? 'var(--amber)'
                        : 'var(--success)',
                  }}>
                    {item.repairsInProgress}
                  </span>
                </td>
                <td style={{ ...needsTdStyle, textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>
                  {item.avgTat.toFixed(1)}d
                </td>
                <td style={{ ...needsTdStyle, color: 'var(--muted)' }}>{item.estimatedNeedDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const needsTdStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 12, borderBottom: '1px solid var(--border)', verticalAlign: 'middle', color: 'var(--text)',
};

/* ═════════════════════════════════════════════════════════════ */
/*  REQUESTS TAB                                                */
/* ═════════════════════════════════════════════════════════════ */


const RequestsTab = ({ onRequestUpdated }: { onRequestUpdated: () => void }) => {
  const [requests, setRequests] = useState<LoanerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadRequests = useCallback(async (s: string, sf: string, cancelled: () => boolean) => {
    setLoading(true);
    try {
      const data = await getLoanerRequests({ search: s || undefined, statusFilter: sf !== 'All' ? sf : undefined });
      if (!cancelled()) setRequests(data);
    } catch {
      if (!cancelled()) message.error('Failed to load loaner requests');
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => loadRequests(search, statusFilter, () => cancelled), search ? 300 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, statusFilter, loadRequests]);

  const fmtDate = (d: string | null) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  const handleAction = async (repairKey: number, action: 'fulfill' | 'decline') => {
    const label = action === 'fulfill' ? 'Fulfill' : 'Decline';
    Modal.confirm({
      title: `${label} Loaner Request`,
      content: `Are you sure you want to ${action} this loaner request?`,
      okText: label,
      okButtonProps: { danger: action === 'decline' },
      onOk: async () => {
        setActionLoading(repairKey);
        try {
          if (action === 'fulfill') await fulfillLoanerRequest(repairKey);
          else await declineLoanerRequest(repairKey);
          message.success(`Request ${action === 'fulfill' ? 'fulfilled' : 'declined'}`);
          await loadRequests(search, statusFilter, () => false);
          onRequestUpdated();
        } catch {
          message.error(`Failed to ${action} request`);
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleBulkAction = async (action: 'fulfill' | 'decline') => {
    const keys = Array.from(selectedKeys);
    const pendingKeys = keys.filter(k => {
      const req = requests.find(r => r.repairKey === k);
      return req?.status === 'Pending';
    });
    if (pendingKeys.length === 0) {
      message.warning('No pending requests selected');
      return;
    }
    const label = action === 'fulfill' ? 'fulfill' : 'decline';
    Modal.confirm({
      title: `Bulk ${action === 'fulfill' ? 'Fulfill' : 'Decline'}`,
      content: `${action === 'fulfill' ? 'Fulfill' : 'Decline'} ${pendingKeys.length} pending request${pendingKeys.length > 1 ? 's' : ''}?`,
      okText: `${action === 'fulfill' ? 'Fulfill' : 'Decline'} All`,
      okButtonProps: { danger: action === 'decline' },
      onOk: async () => {
        setBulkLoading(true);
        try {
          const result = await bulkUpdateLoanerRequests(pendingKeys, action);
          message.success(`${result.updated} request${result.updated !== 1 ? 's' : ''} ${label === 'fulfill' ? 'fulfilled' : 'declined'}`);
          setSelectedKeys(new Set());
          await loadRequests(search, statusFilter, () => false);
          onRequestUpdated();
        } catch {
          message.error(`Failed to ${label} requests`);
        } finally {
          setBulkLoading(false);
        }
      },
    });
  };

  const toggleSelect = (repairKey: number) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(repairKey)) next.delete(repairKey);
      else next.add(repairKey);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === requests.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(requests.map(r => r.repairKey)));
    }
  };

  const pendingSelected = Array.from(selectedKeys).filter(k => {
    const req = requests.find(r => r.repairKey === k);
    return req?.status === 'Pending';
  }).length;

  return (
    <div style={loanerTabInnerStyle}>
      <div style={{ ...loanerSubToolbarStyle, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={loanerFilterLabelStyle}>Status</span>
          <div style={{ display: 'flex', gap: 0 }}>
            {['All', 'Pending', 'Fulfilled', 'Declined'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  height: 28, padding: '0 10px', fontSize: 11, fontWeight: statusFilter === s ? 700 : 500, fontFamily: 'inherit',
                  border: '1px solid var(--border-dk)', borderRight: 'none', cursor: 'pointer',
                  background: statusFilter === s ? 'var(--navy)' : 'var(--card)',
                  color: statusFilter === s ? 'var(--card)' : 'var(--muted)',
                }}
              >
                {s}
              </button>
            ))}
            <div style={{ width: 0, borderRight: '1px solid var(--border-dk)' }} />
          </div>
        </div>
        <div style={loanerSeparatorStyle} />
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
          placeholder="Search requests..."
          aria-label="Search loaner requests"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ height: 30, width: 220, fontSize: 12 }}
          allowClear
        />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedKeys.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{selectedKeys.size}</strong> selected
                {pendingSelected > 0 && <span> ({pendingSelected} pending)</span>}
              </span>
              <button
                onClick={() => handleBulkAction('fulfill')}
                disabled={bulkLoading || pendingSelected === 0}
                style={{
                  height: 36, minWidth: 36, padding: '0 10px', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                  border: '1px solid rgba(var(--success-rgb), 0.4)', borderRadius: 4, cursor: 'pointer',
                  background: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)',
                  opacity: pendingSelected === 0 ? 0.4 : 1,
                }}
              >
                Fulfill All
              </button>
              <button
                onClick={() => handleBulkAction('decline')}
                disabled={bulkLoading || pendingSelected === 0}
                style={{
                  height: 36, minWidth: 36, padding: '0 10px', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                  border: '1px solid rgba(var(--danger-rgb), 0.4)', borderRadius: 4, cursor: 'pointer',
                  background: 'rgba(var(--danger-rgb), 0.1)', color: 'var(--danger)',
                  opacity: pendingSelected === 0 ? 0.4 : 1,
                }}
              >
                Decline All
              </button>
              <button
                onClick={() => setSelectedKeys(new Set())}
                style={{
                  height: 36, minWidth: 36, padding: '0 8px', fontSize: 11, fontWeight: 500, fontFamily: 'inherit',
                  border: '1px solid var(--border-dk)', borderRadius: 4, cursor: 'pointer',
                  background: 'var(--card)', color: 'var(--muted)',
                }}
              >
                Clear
              </button>
            </div>
          )}
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--text)' }}>{requests.length}</strong> requests
          </span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr>
              <th style={loanerCheckboxThStyle}>
                <input
                  type="checkbox"
                  checked={requests.length > 0 && selectedKeys.size === requests.length}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              {REQ_COLS.slice(1).map(col => (
                <th key={col.key} style={{ ...loanerThStyle, width: col.width }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={REQ_COLS.length} style={loadingCellStyle}><Spin size="small" /></td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={REQ_COLS.length} style={emptyCellStyle}>No loaner requests match your filters</td></tr>
            ) : requests.map((req, idx) => {
              const isSelected = selectedKeys.has(req.repairKey);
              return (
                <tr
                  key={req.repairKey}
                  style={{
                    background: isSelected ? 'rgba(var(--primary-rgb), 0.06)' : idx % 2 === 0 ? 'var(--card)' : 'var(--neutral-50)',
                  }}
                >
                  <td style={{ ...reqTdStyle, textAlign: 'center', padding: '6px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(req.repairKey)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={reqTdStyle}><span style={woLinkStyle}>{req.workOrder || '\u2014'}</span></td>
                  <td style={reqTdStyle}>{req.scopeType || '\u2014'}</td>
                  <td style={reqTdStyle}><span style={serialMonoStyle}>{req.serialNumber || '\u2014'}</span></td>
                  <td style={reqTdStyle}>{req.client || '\u2014'}</td>
                  <td style={reqTdStyle}>{req.department || '\u2014'}</td>
                  <td style={reqTdStyle}>{fmtDate(req.dateRequested)}</td>
                  <td style={reqTdStyle}><StatusBadge status={req.status} /></td>
                  <td style={{ ...reqTdStyle, textAlign: 'center' }}>
                    {req.status === 'Pending' ? (
                      <div style={actionCenterStyle}>
                        <button
                          onClick={() => handleAction(req.repairKey, 'fulfill')}
                          disabled={actionLoading === req.repairKey}
                          title="Fulfill"
                          className="loaner-accept-btn"
                          style={fulfillBtnStyle}
                        >
                          <CheckCircleOutlined style={{ fontSize: 14 }} />
                        </button>
                        <button
                          onClick={() => handleAction(req.repairKey, 'decline')}
                          disabled={actionLoading === req.repairKey}
                          title="Decline"
                          className="loaner-decline-btn"
                          style={declineBtnStyle}
                        >
                          <CloseCircleOutlined style={{ fontSize: 14 }} />
                        </button>
                      </div>
                    ) : (
                      <span style={statusSmallStyle}>{req.status}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const reqTdStyle: React.CSSProperties = {
  padding: '6px 8px', fontSize: 12, borderBottom: '1px solid var(--border)', verticalAlign: 'middle', color: 'var(--text)',
};

/* ═════════════════════════════════════════════════════════════ */
/*  TABS DEFINITION                                             */
/* ═════════════════════════════════════════════════════════════ */
const PAGE_TABS: TabDef[] = [
  { key: 'loaners',   label: 'Task Loaners' },
  { key: 'active',    label: 'Active Loaners' },
  { key: 'needs',     label: 'Scope Needs' },
  { key: 'requests',  label: 'Requests' },
];

/* ═════════════════════════════════════════════════════════════ */
/*  LOANERS PAGE                                                */
/* ═════════════════════════════════════════════════════════════ */
export const LoanersPage = () => {
  const [items, setItems] = useState<LoanerListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LoanerStats | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('loaners');
  const bulk = useBulkSelect<number>();

  // Inline detail pane (replaces Drawer)
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [detail, setDetail] = useState<LoanerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const pageSize = 50;

  const loadData = useCallback(async (s: string, sf: string, p: number, cancelled: () => boolean) => {
    setLoading(true);
    try {
      const result = await getLoaners({ search: s, page: p, pageSize, statusFilter: sf });
      if (!cancelled()) {
        setItems(result.items);
        setTotalCount(result.totalCount);
      }
    } catch {
      if (!cancelled()) message.error('Failed to load loaners');
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async (cancelled: () => boolean = () => false) => {
    try {
      const data = await getLoanerStats();
      if (!cancelled()) setStats(data);
    } catch (err) { console.error('[LoanersPage] loadStats failed', err); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadStats(() => cancelled);
    return () => { cancelled = true; };
  }, [loadStats]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => loadData(search, statusFilter, page, () => cancelled), search ? 300 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, statusFilter, page, loadData]);

  const handleChipClick = (sf: string) => {
    setStatusFilter(sf);
    setPage(1);
  };

  const handleRowClick = async (item: LoanerListItem) => {
    setSelectedKey(item.loanerTranKey);
    setDetailLoading(true);
    try {
      setDetail(await getLoanerDetail(item.loanerTranKey));
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  /* ── Stat Strip ──────────────────────────────────────── */
  const loanerChips: StatChipDef[] = [
    { id: 'All',      label: 'Total',     value: stats?.total ?? 0,           color: 'navy'  },
    { id: 'Out',      label: 'Out',       value: stats?.out ?? 0,             color: 'blue'  },
    { id: 'Overdue',  label: 'Overdue',   value: stats?.overdue ?? 0,         color: 'red',   state: (stats?.overdue ?? 0) > 0 ? 'warn' : 'normal' },
    { id: 'Returned', label: 'Returned',  value: stats?.returned ?? 0,        color: 'green' },
    { id: 'Declined', label: 'Declined',  value: stats?.declined ?? 0,        color: 'amber' },
    { id: 'fillRate', label: 'Fill Rate', value: `${stats?.fillRate ?? 0}%`, color: 'green' },
  ];
  const statStrip = (
    <StatStrip
      chips={loanerChips}
      activeChip={statusFilter}
      onChipClick={(id) => { if (id !== 'fillRate') handleChipClick(id === 'all' ? 'All' : id); }}
    />
  );
  /* ── Toolbar ─────────────────────────────────────────────── */
  const toolbar = (
    <div style={loanerToolbarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={loanerFilterLabelStyle}>Status</span>
        <div style={{ display: 'flex', gap: 0 }}>
          {['All', 'Out', 'Overdue', 'Returned', 'Declined'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              style={{
                height: 28, padding: '0 10px', fontSize: 11, fontWeight: statusFilter === s ? 700 : 500, fontFamily: 'inherit',
                border: '1px solid var(--border-dk)', borderRight: 'none', cursor: 'pointer',
                background: statusFilter === s ? 'var(--navy)' : 'var(--card)',
                color: statusFilter === s ? 'var(--card)' : 'var(--muted)',
              }}
            >
              {s}
            </button>
          ))}
          <div style={{ width: 0, borderRight: '1px solid var(--border-dk)' }} />
        </div>
      </div>
      <div style={loanerSeparatorStyle} />
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search loaners..."
        aria-label="Search loaners"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        style={{ height: 30, width: 220, fontSize: 12 }}
        allowClear
      />
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--text)' }}>{totalCount}</strong> records
        </span>
        <ExportButton
          data={items as unknown as Record<string, unknown>[]}
          columns={LOANER_EXPORT_COLS}
          filename="loaners-export"
          sheetName="Loaners"
        />
      </div>
    </div>
  );

  const colCount = MAIN_COLS.length + 1; // +1 for checkbox

  /* ── Loaner list (left panel content for Task Loaners tab) ── */
  const dataTable = (
    <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: selectedKey ? 800 : 1200 }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
          <tr>
            <th style={loanerCheckboxThStyle}>
              <input
                type="checkbox"
                checked={bulk.isAllSelected(items.map(i => i.loanerTranKey))}
                onChange={() => bulk.toggleAll(items.map(i => i.loanerTranKey))}
                style={{ cursor: 'pointer' }}
              />
            </th>
            {MAIN_COLS.map(col => (
              <th key={col.key} style={{ ...loanerThStyle, width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={colCount} style={loadingCellStyle}><Spin size="small" /></td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan={colCount} style={emptyCellStyle}>No loaner records match your filters</td></tr>
          ) : items.map((item, idx) => {
            const selected = bulk.isSelected(item.loanerTranKey);
            const isDetailSelected = item.loanerTranKey === selectedKey;
            return (
              <tr
                key={item.loanerTranKey}
                onClick={() => handleRowClick(item)}
                style={{
                  cursor: 'pointer',
                  background: isDetailSelected ? 'var(--primary-light)' : selected ? 'rgba(var(--primary-rgb), 0.06)' : idx % 2 === 0 ? 'var(--card)' : 'var(--neutral-50)',
                  borderLeft: isDetailSelected ? '3px solid var(--primary)' : '3px solid transparent',
                }}
                className={isDetailSelected ? 'selected' : 'hover-row-light'}
              >
                <td style={{ ...tdStyle, textAlign: 'center', padding: '6px' }} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => bulk.toggle(item.loanerTranKey)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={tdStyle}><span style={woLinkStyle}>{item.workOrder || '\u2014'}</span></td>
                <td style={tdStyle}>{item.scopeType || '\u2014'}</td>
                <td style={tdStyle}><span style={serialMonoStyle}>{item.serial || '\u2014'}</span></td>
                <td style={tdStyle}>{item.client || '\u2014'}</td>
                <td style={tdStyle}>{item.dept || '\u2014'}</td>
                <td style={tdStyle}><StatusBadge status={item.status} /></td>
                <td style={tdStyle}>{item.dateOut || '\u2014'}</td>
                <td style={tdStyle}>{item.dateIn || '\u2014'}</td>
                <td style={tdStyle}>{item.dateOut ? <DaysChip days={item.daysOut} status={item.status} /> : '\u2014'}</td>
                <td style={tdStyle}>{item.trackingNumber || '\u2014'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  /* ── Pagination Footer ───────────────────────────────────── */
  const footer = (
    <div style={loanerFooterStyle}>
      <div style={{ fontSize: 11, color: 'var(--muted)' }} aria-live="polite" aria-atomic="true">
        Showing <strong style={{ color: 'var(--text)' }}>{items.length}</strong> of <strong style={{ color: 'var(--text)' }}>{totalCount}</strong>
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <PgBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{'\u2039'}</PgBtn>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            return p <= totalPages ? <PgBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PgBtn> : null;
          })}
          <PgBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{'\u203A'}</PgBtn>
        </div>
      )}
    </div>
  );

  /* ── Inline Detail Pane content ──────────────────────────── */
  const detailPane = detailLoading ? (
    <div style={loanerDetailLoadingStyle}><Spin /></div>
  ) : detail ? (
    <div style={loanerDetailScrollStyle}>
      {/* Close button */}
      <div style={loanerDetailHeaderBarStyle}>
        <span style={loanerDetailTitleStyle}>{detail.workOrder || `Loaner #${detail.loanerTranKey}`}</span>
        <button
          onClick={() => { setSelectedKey(null); setDetail(null); }}
          style={loanerDetailCloseBtnStyle}
        >
          &times;
        </button>
      </div>
      <div style={loanerDetailBodyStyle}>
        <DetailHeader
          headingLevel="h2"
          title={detail.workOrder || `Loaner #${detail.loanerTranKey}`}
          badges={
            <>
              <StatusBadge status={detail.status} />
              {detail.daysOut > 0 && <DaysChip days={detail.daysOut} status={detail.status} />}
            </>
          }
        />
        <div style={loanerDetailFieldsStyle}>
          <FormGrid cols={2}>
            <Field label="Scope Type" value={detail.scopeType} />
            <Field label="Serial #" value={detail.serial} />
            <Field label="Client" value={detail.client} />
            <Field label="Department" value={detail.dept} />
            <Field label="Date Out" value={detail.dateOut} />
            <Field label="Date In" value={detail.dateIn} />
            <Field label="Tracking #" value={detail.trackingNumber} />
            <Field label="Purchase Order" value={detail.purchaseOrder} />
            <Field label="Sales Rep" value={detail.salesRep} />
            <Field label="Delivery Method" value={detail.deliveryMethod} />
            <Field label="Rack Position" value={detail.rackPosition} />
            <Field label="Created" value={detail.createdDate} />
          </FormGrid>
        </div>
      </div>
    </div>
  ) : null;

  /* ── Tab content ─────────────────────────────────────────────────── */
  const renderTab = () => {
    switch (activeTab) {
      case 'loaners':
        return (
          /* Split-pane layout for Task Loaners tab */
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Left panel — list */}
            <aside aria-label="Loaner list" style={{
              display: 'flex', flexDirection: 'column',
              width: selectedKey ? 'calc(100% - 400px)' : '100%',
              minWidth: 0,
              borderRight: selectedKey ? '1px solid var(--neutral-200)' : undefined,
              transition: 'width 0.2s ease',
              willChange: 'width',
              overflow: 'hidden',
            }}>
              {toolbar}
              {dataTable}
              {footer}
            </aside>

            {/* Right panel — detail */}
            {selectedKey && (
              <section aria-label="Loaner details" style={loanerDetailPanelStyle}>
                {detailPane}
              </section>
            )}
          </div>
        );
      case 'active':
        return <ActiveLoanersTab onRowClick={handleRowClick} />;
      case 'needs':
        return <ScopeNeedsTab />;
      case 'requests':
        return <RequestsTab onRequestUpdated={loadStats} />;
      default:
        return null;
    }
  };

  return (
    <div style={loanerPageContainerStyle}>
      {statStrip}
      <TabBar tabs={PAGE_TABS} activeKey={activeTab} onChange={tab => { setActiveTab(tab); setSelectedKey(null); setDetail(null); }} />
      <div style={loanerTabContentStyle}>
        {renderTab()}
      </div>
    </div>
  );
};

/* ── Shared styles ─────────────────────────────────────────── */
const tdStyle: React.CSSProperties = {
  padding: '6px 8px', fontSize: 12, borderBottom: '1px solid var(--border)', verticalAlign: 'middle', color: 'var(--text)',
};

const PgBtn = ({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    style={{
      height: 36, minWidth: 36, padding: '0 6px',
      border: '1px solid var(--border-dk)', borderRadius: 4, fontSize: 11, fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer',
      background: active ? 'var(--navy)' : 'var(--card)',
      color: active ? 'var(--card)' : 'var(--muted)',
      fontWeight: active ? 600 : 400,
      opacity: disabled ? 0.4 : 1,
    }}
  >
    {children}
  </button>
);
