import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRepairs } from '../../api/repairs';
import { RepairsList } from './RepairsList';
import { RepairDetailPane } from './RepairDetailPane';
import { NewRepairModal } from './components/NewRepairModal';
import type { RepairListItem } from './types';
import { ExportButton } from '../../components/common/ExportButton';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';

const REPAIR_EXPORT_COLS = [
  { key: 'wo', label: 'Work Order' },
  { key: 'dateIn', label: 'Date In' },
  { key: 'client', label: 'Client' },
  { key: 'dept', label: 'Department' },
  { key: 'scopeType', label: 'Scope Type' },
  { key: 'serial', label: 'Serial #' },
  { key: 'daysIn', label: 'TAT' },
  { key: 'status', label: 'Status' },
];

export const RepairsPage = () => {
  const { repairKey: repairKeyParam } = useParams<{ repairKey: string }>();
  const cockpitKey = repairKeyParam ? parseInt(repairKeyParam, 10) : null;

  // Cockpit mode — full page repair view
  if (cockpitKey) {
    return (
      <RepairDetailPane
        cockpitMode
        repairKey={cockpitKey}
        onStatusChanged={() => {}}
      />
    );
  }

  // List mode — full-width, click goes to cockpit
  return <RepairsListView />;
};

const RepairsListView = () => {
  const navigate = useNavigate();
  const [repairs, setRepairs] = useState<RepairListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);

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

  // Single click → cockpit
  const handleSelect = useCallback((r: RepairListItem) => {
    setSelectedKey(r.repairKey);
    navigate(`/repairs/${r.repairKey}`);
  }, [navigate]);

  const selectedIndex = useMemo(
    () => repairs.findIndex(r => r.repairKey === selectedKey),
    [repairs, selectedKey],
  );

  useKeyboardNav(repairs, selectedIndex, handleSelect);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: 'var(--card)' }}>
      {/* Toolbar */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>Repairs</h1>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{repairs.length} records</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <ExportButton data={repairs as unknown as Record<string, unknown>[]} columns={REPAIR_EXPORT_COLS} filename="repairs-export" sheetName="Repairs" />
          <button
            onClick={() => setNewModalOpen(true)}
            style={{
              height: 28, padding: '0 12px', fontSize: 11, fontWeight: 700,
              background: 'var(--primary)', color: 'var(--card)', border: 'none',
              borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            + New Repair
          </button>
        </div>
      </div>
      <NewRepairModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreated={() => loadRepairs(search)}
      />

      {/* Full-width list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <RepairsList
          repairs={repairs}
          loading={listLoading}
          selectedKey={selectedKey}
          search={search}
          onSearchChange={setSearch}
          onSelect={handleSelect}
          onDoubleClick={handleSelect}
        />
      </div>
    </div>
  );
};
