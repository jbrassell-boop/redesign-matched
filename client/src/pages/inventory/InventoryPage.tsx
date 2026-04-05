import { useState, useEffect, useCallback } from 'react';
import { message, Modal } from 'antd';
import { getInventoryList, getInventoryDetail, getInventoryStats } from '../../api/inventory';
import { InventoryList } from './InventoryList';
import { InventoryDetailPane } from './InventoryDetailPane';
import type { InventoryListItem, InventoryDetail, InventoryStats } from './types';
import { ExportButton } from '../../components/common/ExportButton';

const INVENTORY_EXPORT_COLS = [
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'currentLevel', label: 'Current Level' },
  { key: 'minLevel', label: 'Min Level' },
  { key: 'maxLevel', label: 'Max Level' },
  { key: 'isActive', label: 'Active' },
  { key: 'sizeCount', label: 'Sizes' },
  { key: 'isLowStock', label: 'Low Stock' },
];

export const InventoryPage = () => {
  const [items, setItems] = useState<InventoryListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [detail, setDetail] = useState<InventoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [draftPOOpen, setDraftPOOpen] = useState(false);
  const [poSupplier, setPoSupplier] = useState('');
  const [poNotes, setPoNotes] = useState('');

  const loadItems = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const result = await getInventoryList({ search: s, pageSize: 300 });
      setItems(result.items);
      setTotalCount(result.totalCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadItems(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadItems]);

  useEffect(() => {
    getInventoryStats().then(setStats).catch(() => {});
  }, []);

  const handleSelect = useCallback(async (item: InventoryListItem) => {
    setSelectedKey(item.inventoryKey);
    setDetailLoading(true);
    try {
      const d = await getInventoryDetail(item.inventoryKey);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Global Stat Strip */}
      {stats && (
        <div style={{
          display: 'flex',
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {[
            {
              value: stats.totalCount,
              label: 'TOTAL ITEMS',
              iconBg: `rgba(var(--primary-rgb), 0.13)`,
              iconColor: 'var(--primary)',
              valueColor: 'var(--navy)',
            },
            {
              value: stats.activeCount,
              label: 'ACTIVE',
              iconBg: `rgba(var(--success-rgb), 0.13)`,
              iconColor: 'var(--success)',
              valueColor: 'var(--success)',
            },
            {
              value: stats.inactiveCount,
              label: 'INACTIVE',
              iconBg: `rgba(var(--muted-rgb), 0.13)`,
              iconColor: 'var(--muted)',
              valueColor: 'var(--muted)',
            },
            {
              value: stats.lowStockCount,
              label: 'LOW STOCK',
              iconBg: `rgba(var(--amber-rgb), 0.13)`,
              iconColor: 'var(--amber)',
              valueColor: 'var(--amber)',
            },
            {
              value: 0,
              label: 'OPEN POs',
              iconBg: `rgba(var(--navy-rgb), 0.13)`,
              iconColor: 'var(--navy)',
              valueColor: 'var(--navy)',
            },
          ].map((chip, idx, arr) => (
            <div
              key={chip.label}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRight: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                background: chip.iconBg,
                color: chip.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 12, height: 12 }}>
                  <path d="M2 4.5L8 1.5l6 3v7l-6 3-6-3z" />
                  <path d="M2 4.5L8 7.5l6-3" />
                  <line x1="8" y1="7.5" x2="8" y2="14.5" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: chip.valueColor, lineHeight: 1 }}>
                  {chip.value}
                </span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}>
                  {chip.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Split layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel — 260px */}
        <div style={{
          width: 260,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          background: 'var(--card)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--navy)' }}>Inventory</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{totalCount} items</span>
              <ExportButton data={items as unknown as Record<string, unknown>[]} columns={INVENTORY_EXPORT_COLS} filename="inventory-export" sheetName="Inventory" />
              <button
                onClick={() => { setPoSupplier(''); setPoNotes(''); setDraftPOOpen(true); }}
                style={{
                  height: 24, padding: '0 8px', fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                  background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={9} height={9}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Draft PO
              </button>
            </div>
          </div>
          <InventoryList
            items={items}
            loading={loading}
            selectedKey={selectedKey}
            search={search}
            onSearchChange={setSearch}
            onSelect={handleSelect}
            totalCount={totalCount}
          />
        </div>

        {/* Right panel — flex 1 */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
          <InventoryDetailPane detail={detail} loading={detailLoading} />
        </div>
      </div>

      <Modal
        open={draftPOOpen}
        onCancel={() => setDraftPOOpen(false)}
        title={<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Create Draft PO</span>}
        okText="Create Draft PO"
        okButtonProps={{ disabled: !poSupplier.trim() }}
        onOk={() => {
          message.success('Draft PO created');
          setDraftPOOpen(false);
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>Supplier *</div>
            <input
              value={poSupplier}
              onChange={e => setPoSupplier(e.target.value)}
              placeholder="Supplier name"
              style={{ width: '100%', height: 32, border: '1px solid #d1d5db', borderRadius: 4, padding: '0 8px', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>PO Notes</div>
            <textarea
              value={poNotes}
              onChange={e => setPoNotes(e.target.value)}
              placeholder="Optional notes for this purchase order..."
              rows={4}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 8px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
