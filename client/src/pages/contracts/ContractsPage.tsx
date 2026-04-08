import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { getContracts, getContract, getContractStats } from '../../api/contracts';
import { ContractsList } from './ContractsList';
import { ContractDetailPane } from './ContractDetailPane';
import type { ContractListItem, ContractDetail, ContractStats } from './types';
import { ExportButton } from '../../components/common/ExportButton';

const CONTRACT_EXPORT_COLS = [
  { key: 'name', label: 'Client' },
  { key: 'contractNumber', label: 'Contract #' },
  { key: 'effectiveDate', label: 'Effective Date' },
  { key: 'terminationDate', label: 'Termination Date' },
  { key: 'totalAmount', label: 'Total Amount' },
  { key: 'amtInvoiced', label: 'Invoiced' },
  { key: 'scopeCount', label: 'Scopes' },
  { key: 'status', label: 'Status' },
];

export const ContractsPage = () => {
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [detail, setDetail] = useState<ContractDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const loadContracts = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const result = await getContracts({ search: s, pageSize: 200 });
      setContracts(result.contracts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getContractStats().then(setStats).catch(() => { message.error('Failed to load contract stats'); });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadContracts(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadContracts]);

  const handleSelect = useCallback(async (c: ContractListItem) => {
    setSelectedKey(c.contractKey);
    setDetailLoading(true);
    try {
      const d = await getContract(c.contractKey);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Left list panel */}
      <aside aria-label="Contract list" style={{
        width: collapsed ? 0 : 320,
        flexShrink: 0,
        borderRight: collapsed ? 'none' : '1px solid var(--neutral-200)',
        background: 'var(--card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        willChange: 'width',
      }}>
        {!collapsed && (
          <>
            <div style={{
              padding: '6px 12px',
              borderBottom: '1px solid var(--neutral-200)',
              background: 'var(--neutral-50)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--navy)', margin: 0 }}>
                Contracts
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--muted)' }} aria-live="polite">{contracts.length} records</span>
                <ExportButton data={contracts as unknown as Record<string, unknown>[]} columns={CONTRACT_EXPORT_COLS} filename="contracts-export" sheetName="Contracts" />
                <button
                  onClick={() => setCollapsed(true)}
                  title="Collapse list"
                  style={{
                    width: 20, height: 20, borderRadius: 4, border: '1px solid var(--border-dk)',
                    background: 'var(--card)', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', fontSize: 11,
                  }}
                >
                  ◀
                </button>
              </div>
            </div>
            <ContractsList
              contracts={contracts}
              loading={loading}
              selectedKey={selectedKey}
              search={search}
              onSearchChange={setSearch}
              onSelect={handleSelect}
            />
          </>
        )}
      </aside>

      {/* Right detail panel */}
      <section aria-label="Contract details" style={{ flex: 1, overflow: 'auto', background: 'var(--card)', position: 'relative' }}>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Show contract list"
            style={{
              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
              zIndex: 10, width: 20, height: 48, background: 'var(--navy)', color: 'var(--card)',
              border: 'none', borderRadius: '0 6px 6px 0', cursor: 'pointer',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '2px 0 8px rgba(0,0,0,0.12)',
            }}
          >
            ▶
          </button>
        )}
        <ContractDetailPane detail={detail} loading={detailLoading} stats={stats} />
      </section>
    </div>
  );
};
