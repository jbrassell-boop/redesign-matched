import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getSupplierInventory } from '../../../api/suppliers';
import type { SupplierInventoryItem } from '../types';

interface InventorySuppliedTabProps {
  supplierKey: number;
}

export const InventorySuppliedTab = ({ supplierKey }: InventorySuppliedTabProps) => {
  const [items, setItems] = useState<SupplierInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSupplierInventory(supplierKey)
      .then(data => { if (!cancelled) setItems(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [supplierKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  if (items.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        No inventory items supplied by this vendor.
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{
        border: '1px solid var(--neutral-200)',
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>Item</th>
              <th style={thStyle}>Size</th>
              <th style={thStyle}>Supplier Part #</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Unit Cost</th>
              <th style={{ ...thStyle, width: 70 }}>Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={item.supplierSizesKey}
                style={{
                  borderBottom: i < items.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                  background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                }}
              >
                <td style={{ ...tdStyle, fontWeight: 600 }}>{item.itemDescription || '\u2014'}</td>
                <td style={tdStyle}>{item.sizeDescription || '\u2014'}</td>
                <td style={tdStyle}>
                  {item.supplierPartNo ? (
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--primary)',
                      background: 'rgba(var(--primary-rgb), 0.08)',
                      padding: '1px 5px',
                      borderRadius: 3,
                      border: '1px solid rgba(var(--primary-rgb), 0.2)',
                    }}>
                      {item.supplierPartNo}
                    </span>
                  ) : '\u2014'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                  ${item.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    display: 'inline-flex',
                    padding: '2px 6px',
                    borderRadius: 9999,
                    fontSize: 10,
                    fontWeight: 600,
                    background: item.isActive ? 'rgba(var(--success-rgb), 0.1)' : 'var(--neutral-100)',
                    color: item.isActive ? 'var(--success)' : 'var(--muted)',
                  }}>
                    {item.isActive ? 'Yes' : 'No'}
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
  padding: '6px 8px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--muted)',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  color: 'var(--text)',
};
