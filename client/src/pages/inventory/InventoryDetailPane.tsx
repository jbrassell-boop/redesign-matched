import { useState } from 'react';
import { Spin, Table } from 'antd';
import { PurchaseOrdersTab } from './tabs/PurchaseOrdersTab';
import { SuppliersTab } from './tabs/SuppliersTab';
import { ReceiveInventoryTab } from './tabs/ReceiveInventoryTab';
import type { InventoryDetail } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar, SectionCard } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import './InventoryDetailPane.css';

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
    <div className="idp-stat-chip">
      <div className="idp-stat-icon" style={{ background: iconBg, color: iconColor }}>
        #
      </div>
      <div className="idp-stat-col">
        <span className="idp-stat-value" style={{ color: valueColor }}>{value}</span>
        <span className="idp-stat-label">{label}</span>
      </div>
    </div>
  );
}

const TABS: TabDef[] = [
  { key: 'inventory',       label: 'Inventory' },
  { key: 'sizes',           label: 'Sizes' },
  { key: 'receive',         label: 'Receive Inventory' },
  { key: 'purchase-orders', label: 'Purchase Orders' },
  { key: 'suppliers',       label: 'Suppliers' },
];

export const InventoryDetailPane = ({ detail, loading }: InventoryDetailPaneProps) => {
  const [activeTab, setActiveTab] = useState('inventory');

  if (loading) return <div className="idp-loading"><Spin /></div>;
  if (!detail) return (
    <div className="idp-empty">
      Select an inventory item to view details
    </div>
  );

  const isLow = detail.currentLevel < detail.minLevel;
  const isAtMin = detail.currentLevel === detail.minLevel && detail.minLevel > 0;

  const inventoryTab = (
    <div className="idp-inv-tab">
      <SectionCard title="Item Details">
        <FormGrid cols={2}>
          <div className="idp-span-2">
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

      <div className="idp-section-spacer">
      <SectionCard title="Flags">
        <div className="idp-flags-wrap">
          {[
            { label: 'No Count Adjustment', value: detail.noCountAdjustment },
            { label: 'Not Used by Repair', value: detail.notUsedByRepair },
            { label: 'Always Re-Order', value: detail.alwaysReOrder },
            { label: 'Large Diameter', value: detail.largeDiameter },
            { label: 'Skip Pick List', value: detail.skipPickList },
          ].map(flag => (
            <div key={flag.label} className="idp-flag-item">
              <span style={{
                display: 'inline-flex',
                width: 14,
                height: 14,
                borderRadius: 3,
                border: `1px solid ${flag.value ? 'var(--success-border)' : 'var(--neutral-200)'}`,
                background: flag.value ? 'var(--success-light)' : 'var(--neutral-100)',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: flag.value ? 'var(--success)' : 'var(--muted)',
                fontWeight: 700,
              }}>
                {flag.value ? '✓' : ''}
              </span>
              <span className="idp-flag-label">{flag.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>
      </div>
    </div>
  );

  const sizesTab = (
    <div className="idp-sizes-tab">
      {detail.sizes.length === 0 ? (
        <div className="idp-sizes-empty">
          No sizes defined for this item
        </div>
      ) : (
        <div className="idp-sizes-table-wrap">
          <Table
            size="small"
            dataSource={detail.sizes}
            rowKey="sizeKey"
            pagination={false}
            className="idp-table"
            columns={[
              {
                title: 'Description',
                dataIndex: 'sizeDescription',
                key: 'sizeDescription',
                render: (v: string) => <span className="idp-size-desc">{v || '—'}</span>,
              },
              {
                title: 'Bin #',
                dataIndex: 'binNumber',
                key: 'binNumber',
                width: 80,
                render: (v: string | null) => (
                  <span className="idp-bin-badge">{v || '—'}</span>
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
                render: (v: number) => <span className="idp-size-plain">{v}</span>,
              },
              {
                title: 'Max',
                dataIndex: 'maxLevel',
                key: 'maxLevel',
                width: 55,
                render: (v: number) => <span className="idp-size-plain">{v}</span>,
              },
              {
                title: 'Unit Cost',
                dataIndex: 'unitCost',
                key: 'unitCost',
                width: 85,
                render: (v: number) => (
                  <span className="idp-size-cost">
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
    <div className="idp-container">
      <DetailHeader
        headingLevel="h2"
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
      <div className="idp-stat-strip">
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
      <div className="idp-tab-body">
        {activeTab === 'inventory'       && inventoryTab}
        {activeTab === 'sizes'           && sizesTab}
        {activeTab === 'receive'          && <ReceiveInventoryTab />}
        {activeTab === 'purchase-orders' && <PurchaseOrdersTab inventoryKey={detail.inventoryKey} />}
        {activeTab === 'suppliers'       && <SuppliersTab inventoryKey={detail.inventoryKey} />}
      </div>
    </div>
  );
};
