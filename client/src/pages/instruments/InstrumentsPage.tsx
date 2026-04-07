import { useState, useEffect, useCallback } from 'react';
import { Input, Select, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  getInstrumentRepairs,
  getInstrumentRepairDetail,
  getInstrumentCatalog,
  getInstrumentCatalogDetail,
  getInstrumentStats,
} from '../../api/instruments';
import { RepairDetailPane, CatalogDetailPane } from './InstrumentsDetailPane';
import { TabBar, StatusBadge } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import type {
  InstrumentRepairListItem,
  InstrumentRepairDetail,
  InstrumentCatalogItem,
  InstrumentCatalogDetail,
  InstrumentRepairStats,
  InstrumentTab,
} from './types';

const fmt$ = (v: number) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* fmtDate available for future use */

const TABS: TabDef[] = [
  { key: 'repairs', label: 'Instrument Repairs' },
  { key: 'quotes', label: 'Instrument Quotes' },
  { key: 'catalog', label: 'Instrument Catalog' },
];

const STAT_CHIPS: {
  key: string;
  label: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  icon: string;
  filter?: string;
}[] = [
  { key: 'all', label: 'All Orders', iconBg: 'rgba(var(--navy-rgb), 0.13)', iconColor: 'var(--navy)', valueColor: 'var(--navy)', icon: '\u2630' },
  { key: 'received', label: 'Received', iconBg: 'rgba(var(--primary-rgb), 0.13)', iconColor: 'var(--primary)', valueColor: 'var(--primary)', icon: '\u2193', filter: 'Received' },
  { key: 'inprog', label: 'In Progress', iconBg: 'rgba(var(--amber-rgb), 0.13)', iconColor: 'var(--amber)', valueColor: 'var(--amber)', icon: '\u2699', filter: 'In Progress' },
  { key: 'outsourced', label: 'Outsourced', iconBg: 'rgba(var(--primary-rgb), 0.13)', iconColor: 'var(--primary)', valueColor: 'var(--primary)', icon: '\u2191', filter: 'Outsourced' },
  { key: 'hold', label: 'On Hold', iconBg: 'rgba(var(--amber-rgb), 0.13)', iconColor: 'var(--amber)', valueColor: 'var(--amber)', icon: '\u23F8', filter: 'On Hold' },
  { key: 'complete', label: 'Complete', iconBg: 'rgba(var(--success-rgb), 0.13)', iconColor: 'var(--success)', valueColor: 'var(--success)', icon: '\u2713', filter: 'Complete' },
  { key: 'invoiced', label: 'Invoiced', iconBg: 'rgba(var(--success-rgb), 0.13)', iconColor: 'var(--success)', valueColor: 'var(--success)', icon: '$', filter: 'Invoiced' },
  { key: 'value', label: 'Total Value', iconBg: 'rgba(var(--success-rgb), 0.13)', iconColor: 'var(--success)', valueColor: 'var(--success)', icon: '\u2191' },
];

export const InstrumentsPage = () => {
  const [activeTab, setActiveTab] = useState<InstrumentTab>('repairs');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InstrumentRepairStats | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // Repairs data
  const [repairs, setRepairs] = useState<InstrumentRepairListItem[]>([]);
  const [repairTotal, setRepairTotal] = useState(0);
  const [repairDetail, setRepairDetail] = useState<InstrumentRepairDetail | null>(null);
  const [selectedRepairKey, setSelectedRepairKey] = useState<number | null>(null);
  const [repairDetailLoading, setRepairDetailLoading] = useState(false);

  // Catalog data
  const [catalogItems, setCatalogItems] = useState<InstrumentCatalogItem[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogDetail, setCatalogDetail] = useState<InstrumentCatalogDetail | null>(null);
  const [selectedCatalogKey, setSelectedCatalogKey] = useState<number | null>(null);
  const [catalogDetailLoading, setCatalogDetailLoading] = useState(false);

  useEffect(() => {
    getInstrumentStats().then(setStats).catch(() => { message.error('Failed to load instrument stats'); });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'repairs' || activeTab === 'quotes') {
        const res = await getInstrumentRepairs({
          search: search || undefined,
          statusFilter: statusFilter || undefined,
          page,
          pageSize,
        });
        setRepairs(res.items);
        setRepairTotal(res.totalCount);
      } else if (activeTab === 'catalog') {
        const res = await getInstrumentCatalog({
          search: search || undefined,
          typeFilter: typeFilter || undefined,
          activeFilter: activeFilter || undefined,
          page,
          pageSize,
        });
        setCatalogItems(res.items);
        setCatalogTotal(res.totalCount);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, statusFilter, typeFilter, activeFilter, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadData, search]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as InstrumentTab);
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setActiveFilter('');
    setPage(1);
    setSelectedRepairKey(null);
    setRepairDetail(null);
    setSelectedCatalogKey(null);
    setCatalogDetail(null);
  };

  const handleChipClick = (filter?: string) => {
    if (!filter) {
      setStatusFilter('');
    } else {
      setStatusFilter(filter);
    }
    setPage(1);
  };

  const handleViewRepair = async (key: number) => {
    setSelectedRepairKey(key);
    setRepairDetailLoading(true);
    setRepairDetail(null);
    try {
      const d = await getInstrumentRepairDetail(key);
      setRepairDetail(d);
    } finally {
      setRepairDetailLoading(false);
    }
  };

  const handleViewCatalogItem = async (key: number) => {
    setSelectedCatalogKey(key);
    setCatalogDetailLoading(true);
    setCatalogDetail(null);
    try {
      const d = await getInstrumentCatalogDetail(key);
      setCatalogDetail(d);
    } finally {
      setCatalogDetailLoading(false);
    }
  };

  const getStatValue = (key: string): string => {
    if (!stats) return '\u2014';
    switch (key) {
      case 'all': return String(stats.allOrders);
      case 'received': return String(stats.received);
      case 'inprog': return String(stats.inProgress);
      case 'outsourced': return String(stats.outsourced);
      case 'hold': return String(stats.onHold);
      case 'complete': return String(stats.complete);
      case 'invoiced': return String(stats.invoiced);
      case 'value': return fmt$(stats.totalValue);
      default: return '\u2014';
    }
  };

  // Whether a detail pane is open for repairs/quotes tab
  const repairDetailOpen = (activeTab === 'repairs' || activeTab === 'quotes') && selectedRepairKey !== null;
  const catalogDetailOpen = activeTab === 'catalog' && selectedCatalogKey !== null;
  const anyDetailOpen = repairDetailOpen || catalogDetailOpen;

  /* ── Repair / Quote row card ──────────────────────────────── */
  const renderRepairRow = (item: InstrumentRepairListItem) => {
    const isSelected = item.repairKey === selectedRepairKey;
    return (
      <div
        key={item.repairKey}
        onClick={() => handleViewRepair(item.repairKey)}
        style={{
          padding: '9px 12px',
          borderBottom: '1px solid var(--neutral-100)',
          cursor: 'pointer',
          background: isSelected ? 'var(--primary-light)' : 'var(--card)',
          borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--neutral-50)'; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--card)'; }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{item.orderNumber}</div>
          <StatusBadge status={item.status} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.clientName}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 10, color: 'var(--muted)' }}>
          <span>{item.departmentName}</span>
          <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{fmt$(item.totalValue)}</span>
        </div>
      </div>
    );
  };

  /* ── Catalog row card ─────────────────────────────────────── */
  const renderCatalogRow = (item: InstrumentCatalogItem) => {
    const isSelected = item.repairItemKey === selectedCatalogKey;
    return (
      <div
        key={item.repairItemKey}
        onClick={() => handleViewCatalogItem(item.repairItemKey)}
        style={{
          padding: '9px 12px',
          borderBottom: '1px solid var(--neutral-100)',
          cursor: 'pointer',
          background: isSelected ? 'var(--primary-light)' : 'var(--card)',
          borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--neutral-50)'; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'var(--card)'; }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', flex: 1, marginRight: 8 }}>{item.itemDescription}</div>
          <StatusBadge status={item.isActive ? 'Active' : 'Inactive'} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: 10, color: 'var(--muted)' }}>
          <span>{item.rigidOrFlexible === 'R' ? 'Rigid' : item.rigidOrFlexible === 'F' ? 'Flexible' : item.rigidOrFlexible || '\u2014'}</span>
          <span>{item.tsiCode || '\u2014'}</span>
          <span style={{ marginLeft: 'auto' }}>Usage: {item.usageCount}</span>
        </div>
      </div>
    );
  };

  /* ── Pagination ───────────────────────────────────────────── */
  const totalItems = (activeTab === 'repairs' || activeTab === 'quotes') ? repairTotal : catalogTotal;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginationBar = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderTop: '1px solid var(--border)', background: 'var(--neutral-50)', flexShrink: 0 }}>
      <span style={{ fontSize: 10, color: 'var(--muted)' }}>
        {(activeTab === 'repairs' || activeTab === 'quotes') ? repairs.length : catalogItems.length} of {totalItems}
      </span>
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 3 }}>
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Page tabs */}
      <TabBar
        tabs={TABS.map(t =>
          t.key === 'catalog' && catalogTotal > 0
            ? { ...t, label: `${t.label} (${catalogTotal.toLocaleString()})` }
            : t
        )}
        activeKey={activeTab}
        onChange={handleTabChange}
      />

      {/* Stat strip — only for repairs/quotes tab */}
      {(activeTab === 'repairs' || activeTab === 'quotes') && (
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          flexShrink: 0,
          overflowX: 'auto',
        }}>
          {STAT_CHIPS.map((chip, i) => (
            <div
              key={chip.key}
              onClick={() => chip.filter !== undefined ? handleChipClick(chip.filter) : handleChipClick()}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                cursor: chip.filter !== undefined ? 'pointer' : 'default',
                borderRight: i < STAT_CHIPS.length - 1 ? '1px solid var(--border)' : undefined,
                background: statusFilter === (chip.filter ?? '') && chip.filter !== undefined ? 'var(--primary-light)' : undefined,
                outline: statusFilter === (chip.filter ?? '') && chip.filter !== undefined ? '2.5px solid var(--navy)' : undefined,
                outlineOffset: statusFilter === (chip.filter ?? '') && chip.filter !== undefined ? -2 : undefined,
                transition: 'background 0.12s',
                minWidth: 100,
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: chip.iconBg, color: chip.iconColor, fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {chip.icon}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: chip.valueColor, lineHeight: 1.2 }}>{getStatValue(chip.key)}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{chip.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Split pane */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Left panel — list */}
        <div style={{
          width: anyDetailOpen ? 340 : '100%',
          minWidth: anyDetailOpen ? 340 : undefined,
          borderRight: anyDetailOpen ? '1px solid var(--neutral-200)' : undefined,
          display: 'flex', flexDirection: 'column',
          background: 'var(--card)',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
        }}>
          {/* Toolbar */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Input
                prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
                placeholder={activeTab === 'catalog' ? 'Search instruments...' : 'Search order, client, dept...'}
                aria-label="Search instruments"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ height: 28, fontSize: 11, flex: 1, minWidth: 140 }}
                allowClear
              />
              {(activeTab === 'repairs' || activeTab === 'quotes') && !anyDetailOpen && (
                <Select
                  value={statusFilter}
                  onChange={(v) => { setStatusFilter(v); setPage(1); }}
                  style={{ width: 140 }}
                  size="small"
                  aria-label="Filter by status"
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'Received', label: 'Received' },
                    { value: 'In Progress', label: 'In Progress' },
                    { value: 'Outsourced', label: 'Outsourced' },
                    { value: 'On Hold', label: 'On Hold' },
                    { value: 'Complete', label: 'Complete' },
                    { value: 'Invoiced', label: 'Invoiced' },
                  ]}
                />
              )}
              {activeTab === 'catalog' && !anyDetailOpen && (
                <>
                  <Select
                    value={typeFilter}
                    onChange={(v) => { setTypeFilter(v); setPage(1); }}
                    style={{ width: 110 }}
                    size="small"
                    aria-label="Filter by type"
                    options={[
                      { value: '', label: 'All Types' },
                      { value: 'R', label: 'Rigid' },
                      { value: 'F', label: 'Flexible' },
                    ]}
                  />
                  <Select
                    value={activeFilter}
                    onChange={(v) => { setActiveFilter(v); setPage(1); }}
                    style={{ width: 100 }}
                    size="small"
                    aria-label="Filter by active status"
                    options={[
                      { value: '', label: 'All' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </>
              )}
            </div>
            {/* Count badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                {totalItems.toLocaleString()} records
              </span>
            </div>
          </div>

          {/* List rows */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading...</div>}
            {!loading && (activeTab === 'repairs' || activeTab === 'quotes') && repairs.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No records found</div>
            )}
            {!loading && activeTab === 'catalog' && catalogItems.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No records found</div>
            )}
            {(activeTab === 'repairs' || activeTab === 'quotes') && repairs.map(renderRepairRow)}
            {activeTab === 'catalog' && catalogItems.map(renderCatalogRow)}
          </div>

          {paginationBar}
        </div>

        {/* Right panel — detail */}
        {repairDetailOpen && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--card)' }}>
            <RepairDetailPane
              detail={repairDetail}
              loading={repairDetailLoading}
              onClose={() => { setSelectedRepairKey(null); setRepairDetail(null); }}
            />
          </div>
        )}
        {catalogDetailOpen && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--card)' }}>
            <CatalogDetailPane
              detail={catalogDetail}
              loading={catalogDetailLoading}
              onClose={() => { setSelectedCatalogKey(null); setCatalogDetail(null); }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Shared ───────────────────────────────────────────────── */
const PgBtn = ({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) => (
  <button disabled={disabled} onClick={onClick} style={{
    height: 22, minWidth: 22, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, fontSize: 10, fontFamily: 'inherit',
    cursor: disabled ? 'default' : 'pointer', fontWeight: active ? 600 : 400,
    background: active ? 'var(--navy)' : 'var(--card)', color: active ? 'var(--card)' : 'var(--muted)', opacity: disabled ? 0.4 : 1,
  }}>{children}</button>
);
