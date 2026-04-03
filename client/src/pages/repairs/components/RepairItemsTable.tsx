import { useState } from 'react';
import { message } from 'antd';
import type { RepairLineItem, LineItemUpdate } from '../types';
import { addRepairLineItem, deleteRepairLineItem } from '../../../api/repairs';

interface RepairItemsTableProps {
  repairKey: number;
  items: RepairLineItem[];
  onItemsChanged: () => void;
}

const causeBadge = (cause: string) => {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    UA: { bg: '#FEF2F2', color: 'var(--danger)', border: '#FECACA' },
    NW: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  };
  const s = styles[cause?.toUpperCase()] ?? { bg: 'var(--neutral-50)', color: 'var(--muted)', border: 'var(--border)' };
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 10,
      fontSize: 10, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {cause || '—'}
    </span>
  );
};

const fixBadge = (fix: string) => {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    W:  { bg: '#F0FDF4', color: 'var(--success)', border: '#BBF7D0' },
    NC: { bg: '#FEF2F2', color: 'var(--danger)',  border: '#FECACA' },
    C:  { bg: '#EFF6FF', color: 'var(--primary)', border: '#BFDBFE' },
    A:  { bg: '#F5F3FF', color: '#7C3AED',        border: '#DDD6FE' },
  };
  const s = styles[fix?.toUpperCase()] ?? { bg: 'var(--neutral-50)', color: 'var(--muted)', border: 'var(--border)' };
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 10,
      fontSize: 10, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {fix || '—'}
    </span>
  );
};

const approvalDot = (approved: string) => {
  const color = approved === 'Y' ? 'var(--success)' : approved === 'N' ? 'var(--danger)' : 'var(--amber)';
  return <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} />;
};

const EMPTY_ADD: LineItemUpdate = { cause: '', fixType: '', amount: 0, comments: '' };

export const RepairItemsTable = ({ repairKey, items, onItemsChanged }: RepairItemsTableProps) => {
  const [addRow, setAddRow] = useState<LineItemUpdate>(EMPTY_ADD);
  const [saving, setSaving] = useState(false);

  const warrantyTotal = items
    .filter(i => i.fixType?.toUpperCase() === 'W')
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const customerTotal = items
    .filter(i => i.fixType?.toUpperCase() !== 'W')
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const grandTotal = warrantyTotal + customerTotal;

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleAdd = async () => {
    if (!addRow.cause && !addRow.fixType && !addRow.amount) return;
    setSaving(true);
    try {
      await addRepairLineItem(repairKey, addRow);
      setAddRow(EMPTY_ADD);
      onItemsChanged();
      message.success('Item added');
    } catch {
      message.error('Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tranKey: number) => {
    try {
      await deleteRepairLineItem(repairKey, tranKey);
      onItemsChanged();
      message.success('Item removed');
    } catch {
      message.error('Failed to remove item');
    }
  };

  const thStyle: React.CSSProperties = {
    background: 'var(--navy)', color: '#fff',
    padding: '6px 8px', textAlign: 'left',
    fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
    position: 'sticky', top: 0,
  };
  const tdStyle: React.CSSProperties = {
    padding: '5px 8px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', fontSize: 12,
  };
  const addTdStyle: React.CSSProperties = {
    ...tdStyle, background: '#eff6ff',
  };
  const addInput: React.CSSProperties = {
    width: '100%', height: 24,
    border: '1px solid #93c5fd', borderRadius: 3,
    fontSize: 10, padding: '0 4px', background: '#fff',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ border: '2px solid var(--primary)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'var(--primary)', color: '#fff',
        padding: '8px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>Repair Items</span>
        <span style={{ fontSize: 11, opacity: .75 }}>
          {items.length} item{items.length !== 1 ? 's' : ''} ·{' '}
          <span style={{ color: '#4ade80' }}>{fmt(warrantyTotal)} warranty</span> ·{' '}
          <span style={{ color: '#fbbf24' }}>{fmt(customerTotal)} customer</span>
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 28, textAlign: 'center' }}></th>
              <th style={{ ...thStyle, minWidth: 72 }}>Code</th>
              <th style={{ ...thStyle, minWidth: 200 }}>Repair Item</th>
              <th style={{ ...thStyle, minWidth: 70, textAlign: 'center' }}>Cause</th>
              <th style={{ ...thStyle, minWidth: 70, textAlign: 'center' }}>Fix Type</th>
              <th style={{ ...thStyle, minWidth: 80, textAlign: 'center' }}>Approval</th>
              <th style={{ ...thStyle, minWidth: 80, textAlign: 'right' }}>Amount</th>
              <th style={{ ...thStyle, minWidth: 54 }}>Tech</th>
              <th style={{ ...thStyle, minWidth: 160 }}>Comments</th>
              <th style={{ ...thStyle, width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.tranKey} style={{ cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f6ff')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{approvalDot(item.approved)}</td>
                <td style={tdStyle}>{item.itemCode}</td>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{item.description}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{causeBadge(item.cause)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{fixBadge(item.fixType)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {item.approved === 'Y'
                    ? <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 11 }}>✓ Approved</span>
                    : <span style={{ color: 'var(--amber)', fontSize: 11 }}>Pending</span>}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                  {fmt(item.amount ?? 0)}
                </td>
                <td style={tdStyle}>{item.tech || '—'}</td>
                <td style={{ ...tdStyle, color: item.comments ? '#374151' : 'var(--muted)', fontSize: 11 }}>
                  {item.comments || '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button
                    onClick={() => handleDelete(item.tranKey)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: 0 }}
                    title="Remove item"
                  >×</button>
                </td>
              </tr>
            ))}

            {/* Inline add row */}
            <tr style={{ borderTop: '2px dashed #93c5fd' }}>
              <td style={addTdStyle}></td>
              <td style={addTdStyle}>
                <input style={addInput} placeholder="Code…"
                  value={addRow.itemCode ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, itemCode: e.target.value }))} />
              </td>
              <td style={addTdStyle}>
                <input style={addInput} placeholder="Repair item…"
                  value={addRow.description ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, description: e.target.value }))} />
              </td>
              <td style={{ ...addTdStyle, textAlign: 'center' }}>
                <select style={{ ...addInput, width: 52 }}
                  value={addRow.cause ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, cause: e.target.value }))}>
                  <option value="">—</option>
                  <option value="UA">UA</option>
                  <option value="NW">NW</option>
                </select>
              </td>
              <td style={{ ...addTdStyle, textAlign: 'center' }}>
                <select style={{ ...addInput, width: 52 }}
                  value={addRow.fixType ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, fixType: e.target.value }))}>
                  <option value="">—</option>
                  <option value="W">W</option>
                  <option value="NC">NC</option>
                  <option value="C">C</option>
                  <option value="A">A</option>
                </select>
              </td>
              <td style={addTdStyle}></td>
              <td style={addTdStyle}>
                <input style={{ ...addInput, textAlign: 'right' }}
                  placeholder="0.00" type="number" min="0" step="0.01"
                  value={addRow.amount ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, amount: parseFloat(e.target.value) || 0 }))} />
              </td>
              <td style={addTdStyle}></td>
              <td style={addTdStyle}>
                <input style={addInput} placeholder="Comment…"
                  value={addRow.comments ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, comments: e.target.value }))} />
              </td>
              <td style={addTdStyle}>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  style={{
                    background: 'var(--primary)', color: '#fff', border: 'none',
                    borderRadius: 3, padding: '3px 8px', fontSize: 10,
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {saving ? '…' : '+'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals footer */}
      <div style={{
        background: 'var(--navy)', color: '#fff',
        padding: '8px 12px',
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 24,
      }}>
        <span style={{ fontSize: 11, opacity: .7 }}>
          Warranty: <span style={{ color: '#4ade80', fontWeight: 700 }}>{fmt(warrantyTotal)}</span>
        </span>
        <span style={{ fontSize: 11, opacity: .7 }}>
          Non-Warranty: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{fmt(customerTotal)}</span>
        </span>
        <span style={{ fontSize: 14, fontWeight: 900 }}>Total: {fmt(grandTotal)}</span>
      </div>
    </div>
  );
};
