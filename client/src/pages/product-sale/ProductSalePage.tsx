import { useState, useEffect, useCallback } from 'react';
import { Input, Select, Table } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getProductSales, getProductSaleDetail, getProductSaleStats } from '../../api/product-sales';
import { ProductSaleDetailPane } from './ProductSaleDetailPane';
import { StatusBadge } from '../../components/shared';
import type { ProductSaleListItem, ProductSaleDetail, ProductSaleStats } from './types';

const fmt$ = (v: number) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | null) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '\u2014' : dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
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
  { key: 'total', label: 'Total Orders', iconBg: 'rgba(var(--navy-rgb), 0.13)', iconColor: 'var(--navy)', valueColor: 'var(--navy)', icon: '\u2630' },
  { key: 'open', label: 'Open', iconBg: 'rgba(var(--primary-rgb), 0.13)', iconColor: 'var(--primary)', valueColor: 'var(--primary)', icon: '\u2751', filter: 'Open' },
  { key: 'invoiced', label: 'Invoiced', iconBg: 'rgba(var(--success-rgb), 0.13)', iconColor: 'var(--success)', valueColor: 'var(--success)', icon: '\u2713', filter: 'Invoiced' },
  { key: 'draft', label: 'Draft', iconBg: 'rgba(var(--amber-rgb), 0.13)', iconColor: 'var(--amber)', valueColor: 'var(--amber)', icon: '\u270F', filter: 'Draft' },
  { key: 'quoted', label: 'Quoted', iconBg: 'rgba(var(--primary-rgb), 0.13)', iconColor: 'var(--primary)', valueColor: 'var(--primary)', icon: '\u2709', filter: 'Quote Sent' },
  { key: 'cancelled', label: 'Cancelled', iconBg: 'rgba(var(--danger-rgb), 0.13)', iconColor: 'var(--danger)', valueColor: 'var(--danger)', icon: '\u2715', filter: 'Cancelled' },
  { key: 'revenue', label: 'Total Revenue', iconBg: 'rgba(var(--navy-rgb), 0.13)', iconColor: 'var(--navy)', valueColor: 'var(--navy)', icon: '$' },
];

export const ProductSalePage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProductSaleStats | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [sales, setSales] = useState<ProductSaleListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [detail, setDetail] = useState<ProductSaleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    getProductSaleStats().then(setStats).catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProductSales({
        search: search || undefined,
        statusFilter: statusFilter || undefined,
        page,
        pageSize,
      });
      setSales(res.items);
      setTotalCount(res.totalCount);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadData, search]);

  const handleView = async (key: number) => {
    setDetailLoading(true);
    setDrawerOpen(true);
    try {
      const d = await getProductSaleDetail(key);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleChipClick = (filter?: string) => {
    setStatusFilter(filter ?? '');
    setPage(1);
  };

  const getStatValue = (key: string): string => {
    if (!stats) return '\u2014';
    switch (key) {
      case 'total': return String(stats.totalOrders);
      case 'open': return String(stats.openCount);
      case 'invoiced': return String(stats.invoicedCount);
      case 'draft': return String(stats.draftCount);
      case 'quoted': return String(stats.quotedCount);
      case 'cancelled': return String(stats.cancelledCount);
      case 'revenue': return fmt$(stats.totalRevenue);
      default: return '\u2014';
    }
  };

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 100,
      render: (v: string) => <span style={{ fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' }}>{v}</span>,
    },
    { title: 'Client', dataIndex: 'clientName', key: 'clientName' },
    { title: 'Department', dataIndex: 'departmentName', key: 'departmentName' },
    { title: 'Sales Rep', dataIndex: 'salesRep', key: 'salesRep', width: 120 },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 100,
      render: (v: string | null) => <span style={{ color: 'var(--muted)' }}>{fmtDate(v)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: string) => <StatusBadge status={v} />,
    },
    {
      title: 'Items',
      dataIndex: 'itemCount',
      key: 'itemCount',
      width: 60,
      align: 'center' as const,
    },
    {
      title: 'PO #',
      dataIndex: 'purchaseOrder',
      key: 'purchaseOrder',
      width: 100,
      render: (v: string) => v || '\u2014',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmt$(v)}</span>,
      sorter: (a: ProductSaleListItem, b: ProductSaleListItem) => a.total - b.total,
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      render: (_: unknown, r: ProductSaleListItem) => (
        <button
          onClick={() => handleView(r.productSaleKey)}
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
      <div style={{ padding: '16px 20px' }}>
        {/* Stat strip */}
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
              onClick={() => handleChipClick(chip.filter)}
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

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
            placeholder="Search invoice#, client, PO#..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260, height: 32, fontSize: 12 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            style={{ width: 150 }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Draft', label: 'Draft' },
              { value: 'Open', label: 'Open' },
              { value: 'Invoiced', label: 'Invoiced' },
              { value: 'Cancelled', label: 'Cancelled' },
              { value: 'Quote Sent', label: 'Quote Sent' },
            ]}
          />
        </div>

        {/* Table */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 16px rgba(var(--primary-rgb), 0.06)' }}>
          <Table
            dataSource={sales}
            columns={columns}
            rowKey="productSaleKey"
            loading={loading}
            size="small"
            pagination={{
              current: page,
              pageSize,
              total: totalCount,
              showSizeChanger: true,
              pageSizeOptions: ['15', '25', '50', '100'],
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
              showTotal: (total, range) => `Showing ${range[0]}\u2013${range[1]} of ${total.toLocaleString()}`,
            }}
            style={{ fontSize: 12 }}
          />
        </div>
      </div>

      <ProductSaleDetailPane
        detail={detail}
        loading={detailLoading}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDetail(null); }}
      />
    </div>
  );
};
