import { useState, useEffect, useCallback } from 'react';
import { Table, Input, Segmented } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getDashboardTechBench } from '../../../api/dashboard';
import type { DashboardTechBenchItem, DashboardTechBenchStats } from '../types';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Received:   { bg: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' },
  Evaluation: { bg: 'rgba(var(--amber-rgb), 0.1)', color: 'var(--amber)' },
  'In Repair':{ bg: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' },
  Complete:   { bg: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)' },
};

const urgencyDot = (days: number) => {
  const color = days > 14 ? 'var(--danger)' : days > 7 ? 'var(--amber)' : 'var(--success)';
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 4 }} />;
};

const COLUMNS: ColumnsType<DashboardTechBenchItem> = [
  { title: '', key: 'urgency', width: 40, render: (_: unknown, r: DashboardTechBenchItem) => urgencyDot(r.daysIn) },
  { title: 'WO#', dataIndex: 'wo', key: 'wo', width: 100, sorter: (a, b) => a.wo.localeCompare(b.wo) },
  { title: 'Serial#', dataIndex: 'serial', key: 'serial', width: 110 },
  { title: 'Model', dataIndex: 'scopeType', key: 'scopeType', ellipsis: true, sorter: (a, b) => a.scopeType.localeCompare(b.scopeType) },
  { title: 'Customer', dataIndex: 'client', key: 'client', ellipsis: true, sorter: (a, b) => a.client.localeCompare(b.client) },
  { title: 'Days', dataIndex: 'daysIn', key: 'daysIn', width: 70, align: 'center', sorter: (a, b) => a.daysIn - b.daysIn, defaultSortOrder: 'descend', render: (v: number) => <span style={{ fontWeight: 600, color: v > 14 ? 'var(--danger)' : v > 7 ? 'var(--amber)' : 'var(--text)' }}>{v}</span> },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v: string) => {
    const s = STATUS_STYLES[v] ?? { bg: 'var(--neutral-100)', color: 'var(--muted)' };
    return <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: s.bg, color: s.color }}>{v}</span>;
  }},
  { title: 'Tech', dataIndex: 'tech', key: 'tech', width: 100, render: (v: string | null) => v || '\u2014' },
];

const StatChip = ({ label, value }: { label: string; value: number }) => (
  <div style={{ flex: 1, padding: '10px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>{label}</div>
    </div>
  </div>
);

export const TechBenchTab = () => {
  const [items, setItems] = useState<DashboardTechBenchItem[]>([]);
  const [stats, setStats] = useState<DashboardTechBenchStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const load = useCallback(async (s: string, sf: string, p: number, ps: number) => {
    setLoading(true);
    try {
      const r = await getDashboardTechBench({ search: s || undefined, statusFilter: sf || undefined, page: p, pageSize: ps });
      setItems(r.items);
      setTotal(r.totalCount);
      setStats(r.stats);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, statusFilter, page, pageSize), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, statusFilter, page, pageSize, load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <StatChip label="Assigned" value={stats?.assigned ?? 0} />
        <StatChip label="In Repair" value={stats?.inRepair ?? 0} />
        <StatChip label="On Hold" value={stats?.onHold ?? 0} />
        <StatChip label="Completed Today" value={stats?.completedToday ?? 0} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border)', gap: 8 }}>
        <Segmented
          options={[
            { label: 'All', value: '' },
            { label: 'Received', value: 'Received' },
            { label: 'Evaluation', value: 'Evaluation' },
            { label: 'In Repair', value: 'In Repair' },
            { label: 'Complete', value: 'Complete' },
          ]}
          value={statusFilter}
          onChange={v => { setStatusFilter(v as string); setPage(1); }}
          size="small"
        />
        <div style={{ flex: 1 }} />
        <Input prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />} placeholder="Search WO#, serial, client..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 220, height: 30, fontSize: 13 }} allowClear />
      </div>
      <Table<DashboardTechBenchItem>
        dataSource={items} columns={COLUMNS} rowKey="repairKey" loading={loading} size="small" scroll={{ x: 800 }}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: ['25', '50', '100'], onChange: (p, ps) => { setPage(p); setPageSize(ps); }, style: { padding: '8px 16px', background: 'var(--card)', borderTop: '1px solid var(--neutral-200)', margin: 0 }, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        style={{ flex: 1 }}
      />
    </div>
  );
};
