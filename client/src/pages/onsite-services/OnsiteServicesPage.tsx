import { useState, useEffect, useCallback, useRef } from 'react';
import { getOnsiteServices, getOnsiteServiceStats } from '../../api/onsite-services';
import { QuoteModal } from './QuoteModal';
import { CompleteServiceModal } from './CompleteServiceModal';
import { OnsiteServiceDetailDrawer } from './OnsiteServiceDetailDrawer';
import { StatusBadge } from '../../components/shared';
import type { OnsiteServiceListItem, OnsiteServiceStats, OnsiteServiceFilters } from './types';

interface StatChipProps {
  label: string;
  value: string | number;
  iconColor: string;
  iconBg: string;
  valueColor: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  clickable?: boolean;
}

const StatChip = ({ label, value, iconColor, iconBg, valueColor, icon, active, onClick, clickable = true }: StatChipProps) => (
  <div
    onClick={clickable ? onClick : undefined}
    style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 16px',
      cursor: clickable ? 'pointer' : 'default',
      borderRight: '1px solid var(--neutral-200)',
      background: active ? 'var(--primary-light)' : undefined,
      outline: active ? '2.5px solid var(--navy)' : undefined,
      outlineOffset: active ? -2 : undefined,
      transition: 'background 0.12s',
    }}
    onMouseEnter={e => { if (clickable && !active) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'; }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = ''; }}
  >
    <div style={{
      width: 32,
      height: 32,
      borderRadius: 6,
      background: iconBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: iconColor,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: valueColor, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  </div>
);

const IconGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path d="M3 9h18M9 21V9" /><rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
);
const IconSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const IconDollar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const PAGE_SIZE = 25;

export const OnsiteServicesPage = () => {
  const [stats, setStats] = useState<OnsiteServiceStats | null>(null);
  const [items, setItems] = useState<OnsiteServiceListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [chipFilter, setChipFilter] = useState('');
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<OnsiteServiceListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailKey, setDetailKey] = useState<number | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStatsLoading(true);
    getOnsiteServiceStats().then(setStats).finally(() => setStatsLoading(false));
  }, []);

  const loadData = useCallback(async (filters: OnsiteServiceFilters) => {
    setLoading(true);
    try {
      const result = await getOnsiteServices(filters);
      setItems(result.items);
      setTotalCount(result.totalCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const delay = search ? 300 : 0;
    searchTimeout.current = setTimeout(() => {
      loadData({ search, statusFilter, dateFrom, dateTo, page, pageSize: PAGE_SIZE });
    }, delay);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search, statusFilter, dateFrom, dateTo, page, loadData]);

  const reload = useCallback(() => {
    loadData({ search, statusFilter, dateFrom, dateTo, page, pageSize: PAGE_SIZE });
    getOnsiteServiceStats().then(setStats);
  }, [search, statusFilter, dateFrom, dateTo, page, loadData]);

  const handleChipFilter = (status: string) => {
    const next = status === chipFilter ? '' : status;
    setChipFilter(next);
    setStatusFilter(next || 'all');
    setPage(1);
  };

  const handleStatusSegment = (val: string) => {
    setStatusFilter(val);
    setChipFilter('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const segBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: active ? 700 : 500,
    color: active ? 'var(--navy)' : 'var(--muted)',
    background: active ? 'var(--primary-light)' : 'var(--card)',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.1s',
  });

  const thStyle: React.CSSProperties = {
    background: 'var(--neutral-50)',
    color: 'var(--neutral-500)',
    fontWeight: 700,
    padding: '8px 10px',
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontSize: 11,
    position: 'sticky',
    top: 0,
    zIndex: 2,
    whiteSpace: 'nowrap',
    borderRight: '1px solid rgba(180,200,220,0.3)',
    borderBottom: '1px solid var(--neutral-200)',
    userSelect: 'none',
  };

  const tdStyle: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: 12,
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Stat Strip */}
      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 }}>
        <StatChip
          label="Total Visits"
          value={statsLoading ? '\u2014' : (stats?.total ?? 0)}
          icon={<IconGrid />}
          iconColor="var(--navy)"
          iconBg="rgba(var(--navy-rgb), 0.13)"
          valueColor="var(--navy)"
          active={chipFilter === ''}
          onClick={() => handleChipFilter('')}
        />
        <StatChip
          label="Submitted"
          value={statsLoading ? '\u2014' : (stats?.submitted ?? 0)}
          icon={<IconSend />}
          iconColor="var(--primary)"
          iconBg="rgba(var(--primary-rgb), 0.13)"
          valueColor="var(--primary)"
          active={chipFilter === 'Submitted'}
          onClick={() => handleChipFilter('Submitted')}
        />
        <StatChip
          label="Invoiced"
          value={statsLoading ? '\u2014' : (stats?.invoiced ?? 0)}
          icon={<IconCheck />}
          iconColor="var(--success)"
          iconBg="rgba(var(--success-rgb), 0.13)"
          valueColor="var(--success)"
          active={chipFilter === 'Invoiced'}
          onClick={() => handleChipFilter('Invoiced')}
        />
        <StatChip
          label="Draft"
          value={statsLoading ? '\u2014' : (stats?.draft ?? 0)}
          icon={<IconEdit />}
          iconColor="var(--warning)"
          iconBg="rgba(var(--amber-rgb), 0.13)"
          valueColor="var(--warning)"
          active={chipFilter === 'Draft'}
          onClick={() => handleChipFilter('Draft')}
        />
        <StatChip
          label="Void"
          value={statsLoading ? '\u2014' : (stats?.void ?? 0)}
          icon={<IconX />}
          iconColor="var(--danger)"
          iconBg="rgba(var(--danger-rgb), 0.13)"
          valueColor="var(--danger)"
          active={chipFilter === 'Void'}
          onClick={() => handleChipFilter('Void')}
        />
        <StatChip
          label="Total Value"
          value={statsLoading ? '\u2014' : `$${(stats?.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={<IconDollar />}
          iconColor="var(--navy)"
          iconBg="rgba(var(--navy-rgb), 0.13)"
          valueColor="var(--navy)"
          clickable={false}
          active={false}
        />
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--neutral-200)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setQuoteOpen(true)}
          style={{
            height: 30,
            padding: '0 14px',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'inherit',
            background: 'var(--navy)',
            color: 'var(--card)',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={13} height={13}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Visit
        </button>
        <div style={{ width: 1, height: 22, background: 'var(--border-dk)', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          Status
        </span>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden' }}>
          {(['all', 'Draft', 'Submitted', 'Invoiced', 'Void'] as const).map((v, i) => (
            <button
              key={v}
              onClick={() => handleStatusSegment(v)}
              style={{
                ...segBtnStyle(statusFilter === v),
                borderRight: i < 4 ? '1px solid var(--border-dk)' : 'none',
              }}
            >
              {v === 'all' ? 'All' : v}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 22, background: 'var(--border-dk)', flexShrink: 0 }} />

        <input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          title="From date"
          style={{
            height: 30,
            border: '1.5px solid var(--border-dk)',
            borderRadius: 6,
            padding: '0 8px',
            fontSize: 11,
            fontFamily: 'inherit',
            color: 'var(--text)',
            background: 'var(--card)',
            outline: 'none',
            cursor: 'pointer',
            width: 120,
          }}
        />
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>to</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1); }}
          title="To date"
          style={{
            height: 30,
            border: '1.5px solid var(--border-dk)',
            borderRadius: 6,
            padding: '0 8px',
            fontSize: 11,
            fontFamily: 'inherit',
            color: 'var(--text)',
            background: 'var(--card)',
            outline: 'none',
            cursor: 'pointer',
            width: 120,
          }}
        />

        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search invoice, client, dept..."
          style={{
            marginLeft: 'auto',
            height: 30,
            width: 220,
            border: '1.5px solid var(--border-dk)',
            borderRadius: 6,
            padding: '0 10px 0 30px',
            fontSize: 11,
            fontFamily: 'inherit',
            outline: 'none',
            background: `var(--card) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='M21 21l-4.35-4.35'/%3E%3C/svg%3E") no-repeat 10px center`,
          }}
        />
      </div>

      {/* Data Table */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              {[
                { label: 'Invoice #', width: 88 },
                { label: 'Client', width: 190 },
                { label: 'Department', width: 150 },
                { label: 'Technician', width: 120 },
                { label: 'Visit Date', width: 82 },
                { label: 'Status', width: 82 },
                { label: 'Trays', width: 58, align: 'center' as const },
                { label: 'Instruments', width: 95, align: 'center' as const },
                { label: 'Total Billed', width: 95, align: 'right' as const },
                { label: 'Submitted', width: 85 },
              ].map(col => (
                <th key={col.label} style={{ ...thStyle, width: col.width, textAlign: col.align || 'left' }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>
                  No visits found.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr
                  key={item.onsiteServiceKey}
                  style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : undefined, cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 1 ? 'var(--row-alt)' : ''; }}
                  onClick={() => { setDetailKey(item.onsiteServiceKey); setDetailOpen(true); }}
                >
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' }}>{item.invoiceNum}</span>
                  </td>
                  <td style={tdStyle}>{item.clientName}</td>
                  <td style={tdStyle}>{item.deptName}</td>
                  <td style={tdStyle}>{item.techName}</td>
                  <td style={tdStyle}>{item.visitDate ?? '\u2014'}</td>
                  <td style={tdStyle}><StatusBadge status={item.status} /></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{item.trayCount}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{item.instrumentCount}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                    ${item.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{item.submittedDate ?? '\u2014'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'var(--neutral-50)',
        borderTop: '1.5px solid var(--border-dk)',
        flexShrink: 0,
        fontSize: 11,
        color: 'var(--muted)',
      }}>
        <span style={{ fontWeight: 500 }}>{totalCount.toLocaleString()} records</span>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{
              height: 26, minWidth: 26, padding: '0 6px',
              border: '1px solid var(--border-dk)', borderRadius: 4,
              background: 'var(--card)', fontSize: 11, color: 'var(--label)',
              cursor: page <= 1 ? 'default' : 'pointer',
              opacity: page <= 1 ? 0.4 : 1, fontFamily: 'inherit',
            }}
          >
            {'\u2039'}
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const pg = i + 1;
            return (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                style={{
                  height: 26, minWidth: 26, padding: '0 6px',
                  border: '1px solid var(--border-dk)', borderRadius: 4,
                  background: page === pg ? 'var(--navy)' : 'var(--card)',
                  color: page === pg ? 'var(--card)' : 'var(--label)',
                  fontSize: 11, fontWeight: page === pg ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {pg}
              </button>
            );
          })}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{
              height: 26, minWidth: 26, padding: '0 6px',
              border: '1px solid var(--border-dk)', borderRadius: 4,
              background: 'var(--card)', fontSize: 11, color: 'var(--label)',
              cursor: page >= totalPages ? 'default' : 'pointer',
              opacity: page >= totalPages ? 0.4 : 1, fontFamily: 'inherit',
            }}
          >
            {'\u203A'}
          </button>
        </div>
      </div>

      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        onCreated={() => { setQuoteOpen(false); reload(); }}
      />
      <CompleteServiceModal
        open={completeOpen}
        visit={selectedVisit}
        onClose={() => { setCompleteOpen(false); setSelectedVisit(null); }}
        onUpdated={() => { setCompleteOpen(false); setSelectedVisit(null); reload(); }}
      />
      <OnsiteServiceDetailDrawer
        open={detailOpen}
        serviceKey={detailKey}
        onClose={() => { setDetailOpen(false); setDetailKey(null); }}
        onUpdated={() => { reload(); }}
      />
    </div>
  );
};
