import { useState, useEffect, useCallback } from 'react';
import { Input, Spin, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getAcquisitions, getAcquisitionsSold, getAcquisitionStats, getAcquisitionDetail } from '../../api/acquisitions';
import { TabBar, Field, FormGrid, StatusBadge } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import type { AcquisitionListItem, AcquisitionSoldItem, AcquisitionStats, AcquisitionDetail } from './types';

/* ── Stat Chip ───────────────────────────────────────────────── */
interface StatChipProps {
  label: string; value: string | number; iconBg: string; iconColor: string; valueColor: string;
  active: boolean; onClick: () => void; icon: React.ReactNode;
}
const StatChip = ({ label, value, iconBg, iconColor, valueColor, active, onClick, icon }: StatChipProps) => (
  <div
    onClick={onClick}
    style={{
      flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 8, transition: 'background 0.12s, outline-color 0.12s',
      background: active ? 'var(--primary-light)' : 'var(--card)',
      outline: active ? '2.5px solid var(--navy)' : '2.5px solid transparent', outlineOffset: -2,
    }}
  >
    <span style={{ ...statChipIconStyle, background: iconBg, color: iconColor }}>
      {icon}
    </span>
    <span style={statChipTextColStyle}>
      <span style={{ fontSize: 18, fontWeight: 800, color: valueColor, lineHeight: 1.2 }}>{value}</span>
      <span style={statChipLabelStyle}>{label}</span>
    </span>
  </div>
);

/* ── SVG Icons ───────────────────────────────────────────────── */
const IconInHouse = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
const IconConsigned = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><polyline points="1 3 1 7 5 7" /><path d="M2.5 10A5.5 5.5 0 1 0 4 4.5L1 7" /></svg>;
const IconSold = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><polyline points="12 5 7 11 4 8" /></svg>;
const IconDollar = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><line x1="8" y1="1.5" x2="8" y2="14.5" /><path d="M11 4.5H6.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H5" /></svg>;

const fmtCurrency = (n: number) => n > 0 ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0';

// ── Extracted static styles ──
const statChipIconStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const statChipTextColStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const statChipLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
const acqStatStripStyle: React.CSSProperties = { display: 'flex', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 };
const acqDetailContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const acqDetailHeaderStyle: React.CSSProperties = {
  background: 'var(--navy)', padding: '12px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
};
const acqDetailHeaderLeftStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };
const acqDetailTitleStyle: React.CSSProperties = { fontWeight: 700, color: 'var(--card)', fontSize: 14 };
const acqDetailCloseBtnStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '2px 6px' };
const acqDetailBodyStyle: React.CSSProperties = { flex: 1, overflow: 'auto', padding: '16px 20px' };
const acqCenterSpinStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 };
const acqNoDetailStyle: React.CSSProperties = { padding: 40, textAlign: 'center', color: 'var(--muted)' };
const acqCostBannerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: '12px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 16 };
const acqCostValueStyle: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: 'var(--navy)' };
const acqCostLabelStyle: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const acqCommentsLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 };
const acqCommentBoxStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text)', background: 'var(--neutral-50)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)' };
const acqPageContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' };
const acqSplitPaneStyle: React.CSSProperties = { flex: 1, overflow: 'hidden', display: 'flex' };
const acqDetailPaneStyle: React.CSSProperties = { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--card)' };
const acqListContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const acqListHeaderStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 };
const acqListTitleRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const acqListTitleLeftStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const acqListTitleTextStyle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: 'var(--navy)' };
const acqListCountBadgeStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)' };
const acqSearchIconStyle: React.CSSProperties = { color: 'var(--muted)', fontSize: 12 };
const acqSearchInputStyle: React.CSSProperties = { height: 28, fontSize: 11 };
const acqListBodyStyle: React.CSSProperties = { flex: 1, overflow: 'auto' };
const acqLoadingStyle: React.CSSProperties = { padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 };
const acqRowSerialStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.2 };
const acqRowModelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 1 };
const acqRowBottomStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 10, color: 'var(--muted)' };
const acqPaginationStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderTop: '1px solid var(--border)', background: 'var(--neutral-50)', flexShrink: 0 };
const acqPagCountStyle: React.CSSProperties = { fontSize: 10, color: 'var(--muted)' };
const acqPagBtnsStyle: React.CSSProperties = { display: 'flex', gap: 3 };

const TABS: TabDef[] = [
  { key: 'inhouse', label: 'In-House' },
  { key: 'consigned', label: 'Consigned' },
  { key: 'sold', label: 'Sold' },
];

/* ── Acquisition Detail Panel (inline) ───────────────────────── */
const AcquisitionDetailPanel = ({ detail, loading, onClose }: { detail: AcquisitionDetail | null; loading: boolean; onClose: () => void }) => {
  const fmt$ = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, color: 'var(--card)', fontSize: 14 }}>
            {detail?.serial || 'Acquisition Detail'}
          </span>
          {detail && <StatusBadge status={detail.isSold ? 'Sold' : 'In-House'} />}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}
        >
          &times;
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
        ) : !detail ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No detail available</div>
        ) : (
          <>
            {/* Cost banner */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)' }}>{fmt$(detail.cost)}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Acquisition Cost</div>
              </div>
            </div>
            <FormGrid cols={2}>
              <Field label="Serial #" value={detail.serial} />
              <Field label="Type" value={detail.flexOrRigid || '\u2014'} />
              <Field label="Scope Model" value={detail.scopeType} />
              <Field label="Manufacturer" value={detail.manufacturer || '\u2014'} />
              <Field label="Client" value={detail.client || '\u2014'} />
              <Field label="Department" value={detail.dept || '\u2014'} />
              <Field label="Supplier" value={detail.supplier || '\u2014'} />
              <Field label="PO Number" value={detail.poNumber || '\u2014'} />
              <Field label="PO Date" value={detail.poDate || '\u2014'} />
              <Field label="Date Received" value={detail.dateReceived || '\u2014'} />
            </FormGrid>
            {detail.comment && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Comments</div>
                <div style={{ fontSize: 12, color: 'var(--text)', background: 'var(--neutral-50)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)' }}>
                  {detail.comment}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════ */
/*  ACQUISITIONS PAGE                                           */
/* ═════════════════════════════════════════════════════════════ */
export const AcquisitionsPage = () => {
  const [activeTab, setActiveTab] = useState('inhouse');
  const [stats, setStats] = useState<AcquisitionStats | null>(null);

  // In-House state
  const [inHouseItems, setInHouseItems] = useState<AcquisitionListItem[]>([]);
  const [inHouseTotal, setInHouseTotal] = useState(0);
  const [inHouseSearch, setInHouseSearch] = useState('');
  const [inHousePage, setInHousePage] = useState(1);
  const [inHouseLoading, setInHouseLoading] = useState(true);

  // Consigned state
  const [consignedItems, setConsignedItems] = useState<AcquisitionListItem[]>([]);
  const [consignedTotal, setConsignedTotal] = useState(0);
  const [consignedSearch, setConsignedSearch] = useState('');
  const [consignedPage, setConsignedPage] = useState(1);
  const [consignedLoading, setConsignedLoading] = useState(true);

  // Sold state
  const [soldItems, setSoldItems] = useState<AcquisitionSoldItem[]>([]);
  const [soldTotal, setSoldTotal] = useState(0);
  const [soldSearch, setSoldSearch] = useState('');
  const [soldPage, setSoldPage] = useState(1);
  const [soldLoading, setSoldLoading] = useState(true);

  const pageSize = 50;

  // Inline detail state
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [detail, setDetail] = useState<AcquisitionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleRowClick = async (scopeKey: number) => {
    setSelectedKey(scopeKey);
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await getAcquisitionDetail(scopeKey);
      setDetail(d);
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedKey(null);
    setDetail(null);
  };

  useEffect(() => { let cancelled = false; getAcquisitionStats().then(d => { if (!cancelled) setStats(d); }).catch(() => { if (!cancelled) message.error('Failed to load acquisition stats'); }); return () => { cancelled = true; }; }, []);

  const loadInHouse = useCallback(async (s: string, p: number) => {
    setInHouseLoading(true);
    try {
      const r = await getAcquisitions({ search: s, page: p, pageSize, tab: 'inhouse' });
      setInHouseItems(r.items); setInHouseTotal(r.totalCount);
    } finally { setInHouseLoading(false); }
  }, []);

  const loadConsigned = useCallback(async (s: string, p: number) => {
    setConsignedLoading(true);
    try {
      const r = await getAcquisitions({ search: s, page: p, pageSize, tab: 'consigned' });
      setConsignedItems(r.items); setConsignedTotal(r.totalCount);
    } finally { setConsignedLoading(false); }
  }, []);

  const loadSold = useCallback(async (s: string, p: number) => {
    setSoldLoading(true);
    try {
      const r = await getAcquisitionsSold({ search: s, page: p, pageSize, tab: 'sold' });
      setSoldItems(r.items); setSoldTotal(r.totalCount);
    } finally { setSoldLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => loadInHouse(inHouseSearch, inHousePage), inHouseSearch ? 300 : 0); return () => clearTimeout(t); }, [inHouseSearch, inHousePage, loadInHouse]);
  useEffect(() => { const t = setTimeout(() => loadConsigned(consignedSearch, consignedPage), consignedSearch ? 300 : 0); return () => clearTimeout(t); }, [consignedSearch, consignedPage, loadConsigned]);
  useEffect(() => { const t = setTimeout(() => loadSold(soldSearch, soldPage), soldSearch ? 300 : 0); return () => clearTimeout(t); }, [soldSearch, soldPage, loadSold]);

  /* ── Stat Strip ──────────────────────────────────────────── */
  const statStrip = (
    <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 }}>
      <StatChip label="In-House" value={stats?.inHouse ?? 0} iconBg="rgba(var(--primary-rgb), 0.10)" iconColor="var(--primary)" valueColor="var(--navy)" active={activeTab === 'inhouse'} onClick={() => setActiveTab('inhouse')} icon={<IconInHouse />} />
      <StatChip label="Consigned" value={stats?.consigned ?? 0} iconBg="rgba(var(--amber-rgb), 0.10)" iconColor="var(--amber)" valueColor="var(--amber)" active={activeTab === 'consigned'} onClick={() => setActiveTab('consigned')} icon={<IconConsigned />} />
      <StatChip label="Sold" value={stats?.sold ?? 0} iconBg="rgba(var(--success-rgb), 0.10)" iconColor="var(--success)" valueColor="var(--success)" active={activeTab === 'sold'} onClick={() => setActiveTab('sold')} icon={<IconSold />} />
      <StatChip label="In-House Value" value={fmtCurrency(stats?.inHouseValue ?? 0)} iconBg="rgba(var(--navy-rgb), 0.10)" iconColor="var(--navy)" valueColor="var(--navy)" active={false} onClick={() => setActiveTab('inhouse')} icon={<IconDollar />} />
      <StatChip label="Sold Revenue" value={fmtCurrency(stats?.soldRevenue ?? 0)} iconBg="rgba(var(--success-rgb), 0.10)" iconColor="var(--success)" valueColor="var(--success)" active={false} onClick={() => setActiveTab('sold')} icon={<IconDollar />} />
    </div>
  );

  /* ── Render list rows ────────────────────────────────────── */
  const renderAcqList = (
    items: AcquisitionListItem[],
    loading: boolean,
    total: number,
    searchVal: string,
    onSearch: (s: string) => void,
    currentPage: number,
    onPage: (p: number) => void,
    tabLabel: string,
  ) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* List header */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>{tabLabel} Acquisitions</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)' }}>{total}</span>
            </div>
          </div>
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
            placeholder="Search serial, model, client..."
            aria-label="Search acquisitions"
            value={searchVal}
            onChange={e => { onSearch(e.target.value); onPage(1); }}
            allowClear
            style={{ height: 28, fontSize: 11 }}
          />
        </div>

        {/* List rows */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading...</div>}
          {!loading && items.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No records found</div>}
          {items.map(item => (
            <div
              key={item.scopeKey}
              onClick={() => handleRowClick(item.scopeKey)}
              style={{
                padding: '9px 12px',
                borderBottom: '1px solid var(--neutral-100)',
                cursor: 'pointer',
                background: item.scopeKey === selectedKey ? 'var(--primary-light)' : 'var(--card)',
                borderLeft: item.scopeKey === selectedKey ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (item.scopeKey !== selectedKey) e.currentTarget.style.background = 'var(--neutral-50)'; }}
              onMouseLeave={e => { if (item.scopeKey !== selectedKey) e.currentTarget.style.background = 'var(--card)'; }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.2 }}>{item.serial || '\u2014'}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{item.scopeType || '\u2014'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 10, color: 'var(--muted)' }}>
                <span>{item.client || '\u2014'}</span>
                <span>{item.dateAcquired || '\u2014'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderTop: '1px solid var(--border)', background: 'var(--neutral-50)', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{items.length} of {total}</span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 3 }}>
              <PgBtn disabled={currentPage <= 1} onClick={() => onPage(currentPage - 1)}>{'\u2039'}</PgBtn>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                const p = start + i;
                return p <= totalPages ? <PgBtn key={p} active={p === currentPage} onClick={() => onPage(p)}>{p}</PgBtn> : null;
              })}
              <PgBtn disabled={currentPage >= totalPages} onClick={() => onPage(currentPage + 1)}>{'\u203A'}</PgBtn>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Sold List ───────────────────────────────────────────── */
  const soldTotalPages = Math.max(1, Math.ceil(soldTotal / pageSize));
  const renderSoldList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--navy)' }}>Sold Acquisitions</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)' }}>{soldTotal}</span>
        </div>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
          placeholder="Search serial, model, buyer..."
          aria-label="Search sold acquisitions"
          value={soldSearch}
          onChange={e => { setSoldSearch(e.target.value); setSoldPage(1); }}
          allowClear
          style={{ height: 28, fontSize: 11 }}
        />
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {soldLoading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading...</div>}
        {!soldLoading && soldItems.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No records found</div>}
        {soldItems.map(item => (
          <div
            key={item.scopeKey}
            onClick={() => handleRowClick(item.scopeKey)}
            style={{
              padding: '9px 12px',
              borderBottom: '1px solid var(--neutral-100)',
              cursor: 'pointer',
              background: item.scopeKey === selectedKey ? 'var(--primary-light)' : 'var(--card)',
              borderLeft: item.scopeKey === selectedKey ? '3px solid var(--primary)' : '3px solid transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (item.scopeKey !== selectedKey) e.currentTarget.style.background = 'var(--neutral-50)'; }}
            onMouseLeave={e => { if (item.scopeKey !== selectedKey) e.currentTarget.style.background = 'var(--card)'; }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.2 }}>{item.serial || '\u2014'}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{item.scopeType || '\u2014'}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 10, color: 'var(--muted)' }}>
              <span>{item.client || '\u2014'}</span>
              <span>{item.saleDate || '\u2014'}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderTop: '1px solid var(--border)', background: 'var(--neutral-50)', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{soldItems.length} of {soldTotal}</span>
        {soldTotalPages > 1 && (
          <div style={{ display: 'flex', gap: 3 }}>
            <PgBtn disabled={soldPage <= 1} onClick={() => setSoldPage(p => p - 1)}>{'\u2039'}</PgBtn>
            {Array.from({ length: Math.min(5, soldTotalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(soldPage - 2, soldTotalPages - 4));
              const p = start + i;
              return p <= soldTotalPages ? <PgBtn key={p} active={p === soldPage} onClick={() => setSoldPage(p)}>{p}</PgBtn> : null;
            })}
            <PgBtn disabled={soldPage >= soldTotalPages} onClick={() => setSoldPage(p => p + 1)}>{'\u203A'}</PgBtn>
          </div>
        )}
      </div>
    </div>
  );

  /* ── Active list content ─────────────────────────────────── */
  const listContent = activeTab === 'inhouse'
    ? renderAcqList(inHouseItems, inHouseLoading, inHouseTotal, inHouseSearch, setInHouseSearch, inHousePage, setInHousePage, 'In-House')
    : activeTab === 'consigned'
    ? renderAcqList(consignedItems, consignedLoading, consignedTotal, consignedSearch, setConsignedSearch, consignedPage, setConsignedPage, 'Consigned')
    : renderSoldList();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {statStrip}
      <TabBar tabs={TABS} activeKey={activeTab} onChange={tab => { setActiveTab(tab); handleCloseDetail(); }} />

      {/* Split pane */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Left panel — list */}
        <div style={{
          width: selectedKey ? 340 : '100%',
          minWidth: selectedKey ? 340 : undefined,
          borderRight: selectedKey ? '1px solid var(--neutral-200)' : undefined,
          display: 'flex', flexDirection: 'column',
          background: 'var(--card)',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
        }}>
          {listContent}
        </div>

        {/* Right panel — detail */}
        {selectedKey && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--card)' }}>
            <AcquisitionDetailPanel
              detail={detail}
              loading={detailLoading}
              onClose={handleCloseDetail}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Shared ───────────────────────────────────────────────── */
const PgBtn = ({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) => (
  <button disabled={disabled} onClick={onClick} style={{
    height: 22, minWidth: 22, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, fontSize: 10, fontFamily: 'inherit',
    cursor: disabled ? 'default' : 'pointer', fontWeight: active ? 600 : 400,
    background: active ? 'var(--navy)' : 'var(--card)', color: active ? 'var(--card)' : 'var(--muted)', opacity: disabled ? 0.4 : 1,
  }}>{children}</button>
);
