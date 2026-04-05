import { useState, useEffect } from 'react';
import { Table, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getRepairScopeHistory } from '../../../api/repairs';
import type { RepairScopeHistory } from '../types';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Shipped:      { bg: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)' },
  'Pending Ship': { bg: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' },
  'In Repair':  { bg: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' },
  Cancelled:    { bg: 'var(--neutral-100)', color: 'var(--muted)' },
};

const COLUMNS: ColumnsType<RepairScopeHistory> = [
  { title: 'WO#', dataIndex: 'wo', key: 'wo', width: 110, render: (v: string) => <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{v}</span> },
  { title: 'Date In', dataIndex: 'dateIn', key: 'dateIn', width: 100 },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v: string) => {
    const s = STATUS_COLORS[v] ?? { bg: 'var(--neutral-100)', color: 'var(--muted)' };
    return <span style={{ display: 'inline-flex', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: s.bg, color: s.color }}>{v}</span>;
  }},
  { title: 'Scope Type', dataIndex: 'scopeType', key: 'scopeType' },
  { title: 'Client', dataIndex: 'client', key: 'client' },
  { title: 'TAT', dataIndex: 'daysIn', key: 'daysIn', width: 60, align: 'center', render: (v: number) => `${v}d` },
  { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 90, align: 'right', render: (v: number | null) => v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '\u2014' },
];

export const ScopeHistoryTab = ({ repairKey, currentRepairKey }: { repairKey: number; currentRepairKey: number }) => {
  const [items, setItems] = useState<RepairScopeHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRepairScopeHistory(repairKey)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [repairKey]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;

  // Lifecycle stats
  const totalRepairs = items.length;
  const totalCost = items.reduce((s, i) => s + (i.amount ?? 0), 0);
  const avgTat = totalRepairs > 0 ? items.reduce((s, i) => s + (i.daysIn ?? 0), 0) / totalRepairs : 0;
  const fmt$ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div style={{ padding: '10px 14px' }}>
      {/* Lifecycle Summary */}
      {totalRepairs > 0 && (
        <div style={{
          display: 'flex', gap: 16, marginBottom: 12, padding: '10px 14px',
          background: 'linear-gradient(135deg, var(--navy) 0%, #1a365d 100%)',
          borderRadius: 8, color: '#fff',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, opacity: .6, textTransform: 'uppercase', letterSpacing: '.06em', alignSelf: 'center', marginRight: 8 }}>
            Scope Lifecycle
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{totalRepairs}</div>
            <div style={{ fontSize: 9, opacity: .6 }}>Total Repairs</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{fmt$(totalCost)}</div>
            <div style={{ fontSize: 9, opacity: .6 }}>Lifetime Cost</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{avgTat.toFixed(1)}d</div>
            <div style={{ fontSize: 9, opacity: .6 }}>Avg TAT</div>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{fmt$(totalRepairs > 0 ? totalCost / totalRepairs : 0)}</div>
            <div style={{ fontSize: 9, opacity: .6 }}>Avg Cost/Repair</div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        Scope Repair History ({items.length} repairs)
      </div>
      <Table<RepairScopeHistory>
        dataSource={items} columns={COLUMNS} rowKey="repairKey" size="small" pagination={false}
        rowClassName={(row) => row.repairKey === currentRepairKey ? 'current-row' : ''}
        locale={{ emptyText: 'No scope history found' }}
      />
    </div>
  );
};
