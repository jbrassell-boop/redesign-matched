import { useState, useEffect, useCallback } from 'react';
import { Table, Input, Segmented } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getDashboardInvoices } from '../../../api/dashboard';
import type { DashboardInvoice, DashboardInvoiceStats } from '../types';

const COLUMNS: ColumnsType<DashboardInvoice> = [
  { title: 'Invoice#', dataIndex: 'invoiceNumber', key: 'invoiceNumber', width: 120, sorter: (a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber) },
  { title: 'Client', dataIndex: 'client', key: 'client', ellipsis: true, sorter: (a, b) => a.client.localeCompare(b.client) },
  { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 100, align: 'right', sorter: (a, b) => a.amount - b.amount, render: (v: number) => <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v: string) => {
    const isPending = v === 'Pending';
    return <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: isPending ? 'rgba(var(--amber-rgb), 0.1)' : 'rgba(var(--success-rgb), 0.1)', color: isPending ? 'var(--amber)' : 'var(--success)' }}>{v}</span>;
  }},
  { title: 'Date', dataIndex: 'date', key: 'date', width: 100, sorter: (a, b) => a.date.localeCompare(b.date), defaultSortOrder: 'descend' },
];

const fmt$ = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const StatChip = ({ label, value }: { label: string; value: string }) => (
  <div style={{ flex: 1, padding: '10px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{value}</div>
    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>{label}</div>
  </div>
);

export const InvoicesTab = () => {
  const [items, setItems] = useState<DashboardInvoice[]>([]);
  const [stats, setStats] = useState<DashboardInvoiceStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('ready');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const load = useCallback(async (s: string, seg: string, p: number, ps: number) => {
    setLoading(true);
    try {
      const r = await getDashboardInvoices({ search: s || undefined, segment: seg, page: p, pageSize: ps });
      setItems(r.invoices);
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
        <StatChip label="Ready to Invoice" value={String(stats?.readyToInvoice ?? 0)} />
        <StatChip label="Invoiced (Month)" value={String(stats?.invoicedMonth ?? 0)} />
        <StatChip label="Total Amount" value={fmt$(stats?.totalAmount ?? 0)} />
        <StatChip label="Avg Invoice" value={fmt$(stats?.avgInvoice ?? 0)} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border)', gap: 8 }}>
        <Segmented
          options={[
            { label: `Ready to Invoice (${stats?.readyToInvoice ?? 0})`, value: 'ready' },
            { label: 'Invoiced', value: 'invoiced' },
            { label: 'All', value: 'all' },
          ]}
          value={segment}
          onChange={v => { setSegment(v as string); setPage(1); }}
          size="small"
        />
        <div style={{ flex: 1 }} />
        <Input prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />} placeholder="Search invoice#, client..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 260, height: 30, fontSize: 13 }} allowClear />
      </div>
      <Table<DashboardInvoice>
        dataSource={items} columns={COLUMNS} rowKey="invoiceKey" loading={loading} size="small" scroll={{ x: 600 }}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: ['25', '50', '100'], onChange: (p, ps) => { setPage(p); setPageSize(ps); }, style: { padding: '8px 16px', background: 'var(--card)', borderTop: '1px solid var(--neutral-200)', margin: 0 }, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        style={{ flex: 1 }}
      />
    </div>
  );
};
