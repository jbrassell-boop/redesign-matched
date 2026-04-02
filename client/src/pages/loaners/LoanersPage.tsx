import { useState, useEffect, useCallback } from 'react';
import { Input, Spin, Tabs, Drawer } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getLoaners, getLoanerDetail, getLoanerStats } from '../../api/loaners';
import type { LoanerListItem, LoanerDetail, LoanerStats } from './types';

/* ── Status Badge ────────────────────────────────────────────── */
const STATUS_STYLES: Record<string, React.CSSProperties> = {
  Out:      { background: 'var(--primary-light)', border: '1px solid var(--border-dk)', color: 'var(--primary)' },
  Overdue:  { background: '#FEF2F2', border: '1px solid #FECACA', color: 'var(--danger)' },
  Returned: { background: '#F0FDF4', border: '1px solid #BBF7D0', color: 'var(--success)' },
  Declined: { background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' },
  Pending:  { background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.Pending;
  return (
    <span style={{ ...s, display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 700, lineHeight: 1.4 }}>
      {status}
    </span>
  );
};

/* ── Days Out Chip ───────────────────────────────────────────── */
const DaysChip = ({ days, status }: { days: number; status: string }) => {
  let bg = '#F0FDF4'; let color = 'var(--success)';
  if (status === 'Overdue') { bg = '#FEF2F2'; color = 'var(--danger)'; }
  else if (days >= 14) { bg = '#FFFBEB'; color = '#92400E'; }
  return (
    <span style={{ display: 'inline-block', padding: '1px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.04em', background: bg, color }}>
      {days}d
    </span>
  );
};

/* ── Stat Chip ───────────────────────────────────────────────── */
interface StatChipProps {
  label: string; value: string | number; iconBg: string; iconColor: string; valueColor: string;
  active: boolean; onClick: () => void;
  icon: React.ReactNode;
}
const StatChip = ({ label, value, iconBg, iconColor, valueColor, active, onClick, icon }: StatChipProps) => (
  <div
    onClick={onClick}
    style={{
      flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 8, transition: 'background 0.12s, outline-color 0.12s',
      background: active ? 'var(--primary-light)' : 'var(--card)',
      outline: active ? '2.5px solid var(--navy)' : '2.5px solid transparent',
      outlineOffset: -2,
    }}
  >
    <span style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: iconColor }}>
      {icon}
    </span>
    <span style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 18, fontWeight: 800, color: valueColor, lineHeight: 1.2 }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </span>
  </div>
);

/* ── Detail Field ────────────────────────────────────────────── */
const Field = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 13, color: 'var(--text)', padding: '4px 8px', background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 4, minHeight: 28 }}>{value ?? '\u2014'}</div>
  </div>
);

/* ── SVG Icons ───────────────────────────────────────────────── */
const IconTotal = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 5h6M5 8h6M5 11h4" /></svg>;
const IconOut = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><path d="M10 2l4 4-4 4" /><path d="M2 8h12" /></svg>;
const IconOverdue = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.5l2.5 1.5" /></svg>;
const IconReturned = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><polyline points="12 5 7 11 4 8" /></svg>;
const IconDeclined = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><circle cx="8" cy="8" r="5.5" /><path d="M10 6L6 10M6 6l4 4" /></svg>;
const IconFillRate = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><polyline points="2 12 6 6 10 9 14 3" /></svg>;

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

  // Detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<LoanerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const pageSize = 50;

  const loadData = useCallback(async (s: string, sf: string, p: number) => {
    setLoading(true);
    try {
      const result = await getLoaners({ search: s, page: p, pageSize, statusFilter: sf });
      setItems(result.items);
      setTotalCount(result.totalCount);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try { setStats(await getLoanerStats()); } catch { /* stats are non-critical */ }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(search, statusFilter, page), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, statusFilter, page, loadData]);

  const handleChipClick = (sf: string) => {
    setStatusFilter(sf);
    setPage(1);
  };

  const handleRowClick = async (item: LoanerListItem) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      setDetail(await getLoanerDetail(item.loanerTranKey));
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  /* ── Stat Strip ──────────────────────────────────────────── */
  const statStrip = (
    <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)' }}>
      <StatChip label="Total" value={stats?.total ?? 0} iconBg="rgba(var(--navy-rgb), 0.10)" iconColor="var(--navy)" valueColor="var(--navy)" active={statusFilter === 'All'} onClick={() => handleChipClick('All')} icon={<IconTotal />} />
      <StatChip label="Out" value={stats?.out ?? 0} iconBg="rgba(var(--primary-rgb), 0.10)" iconColor="var(--primary)" valueColor="var(--primary)" active={statusFilter === 'Out'} onClick={() => handleChipClick('Out')} icon={<IconOut />} />
      <StatChip label="Overdue" value={stats?.overdue ?? 0} iconBg="rgba(var(--danger-rgb), 0.10)" iconColor="var(--danger)" valueColor="var(--danger)" active={statusFilter === 'Overdue'} onClick={() => handleChipClick('Overdue')} icon={<IconOverdue />} />
      <StatChip label="Returned" value={stats?.returned ?? 0} iconBg="rgba(var(--success-rgb), 0.10)" iconColor="var(--success)" valueColor="var(--success)" active={statusFilter === 'Returned'} onClick={() => handleChipClick('Returned')} icon={<IconReturned />} />
      <StatChip label="Declined" value={stats?.declined ?? 0} iconBg="rgba(var(--amber-rgb), 0.10)" iconColor="#92400E" valueColor="#92400E" active={statusFilter === 'Declined'} onClick={() => handleChipClick('Declined')} icon={<IconDeclined />} />
      <StatChip label="Fill Rate" value={`${stats?.fillRate ?? 0}%`} iconBg="rgba(var(--success-rgb), 0.10)" iconColor="var(--success)" valueColor="var(--success)" active={false} onClick={() => {}} icon={<IconFillRate />} />
    </div>
  );

  /* ── Toolbar ─────────────────────────────────────────────── */
  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
        <div style={{ display: 'flex', gap: 0 }}>
          {['All', 'Out', 'Overdue', 'Returned', 'Declined'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              style={{
                height: 28, padding: '0 10px', fontSize: 11, fontWeight: statusFilter === s ? 700 : 500, fontFamily: 'inherit',
                border: '1px solid var(--border-dk)', borderRight: 'none', cursor: 'pointer',
                background: statusFilter === s ? 'var(--navy)' : 'var(--card)',
                color: statusFilter === s ? '#fff' : 'var(--muted)',
              }}
            >
              {s}
            </button>
          ))}
          <div style={{ width: 0, borderRight: '1px solid var(--border-dk)' }} />
        </div>
      </div>
      <div style={{ width: 1, height: 22, background: 'var(--border-dk)' }} />
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search loaners..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        style={{ height: 30, width: 220, fontSize: 12 }}
        allowClear
      />
      <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
        <strong style={{ color: 'var(--text)' }}>{totalCount}</strong> records
      </div>
    </div>
  );

  /* ── Table ───────────────────────────────────────────────── */
  const columns = [
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

  const dataTable = (
    <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{
                background: 'var(--neutral-50)', color: 'var(--muted)', fontWeight: 600, padding: '8px 10px',
                textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid rgba(180,200,220,0.3)',
                borderBottom: '1px solid var(--neutral-200)', letterSpacing: '0.04em', textTransform: 'uppercase',
                fontSize: 10, width: col.width,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 24 }}><Spin size="small" /></td></tr>
          ) : items.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: 12 }}>No loaner records match your filters</td></tr>
          ) : items.map((item, idx) => (
            <tr
              key={item.loanerTranKey}
              onClick={() => handleRowClick(item)}
              style={{
                cursor: 'pointer',
                background: idx % 2 === 0 ? '#fff' : 'var(--neutral-50)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? '#fff' : 'var(--neutral-50)'; }}
            >
              <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{item.workOrder || '\u2014'}</span></td>
              <td style={tdStyle}>{item.scopeType || '\u2014'}</td>
              <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{item.serial || '\u2014'}</span></td>
              <td style={tdStyle}>{item.client || '\u2014'}</td>
              <td style={tdStyle}>{item.dept || '\u2014'}</td>
              <td style={tdStyle}><StatusBadge status={item.status} /></td>
              <td style={tdStyle}>{item.dateOut || '\u2014'}</td>
              <td style={tdStyle}>{item.dateIn || '\u2014'}</td>
              <td style={tdStyle}>{item.dateOut ? <DaysChip days={item.daysOut} status={item.status} /> : '\u2014'}</td>
              <td style={tdStyle}>{item.trackingNumber || '\u2014'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  /* ── Pagination Footer ───────────────────────────────────── */
  const footer = (
    <div style={{ background: 'var(--card)', borderTop: '1px solid var(--border)', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
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

  /* ── Detail Drawer ───────────────────────────────────────── */
  const drawerContent = detailLoading ? (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
  ) : detail ? (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--neutral-200)' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary-dark)' }}>{detail.workOrder || `Loaner #${detail.loanerTranKey}`}</span>
        <StatusBadge status={detail.status} />
        {detail.daysOut > 0 && <DaysChip days={detail.daysOut} status={detail.status} />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
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
      </div>
    </div>
  ) : null;

  /* ── Tabs content ────────────────────────────────────────── */
  const loanersTab = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {toolbar}
      {dataTable}
      {footer}
    </div>
  );

  const stubTab = (name: string) => (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>{name} coming soon</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {statStrip}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        tabBarStyle={{
          margin: 0, padding: '0 14px',
          background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)',
        }}
        items={[
          { key: 'loaners', label: 'Task Loaners', children: loanersTab },
          { key: 'active', label: 'Active Loaners', children: stubTab('Active Loaners') },
          { key: 'needs', label: 'Scope Needs', children: stubTab('Scope Needs') },
          { key: 'requests', label: 'Requests', children: stubTab('Requests') },
        ]}
      />
      <Drawer
        title={<span style={{ color: '#fff', fontWeight: 700 }}>{detail?.workOrder || 'Loaner Detail'}</span>}
        placement="right"
        width={600}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{
          header: { background: 'var(--primary-dark)', borderBottom: '1px solid var(--border)' },
          body: { padding: '16px 20px' },
        }}
        closeIcon={<span style={{ color: '#fff' }}>&times;</span>}
      >
        {drawerContent}
      </Drawer>
    </div>
  );
};

/* ── Shared styles ─────────────────────────────────────────── */
const tdStyle: React.CSSProperties = {
  padding: '6px 8px', fontSize: 11.5, borderBottom: '1px solid var(--border)', verticalAlign: 'middle', color: 'var(--text)',
};

const PgBtn = ({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) => (
  <button
    disabled={disabled}
    onClick={onClick}
    style={{
      height: 26, minWidth: 26, padding: '0 6px',
      border: '1px solid var(--border-dk)', borderRadius: 4, fontSize: 11, fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer',
      background: active ? 'var(--navy)' : 'var(--card)',
      color: active ? '#fff' : 'var(--muted)',
      fontWeight: active ? 600 : 400,
      opacity: disabled ? 0.4 : 1,
    }}
  >
    {children}
  </button>
);
