import { useState, useEffect, useCallback } from 'react';
import { message, Modal } from 'antd';
import { getInventoryList, getInventoryDetail, getInventoryStats } from '../../api/inventory';
import { InventoryList } from './InventoryList';
import { InventoryDetailPane } from './InventoryDetailPane';
import type { InventoryListItem, InventoryDetail, InventoryStats } from './types';
import { ExportButton } from '../../components/common/ExportButton';
import { StatStrip } from '../../components/shared/StatStrip';

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
    let cancelled = false;
    getInventoryStats()
      .then(data => { if (!cancelled) setStats(data); })
      .catch(() => { if (!cancelled) message.error('Failed to load inventory stats'); });
    return () => { cancelled = true; };
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
        <StatStrip chips={[
          { id: 'total',    label: 'Total Items', value: stats.totalCount,    color: 'navy'  },
          { id: 'active',   label: 'Active',      value: stats.activeCount,   color: 'green' },
          { id: 'inactive', label: 'Inactive',    value: stats.inactiveCount, color: 'muted' },
          { id: 'lowStock', label: 'Low Stock',   value: stats.lowStockCount, color: 'amber', state: stats.lowStockCount > 0 ? 'warn' : 'normal' },
          { id: 'openPos',  label: 'Open POs',    value: 0,                   color: 'navy'  },
        ]} />
      )}

      {/* Split layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel — 260px */}
        <aside aria-label="Inventory list" style={{
          width: 260,
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          background: 'var(--card)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--navy)', margin: 0 }}>Inventory</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }} aria-live="polite">{totalCount} items</span>
              <ExportButton data={items as unknown as Record<string, unknown>[]} columns={INVENTORY_EXPORT_COLS} filename="inventory-export" sheetName="Inventory" />
              <button
                onClick={() => { setPoSupplier(''); setPoNotes(''); setDraftPOOpen(true); }}
                style={{
                  height: 36, minWidth: 36, padding: '0 8px', fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                  background: 'var(--navy)', color: 'var(--card)', border: 'none', borderRadius: 4, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={9} height={9}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
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
        </aside>

        {/* Right panel — flex 1 */}
        <section aria-label="Inventory details" style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
          <InventoryDetailPane detail={detail} loading={detailLoading} />
        </section>
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
              aria-label="Supplier name"
              style={{ width: '100%', height: 32, border: '1px solid var(--neutral-200)', borderRadius: 4, padding: '0 8px', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>PO Notes</div>
            <textarea
              value={poNotes}
              onChange={e => setPoNotes(e.target.value)}
              placeholder="Optional notes for this purchase order..."
              aria-label="Purchase order notes"
              rows={4}
              style={{ width: '100%', border: '1px solid var(--neutral-200)', borderRadius: 4, padding: '6px 8px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
