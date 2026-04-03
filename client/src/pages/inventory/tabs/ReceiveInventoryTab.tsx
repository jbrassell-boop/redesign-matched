import { useState, useEffect, useCallback } from 'react';
import { Spin, message } from 'antd';
import { getInventoryPendingReceipt, receiveInventory } from '../../../api/inventory';
import type { InventoryReceivingItem } from '../types';

export const ReceiveInventoryTab = () => {
  const [items, setItems] = useState<InventoryReceivingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<InventoryReceivingItem | null>(null);

  // Form state
  const [qty, setQty] = useState('1');
  const [lotNumber, setLotNumber] = useState('');
  const [binNumber, setBinNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventoryPendingReceipt();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleSelect = (item: InventoryReceivingItem) => {
    setSelected(item);
    setBinNumber(item.binNumber ?? '');
    setQty('1');
    setLotNumber('');
    setNotes('');
  };

  const handleReceive = async () => {
    if (!selected) return;
    const qtyNum = parseInt(qty, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      message.error('Quantity must be a positive number');
      return;
    }
    setSaving(true);
    try {
      await receiveInventory({
        inventorySizeKey: selected.inventorySizeKey,
        quantity: qtyNum,
        lotNumber: lotNumber || undefined,
        binNumber: binNumber || undefined,
        notes: notes || undefined,
      });
      message.success(`Received ${qtyNum} units of ${selected.description} — ${selected.sizeDescription}`);
      setSelected(null);
      await loadItems();
    } catch {
      message.error('Failed to receive inventory');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin size="small" /></div>;

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 400 }}>
      {/* Left: pending receipt list */}
      <div style={{
        width: 320, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--neutral-50)',
      }}>
        <div style={{
          padding: '8px 14px',
          background: 'var(--neutral-50)',
          borderBottom: '1px solid var(--border)',
          fontSize: 10, fontWeight: 700, color: 'var(--navy)',
          textTransform: 'uppercase', letterSpacing: '0.04em',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Pending Receipt</span>
          <span style={{ fontWeight: 600, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>
            {items.length} items
          </span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              No items at or below minimum stock level
            </div>
          ) : items.map(item => {
            const isSelected = selected?.inventorySizeKey === item.inventorySizeKey;
            return (
              <div
                key={item.inventorySizeKey}
                onClick={() => handleSelect(item)}
                style={{
                  padding: '9px 14px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: isSelected ? '#FEF3C7' : 'var(--card)',
                  borderLeft: isSelected ? '2px solid var(--amber)' : '2px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--primary-light)'; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--card)'; }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{item.description}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{item.sizeDescription || 'Default size'}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 10, fontWeight: 600 }}>
                  <span style={{ color: 'var(--danger)' }}>Current: {item.currentLevel}</span>
                  <span style={{ color: 'var(--muted)' }}>Min: {item.minLevel}</span>
                  {item.binNumber && <span style={{ color: 'var(--primary)', background: 'var(--primary-light)', padding: '0 4px', borderRadius: 3 }}>Bin: {item.binNumber}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: receive form */}
      <div style={{ flex: 1, padding: '20px 24px', overflow: 'auto' }}>
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', gap: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={40} height={40} style={{ opacity: 0.3 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span style={{ fontSize: 13 }}>Select an item to receive inventory</span>
          </div>
        ) : (
          <div style={{ maxWidth: 480 }}>
            {/* Item header */}
            <div style={{
              background: 'rgba(var(--primary-rgb), 0.06)',
              border: '1px solid rgba(var(--primary-rgb), 0.15)',
              borderRadius: 6, padding: '10px 14px', marginBottom: 18,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{selected.description}</div>
              {selected.sizeDescription && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{selected.sizeDescription}</div>
              )}
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11, fontWeight: 600 }}>
                <span style={{ color: 'var(--danger)' }}>Current: {selected.currentLevel}</span>
                <span style={{ color: 'var(--muted)' }}>Min: {selected.minLevel}</span>
                <span style={{ color: 'var(--muted)' }}>Max: {selected.maxLevel}</span>
              </div>
            </div>

            {/* Form fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="Quantity Received *">
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  style={inputStyle}
                  placeholder="Enter quantity"
                />
              </FormField>

              <FormField label="Lot Number">
                <input
                  type="text"
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                  style={inputStyle}
                  placeholder="Optional lot/batch number"
                />
              </FormField>

              <FormField label="Bin Assignment">
                <input
                  type="text"
                  value={binNumber}
                  onChange={e => setBinNumber(e.target.value)}
                  style={inputStyle}
                  placeholder="Storage bin number"
                />
              </FormField>

              <FormField label="Notes">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ ...inputStyle, height: 72, resize: 'vertical' }}
                  placeholder="Optional notes about this receipt"
                />
              </FormField>

              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button
                  onClick={handleReceive}
                  disabled={saving}
                  style={{
                    height: 34, padding: '0 20px', fontSize: 13, fontWeight: 700,
                    background: saving ? 'var(--muted)' : 'var(--navy)', color: 'var(--card)',
                    border: 'none', borderRadius: 6, cursor: saving ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {saving ? 'Receiving...' : 'Receive'}
                </button>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    height: 34, padding: '0 16px', fontSize: 13, fontWeight: 600,
                    background: 'var(--card)', color: 'var(--muted)',
                    border: '1px solid var(--border-dk)', borderRadius: 6, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label style={{
      display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--muted)',
      textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
    }}>
      {label}
    </label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 10px',
  fontSize: 12,
  fontFamily: 'inherit',
  border: '1.5px solid var(--border-dk)',
  borderRadius: 6,
  background: 'var(--card)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
};
