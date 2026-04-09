import { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import type { RepairCatalogItem } from '../types';
import { getRepairItemCatalog, addRepairLineItem } from '../../../api/repairs';
import './RepairItemPicker.css';

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

  const RF_MAP: Record<string, string> = { Flexible: 'F', Rigid: 'R', Camera: 'C' };

  const filtered = catalog.filter(i => {
    if (search && !i.description.toLowerCase().includes(search.toLowerCase()) && !i.itemCode.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (typeFilter !== 'all') {
      const code = RF_MAP[typeFilter];
      if (i.rigidOrFlexible && i.rigidOrFlexible !== code) return false;
    }
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
    } catch {
      message.error('Failed to add items');
    } finally {
      setAdding(false);
    }
  };

  const fmt$ = (n: number) => '$' + n.toFixed(2);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="rpk-overlay"
    >
      <div className="rpk-panel">
        {/* Header */}
        <div className="rpk-header">
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search repair items..."
            aria-label="Search repair items catalog"
            className="rpk-search"
          />
          <div className="rpk-type-tabs">
            {['all', 'Flexible', 'Rigid', 'Camera'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rpk-type-btn${typeFilter === t ? ' rpk-type-btn--on' : ' rpk-type-btn--off'}`}
              >
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="rpk-close-btn">×</button>
        </div>

        {/* Item list */}
        <div className="rpk-list">
          {loading && <div className="rpk-list-msg">Loading catalog...</div>}
          {!loading && filtered.length === 0 && (
            <div className="rpk-list-msg">No items match your search</div>
          )}
          {filtered.map(item => {
            const isSelected = selected.has(item.itemKey);
            const entry = selected.get(item.itemKey);
            return (
              <div key={item.itemKey}>
                <div
                  onClick={() => toggleItem(item)}
                  className={`rpk-row${isSelected ? ' rpk-row--on' : ' rpk-row--off'} ${isSelected ? 'selected' : 'hover-row'}`}
                >
                  <input type="checkbox" checked={isSelected} readOnly className="rpk-checkbox" />
                  <span className="rpk-code">{item.itemCode}</span>
                  <span className="rpk-desc">{item.description}</span>
                  {item.minutesTech1 != null && (
                    <span className="rpk-mins" title="Est. minutes (T1/T2/T3)">
                      {item.minutesTech1}m
                    </span>
                  )}
                  <span className="rpk-price">
                    {item.defaultPrice > 0 ? fmt$(item.defaultPrice) : '—'}
                  </span>
                </div>
                {/* Expanded row for selected items — fix type + comment */}
                {isSelected && entry && (
                  <div className="rpk-detail">
                    <span className="rpk-fix-label">Fix:</span>
                    {['R', 'W', 'N', 'C', 'A'].map(ft => (
                      <button
                        key={ft}
                        onClick={() => updateFixType(item.itemKey, ft)}
                        className={`rpk-ft-btn${entry.fixType === ft ? ' rpk-ft-btn--on' : ' rpk-ft-btn--off'}`}
                      >{ft}</button>
                    ))}
                    <input
                      value={entry.comment}
                      onChange={e => updateComment(item.itemKey, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="Comment..."
                      aria-label="Item comment"
                      maxLength={80}
                      className="rpk-comment"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {selected.size > 0 && (
          <div className="rpk-footer">
            <span className="rpk-footer-label">
              {selected.size} item{selected.size > 1 ? 's' : ''} selected
            </span>
            <div className="rpk-footer-btns">
              <button onClick={() => setSelected(new Map())} className="rpk-clear-btn">Clear</button>
              <button onClick={handleAddAll} disabled={adding} className="rpk-add-btn">{adding ? 'Adding...' : 'Add Items'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
