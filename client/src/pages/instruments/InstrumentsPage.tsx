import { useState, useEffect, useCallback } from 'react';
import { Input, Select, Table, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  getInstrumentRepairs,
  getInstrumentRepairDetail,
  getInstrumentCatalog,
  getInstrumentCatalogDetail,
  getInstrumentStats,
} from '../../api/instruments';
import { RepairDrawer, CatalogDrawer } from './InstrumentsDetailPane';
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

const fmtDate = (d: string | null) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '\u2014' : dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};

const TABS: { key: InstrumentTab; label: string }[] = [
  { key: 'repairs', label: 'Instrument Repairs' },
  { key: 'quotes', label: 'Instrument Quotes' },
  { key: 'catalog', label: 'Instrument Catalog' },
];

const STATUS_COLORS: Record<string, string> = {
  'Received': 'blue',
  'In Progress': 'gold',
  'Outsourced': 'purple',
  'On Hold': 'orange',
  'Complete': 'green',
  'Completed': 'green',
  'Invoiced': 'green',
};

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
  const [pageSize, setPageSize] = useState(50);

  // Repairs data
  const [repairs, setRepairs] = useState<InstrumentRepairListItem[]>([]);
  const [repairTotal, setRepairTotal] = useState(0);
  const [repairDetail, setRepairDetail] = useState<InstrumentRepairDetail | null>(null);
  const [repairDrawerOpen, setRepairDrawerOpen] = useState(false);
  const [repairDetailLoading, setRepairDetailLoading] = useState(false);

  // Catalog data
  const [catalogItems, setCatalogItems] = useState<InstrumentCatalogItem[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogDetail, setCatalogDetail] = useState<InstrumentCatalogDetail | null>(null);
  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState(false);
  const [catalogDetailLoading, setCatalogDetailLoading] = useState(false);

  useEffect(() => {
    getInstrumentStats().then(setStats).catch(() => {});
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

  const handleTabChange = (tab: InstrumentTab) => {
    setActiveTab(tab);
    setSearch('');
    setStatusFilter('');
    setTypeFilter('');
    setActiveFilter('');
    setPage(1);
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
    setRepairDetailLoading(true);
    setRepairDrawerOpen(true);
    try {
      const d = await getInstrumentRepairDetail(key);
      setRepairDetail(d);
    } finally {
      setRepairDetailLoading(false);
    }
  };

  const handleViewCatalogItem = async (key: number) => {
    setCatalogDetailLoading(true);
    setCatalogDrawerOpen(true);
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

  const repairColumns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 100,
      render: (v: string) => <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{v}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'dateReceived',
      key: 'dateReceived',
      width: 90,
      render: (v: string | null) => <span style={{ color: 'var(--muted)' }}>{fmtDate(v)}</span>,
    },
    { title: 'Client', dataIndex: 'clientName', key: 'clientName' },
    { title: 'Department', dataIndex: 'departmentName', key: 'departmentName' },
    {
      title: 'Items',
      dataIndex: 'itemCount',
      key: 'itemCount',
      width: 60,
      align: 'center' as const,
    },
    {
      title: 'Value',
      dataIndex: 'totalValue',
      key: 'totalValue',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{fmt$(v)}</span>,
      sorter: (a: InstrumentRepairListItem, b: InstrumentRepairListItem) => a.totalValue - b.totalValue,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: string) => <Tag color={STATUS_COLORS[v] ?? 'default'}>{v}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      render: (_: unknown, r: InstrumentRepairListItem) => (
        <button
          onClick={() => handleViewRepair(r.repairKey)}
          style={{
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 600,
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'var(--card)',
            color: 'var(--primary)',
            cursor: 'pointer',
          }}
        >
          View
        </button>
      ),
    },
  ];

  const catalogColumns = [
    {
      title: 'Description',
      dataIndex: 'itemDescription',
      key: 'itemDescription',
      render: (v: string) => <span style={{ fontWeight: 600 }}>{v}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'rigidOrFlexible',
      key: 'rigidOrFlexible',
      width: 80,
      render: (v: string | null) => v === 'R' ? 'Rigid' : v === 'F' ? 'Flexible' : v || '\u2014',
    },
    {
      title: 'P/L',
      dataIndex: 'partOrLabor',
      key: 'partOrLabor',
      width: 60,
      render: (v: string | null) => v === 'P' ? 'Part' : v === 'L' ? 'Labor' : v || '\u2014',
    },
    { title: 'Product ID', dataIndex: 'productId', key: 'productId', width: 90, render: (v: string | null) => v || '\u2014' },
    { title: 'TSI Code', dataIndex: 'tsiCode', key: 'tsiCode', width: 90, render: (v: string | null) => v || '\u2014' },
    {
      title: 'Avg Material',
      dataIndex: 'avgCostMaterial',
      key: 'avgCostMaterial',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <span style={{ color: 'var(--muted)' }}>{fmt$(v)}</span>,
    },
    {
      title: 'Avg Labor',
      dataIndex: 'avgCostLabor',
      key: 'avgCostLabor',
      width: 90,
      align: 'right' as const,
      render: (v: number) => <span style={{ color: 'var(--muted)' }}>{fmt$(v)}</span>,
    },
    {
      title: 'Usage',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: 70,
      align: 'right' as const,
      sorter: (a: InstrumentCatalogItem, b: InstrumentCatalogItem) => a.usageCount - b.usageCount,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      render: (_: unknown, r: InstrumentCatalogItem) => (
        <button
          onClick={() => handleViewCatalogItem(r.repairItemKey)}
          style={{
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 600,
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'var(--card)',
            color: 'var(--primary)',
            cursor: 'pointer',
          }}
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div style={{ height: 'calc(100vh - 64px)', overflow: 'auto', background: 'var(--bg)' }}>
      {/* Page tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--neutral-50)',
        borderBottom: '1px solid var(--neutral-200)',
        padding: '0 16px',
        flexShrink: 0,
      }}>
        {TABS.map((t) => (
          <div
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            style={{
              padding: '10px 18px',
              fontSize: 12,
              fontWeight: activeTab === t.key ? 700 : 600,
              color: activeTab === t.key ? 'var(--primary)' : 'var(--muted)',
              cursor: 'pointer',
              borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2,
              transition: 'all 0.12s',
              userSelect: 'none' as const,
            }}
          >
            {t.label}
            {t.key === 'catalog' && catalogTotal > 0 && (
              <span style={{
                background: 'var(--navy)',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 7,
                marginLeft: 4,
              }}>
                {catalogTotal.toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Stat strip — only for repairs tab */}
        {(activeTab === 'repairs' || activeTab === 'quotes') && (
          <div style={{
            display: 'flex',
            marginBottom: 20,
            borderRadius: 10,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            background: 'var(--card)',
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
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: chip.iconBg,
                  color: chip.iconColor,
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {chip.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: chip.valueColor, lineHeight: 1.2 }}>
                    {getStatValue(chip.key)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{chip.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
            placeholder={activeTab === 'catalog' ? 'Search instruments...' : 'Search order, client, dept...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240, height: 32, fontSize: 12 }}
            allowClear
          />
          {(activeTab === 'repairs' || activeTab === 'quotes') && (
            <Select
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              style={{ width: 150 }}
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
          {activeTab === 'catalog' && (
            <>
              <Select
                value={typeFilter}
                onChange={(v) => { setTypeFilter(v); setPage(1); }}
                style={{ width: 130 }}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'R', label: 'Rigid' },
                  { value: 'F', label: 'Flexible' },
                ]}
              />
              <Select
                value={activeFilter}
                onChange={(v) => { setActiveFilter(v); setPage(1); }}
                style={{ width: 130 }}
                options={[
                  { value: '', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </>
          )}
        </div>

        {/* Quotes placeholder */}
        {activeTab === 'quotes' && (
          <div style={{
            padding: 40,
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: 13,
            background: 'var(--card)',
            borderRadius: 12,
            border: '1px solid var(--border)',
          }}>
            Instrument Quotes — coming soon
          </div>
        )}

        {/* Repairs table */}
        {activeTab === 'repairs' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 16px rgba(var(--primary-rgb), 0.06)' }}>
            <Table
              dataSource={repairs}
              columns={repairColumns}
              rowKey="repairKey"
              loading={loading}
              size="small"
              pagination={{
                current: page,
                pageSize,
                total: repairTotal,
                showSizeChanger: true,
                pageSizeOptions: ['25', '50', '100'],
                onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                showTotal: (total, range) => `Showing ${range[0]}\u2013${range[1]} of ${total.toLocaleString()}`,
              }}
              style={{ fontSize: 12 }}
            />
          </div>
        )}

        {/* Catalog table */}
        {activeTab === 'catalog' && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 16px rgba(var(--primary-rgb), 0.06)' }}>
            <Table
              dataSource={catalogItems}
              columns={catalogColumns}
              rowKey="repairItemKey"
              loading={loading}
              size="small"
              pagination={{
                current: page,
                pageSize,
                total: catalogTotal,
                showSizeChanger: true,
                pageSizeOptions: ['25', '50', '100'],
                onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                showTotal: (total, range) => `Showing ${range[0]}\u2013${range[1]} of ${total.toLocaleString()}`,
              }}
              style={{ fontSize: 12 }}
            />
          </div>
        )}
      </div>

      {/* Drawers */}
      <RepairDrawer
        detail={repairDetail}
        loading={repairDetailLoading}
        open={repairDrawerOpen}
        onClose={() => { setRepairDrawerOpen(false); setRepairDetail(null); }}
      />
      <CatalogDrawer
        detail={catalogDetail}
        loading={catalogDetailLoading}
        open={catalogDrawerOpen}
        onClose={() => { setCatalogDrawerOpen(false); setCatalogDetail(null); }}
      />
    </div>
  );
};
