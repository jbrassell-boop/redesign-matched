import { useState, useEffect, useRef } from 'react';
import type { RepairCatalogItem } from '../types';
import { getRepairItemCatalog } from '../../../api/repairs';

interface Props {
  repairKey: number;
  onSelect: (item: RepairCatalogItem) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const RepairItemAutoComplete = ({ repairKey, onSelect, inputRef }: Props) => {
  const [catalog, setCatalog] = useState<RepairCatalogItem[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getRepairItemCatalog(repairKey)
      .then(setCatalog)
      .catch(() => {});  // catalog load failure — don't block the UI
  }, [repairKey]);

  const filtered = query.length >= 1
    ? catalog.filter(i =>
        i.description.toLowerCase().includes(query.toLowerCase()) ||
        i.itemCode.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12)
    : [];

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && filtered[highlighted]) {
      e.preventDefault();
      select(filtered[highlighted]);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  const select = (item: RepairCatalogItem) => {
    onSelect(item);
    setQuery('');
    setOpen(false);
    setHighlighted(0);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1 }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setHighlighted(0); }}
        onKeyDown={handleKey}
        onFocus={() => query && setOpen(true)}
        placeholder="Search repair items…"
        style={{
          width: '100%', height: 26,
          border: '1px solid #93c5fd', borderRadius: 3,
          fontSize: 11, padding: '0 6px', background: '#fff',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,.12)',
          maxHeight: 240, overflowY: 'auto',
        }}>
          {filtered.map((item, idx) => (
            <div
              key={item.itemKey}
              onMouseDown={() => select(item)}
              style={{
                padding: '5px 10px',
                background: idx === highlighted ? 'var(--primary-light)' : '#fff',
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onMouseEnter={() => setHighlighted(idx)}
            >
              <span>
                <span style={{ fontWeight: 600, color: 'var(--navy)', marginRight: 6, fontSize: 10 }}>
                  {item.itemCode}
                </span>
                {item.description}
              </span>
              <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 11, marginLeft: 8 }}>
                ${item.defaultPrice.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
