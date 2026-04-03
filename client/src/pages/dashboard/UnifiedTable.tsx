import { Table } from 'antd';
import type { DashboardView } from './types';
import { getColumnsForView, getRowKey } from './columnDefs';

interface UnifiedTableProps {
  view: DashboardView;
  data: any[];
  loading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onRowClick: (repairKey: number) => void;
  selectedKeys: React.Key[];
  onSelectionChange: (keys: React.Key[]) => void;
}

export const UnifiedTable = ({
  view,
  data,
  loading,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onRowClick,
  selectedKeys,
  onSelectionChange,
}: UnifiedTableProps) => {
  const columns = getColumnsForView(view, onRowClick);
  const rowKey = getRowKey(view);

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey={rowKey}
      loading={loading}
      size="small"
      scroll={{ x: 1000 }}
      rowClassName={(row: any) => row.isUrgent ? 'urgent-row' : ''}
      rowSelection={{
        selectedRowKeys: selectedKeys,
        onChange: onSelectionChange,
        columnWidth: 36,
      }}
      expandable={view === 'repairs' ? {
        expandedRowRender: (record: any) => (
          <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--muted)' }}>
            {record.complaint || record.notes || 'No additional details'}
          </div>
        ),
        rowExpandable: () => true,
      } : undefined}
      pagination={{
        current: page,
        pageSize,
        total: totalCount,
        showSizeChanger: true,
        pageSizeOptions: ['25', '50', '100'],
        onChange: onPageChange,
        style: {
          padding: '8px 16px',
          background: 'var(--card)',
          borderTop: '1px solid var(--neutral-200)',
          margin: 0,
        },
        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
      }}
      style={{ flex: 1 }}
    />
  );
};
