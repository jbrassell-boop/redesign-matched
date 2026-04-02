import { useState } from 'react';
import { Spin, Table } from 'antd';
import { PurchaseOrdersTab } from './tabs/PurchaseOrdersTab';
import { SuppliersTab } from './tabs/SuppliersTab';
import type { InventoryDetail } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar, SectionCard } from '../../components/shared';
import type { TabDef } from '../../components/shared';

interface InventoryDetailPaneProps {
  detail: InventoryDetail | null;
  loading: boolean;
}

function getCategoryLabel(category: string): string {
  const c = (category || '').toUpperCase();
  if (c === 'R') return 'Rigid';
  if (c === 'F') return 'Flexible';
  if (c === 'C') return 'Camera';
  if (category) return category;
  return 'Instrument';
}

function stockColor(current: number, min: number): string {
  if (current < min) return 'var(--danger)';
  if (current === min && min > 0) return 'var(--amber)';
  return 'var(--success)';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatChip({
  value,
  label,
  iconBg,
  iconColor,
  valueColor,
}: {
  value: number | string;
  label: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
}) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRight: '1px solid var(--border)',
    }}>
      <div style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        background: iconBg,
        color: iconColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: 13,
        fontWeight: 800,
      }}>
        #
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: valueColor, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
    </div>
  );
}

const TABS: TabDef[] = [
  { key: 'inventory',       label: 'Inventory' },
  { key: 'sizes',           label: 'Sizes' },
  { key: 'purchase-orders', label: 'Purchase Orders' },
  { key: 'suppliers',       label: 'Suppliers' },
];

export const InventoryDetailPane = ({ detail, loading }: InventoryDetailPaneProps) => {
  const [activeTab, setActiveTab] = useState('inventory');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!detail) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
      Select an inventory item to view details
    </div>
  );

  const isLow = detail.currentLevel < detail.minLevel;
  const isAtMin = detail.currentLevel === detail.minLevel && detail.minLevel > 0;

  const inventoryTab = (
    <div style={{ padding: '16px 20px' }}>
      <SectionCard title="Item Details">
        <FormGrid cols={2}>
          <div style={{ gridColumn: 'span 2' }}>
            <Field label="Description" value={detail.description} />
          </div>
          <Field label="Category" value={getCategoryLabel(detail.category)} />
          <Field label="Status" value={detail.isActive ? 'Active' : 'Inactive'} />
          <Field label="Current Level" value={detail.currentLevel} />
          <Field label="Min Level" value={detail.minLevel} />
          <Field label="Max Level" value={detail.maxLevel} />
          <Field label="Sizes" value={detail.sizes.length} />
          <Field label="Created" value={formatDate(detail.createDate)} />
          <Field label="Last Updated" value={formatDate(detail.lastUpdate)} />
        </FormGrid>
      </SectionCard>

      <div style={{ marginTop: 14 }}>
      <SectionCard title="Flags">
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { label: 'No Count Adjustment', value: detail.noCountAdjustment },
            { label: 'Not Used by Repair', value: detail.notUsedByRepair },
            { label: 'Always Re-Order', value: detail.alwaysReOrder },
          ].map(flag => (
            <div key={flag.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-flex',
                width: 14,
                height: 14,
                borderRadius: 3,
                border: `1px solid ${flag.value ? 'var(--success-border)' : 'var(--neutral-200)'}`,
                background: flag.value ? 'var(--success-light)' : 'var(--neutral-100)',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: flag.value ? 'var(--success)' : 'var(--muted)',
                fontWeight: 700,
              }}>
                {flag.value ? '✓' : ''}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{flag.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>
      </div>
    </div>
  );

  const sizesTab = (
    <div style={{ padding: '12px 16px' }}>
      {detail.sizes.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          No sizes defined for this item
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <Table
            size="small"
            dataSource={detail.sizes}
            rowKey="sizeKey"
            pagination={false}
            style={{ fontSize: 12 }}
            columns={[
              {
                title: 'Description',
                dataIndex: 'sizeDescription',
                key: 'sizeDescription',
                render: (v: string) => <span style={{ fontWeight: 600, fontSize: 12 }}>{v || '—'}</span>,
              },
              {
                title: 'Bin #',
                dataIndex: 'binNumber',
                key: 'binNumber',
                width: 80,
                render: (v: string | null) => (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'var(--primary-light)',
                    padding: '1px 5px',
                    borderRadius: 3,
                    border: '1px solid var(--primary-light)',
                  }}>
                    {v || '—'}
                  </span>
                ),
              },
              {
                title: 'Current',
                dataIndex: 'currentLevel',
                key: 'currentLevel',
                width: 70,
                render: (v: number, row: typeof detail.sizes[0]) => (
                  <span style={{ fontWeight: 700, color: stockColor(row.currentLevel, row.minLevel), fontSize: 12 }}>
                    {v}
                  </span>
                ),
              },
              {
                title: 'Min',
                dataIndex: 'minLevel',
                key: 'minLevel',
                width: 55,
                render: (v: number) => <span style={{ fontSize: 12 }}>{v}</span>,
              },
              {
                title: 'Max',
                dataIndex: 'maxLevel',
                key: 'maxLevel',
                width: 55,
                render: (v: number) => <span style={{ fontSize: 12 }}>{v}</span>,
              },
              {
                title: 'Unit Cost',
                dataIndex: 'unitCost',
                key: 'unitCost',
                width: 85,
                render: (v: number) => (
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    ${v.toFixed(2)}
                  </span>
                ),
              },
              {
                title: 'Status',
                dataIndex: 'isActive',
                key: 'isActive',
                width: 70,
                render: (v: boolean) => (
                  <StatusBadge status={v ? 'Active' : 'Inactive'} />
                ),
              },
            ]}
          />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <DetailHeader
        title={detail.description}
        subtitle={`#${detail.inventoryKey}`}
        badges={
          <>
            <StatusBadge status={detail.isActive ? 'Active' : 'Inactive'} />
            {isLow && <StatusBadge status="Low Stock" variant="amber" />}
            {!isLow && isAtMin && <StatusBadge status="At Minimum" variant="amber" />}
          </>
        }
      />

      {/* Per-item stat strip */}
      <div style={{
        display: 'flex',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
      }}>
        <StatChip
          value={detail.sizes.length || 1}
          label="Total Items"
          iconBg={`rgba(var(--primary-rgb), 0.13)`}
          iconColor="var(--primary)"
          valueColor="var(--navy)"
        />
        <StatChip
          value={detail.sizes.filter(s => s.isActive).length || (detail.isActive ? 1 : 0)}
          label="Active"
          iconBg={`rgba(var(--success-rgb), 0.13)`}
          iconColor="var(--success)"
          valueColor="var(--success)"
        />
        <StatChip
          value={detail.sizes.filter(s => !s.isActive).length || (!detail.isActive ? 1 : 0)}
          label="Inactive"
          iconBg={`rgba(var(--muted-rgb), 0.13)`}
          iconColor="var(--muted)"
          valueColor="var(--muted)"
        />
        <StatChip
          value={detail.sizes.filter(s => s.currentLevel <= s.minLevel && s.isActive).length || (detail.isLowStock ? 1 : 0)}
          label="Low Stock"
          iconBg={`rgba(var(--amber-rgb), 0.13)`}
          iconColor="var(--amber)"
          valueColor="var(--amber)"
        />
        <StatChip
          value={0}
          label="Open POs"
          iconBg={`rgba(var(--navy-rgb), 0.13)`}
          iconColor="var(--navy)"
          valueColor="var(--navy)"
        />
      </div>

      <TabBar tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'inventory'       && inventoryTab}
        {activeTab === 'sizes'           && sizesTab}
        {activeTab === 'purchase-orders' && <PurchaseOrdersTab inventoryKey={detail.inventoryKey} />}
        {activeTab === 'suppliers'       && <SuppliersTab inventoryKey={detail.inventoryKey} />}
      </div>
    </div>
  );
};
