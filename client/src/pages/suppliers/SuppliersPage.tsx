import { useState, useEffect, useCallback } from 'react';
import { getSuppliers, getSupplierDetail, getSupplierStats } from '../../api/suppliers';
import { SuppliersList } from './SuppliersList';
import { SupplierDetailPane } from './SupplierDetailPane';
import type { SupplierListItem, SupplierDetail, SupplierStats } from './types';
import { ExportButton } from '../../components/common/ExportButton';

const EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'phone', label: 'Phone' },
  { key: 'gpId', label: 'GP ID' },
  { key: 'roles', label: 'Roles' },
];

const StatChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 6,
    background: 'var(--card)',
    border: '1px solid var(--neutral-200)',
  }}>
    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}</span>
  </div>
);

export const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stats, setStats] = useState<SupplierStats | null>(null);

  useEffect(() => {
    getSupplierStats().then(setStats).catch(() => {});
  }, []);

  const loadSuppliers = useCallback(async (s: string) => {
    setListLoading(true);
    try {
      const result = await getSuppliers({ search: s || undefined, page: 1, pageSize: 100 });
      setSuppliers(result.items);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadSuppliers(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadSuppliers]);

  const handleSelect = useCallback(async (s: SupplierListItem) => {
    setSelectedKey(s.supplierKey);
    setDetailLoading(true);
    try {
      const d = await getSupplierDetail(s.supplierKey);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Stat Strip */}
      {stats && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          background: 'var(--neutral-50)',
          borderBottom: '1px solid var(--neutral-200)',
        }}>
          <StatChip label="Total" value={stats.total} color="var(--text)" />
          <StatChip label="Active" value={stats.active} color="var(--success)" />
          <StatChip label="Inactive" value={stats.inactive} color="var(--danger)" />
          <StatChip label="Parts" value={stats.parts} color="var(--primary)" />
          <StatChip label="Repair" value={stats.repair} color="var(--primary)" />
          <StatChip label="Acquisition" value={stats.acquisition} color="var(--primary)" />
          <StatChip label="Carts" value={stats.carts} color="var(--primary)" />
        </div>
      )}

      {/* Split layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        <div style={{
          width: 280,
          flexShrink: 0,
          borderRight: '1px solid var(--neutral-200)',
          background: '#fff',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Toolbar */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)' }}>Suppliers</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{suppliers.length} records</span>
              <ExportButton
                data={suppliers as unknown as Record<string, unknown>[]}
                columns={EXPORT_COLS}
                filename="suppliers"
              />
            </div>
          </div>
          <SuppliersList
            suppliers={suppliers}
            loading={listLoading}
            selectedKey={selectedKey}
            search={search}
            onSearchChange={setSearch}
            onSelect={handleSelect}
          />
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
          <SupplierDetailPane detail={detail} loading={detailLoading} />
        </div>
      </div>
    </div>
  );
};
