import { useState, useEffect, useCallback } from 'react';
import { Input, Table, Drawer, Tag, Button } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { getDepartments } from '../../api/departments';
import { DepartmentDetailPane } from './DepartmentDetailPane';
import { NewDepartmentModal } from './NewDepartmentModal';
import { ExportButton } from '../../components/common/ExportButton';
import type { DepartmentListItem } from './types';

const DEPT_EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'clientName', label: 'Client' },
  { key: 'isActive', label: 'Active' },
];

const columns = [
  {
    title: 'Department Name',
    dataIndex: 'name',
    key: 'name',
    render: (v: string) => <span style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: 13 }}>{v}</span>,
  },
  {
    title: 'Client',
    dataIndex: 'clientName',
    key: 'clientName',
    render: (v: string) => <span style={{ fontSize: 12, color: 'var(--neutral-900)' }}>{v || '—'}</span>,
  },
  {
    title: 'Status',
    dataIndex: 'isActive',
    key: 'isActive',
    width: 90,
    render: (v: boolean) => (
      <Tag
        style={{
          fontSize: 10, fontWeight: 700, border: 'none', borderRadius: 9999,
          background: v ? 'var(--success-light)' : 'var(--neutral-100)',
          color: v ? 'var(--success)' : 'var(--muted)',
        }}
      >
        {v ? 'Active' : 'Inactive'}
      </Tag>
    ),
  },
];

export const DepartmentsPage = () => {
  const [departments, setDepartments] = useState<DepartmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [drawerKey, setDrawerKey] = useState<number | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const loadDepartments = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const result = await getDepartments({ search: s, pageSize: 500 });
      setDepartments(result.departments);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadDepartments(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadDepartments]);

  const filtered = departments.filter(d => {
    if (statusFilter === 'active') return d.isActive;
    if (statusFilter === 'inactive') return !d.isActive;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--neutral-200)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-dark)', marginRight: 4 }}>Departments</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 8 }}>{filtered.length} records</span>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
          placeholder="Search departments..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 240, height: 30, fontSize: 12 }}
        />
        {/* Status filter chips */}
        {(['all', 'active', 'inactive'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: statusFilter === s ? 'var(--primary)' : 'var(--neutral-100)',
              color: statusFilter === s ? '#fff' : 'var(--muted)',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <ExportButton data={departments as unknown as Record<string, unknown>[]} columns={DEPT_EXPORT_COLS} filename="departments-export" sheetName="Departments" />
        <Button
          icon={<PlusOutlined />}
          type="primary"
          size="small"
          onClick={() => setNewModalOpen(true)}
          style={{ background: 'var(--primary)', borderColor: 'var(--primary)', fontSize: 12 }}
        >
          New Department
        </Button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 0' }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="deptKey"
          loading={loading}
          size="small"
          pagination={false}
          scroll={{ y: 'calc(100vh - 120px)' }}
          onRow={record => ({
            onClick: () => setDrawerKey(record.deptKey),
            style: { cursor: 'pointer', fontSize: 13 },
          })}
          rowClassName={record => record.deptKey === drawerKey ? 'ant-table-row-selected' : ''}
        />
      </div>

      <NewDepartmentModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreated={() => loadDepartments(search)}
      />

      {/* Detail Drawer */}
      <Drawer
        open={drawerKey !== null}
        onClose={() => setDrawerKey(null)}
        width="min(900px, 90vw)"
        styles={{
          header: { background: 'var(--primary-dark)', color: 'var(--card)', padding: '12px 16px' },
          body: { padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
        }}
        title={
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
            {departments.find(d => d.deptKey === drawerKey)?.name ?? 'Department'}
          </span>
        }
      >
        <div style={{ flex: 1, overflow: 'auto' }}>
          <DepartmentDetailPane deptKey={drawerKey} />
        </div>
      </Drawer>
    </div>
  );
};
