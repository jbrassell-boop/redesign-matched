import { useState, useEffect, useCallback } from 'react';
import { Spin, message } from 'antd';
import { getInventoryPendingReceipt, receiveInventory } from '../../../api/inventory';
import type { InventoryReceivingItem } from '../types';
import './ReceiveInventoryTab.css';

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

  useEffect(() => {
    let cancelled = false;
    loadItems().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [loadItems]);

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

  if (loading) return <div className="rcv-loading"><Spin size="small" /></div>;

  return (
    <div className="rcv-shell">
      {/* Left: pending receipt list */}
      <div className="rcv-left">
        <div className="rcv-left-head">
          <span>Pending Receipt</span>
          <span className="rcv-left-count">{items.length} items</span>
        </div>
        <div className="rcv-left-scroll">
          {items.length === 0 ? (
            <div className="rcv-empty">No items at or below minimum stock level</div>
          ) : items.map(item => {
            const isSelected = selected?.inventorySizeKey === item.inventorySizeKey;
            return (
              <div
                key={item.inventorySizeKey}
                onClick={() => handleSelect(item)}
                className={`rcv-item ${isSelected ? 'selected' : 'hover-row-light'}`}
                style={{
                  background: isSelected ? 'var(--amber-light)' : 'var(--card)',
                  borderLeft: isSelected ? '2px solid var(--amber)' : '2px solid transparent',
                }}
              >
                <div className="rcv-item-name">{item.description}</div>
                <div className="rcv-item-size">{item.sizeDescription || 'Default size'}</div>
                <div className="rcv-item-levels">
                  <span className="rcv-level-danger">Current: {item.currentLevel}</span>
                  <span className="rcv-level-muted">Min: {item.minLevel}</span>
                  {item.binNumber && <span className="rcv-bin-badge">Bin: {item.binNumber}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: receive form */}
      <div className="rcv-right">
        {!selected ? (
          <div className="rcv-placeholder">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={40} height={40} className="rcv-placeholder-icon">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="rcv-placeholder-text">Select an item to receive inventory</span>
          </div>
        ) : (
          <div className="rcv-form-wrap">
            {/* Item header */}
            <div className="rcv-item-card">
              <div className="rcv-item-card-name">{selected.description}</div>
              {selected.sizeDescription && (
                <div className="rcv-item-card-size">{selected.sizeDescription}</div>
              )}
              <div className="rcv-item-card-levels">
                <span className="rcv-level-danger">Current: {selected.currentLevel}</span>
                <span className="rcv-level-muted">Min: {selected.minLevel}</span>
                <span className="rcv-level-muted">Max: {selected.maxLevel}</span>
              </div>
            </div>

            {/* Form fields */}
            <div className="rcv-fields">
              <FormField label="Quantity Received *">
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  className="rcv-input"
                  placeholder="Enter quantity"
                />
              </FormField>

              <FormField label="Lot Number">
                <input
                  type="text"
                  value={lotNumber}
                  onChange={e => setLotNumber(e.target.value)}
                  className="rcv-input"
                  placeholder="Optional lot/batch number"
                />
              </FormField>

              <FormField label="Bin Assignment">
                <input
                  type="text"
                  value={binNumber}
                  onChange={e => setBinNumber(e.target.value)}
                  className="rcv-input"
                  placeholder="Storage bin number"
                />
              </FormField>

              <FormField label="Notes">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="rcv-textarea"
                  placeholder="Optional notes about this receipt"
                />
              </FormField>

              <div className="rcv-actions">
                <button
                  onClick={handleReceive}
                  disabled={saving}
                  className={`rcv-save-btn${saving ? ' rcv-save-btn--saving' : ''}`}
                >
                  {saving ? 'Receiving...' : 'Receive'}
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="rcv-cancel-btn"
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
    <label className="rcv-field-label">{label}</label>
    {children}
  </div>
);
