import { useState, useEffect, useCallback } from 'react';
import { Input, Spin, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getLoaners, getLoanerStats, checkOutLoaner, checkInLoaner } from '../../api/loaners';
import type { LoanerListItem, LoanerStats, CheckOutPayload, CheckInPayload } from './types';
import { StatStrip, InlineExpandRow } from '../../components/shared';
import type { StatChipDef } from '../../components/shared';
import { LoanerDrawer } from './LoanerDrawer';
import './LoanersPage.css';

/* ── Column definitions ──────────────────────────────────────── */
const COLS = [
  { key: 'scopeType',  label: 'Scope Type',   width: 170 },
  { key: 'serial',     label: 'Serial #',     width: 120 },
  { key: 'status',     label: 'Status',       width: 100 },
  { key: 'clientDept', label: 'Client / Dept', width: 200 },
  { key: 'rep',        label: 'Rep',          width: 110 },
  { key: 'daysOut',    label: 'Days Out',     width: 80 },
  { key: 'agreement',  label: 'Agreement',    width: 110 },
  { key: 'action',     label: 'Action',       width: 120 },
];

const COL_COUNT = COLS.length;

/* ── Status helpers ──────────────────────────────────────────── */
const statusBadgeClass = (s: string) => {
  const k = s.toLowerCase();
  if (k === 'available') return 'loaners-status-badge--available';
  if (k === 'out') return 'loaners-status-badge--out';
  if (k === 'overdue') return 'loaners-status-badge--overdue';
  if (k === 'repair' || k === 'in repair') return 'loaners-status-badge--repair';
  if (k === 'evaluating') return 'loaners-status-badge--evaluating';
  if (k === 'returned') return 'loaners-status-badge--returned';
  return '';
};

const rowClass = (item: LoanerListItem, idx: number) => {
  const k = item.status.toLowerCase();
  if (k === 'overdue') return 'loaners-row--overdue';
  if (k === 'out') return 'loaners-row--out';
  if (k === 'repair' || k === 'in repair') return 'loaners-row--repair';
  if (k === 'evaluating') return 'loaners-row--evaluating';
  return idx % 2 === 0 ? 'loaners-row--stripe-even' : 'loaners-row--stripe-odd';
};

const daysClass = (days: number, status: string) => {
  if (status.toLowerCase() === 'overdue') return 'loaners-days--red';
  if (days >= 14) return 'loaners-days--amber';
  return 'loaners-days--green';
};

/* ═════════════════════════════════════════════════════════════ */
/*  LOANERS PAGE                                                */
/* ═════════════════════════════════════════════════════════════ */
export const LoanersPage = () => {
  const [items, setItems] = useState<LoanerListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LoanerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Drawer state
  const [drawerScopeKey, setDrawerScopeKey] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Inline expand state
  const [expandedRow, setExpandedRow] = useState<{ key: number; mode: 'checkout' | 'checkin' } | null>(null);
  const [expandForm, setExpandForm] = useState({
    departmentKey: 0,
    deliveryMethodKey: 0,
    salesRepKey: 0,
    purchaseOrder: '',
    onSiteLoaner: false,
    rackPosition: '',
    trackingNumber: '',
  });
  const [expandSaving, setExpandSaving] = useState(false);

  const pageSize = 50;

  const loadData = useCallback(async (s: string, sf: string, p: number, cancelled: () => boolean) => {
    setLoading(true);
    try {
      const result = await getLoaners({
        search: s || undefined,
        page: p,
        pageSize,
        statusFilter: sf === 'all' ? undefined : sf,
      });
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
    setStatsLoading(true);
    try {
      const data = await getLoanerStats();
      if (!cancelled()) setStats(data);
    } catch {
      if (!cancelled()) message.error('Failed to load stats');
    } finally {
      if (!cancelled()) setStatsLoading(false);
    }
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

  const handleChipClick = (id: string) => {
    setStatusFilter(id);
    setPage(1);
    setExpandedRow(null);
  };

  const handleRowClick = (item: LoanerListItem) => {
    if (expandedRow) return; // don't open drawer while expanding
    setDrawerScopeKey(item.scopeKey);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setDrawerScopeKey(null);
  };

  const handleActionClick = (e: React.MouseEvent, item: LoanerListItem, mode: 'checkout' | 'checkin') => {
    e.stopPropagation();
    if (expandedRow?.key === item.loanerTranKey && expandedRow?.mode === mode) {
      setExpandedRow(null);
      return;
    }
    setExpandedRow({ key: item.loanerTranKey, mode });
    setExpandForm({
      departmentKey: 0,
      deliveryMethodKey: 0,
      salesRepKey: 0,
      purchaseOrder: item.purchaseOrder || '',
      onSiteLoaner: false,
      rackPosition: '',
      trackingNumber: item.trackingNumber || '',
    });
  };

  const handleExpandSave = async () => {
    if (!expandedRow) return;
    setExpandSaving(true);
    try {
      if (expandedRow.mode === 'checkout') {
        const item = items.find(i => i.loanerTranKey === expandedRow.key);
        if (!item?.scopeKey) { message.error('Missing scope key'); return; }
        const payload: CheckOutPayload = {
          scopeKey: item.scopeKey,
          departmentKey: expandForm.departmentKey,
          deliveryMethodKey: expandForm.deliveryMethodKey,
          salesRepKey: expandForm.salesRepKey,
          purchaseOrder: expandForm.purchaseOrder || undefined,
          onSiteLoaner: expandForm.onSiteLoaner,
        };
        await checkOutLoaner(payload);
        message.success('Loaner checked out');
      } else {
        const payload: CheckInPayload = {
          loanerTranKey: expandedRow.key,
          rackPosition: expandForm.rackPosition || undefined,
          trackingNumber: expandForm.trackingNumber || undefined,
        };
        await checkInLoaner(payload);
        message.success('Loaner checked in');
      }
      setExpandedRow(null);
      loadData(search, statusFilter, page, () => false);
      loadStats();
    } catch {
      message.error(expandedRow.mode === 'checkout' ? 'Check out failed' : 'Check in failed');
    } finally {
      setExpandSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  /* ── Stat Strip chips ──────────────────────────────────────── */
  const chips: StatChipDef[] = [
    { id: 'Available',   label: 'Available',   value: stats?.available ?? 0,  color: 'green' },
    { id: 'Evaluating',  label: 'Evaluating',  value: stats?.evaluating ?? 0, color: 'purple' },
    { id: 'Out',         label: 'Out',         value: stats?.out ?? 0,        color: 'amber' },
    { id: 'Overdue',     label: 'Overdue',     value: stats?.overdue ?? 0,    color: 'red', state: (stats?.overdue ?? 0) > 0 ? 'alert' : 'normal' },
    { id: 'Repair',      label: 'Repair',      value: stats?.repair ?? 0,     color: 'muted' },
  ];

  /* ── Render rows ───────────────────────────────────────────── */
  const renderRow = (item: LoanerListItem, idx: number) => {
    const k = item.status.toLowerCase();
    const isRepair = k === 'repair' || k === 'in repair';
    const isAvailable = k === 'available';
    const isOut = k === 'out' || k === 'overdue';
    const isExpanded = expandedRow?.key === item.loanerTranKey;

    return (
      <tbody key={item.loanerTranKey}>
        <tr
          className={rowClass(item, idx)}
          onClick={() => handleRowClick(item)}
        >
          {/* Scope Type */}
          <td>{item.scopeType || '\u2014'}</td>

          {/* Serial # */}
          <td>
            <span className="loaners-serial">{item.serial || '\u2014'}</span>
            {item.recallNeeded && <span className="loaners-recall-badge">Recall?</span>}
          </td>

          {/* Status */}
          <td>
            <span className={`loaners-status-badge ${statusBadgeClass(item.status)}`}>
              {item.status}
            </span>
          </td>

          {/* Client / Dept */}
          <td>
            <div className="loaners-cell-twoline">
              <span className="loaners-client">{item.client || '\u2014'}</span>
              <span className="loaners-dept">{item.dept || ''}</span>
            </div>
          </td>

          {/* Rep */}
          <td>{item.rep || '\u2014'}</td>

          {/* Days Out */}
          <td>
            {item.daysOut > 0 ? (
              <span className={`loaners-days ${daysClass(item.daysOut, item.status)}`}>
                {item.daysOut}d
              </span>
            ) : '\u2014'}
          </td>

          {/* Agreement */}
          <td>
            {item.agreement && item.agreement !== 'None' ? (
              <span className={`loaners-agreement-badge ${
                item.agreement === 'Signed'
                  ? 'loaners-agreement-badge--signed'
                  : 'loaners-agreement-badge--pending'
              }`}>
                {item.agreement}
              </span>
            ) : (
              <span className="loaners-agreement-badge--none">&mdash;</span>
            )}
          </td>

          {/* Action */}
          <td onClick={e => e.stopPropagation()}>
            {isAvailable && (
              <button
                className="loaners-action-btn loaners-action-btn--checkout"
                onClick={e => handleActionClick(e, item, 'checkout')}
              >
                Check Out
              </button>
            )}
            {isOut && (
              <button
                className="loaners-action-btn loaners-action-btn--checkin"
                onClick={e => handleActionClick(e, item, 'checkin')}
              >
                Check In
              </button>
            )}
            {isRepair && (
              <span className="loaners-repair-label">In repair</span>
            )}
          </td>
        </tr>

        {/* Inline expand row */}
        {isExpanded && expandedRow.mode === 'checkout' && (
          <InlineExpandRow colSpan={COL_COUNT} onCancel={() => setExpandedRow(null)}>
            <div className="loaners-expand-fields">
              <div className="loaners-expand-field">
                <label>Department</label>
                <select
                  value={expandForm.departmentKey}
                  onChange={e => setExpandForm(f => ({ ...f, departmentKey: Number(e.target.value) }))}
                >
                  <option value={0}>Select...</option>
                </select>
              </div>
              <div className="loaners-expand-field">
                <label>Delivery Method</label>
                <select
                  value={expandForm.deliveryMethodKey}
                  onChange={e => setExpandForm(f => ({ ...f, deliveryMethodKey: Number(e.target.value) }))}
                >
                  <option value={0}>Select...</option>
                </select>
              </div>
              <div className="loaners-expand-field">
                <label>Sales Rep</label>
                <select
                  value={expandForm.salesRepKey}
                  onChange={e => setExpandForm(f => ({ ...f, salesRepKey: Number(e.target.value) }))}
                >
                  <option value={0}>Select...</option>
                </select>
              </div>
              <div className="loaners-expand-field">
                <label>PO #</label>
                <input
                  type="text"
                  value={expandForm.purchaseOrder}
                  onChange={e => setExpandForm(f => ({ ...f, purchaseOrder: e.target.value }))}
                  placeholder="PO#"
                />
              </div>
              <div className="loaners-expand-field">
                <label>On-Site</label>
                <input
                  type="checkbox"
                  checked={expandForm.onSiteLoaner}
                  onChange={e => setExpandForm(f => ({ ...f, onSiteLoaner: e.target.checked }))}
                />
              </div>
              <button
                className="loaners-expand-save"
                onClick={handleExpandSave}
                disabled={expandSaving}
              >
                {expandSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </InlineExpandRow>
        )}

        {isExpanded && expandedRow.mode === 'checkin' && (
          <InlineExpandRow colSpan={COL_COUNT} onCancel={() => setExpandedRow(null)}>
            <div className="loaners-expand-fields">
              <div className="loaners-expand-field">
                <label>Rack #</label>
                <input
                  type="text"
                  value={expandForm.rackPosition}
                  onChange={e => setExpandForm(f => ({ ...f, rackPosition: e.target.value }))}
                  placeholder="Rack position"
                />
              </div>
              <div className="loaners-expand-field">
                <label>Tracking #</label>
                <input
                  type="text"
                  value={expandForm.trackingNumber}
                  onChange={e => setExpandForm(f => ({ ...f, trackingNumber: e.target.value }))}
                  placeholder="Tracking number"
                />
              </div>
              <button
                className="loaners-expand-save"
                onClick={handleExpandSave}
                disabled={expandSaving}
              >
                {expandSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </InlineExpandRow>
        )}
      </tbody>
    );
  };

  return (
    <div className="loaners-page">
      {/* Stat Strip */}
      <StatStrip
        chips={chips}
        loading={statsLoading}
        activeChip={statusFilter === 'all' ? undefined : statusFilter}
        onChipClick={id => handleChipClick(id)}
      />

      {/* Controls Row */}
      <div className="loaners-controls">
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
          placeholder="Search serial, client, scope type..."
          aria-label="Search loaners"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          allowClear
          className="loaners-controls__search"
        />
        <div className="loaners-separator" />
        <div className="loaners-controls__count">
          <strong>{totalCount}</strong> loaners
        </div>
      </div>

      {/* Table */}
      <div className="loaners-table-wrap">
        <table className="loaners-table">
          <thead>
            <tr>
              {COLS.map(col => (
                <th key={col.key} style={{ width: col.width }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          {loading ? (
            <tbody>
              <tr><td colSpan={COL_COUNT} className="loaners-loading-cell"><Spin size="small" /></td></tr>
            </tbody>
          ) : items.length === 0 ? (
            <tbody>
              <tr><td colSpan={COL_COUNT} className="loaners-empty-cell">No loaners match your filters</td></tr>
            </tbody>
          ) : (
            items.map((item, idx) => renderRow(item, idx))
          )}
        </table>
      </div>

      {/* Footer */}
      {totalPages > 1 && (
        <div className="loaners-footer">
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Showing <strong style={{ color: 'var(--text)' }}>{items.length}</strong> of <strong style={{ color: 'var(--text)' }}>{totalCount}</strong>
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <PgBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{'\u2039'}</PgBtn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return p <= totalPages ? <PgBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PgBtn> : null;
            })}
            <PgBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{'\u203A'}</PgBtn>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <LoanerDrawer
        scopeKey={drawerScopeKey}
        open={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
};

/* ── Pagination button ─────────────────────────────────────────── */
const PgBtn = ({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className="loaners-action-btn"
    style={{
      height: 28, minWidth: 28, padding: '0 6px',
      border: '1px solid var(--border-dk)', borderRadius: 4,
      fontSize: 11, fontFamily: 'inherit',
      cursor: disabled ? 'default' : 'pointer',
      background: active ? 'var(--navy)' : 'var(--card)',
      color: active ? 'var(--card)' : 'var(--muted)',
      fontWeight: active ? 600 : 400,
      opacity: disabled ? 0.4 : 1,
    }}
  >
    {children}
  </button>
);
