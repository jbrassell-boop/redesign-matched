import { useState, useEffect, useCallback } from 'react';
import { Table, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getDashboardEmails } from '../../../api/dashboard';
import type { DashboardEmail, DashboardEmailStats } from '../types';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Pending: { bg: 'rgba(var(--amber-rgb), 0.1)', color: 'var(--amber)' },
  Sent:    { bg: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' },
  Ignored: { bg: 'var(--neutral-100)', color: 'var(--muted)' },
};

const COLUMNS: ColumnsType<DashboardEmail> = [
  { title: 'Date', dataIndex: 'date', key: 'date', width: 100, sorter: (a, b) => a.date.localeCompare(b.date), defaultSortOrder: 'descend' },
  { title: 'Type', dataIndex: 'emailType', key: 'emailType', width: 120, sorter: (a, b) => a.emailType.localeCompare(b.emailType) },
  { title: 'From', dataIndex: 'from', key: 'from', ellipsis: true },
  { title: 'To', dataIndex: 'to', key: 'to', ellipsis: true },
  { title: 'Subject', dataIndex: 'subject', key: 'subject', ellipsis: true },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 90, render: (v: string) => {
    const s = STATUS_STYLES[v] ?? STATUS_STYLES.Pending;
    return <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{v}</span>;
  }},
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

export const EmailsTab = () => {
  const [emails, setEmails] = useState<DashboardEmail[]>([]);
  const [stats, setStats] = useState<DashboardEmailStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const load = useCallback(async (s: string, p: number, ps: number) => {
    setLoading(true);
    try {
      const r = await getDashboardEmails({ search: s || undefined, page: p, pageSize: ps });
      setEmails(r.emails);
      setTotal(r.totalCount);
      setStats(r.stats);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, page, pageSize), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, page, pageSize, load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)' }}>
        <StatChip label="Total Emails" value={stats?.total ?? 0} color="var(--navy-rgb)" />
        <StatChip label="Pending" value={stats?.pending ?? 0} color="var(--amber-rgb)" />
        <StatChip label="Sent" value={stats?.sent ?? 0} color="var(--success-rgb)" />
        <StatChip label="Email Types" value={stats?.emailTypes ?? 0} color="var(--primary-rgb)" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', gap: 8 }}>
        <Input prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />} placeholder="Search emails..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 260, height: 30, fontSize: 13 }} allowClear />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{total.toLocaleString()} records</span>
      </div>
      <Table<DashboardEmail>
        dataSource={emails} columns={COLUMNS} rowKey="emailKey" loading={loading} size="small" scroll={{ x: 900 }}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: ['25', '50', '100'], onChange: (p, ps) => { setPage(p); setPageSize(ps); }, style: { padding: '8px 16px', background: 'var(--card)', borderTop: '1px solid var(--neutral-200)', margin: 0 }, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        style={{ flex: 1 }}
      />
    </div>
  );
};
