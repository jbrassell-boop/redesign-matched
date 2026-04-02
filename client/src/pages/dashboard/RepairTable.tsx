import { Table, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { DashboardRepair, DashboardFilters } from './types';

const STATUS_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  'Shipped':      { bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A' },
  'Pending Ship': { bg: '#EFF6FF', border: '#BFDBFE', color: '#2E75B6' },
  'Pending QC':   { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E' },
  'Cancelled':    { bg: '#F3F4F6', border: '#E5E7EB', color: '#6B7280' },
};

const statusTag = (status: string) => {
  const colors = STATUS_COLORS[status] ?? { bg: '#F9FAFB', border: '#E5E7EB', color: '#374151' };
  return (
    <span style={{
      display: 'inline-flex',
      padding: '2px 8px',
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 700,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: colors.color,
    }}>
      {status}
    </span>
  );
};

const COLUMNS: ColumnsType<DashboardRepair> = [
  {
    title: 'Date In',
    dataIndex: 'dateIn',
    key: 'dateIn',
    width: 90,
    sorter: (a, b) => a.dateIn.localeCompare(b.dateIn),
    defaultSortOrder: 'descend',
  },
  {
    title: 'Client',
    dataIndex: 'client',
    key: 'client',
    sorter: (a, b) => a.client.localeCompare(b.client),
    ellipsis: true,
  },
  {
    title: 'Department',
    dataIndex: 'dept',
    key: 'dept',
    sorter: (a, b) => a.dept.localeCompare(b.dept),
    ellipsis: true,
  },
  {
    title: 'Work Order',
    dataIndex: 'wo',
    key: 'wo',
    width: 110,
    sorter: (a, b) => a.wo.localeCompare(b.wo),
    render: (wo: string, row: DashboardRepair) => (
      <span style={{ fontWeight: row.isUrgent ? 700 : 400, color: row.isUrgent ? 'var(--danger)' : undefined }}>
        {wo}
      </span>
    ),
  },
  {
    title: 'Scope Type',
    dataIndex: 'scopeType',
    key: 'scopeType',
    sorter: (a, b) => a.scopeType.localeCompare(b.scopeType),
    ellipsis: true,
  },
  {
    title: 'Serial #',
    dataIndex: 'serial',
    key: 'serial',
    width: 100,
  },
  {
    title: 'TAT',
    dataIndex: 'daysIn',
    key: 'daysIn',
    width: 60,
    align: 'center' as const,
    sorter: (a, b) => a.daysIn - b.daysIn,
    render: (days: number) => (
      <span style={{ color: days > 14 ? 'var(--danger)' : days > 7 ? 'var(--amber)' : 'var(--text)' }}>
        {days}d
      </span>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 130,
    sorter: (a, b) => a.status.localeCompare(b.status),
    render: statusTag,
  },
  {
    title: 'Date Approved',
    dataIndex: 'dateApproved',
    key: 'dateApproved',
    width: 110,
    render: (v: string | null) => v ?? '—',
  },
  {
    title: 'Est Delivery',
    dataIndex: 'estDelivery',
    key: 'estDelivery',
    width: 100,
    render: (v: string | null) => v ?? '—',
  },
  {
    title: 'Approved $',
    dataIndex: 'amountApproved',
    key: 'amountApproved',
    width: 90,
    align: 'right' as const,
    sorter: (a, b) => (a.amountApproved ?? 0) - (b.amountApproved ?? 0),
    render: (v: number | null) => v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '—',
  },
  {
    title: 'Tech',
    dataIndex: 'tech',
    key: 'tech',
    width: 90,
    render: (v: string | null) => v ?? '—',
  },
];

interface RepairTableProps {
  repairs: DashboardRepair[];
  totalCount: number;
  loading: boolean;
  filters: DashboardFilters;
  onFiltersChange: (f: Partial<DashboardFilters>) => void;
}

export const RepairTable = ({ repairs, totalCount, loading, filters, onFiltersChange }: RepairTableProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
    {/* Toolbar */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '8px 16px',
      background: '#fff',
      borderBottom: '1px solid var(--neutral-200)',
      gap: 8,
    }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)' }} />}
        placeholder="Search repairs..."
        value={filters.search}
        onChange={e => onFiltersChange({ search: e.target.value, page: 1 })}
        style={{ width: 260, height: 30, fontSize: 13 }}
        allowClear
      />
      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
        {totalCount.toLocaleString()} records
      </span>
    </div>

    {/* Table */}
    <Table<DashboardRepair>
      dataSource={repairs}
      columns={COLUMNS}
      rowKey="repairKey"
      loading={loading}
      size="small"
      scroll={{ x: 1200 }}
      rowClassName={(row) => row.isUrgent ? 'urgent-row' : ''}
      pagination={{
        current: filters.page,
        pageSize: filters.pageSize,
        total: totalCount,
        showSizeChanger: true,
        pageSizeOptions: ['25', '50', '100'],
        onChange: (page, pageSize) => onFiltersChange({ page, pageSize }),
        style: { padding: '8px 16px', background: '#fff', borderTop: '1px solid var(--neutral-200)', margin: 0 },
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
      }}
      style={{ flex: 1 }}
    />
  </div>
);
