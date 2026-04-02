import { useState, useEffect, useCallback } from 'react';
import { Table, Input, Segmented } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getDashboardShipping } from '../../../api/dashboard';
import type { DashboardShipment, DashboardShippingStats } from '../types';

const COLUMNS: ColumnsType<DashboardShipment> = [
  { title: 'WO#', dataIndex: 'wo', key: 'wo', width: 100, sorter: (a, b) => a.wo.localeCompare(b.wo) },
  { title: 'Client', dataIndex: 'client', key: 'client', ellipsis: true, sorter: (a, b) => a.client.localeCompare(b.client) },
  { title: 'Dept', dataIndex: 'dept', key: 'dept', ellipsis: true },
  { title: 'Scope Type', dataIndex: 'scopeType', key: 'scopeType', ellipsis: true },
  { title: 'Serial#', dataIndex: 'serial', key: 'serial', width: 110 },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (v: string) => {
    const isReady = v === 'Complete' || v === 'Pending Ship';
    return <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: isReady ? 'rgba(var(--amber-rgb), 0.1)' : 'rgba(var(--success-rgb), 0.1)', color: isReady ? 'var(--amber)' : 'var(--success)' }}>{v}</span>;
  }},
  { title: 'Date In', dataIndex: 'dateIn', key: 'dateIn', width: 90 },
  { title: 'Ship Date', dataIndex: 'shipDate', key: 'shipDate', width: 90, render: (v: string | null) => v ?? '\u2014' },
  { title: 'Tracking', dataIndex: 'trackingNumber', key: 'trackingNumber', width: 140, ellipsis: true, render: (v: string | null) => v || '\u2014' },
  { title: 'Charge', dataIndex: 'shipCharge', key: 'shipCharge', width: 80, align: 'right', render: (v: number) => `$${v.toFixed(2)}` },
];

const StatChip = ({ label, value }: { label: string; value: string }) => (
  <div style={{ flex: 1, padding: '10px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{value}</div>
    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>{label}</div>
  </div>
);

export const ShippingTab = () => {
  const [items, setItems] = useState<DashboardShipment[]>([]);
  const [stats, setStats] = useState<DashboardShippingStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('ready');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const load = useCallback(async (s: string, seg: string, p: number, ps: number) => {
    setLoading(true);
    try {
      const r = await getDashboardShipping({ search: s || undefined, segment: seg, page: p, pageSize: ps });
      setItems(r.shipments);
      setTotal(r.totalCount);
      setStats(r.stats);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, segment, page, pageSize), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, segment, page, pageSize, load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <StatChip label="Ready to Ship" value={String(stats?.readyToShip ?? 0)} />
        <StatChip label="Shipped Today" value={String(stats?.shippedToday ?? 0)} />
        <StatChip label="Total Charges" value={`$${(stats?.totalCharges ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border)', gap: 8 }}>
        <Segmented
          options={[
            { label: `Ready to Ship (${stats?.readyToShip ?? 0})`, value: 'ready' },
            { label: `Shipped Today (${stats?.shippedToday ?? 0})`, value: 'today' },
            { label: 'All Shipped', value: 'all' },
          ]}
          value={segment}
          onChange={v => { setSegment(v as string); setPage(1); }}
          size="small"
        />
        <div style={{ flex: 1 }} />
        <Input prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />} placeholder="Search WO#, serial, client, tracking..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 260, height: 30, fontSize: 13 }} allowClear />
      </div>
      <Table<DashboardShipment>
        dataSource={items} columns={COLUMNS} rowKey="repairKey" loading={loading} size="small" scroll={{ x: 1100 }}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: ['25', '50', '100'], onChange: (p, ps) => { setPage(p); setPageSize(ps); }, style: { padding: '8px 16px', background: 'var(--card)', borderTop: '1px solid var(--neutral-200)', margin: 0 }, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        style={{ flex: 1 }}
      />
    </div>
  );
};
