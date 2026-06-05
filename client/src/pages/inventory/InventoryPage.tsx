import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { useServiceLocation } from '../../hooks/useServiceLocation';
import { getInventoryList, getInventoryDetail, getInventoryStats, getOpenPoReceipts } from '../../api/inventory';
import { InventoryList } from './InventoryList';
import { InventoryDetailPane } from './InventoryDetailPane';
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal';
import { ReceivePurchaseOrdersModal } from './ReceivePurchaseOrdersModal';
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

const poBtn: React.CSSProperties = {
  height: 36, minWidth: 36, padding: '0 8px', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
  background: 'var(--navy)', color: 'var(--card)', border: 'none', borderRadius: 4, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 3,
};

export const InventoryPage = () => {
  const { locationKey } = useServiceLocation();
  const [items, setItems] = useState<InventoryListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [detail, setDetail] = useState<InventoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [createPOOpen, setCreatePOOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [openPoCount, setOpenPoCount] = useState(0);

  // loadItems doesn't use locationKey in its body — the X-Service-Location
  // header travels via the axios interceptor — but locationKey is kept in
  // deps so a banner switch returns a new function reference, which fires
  // the calling useEffect (which has loadItems in deps) for a refetch.
  const loadItems = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const result = await getInventoryList({ search: s, pageSize: 300 });
      setItems(result.items);
      setTotalCount(result.totalCount);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey]);

  useEffect(() => {
    const timer = setTimeout(() => loadItems(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadItems]);

  const loadStats = useCallback(() => {
    getInventoryStats()
      .then(setStats)
      .catch(() => message.error('Failed to load inventory stats'));
  }, []);

  // Open-PO count drives the "Open POs" stat chip; location-scoped server-side.
  const loadOpenPoCount = useCallback(() => {
    getOpenPoReceipts()
      .then(d => setOpenPoCount(d.length))
      .catch(() => { /* non-critical — leave the chip at its last value */ });
  }, []);

  useEffect(() => {
    loadStats();
    loadOpenPoCount();
  }, [locationKey, loadStats, loadOpenPoCount]);

  const handleSelect = useCallback((item: InventoryListItem) => {
    setSelectedKey(item.inventoryKey);
  }, []);

  // Single fetch path — fires on initial select (selectedKey 0→N) AND on banner
  // location change. The locationKey value itself isn't passed to the API call
  // (the axios interceptor reads it and sets X-Service-Location), but it's kept
  // as an effect dep so a banner switch re-fires the fetch with the new header.
  useEffect(() => {
    if (selectedKey == null) return;
    let cancelled = false;
    setDetailLoading(true);
    getInventoryDetail(selectedKey)
      .then(d => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) message.error('Failed to load inventory detail'); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [locationKey, selectedKey]);

  // After a PO is created or stock is received, refresh the on-hand levels,
  // stats, and the open-PO count so the screen reflects the change immediately.
  const refreshAfterPoChange = useCallback(() => {
    loadStats();
    loadOpenPoCount();
    loadItems(search);
  }, [loadStats, loadOpenPoCount, loadItems, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Global Stat Strip */}
      {stats && (
        <StatStrip chips={[
          { id: 'total',    label: 'Total Items', value: stats.totalCount,    color: 'navy'  },
          { id: 'active',   label: 'Active',      value: stats.activeCount,   color: 'green' },
          { id: 'inactive', label: 'Inactive',    value: stats.inactiveCount, color: 'muted' },
          { id: 'lowStock', label: 'Low Stock',   value: stats.lowStockCount, color: 'amber', state: stats.lowStockCount > 0 ? 'warn' : 'normal' },
          { id: 'openPos',  label: 'Open POs',    value: openPoCount,         color: 'navy', state: openPoCount > 0 ? 'warn' : 'normal' },
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
            <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--navy)', margin: 0 }}>Inventory</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }} aria-live="polite">{totalCount} items</span>
              <ExportButton data={items as unknown as Record<string, unknown>[]} columns={INVENTORY_EXPORT_COLS} filename="inventory-export" sheetName="Inventory" />
              <button onClick={() => setReceiveOpen(true)} style={{ ...poBtn, background: 'var(--card)', color: 'var(--navy)', border: '1px solid var(--border)' }}>
                Receive
              </button>
              <button onClick={() => setCreatePOOpen(true)} style={poBtn}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={9} height={9}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Create PO
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

      <CreatePurchaseOrderModal
        open={createPOOpen}
        onClose={() => setCreatePOOpen(false)}
        onCreated={refreshAfterPoChange}
      />
      <ReceivePurchaseOrdersModal
        open={receiveOpen}
        onClose={() => setReceiveOpen(false)}
        onReceived={refreshAfterPoChange}
      />
    </div>
  );
};
