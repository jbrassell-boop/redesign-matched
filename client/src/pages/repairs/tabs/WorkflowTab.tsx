import { useState, useEffect } from 'react';
import { Table, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getRepairLineItems } from '../../../api/repairs';
import type { RepairLineItem } from '../types';

const APPROVED_STYLES: Record<string, { bg: string; color: string }> = {
  Y: { bg: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)' },
  N: { bg: 'rgba(var(--danger-rgb), 0.1)', color: 'var(--danger)' },
  P: { bg: 'rgba(var(--amber-rgb), 0.1)', color: 'var(--amber)' },
};

const COLUMNS: ColumnsType<RepairLineItem> = [
  { title: 'Appr', dataIndex: 'approved', key: 'approved', width: 58, align: 'center', render: (v: string) => {
    const s = APPROVED_STYLES[v] ?? { bg: 'var(--neutral-100)', color: 'var(--muted)' };
    return <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: s.bg, color: s.color }}>{v || '\u2014'}</span>;
  }},
  { title: 'Code', dataIndex: 'itemCode', key: 'itemCode', width: 70 },
  { title: 'Repair Item', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Cause', dataIndex: 'cause', key: 'cause', width: 68, align: 'center' },
  { title: 'Fix Type', dataIndex: 'fixType', key: 'fixType', width: 68, align: 'center' },
  { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 85, align: 'right', render: (v: number) => `$${v.toFixed(2)}` },
  { title: 'Tech', dataIndex: 'tech', key: 'tech', width: 80, ellipsis: true },
  { title: 'Comments', dataIndex: 'comments', key: 'comments', ellipsis: true },
];

export const WorkflowTab = ({ repairKey }: { repairKey: number }) => {
  const [items, setItems] = useState<RepairLineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRepairLineItems(repairKey)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [repairKey]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div style={{ padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Line Items ({items.length})
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
          Total: ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>
      <Table<RepairLineItem>
        dataSource={items} columns={COLUMNS} rowKey="tranKey" size="small" pagination={false}
        locale={{ emptyText: 'No repair items' }}
      />
    </div>
  );
};
