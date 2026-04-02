import { Tabs, Spin, Table } from 'antd';
import type { InventoryDetail } from './types';

interface InventoryDetailPaneProps {
  detail: InventoryDetail | null;
  loading: boolean;
}

interface FieldProps {
  label: string;
  value: string | number | boolean | null | undefined;
}

const Field = ({ label, value }: FieldProps) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      color: 'var(--muted)',
      letterSpacing: '0.05em',
      marginBottom: 2,
    }}>
      {label}
    </div>
    <div style={{
      fontSize: 13,
      color: 'var(--text)',
      padding: '4px 8px',
      background: 'var(--neutral-50)',
      border: '1px solid var(--neutral-200)',
      borderRadius: 4,
      minHeight: 28,
    }}>
      {value === null || value === undefined ? '—' : String(value)}
    </div>
  </div>
);

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

export const InventoryDetailPane = ({ detail, loading }: InventoryDetailPaneProps) => {
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
      {/* Item info panel */}
      <div style={{
        border: '1px solid var(--border-dk)',
        borderRadius: 8,
        marginBottom: 14,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{
          background: 'var(--neutral-50)',
          borderBottom: '1px solid var(--border-dk)',
          padding: '6px 12px',
          fontSize: 9.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--navy)',
        }}>
          Item Details
        </div>
        <div style={{ background: 'var(--card)', padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
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
          </div>
        </div>
      </div>

      {/* Flags panel */}
      <div style={{
        border: '1px solid var(--border-dk)',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{
          background: 'var(--neutral-50)',
          borderBottom: '1px solid var(--border-dk)',
          padding: '6px 12px',
          fontSize: 9.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--navy)',
        }}>
          Flags
        </div>
        <div style={{ background: 'var(--card)', padding: '14px 16px', display: 'flex', gap: 24 }}>
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
                border: `1px solid ${flag.value ? '#BBF7D0' : 'var(--neutral-200)'}`,
                background: flag.value ? '#F0FDF4' : 'var(--neutral-100)',
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
                  <span style={{
                    display: 'inline-flex',
                    padding: '1px 6px',
                    borderRadius: 9999,
                    fontSize: 10,
                    fontWeight: 700,
                    background: v ? '#F0FDF4' : 'var(--neutral-100)',
                    border: `1px solid ${v ? '#BBF7D0' : 'var(--neutral-200)'}`,
                    color: v ? 'var(--success)' : 'var(--muted)',
                  }}>
                    {v ? 'Active' : 'Inactive'}
                  </span>
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
      {/* Item header */}
      <div style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary-dark)' }}>{detail.description}</span>
        <span style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--steel)',
        }}>
          #{detail.inventoryKey}
        </span>
        <span style={{
          display: 'inline-flex',
          padding: '2px 8px',
          borderRadius: 9999,
          fontSize: 11,
          fontWeight: 700,
          background: detail.isActive ? '#F0FDF4' : 'var(--neutral-100)',
          border: `1px solid ${detail.isActive ? '#BBF7D0' : 'var(--neutral-200)'}`,
          color: detail.isActive ? 'var(--success)' : 'var(--muted)',
        }}>
          {detail.isActive ? 'Active' : 'Inactive'}
        </span>
        {(isLow || isAtMin) && (
          <span style={{
            display: 'inline-flex',
            padding: '2px 8px',
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 700,
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: 'var(--amber)',
          }}>
            {isLow ? 'Low Stock' : 'At Minimum'}
          </span>
        )}
      </div>

      {/* Stat strip */}
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

      {/* Tabs */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Tabs
          size="small"
          tabBarStyle={{
            margin: 0,
            padding: '0 16px',
            background: 'var(--card)',
            borderBottom: '1px solid var(--neutral-200)',
          }}
          items={[
            { key: 'inventory', label: 'Inventory', children: inventoryTab },
            {
              key: 'sizes',
              label: (
                <span>
                  Sizes
                  {detail.sizes.length > 0 && (
                    <span style={{
                      background: 'var(--navy)',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 8,
                      marginLeft: 4,
                    }}>
                      {detail.sizes.length}
                    </span>
                  )}
                </span>
              ),
              children: sizesTab,
            },
            {
              key: 'purchase-orders',
              label: 'Purchase Orders',
              children: (
                <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>
                  Purchase orders coming soon
                </div>
              ),
            },
            {
              key: 'suppliers',
              label: 'Suppliers',
              children: (
                <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>
                  Suppliers coming soon
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};
