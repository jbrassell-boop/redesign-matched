import { useState, useEffect, useCallback, useRef } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { getOutsourceValidation, getOutsourceStats } from '../../api/outsource-validation';
import { SendToVendorModal } from './SendToVendorModal';
import { ReceiveBackModal } from './ReceiveBackModal';
import { ValidationChecklist } from './ValidationChecklist';
import type { OutsourceListItem, OutsourceStats, OutsourceFilters } from './types';
import { StatusBadge } from '../../components/shared';
import './OutsourceValidationPage.css';

interface StatChipProps {
  label: string;
  value: string | number;
  iconColor: string;
  iconBg: string;
  valueColor: string;
  icon: React.ReactNode;
}

const StatChip = ({ label, value, iconColor, iconBg, valueColor, icon }: StatChipProps) => (
  <div className="ovp-stat-chip">
    <div className="ovp-stat-chip-icon" style={{ background: iconBg, color: iconColor }}>
      {icon}
    </div>
    <div>
      <div className="ovp-stat-chip-value" style={{ color: valueColor }}>{value}</div>
      <div className="ovp-stat-chip-label">{label}</div>
    </div>
  </div>
);

const IconList = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={14} height={14}>
    <rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 5h6M5 8h6M5 11h4" />
  </svg>
);
const IconDollar = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={14} height={14}>
    <line x1="8" y1="1.5" x2="8" y2="14.5" /><path d="M11 4.5H6.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H5" />
  </svg>
);
const IconTrend = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={14} height={14}>
    <polyline points="14 4 9 9 6 6 2 12" /><polyline points="10 4 14 4 14 8" />
  </svg>
);
const IconWarn = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={14} height={14}>
    <path d="M7.13 2.5L1.5 12.5a1 1 0 0 0 .87 1.5h11.26a1 1 0 0 0 .87-1.5L8.87 2.5a1 1 0 0 0-1.74 0z" />
    <line x1="8" y1="6" x2="8" y2="9" /><circle cx="8" cy="11.5" r=".5" fill="currentColor" stroke="none" />
  </svg>
);
const IconBuilding = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={14} height={14}>
    <path d="M2 14h12" /><path d="M3 14V7l5-4 5 4v7" /><rect x="6" y="9" width="4" height="5" />
  </svg>
);
const IconClock = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} width={14} height={14}>
    <circle cx="8" cy="8" r="6" /><path d="M8 4.5v3.5l2.5 1.5" />
  </svg>
);

const PAGE_SIZE = 25;

const fmtMoney = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoneyShort = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const OutsourceValidationPage = () => {
  const [stats, setStats] = useState<OutsourceStats | null>(null);
  const [items, setItems] = useState<OutsourceListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const [selectedItem, setSelectedItem] = useState<OutsourceListItem | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    getOutsourceStats().then(d => { if (!cancelled) setStats(d); }).finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const loadData = useCallback(async (filters: OutsourceFilters) => {
    setLoading(true);
    try {
      const result = await getOutsourceValidation(filters);
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
    getOutsourceStats().then(setStats);
  }, [search, statusFilter, dateFrom, dateTo, page, loadData]);

  const getRowMenuItems = (item: OutsourceListItem): MenuProps['items'] => {
    const items: MenuProps['items'] = [];
    if (item.status === 'At Vendor') {
      items.push({ key: 'receive', label: 'Mark Returned', onClick: () => { setSelectedItem(item); setReceiveOpen(true); } });
    }
    if (item.status === 'Returned' || item.status === 'Pending Review') {
      items.push({ key: 'validate', label: 'Validate / Flag', onClick: () => { setSelectedItem(item); setValidateOpen(true); } });
    }
    if (!item.vendorName) {
      items.push({ key: 'send', label: 'Send to Vendor', onClick: () => { setSelectedItem(item); setSendOpen(true); } });
    }
    if (items.length === 0) {
      items.push({ key: 'none', label: 'No actions available', disabled: true });
    }
    return items;
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

  // styles moved to OutsourceValidationPage.css

  return (
    <div className="ovp-page">

      {/* Stat Strip */}
      <div className="ovp-stat-strip">
        <StatChip label="Total Outsourced" value={statsLoading ? '\u2014' : (stats?.total ?? 0)} icon={<IconList />} iconColor="var(--navy)" iconBg="rgba(var(--navy-rgb), 0.13)" valueColor="var(--navy)" />
        <StatChip label="Outsource Spend" value={statsLoading ? '\u2014' : fmtMoneyShort(stats?.outsourceSpend ?? 0)} icon={<IconDollar />} iconColor="var(--danger)" iconBg="rgba(var(--danger-rgb), 0.13)" valueColor="var(--danger)" />
        <StatChip label="Avg Margin" value={statsLoading ? '\u2014' : `${stats?.avgMarginPct ?? 0}%`} icon={<IconTrend />} iconColor="var(--success)" iconBg="rgba(var(--success-rgb), 0.13)" valueColor="var(--success)" />
        <StatChip label="Negative Margin" value={statsLoading ? '\u2014' : (stats?.negativeMargin ?? 0)} icon={<IconWarn />} iconColor="var(--danger)" iconBg="rgba(var(--danger-rgb), 0.13)" valueColor="var(--danger)" />
        <StatChip label="Top Vendor Spend" value={statsLoading ? '\u2014' : fmtMoneyShort(stats?.topVendorSpend ?? 0)} icon={<IconBuilding />} iconColor="var(--warning)" iconBg="rgba(var(--amber-rgb), 0.13)" valueColor="var(--warning)" />
        <StatChip label="Avg Days Out" value={statsLoading ? '\u2014' : `${stats?.avgDaysOut ?? 0}d`} icon={<IconClock />} iconColor="var(--primary)" iconBg="rgba(var(--primary-rgb), 0.13)" valueColor="var(--primary)" />
      </div>

      {/* Toolbar */}
      <div className="ovp-toolbar">
        <span className="ovp-filter-label">Status</span>
        <div className="ovp-seg-group">
          {(['all', 'At Vendor', 'Returned', 'Pending Review', 'Validated', 'Flagged'] as const).map((v, i, arr) => (
            <button
              key={v}
              onClick={() => { setStatusFilter(v); setPage(1); }}
              style={{
                ...segBtnStyle(statusFilter === v),
                borderRight: i < arr.length - 1 ? '1px solid var(--border-dk)' : 'none',
              }}
            >
              {v === 'all' ? 'All' : v}
            </button>
          ))}
        </div>

        <div className="ovp-sep" />

        <span className="ovp-filter-label">From</span>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          aria-label="Filter from date"
          className="ovp-date-input" />
        <span className="ovp-filter-label">To</span>
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          aria-label="Filter to date"
          className="ovp-date-input" />

        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search WO#, serial, client, vendor..."
          aria-label="Search outsource validations"
          className="ovp-search-input"
          style={{
            background: `var(--card) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='M21 21l-4.35-4.35'/%3E%3C/svg%3E") no-repeat 10px center`,
          }} />
      </div>

      {/* Data Table */}
      <div className="ovp-table-area">
        <table className="ovp-table">
          <thead>
            <tr>
              {[
                { label: 'WO#', width: 70 },
                { label: 'Serial#', width: 120 },
                { label: 'Scope Type', width: 95 },
                { label: 'Client', width: 180 },
                { label: 'Vendor', width: 150 },
                { label: 'Sent Date', width: 98 },
                { label: 'Days Out', width: 62, align: 'center' as const },
                { label: 'Vendor Cost', width: 88, align: 'right' as const },
                { label: 'TSI Charge', width: 88, align: 'right' as const },
                { label: 'Margin $', width: 78, align: 'right' as const },
                { label: 'Margin %', width: 65, align: 'right' as const },
                { label: 'Status', width: 100 },
              ].map(col => (
                <th key={col.label} className="ovp-th" style={{ width: col.width, textAlign: col.align || 'left' }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="ovp-empty-cell">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={12} className="ovp-empty-cell">No outsourced repairs found.</td></tr>
            ) : (
              items.map((item, idx) => {
                const daysColor = item.daysOut > 30 ? 'var(--danger)' : item.daysOut > 14 ? 'var(--warning)' : 'var(--muted)';
                const marginColor = item.marginDollar >= 0 ? 'var(--success)' : 'var(--danger)';
                return (
                  <Dropdown key={item.repairKey} menu={{ items: getRowMenuItems(item) }} trigger={['contextMenu']}>
                  <tr
                    className="hover-row-light"
                    style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : undefined, cursor: 'pointer' }}
                  >
                    <td className="ovp-td"><span className="ovp-wo-text">{item.wo}</span></td>
                    <td className="ovp-td">{item.serial}</td>
                    <td className="ovp-td">{item.scopeType}</td>
                    <td className="ovp-td">{item.clientName}</td>
                    <td className="ovp-td">{item.vendorName}</td>
                    <td className="ovp-td">{item.sentDate ?? '\u2014'}</td>
                    <td className="ovp-td" style={{ textAlign: 'center', fontWeight: 600, color: daysColor }}>{item.daysOut}</td>
                    <td className="ovp-td" style={{ textAlign: 'right' }}>{fmtMoney(item.vendorCost)}</td>
                    <td className="ovp-td" style={{ textAlign: 'right' }}>{fmtMoney(item.tsiCharge)}</td>
                    <td className="ovp-td" style={{ textAlign: 'right', fontWeight: 700, color: marginColor }}>{fmtMoney(item.marginDollar)}</td>
                    <td className="ovp-td" style={{ textAlign: 'right', fontWeight: 700, color: marginColor }}>{item.marginPct}%</td>
                    <td className="ovp-td"><StatusBadge status={item.status} /></td>
                  </tr>
                  </Dropdown>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="ovp-footer">
        <span className="ovp-record-count">{totalCount.toLocaleString()} records</span>
        <div className="ovp-pag-btns">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="ovp-pag-btn" style={{ opacity: page <= 1 ? 0.4 : 1 }}>
            {'\u2039'}
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const pg = i + 1;
            return (
              <button key={pg} onClick={() => setPage(pg)}
                className="ovp-pag-btn"
                style={{ background: page === pg ? 'var(--navy)' : 'var(--card)', color: page === pg ? 'var(--card)' : 'var(--label)', fontWeight: page === pg ? 600 : 400 }}>
                {pg}
              </button>
            );
          })}
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="ovp-pag-btn" style={{ opacity: page >= totalPages ? 0.4 : 1 }}>
            {'\u203A'}
          </button>
        </div>
      </div>

      <SendToVendorModal
        open={sendOpen}
        item={selectedItem}
        onClose={() => { setSendOpen(false); setSelectedItem(null); }}
        onSent={() => { setSendOpen(false); setSelectedItem(null); reload(); }}
      />
      <ReceiveBackModal
        open={receiveOpen}
        item={selectedItem}
        onClose={() => { setReceiveOpen(false); setSelectedItem(null); }}
        onReceived={() => { setReceiveOpen(false); setSelectedItem(null); reload(); }}
      />
      <ValidationChecklist
        open={validateOpen}
        item={selectedItem}
        onClose={() => { setValidateOpen(false); setSelectedItem(null); }}
        onValidated={() => { setValidateOpen(false); setSelectedItem(null); reload(); }}
      />
    </div>
  );
};
