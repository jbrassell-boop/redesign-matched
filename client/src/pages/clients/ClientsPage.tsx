import { useState, useEffect, useCallback } from 'react';
import { Input, Table, Drawer, Tag, Button } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { getClients } from '../../api/clients';
import { ClientDetailPane } from './ClientDetailPane';
import { ExportButton } from '../../components/common/ExportButton';
import type { ClientListItem } from './types';

const CLIENT_EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'isActive', label: 'Active' },
];

const columns = [
  {
    title: 'Client Name',
    dataIndex: 'name',
    key: 'name',
    render: (v: string) => <span style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: 13 }}>{v}</span>,
  },
  {
    title: 'City',
    dataIndex: 'city',
    key: 'city',
    width: 160,
    render: (v: string) => <span style={{ fontSize: 12, color: 'var(--neutral-900)' }}>{v || '—'}</span>,
  },
  {
    title: 'State',
    dataIndex: 'state',
    key: 'state',
    width: 80,
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

export const ClientsPage = () => {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [drawerKey, setDrawerKey] = useState<number | null>(null);

  const loadClients = useCallback(async (s: string, sf: string) => {
    setLoading(true);
    try {
      const result = await getClients({ search: s, pageSize: 500, statusFilter: sf === 'all' ? undefined : sf });
      setClients(result.clients);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadClients(search, statusFilter), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, statusFilter, loadClients]);

  const handleClientDeleted = useCallback(() => {
    setDrawerKey(null);
    loadClients(search, statusFilter);
  }, [search, statusFilter, loadClients]);

  const filtered = clients.filter(c => {
    if (statusFilter === 'active') return c.isActive;
    if (statusFilter === 'inactive') return !c.isActive;
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
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary-dark)', marginRight: 4 }}>Clients</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 8 }}>{filtered.length} records</span>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
          placeholder="Search clients..."
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
        <ExportButton data={clients as unknown as Record<string, unknown>[]} columns={CLIENT_EXPORT_COLS} filename="clients-export" sheetName="Clients" />
        <Button
          icon={<PlusOutlined />}
          type="primary"
          size="small"
          style={{ background: 'var(--primary)', borderColor: 'var(--primary)', fontSize: 12 }}
        >
          New Client
        </Button>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 0' }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="clientKey"
          loading={loading}
          size="small"
          pagination={false}
          scroll={{ y: 'calc(100vh - 120px)' }}
          onRow={record => ({
            onClick: () => setDrawerKey(record.clientKey),
            style: { cursor: 'pointer', fontSize: 13 },
          })}
          rowClassName={record => record.clientKey === drawerKey ? 'ant-table-row-selected' : ''}
        />
      </div>

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
            {clients.find(c => c.clientKey === drawerKey)?.name ?? 'Client'}
          </span>
        }
      >
        <div style={{ flex: 1, overflow: 'auto' }}>
          <ClientDetailPane clientKey={drawerKey} onClientDeleted={handleClientDeleted} />
        </div>
      </Drawer>
    </div>
  );
};
