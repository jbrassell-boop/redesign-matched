import { useState, useEffect, useCallback } from 'react';
import { Table, Input, Segmented } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getDashboardFlags } from '../../../api/dashboard';
import type { DashboardFlag, DashboardFlagStats } from '../types';

const FLAG_STYLES: Record<string, { bg: string; color: string }> = {
  Client:      { bg: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' },
  'Scope Type':{ bg: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)' },
  Scope:       { bg: 'rgba(var(--success-rgb), 0.15)', color: 'var(--success)' },
  Repair:      { bg: 'rgba(var(--amber-rgb), 0.1)', color: 'var(--amber)' },
};

const COLUMNS: ColumnsType<DashboardFlag> = [
  { title: 'Flag Text', dataIndex: 'flagText', key: 'flagText', ellipsis: true },
  { title: 'Flag Type', dataIndex: 'flagType', key: 'flagType', width: 120, align: 'center', render: (v: string) => {
    const s = FLAG_STYLES[v] ?? { bg: 'var(--neutral-100)', color: 'var(--muted)' };
    return <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{v}</span>;
  }},
  { title: 'Owner Key', dataIndex: 'ownerKey', key: 'ownerKey', width: 100, align: 'center' },
];

const StatChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRight: '1px solid var(--neutral-200)' }}>
    <div style={{ width: 24, height: 24, borderRadius: 4, background: `rgba(${color}, 0.13)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: `rgb(${color})` }} />
    </div>
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1 }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  </div>
);

export const FlagsTab = () => {
  const [flags, setFlags] = useState<DashboardFlag[]>([]);
  const [stats, setStats] = useState<DashboardFlagStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [flagType, setFlagType] = useState('All');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const load = useCallback(async (s: string, ft: string, p: number, ps: number) => {
    setLoading(true);
    try {
      const r = await getDashboardFlags({ search: s || undefined, flagType: ft !== 'All' ? ft : undefined, page: p, pageSize: ps });
      setFlags(r.flags);
      setTotal(r.totalCount);
      setStats(r.stats);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, flagType, page, pageSize), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, flagType, page, pageSize, load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)' }}>
        <StatChip label="Total Flags" value={stats?.total ?? 0} color="var(--navy-rgb)" />
        <StatChip label="Client" value={stats?.client ?? 0} color="var(--primary-rgb)" />
        <StatChip label="Scope Type" value={stats?.scopeType ?? 0} color="var(--navy-rgb)" />
        <StatChip label="Scope" value={stats?.scope ?? 0} color="var(--success-rgb)" />
        <StatChip label="Repair" value={stats?.repair ?? 0} color="var(--amber-rgb)" />
      </div>
      <div style={{ padding: '6px 16px 4px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Flags are persistent alerts attached to clients, scopes, or repairs that surface on every interaction.</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flag Type</span>
        <Segmented
          options={['All', 'Client', 'Scope Type', 'Scope', 'Repair']}
          value={flagType}
          onChange={v => { setFlagType(v as string); setPage(1); }}
          size="small"
        />
        <div style={{ flex: 1 }} />
        <Input prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />} placeholder="Search flags..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 220, height: 30, fontSize: 13 }} allowClear />
      </div>
      <Table<DashboardFlag>
        dataSource={flags} columns={COLUMNS} rowKey="flagKey" loading={loading} size="small" scroll={{ x: 600 }}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: ['25', '50', '100'], onChange: (p, ps) => { setPage(p); setPageSize(ps); }, style: { padding: '8px 16px', background: 'var(--card)', borderTop: '1px solid var(--neutral-200)', margin: 0 }, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        style={{ flex: 1 }}
      />
    </div>
  );
};
