import { useState, useCallback } from 'react';
import { Table, message } from 'antd';
import type { DashboardView } from './types';
import { getColumnsForView, getRowKey } from './columnDefs';
import { ContextMenu } from '../../components/common/ContextMenu';
import type { ContextMenuItem } from '../../components/common/ContextMenu';

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

  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [menuRecord, setMenuRecord] = useState<any>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, record: any) => {
    e.preventDefault();
    setMenuRecord(record);
    setMenuPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const closeMenu = useCallback(() => {
    setMenuPosition(null);
    setMenuRecord(null);
  }, []);

  const getRepairMenuItems = (record: any): ContextMenuItem[] => [
    {
      label: 'Open Repair',
      onClick: () => {
        const key = record?.repairKey;
        if (key) window.location.assign(`/repairs/${key}`);
      },
    },
    {
      label: 'Quick Edit',
      onClick: () => {
        if (record?.repairKey) onRowClick(record.repairKey);
      },
    },
    {
      label: 'Add to Hot List',
      onClick: () => message.info('Coming soon'),
    },
    {
      label: 'Assign Tech',
      onClick: () => message.info('Coming soon'),
    },
    {
      label: 'Add Note',
      onClick: () => message.info('Coming soon'),
    },
  ];

  const menuItems: ContextMenuItem[] = view === 'repairs' && menuRecord
    ? getRepairMenuItems(menuRecord)
    : [];

  return (
    <>
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
        onRow={(record) => ({
          onContextMenu: (e) => {
            if (view === 'repairs') handleContextMenu(e, record);
          },
        })}
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

      {view === 'repairs' && (
        <ContextMenu
          items={menuItems}
          position={menuPosition}
          onClose={closeMenu}
        />
      )}
    </>
  );
};
