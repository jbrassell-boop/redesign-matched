import { useState, useEffect, useMemo, useCallback } from 'react';
import { Spin } from 'antd';
import { QUOTES, CATALOG, MODELS, SALES_REPS, CATALOG_CATEGORIES } from './endoCartData';
import { getEndoCartScopeInventory, getEndoCartServiceHistory } from '../../api/endocarts';
import type { EndoCartFilters, CatalogPart, CartModel, EndoCartScopeItem, EndoCartServiceHistoryItem } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';
import { StatStrip } from '../../components/shared/StatStrip';
import './EndoCartsPage.css';

/* ── helpers ─────────────────────────────────────────────────── */
const fmtMoney = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoneyShort = (n: number) =>
  Math.abs(n) >= 1000 ? '$' + (n / 1000).toFixed(1) + 'K' : '$' + Math.round(n).toLocaleString();
const fmtDate = (d: string) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`;
};

const CAT_BADGE: Record<string, { bg: string; border: string; color: string }> = {
  'Cart Frame': { bg: 'var(--primary-light)', border: 'var(--border-dk)', color: 'var(--primary)' },
  Monitor:      { bg: 'var(--neutral-100)', border: 'var(--border-dk)', color: 'var(--navy)' },
  Accessory:    { bg: 'rgba(var(--success-rgb), 0.1)', border: '1px solid rgba(var(--success-rgb), 0.3)', color: 'var(--success)' },
  Power:        { bg: 'rgba(var(--amber-rgb), 0.1)', border: '1px solid rgba(var(--amber-rgb), 0.3)', color: 'var(--warning)' },
  Cabling:      { bg: 'rgba(var(--danger-rgb), 0.1)', border: '1px solid rgba(var(--danger-rgb), 0.3)', color: 'var(--danger)' },
  Storage:      { bg: 'var(--neutral-50)', border: 'var(--border-dk)', color: 'var(--navy)' },
};

const Badge = ({ text, style }: { text: string; style: { bg: string; border: string; color: string } }) => (
  <span className="ec-badge" style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}>{text}</span>
);


/* ── SVG Icons ───────────────────────────────────────────────── */
const IconSearch = () => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ec-icon-13"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
const IconExpand = ({ open }: { open: boolean }) => <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 4 10 8 6 12" /></svg>;

/* ── Segmented Control ───────────────────────────────────────── */
const SegmentedControl = ({ items, value, onChange }: { items: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) => (
  <div className="ec-segmented">
    {items.map(it => (
      <button key={it.value} onClick={() => onChange(it.value)} style={{
        height: 28, padding: '0 12px', border: 'none', fontSize: 11, fontWeight: it.value === value ? 700 : 500, fontFamily: 'inherit', cursor: 'pointer',
        background: it.value === value ? 'var(--navy)' : 'var(--card)', color: it.value === value ? 'var(--card)' : 'var(--muted)',
        borderRight: '1px solid var(--border-dk)', transition: 'all 0.1s',
      }}>{it.label}</button>
    ))}
  </div>
);

/* ── Column Header ───────────────────────────────────────────── */
const ColHeader = ({ label, sortKey, currentSort, currentDir, onSort, style }: {
  label: string; sortKey: string; currentSort: string; currentDir: 'asc' | 'desc'; onSort: (k: string) => void; style?: React.CSSProperties;
}) => (
  <th onClick={() => onSort(sortKey)} style={{
    background: 'var(--neutral-50)', color: 'var(--neutral-500)', fontWeight: 700, padding: '9px 10px', textAlign: 'left',
    textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2,
    cursor: 'pointer', whiteSpace: 'nowrap', borderRight: '1px solid rgba(var(--primary-rgb), 0.15)', borderBottom: '1px solid var(--neutral-200)',
    userSelect: 'none', transition: 'background 0.1s', ...style,
  }}>
    {label}{' '}
    {currentSort === sortKey && <span style={{ fontSize: 11, marginLeft: 3 }}>{currentDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
  </th>
);


const ENDO_TABS: TabDef[] = [
  { key: 'quotes', label: 'Quotes' },
  { key: 'catalog', label: 'Catalog' },
  { key: 'models', label: 'Models' },
  { key: 'scope-inventory', label: 'Scope Inventory' },
  { key: 'service-history', label: 'Service History' },
];

const STATUS_SEGMENTS = [
  { label: 'All', value: '' }, { label: 'Draft', value: 'Draft' }, { label: 'Quoted', value: 'Quoted' },
  { label: 'Approved', value: 'Approved' }, { label: 'Billed', value: 'Billed' }, { label: 'Cancelled', value: 'Cancelled' },
];

/* ── Table Row Style ─────────────────────────────────────────── */
const rowStyle = (idx: number, selected: boolean, detailSelected: boolean): React.CSSProperties => ({
  background: detailSelected ? 'var(--primary-light)' : selected ? 'var(--row-alt)' : idx % 2 === 1 ? 'var(--row-alt)' : 'var(--card)',
  cursor: 'pointer',
  borderLeft: detailSelected ? '3px solid var(--primary)' : '3px solid transparent',
});

/* ── Section Card (for detail pane) ─────────────────────────── */
const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="ec-section-outer">
    <div className="ec-section-head">{title}</div>
    <div className="ec-section-body">{children}</div>
  </div>
);

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */
export const EndoCartsPage = () => {
  const [activeTab, setActiveTab] = useState<'quotes' | 'catalog' | 'models' | 'scope-inventory' | 'service-history'>('quotes');

  /* ── Quotes state ─── */
  const [filters, setFilters] = useState<EndoCartFilters>({ status: '', rep: '', search: '' });
  const [sortCol, setSortCol] = useState('dateCreated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [chipFilter, setChipFilter] = useState('');

  /* ── Catalog state ─── */
  const [catCategory, setCatCategory] = useState('');
  const [catSearch, setCatSearch] = useState('');

  /* ── Models state ─── */
  const [modelSearch, setModelSearch] = useState('');
  const [expandedModel, setExpandedModel] = useState<number | null>(null);

  /* ── Scope Inventory state (API) ─── */
  const [scopeItems, setScopeItems] = useState<EndoCartScopeItem[]>([]);
  const [scopeTotal, setScopeTotal] = useState(0);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeSearch, setScopeSearch] = useState('');
  const [scopeTypeFilter, setScopeTypeFilter] = useState('');
  const [scopePage, setScopePage] = useState(1);

  /* ── Service History state (API) ─── */
  const [serviceItems, setServiceItems] = useState<EndoCartServiceHistoryItem[]>([]);
  const [serviceTotal, setServiceTotal] = useState(0);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [servicePage, setServicePage] = useState(1);

  /* ── Quotes pipeline ─── */
  const filtered = useMemo(() => {
    let arr = [...QUOTES];
    const st = chipFilter || filters.status;
    if (st) arr = arr.filter(q => q.status === st);
    if (filters.rep) arr = arr.filter(q => q.salesRep === filters.rep);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      arr = arr.filter(q => `${q.quoteNum}|${q.clientName}|${q.cartModel}|${q.deptName}|${q.salesRep}`.toLowerCase().includes(s));
    }
    arr.sort((a, b) => {
      const va = (a as any)[sortCol] ?? '';
      const vb = (b as any)[sortCol] ?? '';
      const dir = sortDir === 'asc' ? 1 : -1;
      if (typeof va === 'string') return va.localeCompare(vb) * dir;
      return ((va as number) - (vb as number)) * dir;
    });
    return arr;
  }, [filters, sortCol, sortDir, chipFilter]);

  const stats = useMemo(() => ({
    total: QUOTES.length,
    draft: QUOTES.filter(q => q.status === 'Draft').length,
    quoted: QUOTES.filter(q => q.status === 'Quoted').length,
    approved: QUOTES.filter(q => q.status === 'Approved').length,
    billed: QUOTES.filter(q => q.status === 'Billed').length,
    pipelineValue: QUOTES.filter(q => q.status === 'Draft' || q.status === 'Quoted' || q.status === 'Approved').reduce((s, q) => s + q.total, 0),
  }), []);

  const totalPages = pageSize >= filtered.length ? 1 : Math.ceil(filtered.length / pageSize);
  const displayQuotes = pageSize >= filtered.length ? filtered : filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  const handleSort = useCallback((col: string) => {
    setSortCol(prev => { if (prev === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return prev; } setSortDir('asc'); return col; });
    setSortCol(col);
  }, []);

  const openDetail = (key: number) => {
    setSelectedKey(key);
    setDrawerTab('overview');
  };

  const selectedQuote = QUOTES.find(q => q.lQuoteKey === selectedKey);

  /* ── Catalog pipeline ─── */
  const filteredCatalog = useMemo(() => {
    let arr: CatalogPart[] = [...CATALOG];
    if (catCategory) arr = arr.filter(p => p.category === catCategory);
    if (catSearch) { const s = catSearch.toLowerCase(); arr = arr.filter(p => `${p.partNum}|${p.desc}`.toLowerCase().includes(s)); }
    return arr;
  }, [catCategory, catSearch]);

  /* ── Models pipeline ─── */
  const filteredModels = useMemo(() => {
    let arr: CartModel[] = [...MODELS];
    if (modelSearch) { const s = modelSearch.toLowerCase(); arr = arr.filter(m => `${m.modelName}|${m.desc}`.toLowerCase().includes(s)); }
    return arr;
  }, [modelSearch]);

  /* ── Scope Inventory loader ─── */
  const loadScopeInventory = useCallback(async () => {
    setScopeLoading(true);
    try {
      const res = await getEndoCartScopeInventory({ search: scopeSearch || undefined, rigidOrFlexible: scopeTypeFilter || undefined, page: scopePage, pageSize: 50 });
      setScopeItems(res.items);
      setScopeTotal(res.totalCount);
    } catch (err) { console.error('[EndoCarts] loadScopeInventory failed', err); }
    finally { setScopeLoading(false); }
  }, [scopeSearch, scopeTypeFilter, scopePage]);

  useEffect(() => {
    if (activeTab === 'scope-inventory') { const t = setTimeout(() => loadScopeInventory(), scopeSearch ? 300 : 0); return () => clearTimeout(t); }
  }, [activeTab, loadScopeInventory, scopeSearch]);

  /* ── Service History loader ─── */
  const loadServiceHistory = useCallback(async () => {
    setServiceLoading(true);
    try {
      const res = await getEndoCartServiceHistory({ search: serviceSearch || undefined, page: servicePage, pageSize: 50 });
      setServiceItems(res.items);
      setServiceTotal(res.totalCount);
    } catch (err) { console.error('[EndoCarts] loadServiceHistory failed', err); }
    finally { setServiceLoading(false); }
  }, [serviceSearch, servicePage]);

  useEffect(() => {
    if (activeTab === 'service-history') { const t = setTimeout(() => loadServiceHistory(), serviceSearch ? 300 : 0); return () => clearTimeout(t); }
  }, [activeTab, loadServiceHistory, serviceSearch]);

  /* ── Tab bar and status segments use module-level constants ─── */

  /* ── Quote detail pane content ─── */
  const quoteDetailPane = selectedQuote ? (
    <div className="ec-detail-pane">
      {/* Close row */}
      <div className="ec-detail-close-row">
        <button
          onClick={() => setSelectedKey(null)}
          className="ec-detail-close-btn"
        >
          &times;
        </button>
      </div>
      <DetailHeader
        headingLevel="h2"
        title={selectedQuote.quoteNum}
        subtitle={selectedQuote.clientName}
        badges={<StatusBadge status={selectedQuote.status} />}
      />
      <TabBar
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'bom', label: 'BOM Items' },
          { key: 'docs', label: 'Documents' },
        ]}
        activeKey={drawerTab}
        onChange={setDrawerTab}
      />

      <div className="ec-detail-scroll">
        {/* Overview pane */}
        {drawerTab === 'overview' && (
          <div className="ec-overview-pane">
            <SectionCard title="Quote Info">
              <FormGrid cols={2}>
                <Field label="Quote #" value={selectedQuote.quoteNum} />
                <Field label="Status" value={selectedQuote.status} />
                <Field label="Client" value={selectedQuote.clientName} />
                <Field label="Department" value={selectedQuote.deptName} />
                <Field label="Cart Model" value={selectedQuote.cartModel} />
                <Field label="Date Created" value={fmtDate(selectedQuote.dateCreated)} />
              </FormGrid>
            </SectionCard>
            <SectionCard title="Settings & Payment">
              <FormGrid cols={2}>
                <Field label="Sales Rep" value={selectedQuote.salesRep} />
                <Field label="Date Quoted" value={fmtDate(selectedQuote.dateQuoted)} />
                <Field label="Subtotal" value={fmtMoney(selectedQuote.total)} />
                <Field label="Grand Total" value={fmtMoney(selectedQuote.total)} />
              </FormGrid>
            </SectionCard>
            <SectionCard title="Notes">
              <span className="ec-notes-text">{selectedQuote.notes || '\u2014'}</span>
            </SectionCard>
          </div>
        )}

        {/* BOM pane */}
        {drawerTab === 'bom' && (
          <div className="ec-overview-pane">
            <SectionCard title="Bill of Materials">
              <div className="ec-bom-table-wrap">
                <table className="ec-bom-table">
                  <thead>
                    <tr>
                      <th className="ec-bom-th">Part #</th>
                      <th className="ec-bom-th">Description</th>
                      <th className="ec-bom-th ec-bom-th--center">Qty</th>
                      <th className="ec-bom-th ec-bom-th--right">Unit Cost</th>
                      <th className="ec-bom-th ec-bom-th--right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuote.items.map((it, i) => (
                      <tr key={i}>
                        <td className="ec-bom-td">{it.partNum}</td>
                        <td className="ec-bom-td">{it.desc}</td>
                        <td className="ec-bom-td ec-bom-td--center">{it.qty}</td>
                        <td className="ec-bom-td ec-bom-td--right">{fmtMoney(it.unitCost)}</td>
                        <td className="ec-bom-td ec-bom-td--right">{fmtMoney(it.unitCost * it.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="ec-bom-footer-row">
                      <td colSpan={4} className="ec-bom-footer-td">Subtotal</td>
                      <td className="ec-bom-footer-td">{fmtMoney(selectedQuote.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Documents pane */}
        {drawerTab === 'docs' && (
          <div className="ec-detail-empty">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="var(--border-dk)" strokeWidth="1.5" style={{ width: 40, height: 40 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
            <div className="ec-detail-empty-title">No documents attached</div>
            <div style={{ fontSize: 11 }}>Quotes, specs, and supporting documents will appear here.</div>
          </div>
        )}
      </div>

      {/* Detail footer */}
      <div className="ec-detail-footer">
        <span className="ec-detail-footer-text">Quote detail</span>
      </div>
    </div>
  ) : null;

  return (
    <div className="ec-page">

      {/* ── Sub-Tab Bar ─── */}
      <TabBar tabs={ENDO_TABS} activeKey={activeTab} onChange={k => { setActiveTab(k as typeof activeTab); setSelectedKey(null); }} />

      {/* ════════════════════════════════════════════════════════ */}
      {/* QUOTES TAB — split-pane                                 */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'quotes' && (
        <div className="ec-split-flex">
          {/* Left panel — list */}
          <aside aria-label="EndoCart quotes list" style={{
            display: 'flex', flexDirection: 'column',
            width: selectedKey ? 'calc(100% - 520px)' : '100%',
            minWidth: 0,
            borderRight: selectedKey ? '1px solid var(--neutral-200)' : undefined,
            transition: 'width 0.2s ease',
            willChange: 'width',
            overflow: 'hidden',
          }}>
            {/* Stat Strip */}
            <StatStrip
              chips={[
                { id: 'all',           label: 'Total Quotes',   value: stats.total,                        color: 'navy'  },
                { id: 'Draft',         label: 'Draft',          value: stats.draft,                        color: 'amber' },
                { id: 'Quoted',        label: 'Quoted',         value: stats.quoted,                       color: 'blue'  },
                { id: 'Approved',      label: 'Approved',       value: stats.approved,                     color: 'green' },
                { id: 'Billed',        label: 'Billed',         value: stats.billed,                       color: 'navy'  },
                { id: 'pipelineValue', label: 'Pipeline Value', value: fmtMoneyShort(stats.pipelineValue), color: 'navy'  },
              ]}
              activeChip={chipFilter === '' ? 'all' : chipFilter}
              onChipClick={(id) => {
                if (id === 'pipelineValue') return;
                setChipFilter(id === 'all' ? '' : id);
                setPage(1);
              }}
            />
            {/* Toolbar */}
            <div className="ec-toolbar">
              <button style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 5, background: 'var(--navy)', color: 'var(--card)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ec-icon-12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                New Quote
              </button>
              <div className="ec-separator" />
              <span className="ec-filter-label">Status</span>
              <SegmentedControl items={STATUS_SEGMENTS} value={filters.status} onChange={v => { setFilters(f => ({ ...f, status: v })); setChipFilter(''); setPage(1); }} />
              <div className="ec-separator" />
              <select value={filters.rep} onChange={e => { setFilters(f => ({ ...f, rep: e.target.value })); setPage(1); }} style={{
                height: 30, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 8px', fontSize: 11, fontFamily: 'inherit',
                color: 'var(--text)', background: 'var(--card)', outline: 'none', cursor: 'pointer', minWidth: 130,
              }}>
                <option value="">All Sales Reps</option>
                {SALES_REPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="ec-search-wrap">
                <span className="ec-search-icon"><IconSearch /></span>
                <input placeholder="Search quote#, client, model..." aria-label="Search EndoCart quotes" value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} className="ec-search-input" />
              </div>
            </div>

            {/* Data Table */}
            <div className="ec-table-bg">
              <table className="ec-table-fixed">
                <thead>
                  <tr>
                    <ColHeader label="Quote #" sortKey="quoteNum" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} style={{ width: 100 }} />
                    <ColHeader label="Client" sortKey="clientName" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} style={{ width: '20%' }} />
                    <ColHeader label="Department" sortKey="deptName" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} style={{ width: '16%' }} />
                    <ColHeader label="Cart Model" sortKey="cartModel" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} style={{ width: '16%' }} />
                    <ColHeader label="Items" sortKey="itemCount" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} style={{ width: 55, textAlign: 'center' }} />
                    <ColHeader label="Total $" sortKey="total" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} style={{ width: 100, textAlign: 'right' }} />
                    <ColHeader label="Status" sortKey="status" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} style={{ width: 90 }} />
                    <ColHeader label="Created" sortKey="dateCreated" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} style={{ width: 95 }} />
                    <ColHeader label="Quoted" sortKey="dateQuoted" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} style={{ width: 95 }} />
                    <ColHeader label="Sales Rep" sortKey="salesRep" currentSort={sortCol} currentDir={sortDir} onSort={handleSort} style={{ width: 110 }} />
                  </tr>
                </thead>
                <tbody>
                  {displayQuotes.length === 0 ? (
                    <tr><td colSpan={10} className="ec-no-records">No records match current filters.</td></tr>
                  ) : displayQuotes.map((q, idx) => (
                    <tr
                      key={q.lQuoteKey}
                      style={rowStyle(idx, false, q.lQuoteKey === selectedKey)}
                      onClick={() => openDetail(q.lQuoteKey)}
                      className={q.lQuoteKey === selectedKey ? 'selected' : 'hover-row-light'}
                    >
                      <td className="ec-td"><span style={{ fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' }}>{q.quoteNum}</span></td>
                      <td className="ec-td">{q.clientName}</td>
                      <td className="ec-td">{q.deptName}</td>
                      <td className="ec-td">{q.cartModel}</td>
                      <td className="ec-td ec-td--center">{q.itemCount}</td>
                      <td className="ec-td ec-td--right-bold">{fmtMoney(q.total)}</td>
                      <td className="ec-td"><StatusBadge status={q.status} /></td>
                      <td className="ec-td">{fmtDate(q.dateCreated)}</td>
                      <td className="ec-td">{fmtDate(q.dateQuoted)}</td>
                      <td className="ec-td">{q.salesRep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="ec-footer">
              <span style={{ fontWeight: 500 }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
                  Rows:
                  <select value={pageSize} onChange={e => { setPageSize(e.target.value === 'All' ? 9999 : Number(e.target.value)); setPage(1); }} style={{ height: 36, minWidth: 36, border: '1px solid var(--border-dk)', borderRadius: 4, padding: '0 6px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value="All">All</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ height: 36, minWidth: 36, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, background: 'var(--card)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', opacity: page <= 1 ? 0.4 : 1 }}>&laquo;</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(p => (
                    <button key={p} onClick={() => setPage(p)} style={{
                      height: 36, minWidth: 36, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                      background: p === page ? 'var(--navy)' : 'var(--card)', color: p === page ? 'var(--card)' : 'var(--muted)', fontWeight: p === page ? 600 : 400,
                    }}>{p}</button>
                  ))}
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ height: 36, minWidth: 36, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, background: 'var(--card)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', opacity: page >= totalPages ? 0.4 : 1 }}>&raquo;</button>
                </div>
              </div>
            </div>
          </aside>

          {/* Right panel — quote detail */}
          {selectedKey && (
            <section aria-label="Quote details" className="ec-right-panel">
              {quoteDetailPane}
            </section>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* CATALOG TAB                                             */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'catalog' && (
        <div className="ec-tab-flex">
          <div className="ec-toolbar">
            <button disabled style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 5, background: 'var(--navy)', color: 'var(--card)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'not-allowed', opacity: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ec-icon-12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Component
            </button>
            <div className="ec-separator" />
            <span className="ec-filter-label">Category</span>
            <select value={catCategory} onChange={e => setCatCategory(e.target.value)} style={{
              height: 30, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 8px', fontSize: 11, fontFamily: 'inherit',
              color: 'var(--text)', background: 'var(--card)', outline: 'none', cursor: 'pointer', minWidth: 130,
            }}>
              <option value="">All Categories</option>
              {CATALOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="ec-search-wrap">
              <span className="ec-search-icon"><IconSearch /></span>
              <input placeholder="Search parts..." aria-label="Search EndoCart parts catalog" value={catSearch} onChange={e => setCatSearch(e.target.value)} className="ec-search-input" />
            </div>
          </div>
          <div className="ec-table-bg">
            <table className="ec-table-fixed">
              <thead>
                <tr>
                  <th className="ec-th" style={{ width: 100 }}>Part #</th>
                  <th className="ec-th">Description</th>
                  <th className="ec-th" style={{ width: 90 }}>Category</th>
                  <th className="ec-th" style={{ width: 90, textAlign: 'right' }}>Unit Cost</th>
                  <th className="ec-th" style={{ width: 70, textAlign: 'center' }}>Stock</th>
                  <th className="ec-th" style={{ width: 80, textAlign: 'center' }}>Reorder Pt</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map((p, idx) => (
                  <tr key={p.partNum} style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : 'var(--card)' }}>
                    <td className="ec-td ec-td--navy-bold">{p.partNum}</td>
                    <td className="ec-td">{p.desc}</td>
                    <td className="ec-td"><Badge text={p.category} style={CAT_BADGE[p.category]} /></td>
                    <td className="ec-td ec-td--right-600">{fmtMoney(p.unitCost)}</td>
                    <td className="ec-td ec-td--center" style={{ color: p.stock <= p.reorderPt ? 'var(--danger)' : undefined, fontWeight: p.stock <= p.reorderPt ? 700 : 400 }}>{p.stock}</td>
                    <td className="ec-td ec-td--center">{p.reorderPt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODELS TAB                                              */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'models' && (
        <div className="ec-tab-flex">
          <div className="ec-toolbar">
            <button disabled style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 5, background: 'var(--navy)', color: 'var(--card)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'not-allowed', opacity: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ec-icon-12"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Model
            </button>
            <div className="ec-search-wrap">
              <span className="ec-search-icon"><IconSearch /></span>
              <input placeholder="Search models..." aria-label="Search EndoCart models" value={modelSearch} onChange={e => setModelSearch(e.target.value)} className="ec-search-input" />
            </div>
          </div>
          <div className="ec-table-bg">
            <table className="ec-table-fixed">
              <thead>
                <tr>
                  <th className="ec-th" style={{ width: 160 }}>Model Name</th>
                  <th className="ec-th">Description</th>
                  <th className="ec-th" style={{ width: 90, textAlign: 'center' }}>Components</th>
                  <th className="ec-th" style={{ width: 100, textAlign: 'right' }}>Base Price</th>
                  <th className="ec-th" style={{ width: 80, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((m, idx) => (
                  <>
                    <tr key={m.lModelKey} style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : 'var(--card)', cursor: 'pointer' }} onClick={() => setExpandedModel(k => k === m.lModelKey ? null : m.lModelKey)}>
                      <td className="ec-td ec-td--navy-bold">{m.modelName}</td>
                      <td className="ec-td">{m.desc}</td>
                      <td className="ec-td ec-td--center">{m.componentCount}</td>
                      <td className="ec-td ec-td--right-bold">{fmtMoney(m.basePrice)}</td>
                      <td className="ec-td ec-td--center">
                        <button onClick={e => { e.stopPropagation(); setExpandedModel(k => k === m.lModelKey ? null : m.lModelKey); }} className="ec-expand-bom-btn">
                          <IconExpand open={expandedModel === m.lModelKey} /> BOM
                        </button>
                      </td>
                    </tr>
                    {expandedModel === m.lModelKey && (
                      <tr key={`bom-${m.lModelKey}`}>
                        <td colSpan={5} style={{ padding: 0, borderBottom: '1px solid var(--border)' }}>
                          <div className="ec-bom-exp-container">
                            <table className="ec-bom-exp-table">
                              <thead>
                                <tr>
                                  <th className="ec-bom-exp-th">Part #</th>
                                  <th className="ec-bom-exp-th">Description</th>
                                  <th className="ec-bom-exp-th ec-bom-exp-th--center">Qty</th>
                                  <th className="ec-bom-exp-th ec-bom-exp-th--right">Unit Cost</th>
                                  <th className="ec-bom-exp-th ec-bom-exp-th--right">Line Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {m.components.map((c, ci) => (
                                  <tr key={ci}>
                                    <td className="ec-bom-exp-td">{c.partNum}</td>
                                    <td className="ec-bom-exp-td">{c.desc}</td>
                                    <td className="ec-bom-exp-td ec-bom-exp-td--center">{c.qty}</td>
                                    <td className="ec-bom-exp-td ec-bom-exp-td--right">{fmtMoney(c.unitCost)}</td>
                                    <td className="ec-bom-exp-td ec-bom-exp-td--right">{fmtMoney(c.unitCost * c.qty)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SCOPE INVENTORY TAB                                      */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'scope-inventory' && (
        <div className="ec-tab-flex">
          <div className="ec-toolbar">
            <span className="ec-filter-label">Type</span>
            <SegmentedControl
              items={[{ label: 'All', value: '' }, { label: 'Flexible', value: 'F' }, { label: 'Rigid', value: 'R' }]}
              value={scopeTypeFilter}
              onChange={v => { setScopeTypeFilter(v); setScopePage(1); }}
            />
            <div className="ec-search-wrap">
              <span className="ec-search-icon"><IconSearch /></span>
              <input placeholder="Search serial#, type, client..." aria-label="Search EndoCart scopes" value={scopeSearch} onChange={e => { setScopeSearch(e.target.value); setScopePage(1); }} className="ec-search-input" style={{ width: 220 }} />
            </div>
          </div>
          {scopeLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>
          ) : (
            <div className="ec-table-bg">
              <table className="ec-table-fixed">
                <thead>
                  <tr>
                    {[
                      { label: 'Serial #', w: 120 }, { label: 'Scope Type', w: '20%' as string | number }, { label: 'Manufacturer', w: '14%' },
                      { label: 'Client', w: '18%' }, { label: 'Department', w: '14%' }, { label: 'Type', w: 60 },
                      { label: 'Status', w: 70 }, { label: 'Last Update', w: 95 },
                    ].map(col => (
                      <th key={col.label} className="ec-th" style={{ width: col.w }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scopeItems.length === 0 ? (
                    <tr><td colSpan={8} className="ec-no-records">No scopes found.</td></tr>
                  ) : scopeItems.map((s, idx) => (
                    <tr key={s.scopeKey} style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : 'var(--card)' }}>
                      <td className="ec-td ec-td--navy-bold">{s.serialNumber || '\u2014'}</td>
                      <td className="ec-td">{s.scopeType}</td>
                      <td className="ec-td">{s.manufacturer}</td>
                      <td className="ec-td">{s.clientName}</td>
                      <td className="ec-td">{s.departmentName}</td>
                      <td className="ec-td">
                        {s.rigidOrFlexible === 'F'
                          ? <StatusBadge status="Flexible" />
                          : s.rigidOrFlexible === 'R'
                            ? <StatusBadge status="Scope" />
                            : <span>{'\u2014'}</span>}
                      </td>
                      <td className="ec-td">
                        <StatusBadge status={s.isDead ? 'Inactive' : 'Active'} />
                      </td>
                      <td className="ec-td">{s.lastUpdate || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Footer */}
          <div className="ec-footer">
            <span style={{ fontWeight: 500 }}>{scopeTotal} scope{scopeTotal !== 1 ? 's' : ''}</span>
            <div className="ec-pager-btns">
              <button disabled={scopePage <= 1} onClick={() => setScopePage(p => p - 1)} className="ec-pager-btn" style={{ opacity: scopePage <= 1 ? 0.4 : 1 }}>&laquo;</button>
              <span className="ec-pager-span">Page {scopePage}</span>
              <button disabled={scopePage * 50 >= scopeTotal} onClick={() => setScopePage(p => p + 1)} className="ec-pager-btn" style={{ opacity: scopePage * 50 >= scopeTotal ? 0.4 : 1 }}>&raquo;</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SERVICE HISTORY TAB                                      */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'service-history' && (
        <div className="ec-tab-flex">
          <div className="ec-toolbar">
            <div className="ec-search-wrap">
              <span className="ec-search-icon"><IconSearch /></span>
              <input placeholder="Search WO#, serial#, client..." aria-label="Search EndoCart service history" value={serviceSearch} onChange={e => { setServiceSearch(e.target.value); setServicePage(1); }} className="ec-search-input" style={{ width: 220 }} />
            </div>
          </div>
          {serviceLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>
          ) : (
            <div className="ec-table-bg">
              <table className="ec-table-fixed">
                <thead>
                  <tr>
                    {[
                      { label: 'Work Order', w: 110 }, { label: 'Serial #', w: 110 }, { label: 'Scope Type', w: '16%' as string | number },
                      { label: 'Client', w: '18%' }, { label: 'Status', w: 90 }, { label: 'Date In', w: 90 },
                      { label: 'Date Out', w: 90 }, { label: 'Complaint', w: '20%' }, { label: 'Total', w: 90 },
                    ].map(col => (
                      <th key={col.label} className="ec-th" style={{ width: col.w, textAlign: col.label === 'Total' ? 'right' : 'left' }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {serviceItems.length === 0 ? (
                    <tr><td colSpan={9} className="ec-no-records">No repair history found.</td></tr>
                  ) : serviceItems.map((r, idx) => (
                    <tr key={r.repairKey} style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : 'var(--card)' }}>
                      <td className="ec-td ec-td--navy-bold">{r.workOrderNumber || '\u2014'}</td>
                      <td className="ec-td">{r.serialNumber || '\u2014'}</td>
                      <td className="ec-td">{r.scopeType}</td>
                      <td className="ec-td">{r.clientName}</td>
                      <td className="ec-td">
                        <StatusBadge status={r.repairStatus} />
                      </td>
                      <td className="ec-td">{r.dateIn || '\u2014'}</td>
                      <td className="ec-td">{r.dateOut || '\u2014'}</td>
                      <td className="ec-td" style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>{r.complaint || '\u2014'}</td>
                      <td className="ec-td ec-td--right-bold">{fmtMoney(r.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Footer */}
          <div className="ec-footer">
            <span style={{ fontWeight: 500 }}>{serviceTotal} repair{serviceTotal !== 1 ? 's' : ''}</span>
            <div className="ec-pager-btns">
              <button disabled={servicePage <= 1} onClick={() => setServicePage(p => p - 1)} className="ec-pager-btn" style={{ opacity: servicePage <= 1 ? 0.4 : 1 }}>&laquo;</button>
              <span className="ec-pager-span">Page {servicePage}</span>
              <button disabled={servicePage * 50 >= serviceTotal} onClick={() => setServicePage(p => p + 1)} className="ec-pager-btn" style={{ opacity: servicePage * 50 >= serviceTotal ? 0.4 : 1 }}>&raquo;</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
