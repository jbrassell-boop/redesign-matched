import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import { getPendingContracts, getPendingContract } from '../../api/pendingContracts';
import { PendingContractsList } from './PendingContractsList';
import { PendingContractDetailPane } from './PendingContractDetailPane';
import { NewPendingContractModal } from './NewPendingContractModal';
import { ConvertDialog } from './ConvertDialog';
import type { PendingContractListItem, PendingContractDetail } from './types';

export const PendingContractsPage = () => {
  const { role } = useAuth();
  const isAdmin = role === 'Admin';

  const [items, setItems] = useState<PendingContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [detail, setDetail] = useState<PendingContractDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [showNew, setShowNew] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  // Live scope counts surfaced by the detail pane's Scopes tab, fed to Convert.
  const scopeCountsRef = useRef({ total: 0, modelOnly: 0 });
  const [convertCounts, setConvertCounts] = useState({ total: 0, modelOnly: 0 });

  const loadList = useCallback(async (s: string, inactive: boolean) => {
    setLoading(true);
    try {
      const res = await getPendingContracts({ search: s, includeInactive: inactive, pageSize: 200 });
      setItems(res.items);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to load pending contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadList(search, includeInactive), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, includeInactive, loadList]);

  const loadDetail = useCallback(async (key: number) => {
    setDetailLoading(true);
    try {
      const d = await getPendingContract(key);
      setDetail(d);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to load pending contract');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleSelect = useCallback((c: PendingContractListItem) => {
    setSelectedKey(c.pendingContractKey);
    loadDetail(c.pendingContractKey);
  }, [loadDetail]);

  const handleCreated = useCallback((newKey: number) => {
    loadList(search, includeInactive);
    setSelectedKey(newKey);
    loadDetail(newKey);
  }, [loadList, search, includeInactive, loadDetail]);

  const handleScopeCounts = useCallback((total: number, modelOnly: number) => {
    scopeCountsRef.current = { total, modelOnly };
  }, []);

  const handleOpenConvert = useCallback((total: number, modelOnly: number) => {
    setConvertCounts({ total, modelOnly });
    setShowConvert(true);
  }, []);

  const handleConverted = useCallback(() => {
    // After a successful convert the deal moves out of the live list.
    loadList(search, includeInactive);
    setSelectedKey(null);
    setDetail(null);
  }, [loadList, search, includeInactive]);

  const handleDeleted = useCallback(() => {
    loadList(search, includeInactive);
    setSelectedKey(null);
    setDetail(null);
  }, [loadList, search, includeInactive]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Left list panel */}
      <aside aria-label="Pending contract list" style={{
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
              <h2 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--navy)', margin: 0 }}>
                Pending Contracts
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setShowNew(true)}
                  title="New pending contract"
                  style={{ height: 22, padding: '0 8px', fontSize: 11, fontWeight: 700, background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                >
                  + New
                </button>
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
            {/* Active / All filter */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--neutral-200)', background: 'var(--neutral-50)' }}>
              {[{ v: false, label: 'Active' }, { v: true, label: 'All (incl. Dead)' }].map((opt, i, arr) => (
                <button
                  key={String(opt.v)}
                  onClick={() => setIncludeInactive(opt.v)}
                  style={{
                    flex: 1, padding: '5px 4px', fontSize: 11,
                    fontWeight: includeInactive === opt.v ? 700 : 500,
                    color: includeInactive === opt.v ? 'var(--navy)' : 'var(--muted)',
                    background: includeInactive === opt.v ? 'var(--primary-light)' : 'transparent',
                    border: 'none',
                    borderRight: i < arr.length - 1 ? '1px solid var(--neutral-200)' : 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <PendingContractsList
              items={items}
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
      <section aria-label="Pending contract details" style={{ flex: 1, overflow: 'auto', background: 'var(--card)', position: 'relative' }}>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Show list"
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
        <PendingContractDetailPane
          detail={detail}
          loading={detailLoading}
          isAdmin={isAdmin}
          onConvert={handleOpenConvert}
          onDeleted={handleDeleted}
          onScopeCountsChange={handleScopeCounts}
        />
      </section>

      <NewPendingContractModal open={showNew} onClose={() => setShowNew(false)} onCreated={handleCreated} />
      <ConvertDialog
        open={showConvert}
        detail={detail}
        scopeCount={convertCounts.total}
        modelOnlyCount={convertCounts.modelOnly}
        onClose={() => setShowConvert(false)}
        onConverted={handleConverted}
      />
    </div>
  );
};
