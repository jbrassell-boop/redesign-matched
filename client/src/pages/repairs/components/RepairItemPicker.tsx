import { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import type { RepairCatalogItem } from '../types';
import { getRepairItemCatalog, addRepairLineItem } from '../../../api/repairs';

interface Props {
  repairKey: number;
  open: boolean;
  onClose: () => void;
  onItemsAdded: () => void;
}

export const RepairItemPicker = ({ repairKey, open, onClose, onItemsAdded }: Props) => {
  const [catalog, setCatalog] = useState<RepairCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Map<number, { item: RepairCatalogItem; fixType: string; comment: string }>>(new Map());
  const [adding, setAdding] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getRepairItemCatalog(repairKey)
      .then(setCatalog)
      .catch(() => message.error('Failed to load catalog'))
      .finally(() => setLoading(false));
    setSearch('');
    setSelected(new Map());
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [open, repairKey]);

  if (!open) return null;

  const filtered = catalog.filter(i => {
    if (search && !i.description.toLowerCase().includes(search.toLowerCase()) && !i.itemCode.toLowerCase().includes(search.toLowerCase()))
      return false;
    // Type filter would use a category field — for now show all
    return true;
  });

  const toggleItem = (item: RepairCatalogItem) => {
    const next = new Map(selected);
    if (next.has(item.itemKey)) {
      next.delete(item.itemKey);
    } else {
      next.set(item.itemKey, { item, fixType: 'C', comment: '' });
    }
    setSelected(next);
  };

  const updateFixType = (key: number, ft: string) => {
    const next = new Map(selected);
    const entry = next.get(key);
    if (entry) {
      next.set(key, { ...entry, fixType: ft });
      setSelected(next);
    }
  };

  const updateComment = (key: number, comment: string) => {
    const next = new Map(selected);
    const entry = next.get(key);
    if (entry) {
      next.set(key, { ...entry, comment });
      setSelected(next);
    }
  };

  const handleAddAll = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      for (const [, { item, fixType, comment }] of selected) {
        await addRepairLineItem(repairKey, {
          itemKey: item.itemKey,
          itemCode: item.itemCode,
          description: item.description,
          fixType: fixType || 'C',
          amount: fixType === 'W' ? 0 : item.defaultPrice,
          baseAmount: item.defaultPrice,
          comments: comment || undefined,
        });
      }
      message.success(`${selected.size} item${selected.size > 1 ? 's' : ''} added`);
      onItemsAdded();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status: number; data?: unknown } };
      const detail = axiosErr?.response?.data ? JSON.stringify(axiosErr.response.data) : String(err);
      message.error(`Failed to add items (${axiosErr?.response?.status ?? 'network'}): ${detail}`);
    } finally {
      setAdding(false);
    }
  };

  const fmt$ = (n: number) => '$' + n.toFixed(2);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        width: '90vw', maxWidth: 700, height: '80vh',
        background: '#fff', borderRadius: 10,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px', background: 'var(--navy)', color: '#fff',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search repair items..."
            style={{
              flex: 1, height: 32, border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 4, padding: '0 10px', fontSize: 12,
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden' }}>
            {['all', 'Flexible', 'Rigid', 'Camera'].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} style={{
                height: 28, padding: '0 10px', border: 'none', fontSize: 10, fontWeight: 600,
                background: typeFilter === t ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 4, background: 'transparent', color: '#fff',
            fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Item list */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading catalog...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No items match your search</div>
          )}
          {filtered.map(item => {
            const isSelected = selected.has(item.itemKey);
            const entry = selected.get(item.itemKey);
            return (
              <div key={item.itemKey}>
                <div
                  onClick={() => toggleItem(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 16px', cursor: 'pointer',
                    borderBottom: '1px solid var(--neutral-100)',
                    background: isSelected ? 'rgba(var(--primary-rgb), 0.06)' : '#fff',
                    borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--neutral-50)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
                >
                  <input type="checkbox" checked={isSelected} readOnly style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--navy)', minWidth: 60 }}>{item.itemCode}</span>
                  <span style={{ flex: 1, fontSize: 12, color: '#374151' }}>{item.description}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', minWidth: 60, textAlign: 'right' }}>
                    {item.defaultPrice > 0 ? fmt$(item.defaultPrice) : '—'}
                  </span>
                </div>
                {/* Expanded row for selected items — fix type + comment */}
                {isSelected && entry && (
                  <div style={{
                    padding: '6px 16px 8px 45px', background: 'rgba(var(--primary-rgb), 0.04)',
                    borderBottom: '1px solid var(--neutral-200)',
                    display: 'flex', gap: 10, alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>Fix:</span>
                    {['R', 'W', 'N', 'C', 'A'].map(ft => (
                      <button key={ft} onClick={() => updateFixType(item.itemKey, ft)} style={{
                        padding: '2px 8px', fontSize: 10, fontWeight: 700, borderRadius: 3, cursor: 'pointer',
                        border: entry.fixType === ft ? '1px solid var(--primary)' : '1px solid var(--border)',
                        background: entry.fixType === ft ? 'var(--primary)' : '#fff',
                        color: entry.fixType === ft ? '#fff' : 'var(--muted)',
                      }}>{ft}</button>
                    ))}
                    <input
                      value={entry.comment}
                      onChange={e => updateComment(item.itemKey, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="Comment..."
                      maxLength={80}
                      style={{
                        flex: 1, height: 24, border: '1px solid var(--border)', borderRadius: 3,
                        fontSize: 11, padding: '0 6px', outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {selected.size > 0 && (
          <div style={{
            padding: '10px 16px', borderTop: '1px solid var(--border)',
            background: 'var(--neutral-50)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>
              {selected.size} item{selected.size > 1 ? 's' : ''} selected
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setSelected(new Map())} style={{
                padding: '5px 14px', borderRadius: 4, border: '1px solid var(--border)',
                background: '#fff', fontSize: 12, cursor: 'pointer',
              }}>Clear</button>
              <button onClick={handleAddAll} disabled={adding} style={{
                padding: '5px 14px', borderRadius: 4, border: 'none',
                background: 'var(--success)', color: '#fff', fontSize: 12,
                fontWeight: 700, cursor: 'pointer',
              }}>{adding ? 'Adding...' : 'Add Items'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
