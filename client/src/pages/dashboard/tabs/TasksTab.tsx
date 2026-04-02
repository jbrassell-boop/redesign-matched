import { useState, useEffect, useCallback } from 'react';
import { Table, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { getDashboardTasks } from '../../../api/dashboard';
import type { DashboardTask, DashboardTaskStats } from '../types';

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  Urgent: { bg: 'rgba(var(--danger-rgb), 0.1)', color: 'var(--danger)' },
  High:   { bg: 'rgba(var(--amber-rgb), 0.1)', color: 'var(--amber)' },
  Normal: { bg: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' },
  Low:    { bg: 'var(--neutral-100)', color: 'var(--muted)' },
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'Not Started':       { bg: 'rgba(var(--amber-rgb), 0.1)', color: 'var(--amber)' },
  'In Process':        { bg: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' },
  'Request Fulfilled': { bg: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)' },
  'Closed Duplicate':  { bg: 'var(--neutral-100)', color: 'var(--muted)' },
  'Request Declined':  { bg: 'rgba(var(--danger-rgb), 0.1)', color: 'var(--danger)' },
};

const badge = (text: string, styles: Record<string, { bg: string; color: string }>) => {
  const s = styles[text] ?? { bg: 'var(--neutral-100)', color: 'var(--muted)' };
  return (
    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {text}
    </span>
  );
};

const COLUMNS: ColumnsType<DashboardTask> = [
  { title: 'Date', dataIndex: 'date', key: 'date', width: 90, sorter: (a, b) => a.date.localeCompare(b.date), defaultSortOrder: 'descend' },
  { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true, sorter: (a, b) => a.title.localeCompare(b.title) },
  { title: 'Client', dataIndex: 'client', key: 'client', ellipsis: true, sorter: (a, b) => a.client.localeCompare(b.client) },
  { title: 'Dept', dataIndex: 'dept', key: 'dept', ellipsis: true },
  { title: 'Type', dataIndex: 'taskType', key: 'taskType', width: 140, sorter: (a, b) => a.taskType.localeCompare(b.taskType) },
  { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 80, align: 'center', render: (v: string) => badge(v, PRIORITY_STYLES) },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 140, render: (v: string) => badge(v, STATUS_STYLES) },
  { title: 'Portal', dataIndex: 'fromPortal', key: 'fromPortal', width: 60, align: 'center', render: (v: boolean) => v ? <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--success)' }}>Yes</span> : null },
];

const StatChip = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRight: '1px solid var(--neutral-200)' }}>
    <div style={{ width: 24, height: 24, borderRadius: 4, background: `rgba(${color}, 0.13)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: `rgb(${color})` }} />
    </div>
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  </div>
);

export const TasksTab = () => {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [stats, setStats] = useState<DashboardTaskStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const load = useCallback(async (s: string, p: number, ps: number) => {
    setLoading(true);
    try {
      const r = await getDashboardTasks({ search: s || undefined, page: p, pageSize: ps });
      setTasks(r.tasks);
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
        <StatChip label="Open" value={stats?.open ?? 0} color="var(--amber-rgb)" />
        <StatChip label="Fulfilled" value={stats?.fulfilled ?? 0} color="var(--success-rgb)" />
        <StatChip label="From Portal" value={stats?.fromPortal ?? 0} color="var(--primary-rgb)" />
        <StatChip label={stats?.topTypeLabel ?? 'Top Type'} value={stats?.topTypeCount ?? 0} color="var(--navy-rgb)" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', gap: 8 }}>
        <Input prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />} placeholder="Search tasks..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: 260, height: 30, fontSize: 13 }} allowClear />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{total.toLocaleString()} records</span>
      </div>
      <Table<DashboardTask>
        dataSource={tasks} columns={COLUMNS} rowKey="taskKey" loading={loading} size="small" scroll={{ x: 900 }}
        pagination={{ current: page, pageSize, total, showSizeChanger: true, pageSizeOptions: ['25', '50', '100'], onChange: (p, ps) => { setPage(p); setPageSize(ps); }, style: { padding: '8px 16px', background: 'var(--card)', borderTop: '1px solid var(--neutral-200)', margin: 0 }, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }}
        style={{ flex: 1 }}
      />
    </div>
  );
};
