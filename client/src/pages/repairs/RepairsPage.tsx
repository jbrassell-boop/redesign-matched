import { useState, useEffect, useCallback } from 'react';
import { getRepairs, getRepairDetail } from '../../api/repairs';
import { RepairsList } from './RepairsList';
import { RepairDetailPane } from './RepairDetailPane';
import type { RepairListItem, RepairDetail } from './types';

export const RepairsPage = () => {
  const [repairs, setRepairs] = useState<RepairListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [detail, setDetail] = useState<RepairDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadRepairs = useCallback(async (s: string) => {
    setListLoading(true);
    try {
      const result = await getRepairs({ search: s, page: 1, pageSize: 100, statusFilter: 'all' });
      setRepairs(result.repairs);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadRepairs(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadRepairs]);

  const handleSelect = useCallback(async (r: RepairListItem) => {
    setSelectedKey(r.repairKey);
    setDetailLoading(true);
    try {
      const d = await getRepairDetail(r.repairKey);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
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
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)' }}>Repairs</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{repairs.length} records</span>
        </div>
        <RepairsList
          repairs={repairs}
          loading={listLoading}
          selectedKey={selectedKey}
          search={search}
          onSearchChange={setSearch}
          onSelect={handleSelect}
        />
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflow: 'auto', background: '#fff' }}>
        <RepairDetailPane detail={detail} loading={detailLoading} />
      </div>
    </div>
  );
};
