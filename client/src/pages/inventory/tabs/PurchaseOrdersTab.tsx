import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getInventoryPurchaseOrders } from '../../../api/inventory';
import type { InventoryPurchaseOrder } from '../types';

interface Props {
  inventoryKey: number;
}

export const PurchaseOrdersTab = ({ inventoryKey }: Props) => {
  const [items, setItems] = useState<InventoryPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInventoryPurchaseOrders(inventoryKey)
      .then(data => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) { message.error('Failed to load data'); setItems([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [inventoryKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin size="small" /></div>;

  if (items.length === 0) {
    return <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>No purchase orders found for this item</div>;
  }

  return (
    <div style={{ padding: '14px 18px' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          background: 'var(--neutral-50)', padding: '6px 12px', fontSize: 10, fontWeight: 700,
          color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em',
          borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Purchase Orders</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>{items.length} orders</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={thStyle}>PO #</th>
              <th style={thStyle}>Supplier</th>
              <th style={thStyle}>Date</th>
              <th style={{ ...thStyle, textAlign: 'right', width: 80 }}>Total</th>
              <th style={{ ...thStyle, textAlign: 'center', width: 50 }}>Lines</th>
              <th style={{ ...thStyle, textAlign: 'center', width: 55 }}>Ordered</th>
              <th style={{ ...thStyle, textAlign: 'center', width: 60 }}>Received</th>
              <th style={{ ...thStyle, textAlign: 'center', width: 65 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map(po => {
              const isFullyReceived = po.orderedQty > 0 && po.receivedQty >= po.orderedQty;
              const statusLabel = po.cancelled ? 'Cancelled' : isFullyReceived ? 'Closed' : 'Open';
              const statusColor = po.cancelled ? 'var(--danger)' : isFullyReceived ? 'var(--muted)' : 'var(--success)';
              return (
                <tr key={po.supplierPOKey} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                >
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: 'var(--navy)' }}>{po.poNumber || '\u2014'}</span>
                  </td>
                  <td style={tdStyle}>{po.supplierName || '\u2014'}</td>
                  <td style={tdStyle}>{po.poDate || '\u2014'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--navy)' }}>
                    ${po.poTotal.toFixed(2)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{po.lineCount}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{po.orderedQty}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{po.receivedQty}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex', padding: '1px 6px', borderRadius: 9999, fontSize: 10, fontWeight: 700,
                      color: statusColor,
                    }}>
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
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
