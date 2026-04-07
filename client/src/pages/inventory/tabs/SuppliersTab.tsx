import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getInventorySuppliers } from '../../../api/inventory';
import type { InventorySupplierItem } from '../types';

interface Props {
  inventoryKey: number;
}

export const SuppliersTab = ({ inventoryKey }: Props) => {
  const [items, setItems] = useState<InventorySupplierItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInventorySuppliers(inventoryKey)
      .then(data => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) { message.error('Failed to load data'); setItems([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [inventoryKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin size="small" /></div>;

  if (items.length === 0) {
    return <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>No suppliers linked to this item</div>;
  }

  return (
    <div style={{ padding: '14px 18px' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          background: 'var(--neutral-50)', padding: '6px 12px', fontSize: 10, fontWeight: 700,
          color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em',
          borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Suppliers</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>{items.length} entries</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={thStyle}>Supplier</th>
              <th style={thStyle}>Size</th>
              <th style={thStyle}>Part #</th>
              <th style={{ ...thStyle, textAlign: 'right', width: 80 }}>Unit Cost</th>
              <th style={{ ...thStyle, textAlign: 'center', width: 60 }}>Min Ord</th>
              <th style={{ ...thStyle, textAlign: 'center', width: 60 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.supplierSizesKey} style={{ cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
              >
                <td style={{ ...tdStyle, fontWeight: 600 }}>{item.supplierName || '\u2014'}</td>
                <td style={tdStyle}>{item.sizeDescription || '\u2014'}</td>
                <td style={tdStyle}>
                  {item.partNumber ? (
                    <span style={{
                      fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: 'var(--primary)',
                      background: 'var(--primary-light)', padding: '1px 5px', borderRadius: 3,
                      border: '1px solid var(--border-dk)', letterSpacing: '0.04em',
                    }}>
                      {item.partNumber}
                    </span>
                  ) : '\u2014'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                  ${item.unitCost.toFixed(2)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{item.orderMinimum}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex', padding: '1px 6px', borderRadius: 9999, fontSize: 10, fontWeight: 700,
                    background: item.isActive ? 'rgba(var(--success-rgb), 0.1)' : 'var(--neutral-100)',
                    border: `1px solid ${item.isActive ? 'rgba(var(--success-rgb), 0.3)' : 'var(--neutral-200)'}`,
                    color: item.isActive ? 'var(--success)' : 'var(--muted)',
                  }}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  background: 'var(--neutral-50)', padding: '5px 8px', fontSize: 9, fontWeight: 600,
  color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left',
  borderBottom: '1px solid var(--neutral-200)',
};

const tdStyle: React.CSSProperties = {
  padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 11,
};
