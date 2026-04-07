import { useState, useCallback } from 'react';
import { Table, message, Modal } from 'antd';
import type { DashboardView } from './types';
import { getColumnsForView, getRowKey } from './columnDefs';
import { ContextMenu } from '../../components/common/ContextMenu';
import type { ContextMenuItem } from '../../components/common/ContextMenu';
import { patchRepairHeader, addRepairNote, updateRepairTechs, getRepairTechnicians } from '../../api/repairs';
import type { TechnicianOption } from '../../api/repairs';

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
  const [techList, setTechList] = useState<TechnicianOption[]>([]);
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [techRecord, setTechRecord] = useState<any>(null);
  const [selectedTech, setSelectedTech] = useState<number>(0);

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
      onClick: () => {
        const repairKey = record?.repairKey;
        if (!repairKey) return;
        Modal.confirm({
          title: 'Add to Hot List',
          content: `Add repair #${repairKey} to the hot list?`,
          okText: 'Add',
          onOk: async () => {
            try {
              await patchRepairHeader(repairKey, { isUrgent: true });
              message.success('Added to hot list');
            } catch {
              message.error('Failed to add to hot list');
            }
          },
        });
      },
    },
    {
      label: 'Assign Tech',
      onClick: async () => {
        const repairKey = record?.repairKey;
        if (!repairKey) return;
        try {
          const techs = await getRepairTechnicians();
          setTechList(techs);
          setSelectedTech(0);
          setTechRecord(record);
          setTechModalOpen(true);
        } catch {
          message.error('Failed to load technicians');
        }
      },
    },
    {
      label: 'Add Note',
      onClick: () => {
        const repairKey = record?.repairKey;
        if (!repairKey) return;
        Modal.confirm({
          title: 'Add Note',
          content: (
            <textarea
              id="dashboard-note-input"
              placeholder="Enter note..."
              rows={3}
              style={{ width: '100%', marginTop: 8, padding: '6px 8px', fontSize: 12, border: '1px solid var(--neutral-200)', borderRadius: 4, fontFamily: 'inherit', resize: 'vertical' }}
            />
          ),
          okText: 'Save Note',
          onOk: async () => {
            const el = document.getElementById('dashboard-note-input') as HTMLTextAreaElement | null;
            const note = el?.value?.trim();
            if (!note) { message.warning('Note cannot be empty'); return Promise.reject('empty'); }
            try {
              await addRepairNote(repairKey, note);
              message.success('Note added');
            } catch {
              message.error('Failed to add note');
            }
          },
        });
      },
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
        scroll={{ x: 1400 }}
        rowClassName={(row: any) => row.isUrgent ? 'urgent-row' : ''}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: onSelectionChange,
          columnWidth: 36,
        }}
        onRow={(record) => ({
          onClick: () => {
            const key = record?.repairKey ?? record?.invoiceKey ?? record?.flagKey ?? record?.emailKey ?? record?.taskKey;
            if (key) onRowClick(key);
          },
          onContextMenu: (e) => {
            if (view === 'repairs') handleContextMenu(e, record);
          },
          style: { cursor: 'pointer' },
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

      <Modal
        open={techModalOpen}
        onCancel={() => setTechModalOpen(false)}
        title={<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Assign Technician</span>}
        okText="Assign"
        okButtonProps={{ disabled: !selectedTech }}
        onOk={async () => {
          if (!techRecord?.repairKey || !selectedTech) return;
          try {
            await updateRepairTechs(techRecord.repairKey, selectedTech, null);
            message.success('Technician assigned');
            setTechModalOpen(false);
          } catch {
            message.error('Failed to assign technician');
          }
        }}
      >
        <div style={{ paddingTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 6 }}>Select Technician</div>
          <select
            style={{ width: '100%', height: 32, border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, padding: '0 8px' }}
            value={selectedTech}
            onChange={e => setSelectedTech(Number(e.target.value))}
          >
            <option value={0}>Select…</option>
            {techList.map(t => <option key={t.techKey} value={t.techKey}>{t.techName}</option>)}
          </select>
        </div>
      </Modal>
    </>
  );
};
