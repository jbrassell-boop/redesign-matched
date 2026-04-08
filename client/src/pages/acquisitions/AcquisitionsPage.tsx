import { useState, useEffect, useCallback } from 'react';
import { Input, Spin, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getAcquisitions, getAcquisitionsSold, getAcquisitionStats, getAcquisitionDetail } from '../../api/acquisitions';
import { TabBar, Field, FormGrid, StatusBadge } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import type { AcquisitionListItem, AcquisitionSoldItem, AcquisitionStats, AcquisitionDetail } from './types';
import { StatStrip } from '../../components/shared/StatStrip';



const fmtCurrency = (n: number) => n > 0 ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0';

// ── Extracted static styles ──
const acqDetailContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const acqDetailHeaderStyle: React.CSSProperties = {
  background: 'var(--navy)', padding: '12px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
};
const acqDetailHeaderLeftStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };
const acqDetailTitleStyle: React.CSSProperties = { fontWeight: 700, color: 'var(--card)', fontSize: 14, margin: 0 };
const acqDetailCloseBtnStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '2px 6px' };
const acqDetailBodyStyle: React.CSSProperties = { flex: 1, overflow: 'auto', padding: '16px 20px' };
const acqCenterSpinStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 };
const acqNoDetailStyle: React.CSSProperties = { padding: 40, textAlign: 'center', color: 'var(--muted)' };
const acqCostBannerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: '12px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 16 };
const acqCostValueStyle: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: 'var(--navy)' };
const acqCostLabelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const acqCommentsLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 };
const acqCommentBoxStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text)', background: 'var(--neutral-50)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)' };
const acqPageContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' };
const acqSplitPaneStyle: React.CSSProperties = { flex: 1, overflow: 'hidden', display: 'flex' };
const acqDetailPaneStyle: React.CSSProperties = { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--card)' };
const acqListContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const acqListHeaderStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 };
const acqListTitleRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const acqListTitleLeftStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };
const acqListTitleTextStyle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: 'var(--navy)' };
const acqListCountBadgeStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)' };
const acqSearchIconStyle: React.CSSProperties = { color: 'var(--muted)', fontSize: 12 };
const acqSearchInputStyle: React.CSSProperties = { height: 28, fontSize: 11 };
const acqListBodyStyle: React.CSSProperties = { flex: 1, overflow: 'auto' };
const acqLoadingStyle: React.CSSProperties = { padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 };
const acqRowSerialStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.2 };
const acqRowModelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', marginTop: 1 };
const acqRowBottomStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 11, color: 'var(--muted)' };
const acqPaginationStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderTop: '1px solid var(--border)', background: 'var(--neutral-50)', flexShrink: 0 };
const acqPagCountStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' };
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
    <div style={acqDetailContainerStyle}>
      {/* Header */}
      <div style={acqDetailHeaderStyle}>
        <div style={acqDetailHeaderLeftStyle}>
          <h2 style={acqDetailTitleStyle}>
            {detail?.serial || 'Acquisition Detail'}
          </h2>
          {detail && <StatusBadge status={detail.isSold ? 'Sold' : 'In-House'} />}
        </div>
        <button onClick={onClose} style={acqDetailCloseBtnStyle}>
          &times;
        </button>
      </div>

      {/* Body */}
      <div style={acqDetailBodyStyle}>
        {loading ? (
          <div style={acqCenterSpinStyle}><Spin /></div>
        ) : !detail ? (
          <div style={acqNoDetailStyle}>No detail available</div>
        ) : (
          <>
            {/* Cost banner */}
            <div style={acqCostBannerStyle}>
              <div style={{ textAlign: 'center' }}>
                <div style={acqCostValueStyle}>{fmt$(detail.cost)}</div>
                <div style={acqCostLabelStyle}>Acquisition Cost</div>
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
                <div style={acqCommentsLabelStyle}>Comments</div>
                <div style={acqCommentBoxStyle}>
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

  /* ── Stat Strip ──────────────────────────────────────── */
  const statStrip = (
    <StatStrip
      chips={[
        { id: 'inhouse',      label: 'In-House',       value: stats?.inHouse ?? 0,                   color: 'blue'  },
        { id: 'consigned',    label: 'Consigned',      value: stats?.consigned ?? 0,                 color: 'amber' },
        { id: 'sold',         label: 'Sold',           value: stats?.sold ?? 0,                      color: 'green' },
        { id: 'inHouseValue', label: 'In-House Value', value: fmtCurrency(stats?.inHouseValue ?? 0), color: 'navy'  },
        { id: 'soldRevenue',  label: 'Sold Revenue',   value: fmtCurrency(stats?.soldRevenue ?? 0),  color: 'green' },
      ]}
      activeChip={activeTab}
      onChipClick={(id) => {
        if (id === 'inhouse' || id === 'consigned' || id === 'sold') setActiveTab(id);
      }}
    />
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
      <div style={acqListContainerStyle}>
        {/* List header */}
        <div style={acqListHeaderStyle}>
          <div style={acqListTitleRowStyle}>
            <div style={acqListTitleLeftStyle}>
              <span style={acqListTitleTextStyle}>{tabLabel} Acquisitions</span>
              <span style={acqListCountBadgeStyle}>{total}</span>
            </div>
          </div>
          <Input
            prefix={<SearchOutlined style={acqSearchIconStyle} />}
            placeholder="Search serial, model, client..."
            aria-label="Search acquisitions"
            value={searchVal}
            onChange={e => { onSearch(e.target.value); onPage(1); }}
            allowClear
            style={acqSearchInputStyle}
          />
        </div>

        {/* List rows */}
        <div style={acqListBodyStyle}>
          {loading && <div style={acqLoadingStyle}>Loading...</div>}
          {!loading && items.length === 0 && <div style={acqLoadingStyle}>No records found</div>}
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
              className={item.scopeKey === selectedKey ? 'selected' : 'hover-row'}
            >
              <div style={acqRowSerialStyle}>{item.serial || '\u2014'}</div>
              <div style={acqRowModelStyle}>{item.scopeType || '\u2014'}</div>
              <div style={acqRowBottomStyle}>
                <span>{item.client || '\u2014'}</span>
                <span>{item.dateAcquired || '\u2014'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div style={acqPaginationStyle}>
          <span style={acqPagCountStyle}>{items.length} of {total}</span>
          {totalPages > 1 && (
            <div style={acqPagBtnsStyle}>
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
    <div style={acqListContainerStyle}>
      <div style={acqListHeaderStyle}>
        <div style={acqListTitleLeftStyle}>
          <span style={acqListTitleTextStyle}>Sold Acquisitions</span>
          <span style={acqListCountBadgeStyle}>{soldTotal}</span>
        </div>
        <Input
          prefix={<SearchOutlined style={acqSearchIconStyle} />}
          placeholder="Search serial, model, buyer..."
          aria-label="Search sold acquisitions"
          value={soldSearch}
          onChange={e => { setSoldSearch(e.target.value); setSoldPage(1); }}
          allowClear
          style={acqSearchInputStyle}
        />
      </div>
      <div style={acqListBodyStyle}>
        {soldLoading && <div style={acqLoadingStyle}>Loading...</div>}
        {!soldLoading && soldItems.length === 0 && <div style={acqLoadingStyle}>No records found</div>}
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
            className={item.scopeKey === selectedKey ? 'selected' : 'hover-row'}
          >
            <div style={acqRowSerialStyle}>{item.serial || '\u2014'}</div>
            <div style={acqRowModelStyle}>{item.scopeType || '\u2014'}</div>
            <div style={acqRowBottomStyle}>
              <span>{item.client || '\u2014'}</span>
              <span>{item.saleDate || '\u2014'}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={acqPaginationStyle}>
        <span style={acqPagCountStyle}>{soldItems.length} of {soldTotal}</span>
        {soldTotalPages > 1 && (
          <div style={acqPagBtnsStyle}>
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
    <div style={acqPageContainerStyle}>
      {statStrip}
      <TabBar tabs={TABS} activeKey={activeTab} onChange={tab => { setActiveTab(tab); handleCloseDetail(); }} />

      {/* Split pane */}
      <div style={acqSplitPaneStyle}>
        {/* Left panel — list */}
        <aside aria-label="Acquisition list" style={{
          width: selectedKey ? 340 : '100%',
          minWidth: selectedKey ? 340 : undefined,
          borderRight: selectedKey ? '1px solid var(--neutral-200)' : undefined,
          display: 'flex', flexDirection: 'column',
          background: 'var(--card)',
          transition: 'width 0.2s ease',
          willChange: 'width',
          overflow: 'hidden',
        }}>
          {listContent}
        </aside>

        {/* Right panel — detail */}
        {selectedKey && (
          <section aria-label="Acquisition details" style={acqDetailPaneStyle}>
            <AcquisitionDetailPanel
              detail={detail}
              loading={detailLoading}
              onClose={handleCloseDetail}
            />
          </section>
        )}
      </div>
    </div>
  );
};

/* ── Shared ───────────────────────────────────────────────── */
const PgBtn = ({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) => (
  <button disabled={disabled} onClick={onClick} style={{
    height: 36, minWidth: 36, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, fontSize: 11, fontFamily: 'inherit',
    cursor: disabled ? 'default' : 'pointer', fontWeight: active ? 600 : 400,
    background: active ? 'var(--navy)' : 'var(--card)', color: active ? 'var(--card)' : 'var(--muted)', opacity: disabled ? 0.4 : 1,
  }}>{children}</button>
);
