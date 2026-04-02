import { useState, useMemo, useCallback } from 'react';
import { Drawer } from 'antd';
import { QUOTES, CATALOG, MODELS, SALES_REPS, CATALOG_CATEGORIES } from './endoCartData';
import type { EndoCartFilters, CatalogPart, CartModel } from './types';

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

const STATUS_BADGE: Record<string, { bg: string; border: string; color: string }> = {
  Draft:     { bg: 'var(--warning-light, #FEF3C7)', border: 'var(--warning-border, #FDE68A)', color: 'var(--warning, #F59E0B)' },
  Quoted:    { bg: 'var(--primary-light)', border: 'var(--border-dk)', color: 'var(--primary)' },
  Approved:  { bg: 'var(--success-light, #F0FDF4)', border: 'var(--success-border, #BBF7D0)', color: 'var(--success)' },
  Billed:    { bg: 'var(--primary-light)', border: 'var(--border-dk)', color: 'var(--primary)' },
  Cancelled: { bg: 'var(--danger-light, #FEE2E2)', border: 'var(--danger-border, #FECACA)', color: 'var(--danger)' },
};

const CAT_BADGE: Record<string, { bg: string; border: string; color: string }> = {
  'Cart Frame': { bg: 'var(--primary-light)', border: 'var(--border-dk)', color: 'var(--primary)' },
  Monitor:      { bg: 'var(--neutral-100, #F3F4F6)', border: 'var(--border-dk)', color: 'var(--navy)' },
  Accessory:    { bg: 'var(--success-light, #F0FDF4)', border: 'var(--success-border, #BBF7D0)', color: 'var(--success)' },
  Power:        { bg: 'var(--warning-light, #FEF3C7)', border: 'var(--warning-border, #FDE68A)', color: 'var(--warning, #F59E0B)' },
  Cabling:      { bg: 'var(--danger-light, #FEE2E2)', border: 'var(--danger-border, #FECACA)', color: 'var(--danger)' },
  Storage:      { bg: 'var(--neutral-50)', border: 'var(--border-dk)', color: 'var(--navy)' },
};

const Badge = ({ text, style }: { text: string; style: { bg: string; border: string; color: string } }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 10, fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap', background: style.bg, border: `1px solid ${style.border}`, color: style.color }}>{text}</span>
);

/* ── Stat Chip ───────────────────────────────────────────────── */
const StatChip = ({ label, value, iconBg, iconColor, valueColor, icon, active, onClick }: {
  label: string; value: string | number; iconBg: string; iconColor: string; valueColor: string;
  icon: React.ReactNode; active?: boolean; onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: onClick ? 'pointer' : 'default',
      borderRight: '1px solid var(--border)', transition: 'background 0.12s',
      background: active ? 'var(--primary-light)' : 'var(--card)',
      outline: active ? '2.5px solid var(--navy)' : 'none', outlineOffset: active ? -2 : 0,
    }}
  >
    <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: iconColor, fontSize: 13, flexShrink: 0 }}>{icon}</span>
    <span style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1, color: valueColor }}>{value}</span>
      <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  </div>
);

/* ── SVG Icons ───────────────────────────────────────────────── */
const IconFile = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 5h6M5 8h6M5 11h4" /></svg>;
const IconPen = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><path d="M11 2.5a1.5 1.5 0 0 1 2.12 0l.38.38a1.5 1.5 0 0 1 0 2.12L6 12.5 2.5 13.5 3.5 10z" /></svg>;
const IconChat = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><path d="M14 3H2v8h5l3 3v-3h4z" /></svg>;
const IconCheck = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><circle cx="8" cy="8" r="5.5" /><polyline points="5.5 8 7 10 10.5 6" /></svg>;
const IconDollar = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><line x1="8" y1="1.5" x2="8" y2="14.5" /><path d="M11 4.5H6.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H5" /></svg>;
const IconTrend = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}><polyline points="14 4 9 9 6 6 2 12" /><polyline points="10 4 14 4 14 8" /></svg>;
const IconSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
const IconExpand = ({ open }: { open: boolean }) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 4 10 8 6 12" /></svg>;

/* ── Segmented Control ───────────────────────────────────────── */
const SegmentedControl = ({ items, value, onChange }: { items: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) => (
  <div style={{ display: 'inline-flex', border: '1.5px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden' }}>
    {items.map(it => (
      <button key={it.value} onClick={() => onChange(it.value)} style={{
        height: 28, padding: '0 12px', border: 'none', fontSize: 11, fontWeight: it.value === value ? 700 : 500, fontFamily: 'inherit', cursor: 'pointer',
        background: it.value === value ? 'var(--navy)' : 'var(--card)', color: it.value === value ? '#fff' : 'var(--muted)',
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
    background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'left',
    textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2,
    cursor: 'pointer', whiteSpace: 'nowrap', borderRight: '1px solid rgba(180,200,220,0.3)', borderBottom: '1px solid var(--neutral-200)',
    userSelect: 'none', transition: 'background 0.1s', ...style,
  }}>
    {label}{' '}
    {currentSort === sortKey && <span style={{ fontSize: 9, marginLeft: 3 }}>{currentDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
  </th>
);

/* ── Table Row Style ─────────────────────────────────────────── */
const rowStyle = (idx: number, selected: boolean): React.CSSProperties => ({
  background: selected ? 'var(--primary-light)' : idx % 2 === 1 ? 'var(--row-alt, #F9FAFB)' : 'var(--card)',
  cursor: 'pointer',
});
const cellStyle: React.CSSProperties = { padding: '7px 10px', fontSize: 11.5, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

/* ── Section Card (for drawer) ───────────────────────────────── */
const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: 'var(--card)', border: '1px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
    <div style={{ background: 'var(--neutral-50)', padding: '6px 12px', fontSize: 9.5, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>{title}</div>
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
  </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
    <span style={{ fontSize: 11.5, color: 'var(--text, #1F2937)' }}>{value || '\u2014'}</span>
  </div>
);

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */
export const EndoCartsPage = () => {
  const [activeTab, setActiveTab] = useState<'quotes' | 'catalog' | 'models'>('quotes');

  /* ── Quotes state ─── */
  const [filters, setFilters] = useState<EndoCartFilters>({ status: '', rep: '', search: '' });
  const [sortCol, setSortCol] = useState('dateCreated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [chipFilter, setChipFilter] = useState('');

  /* ── Catalog state ─── */
  const [catCategory, setCatCategory] = useState('');
  const [catSearch, setCatSearch] = useState('');

  /* ── Models state ─── */
  const [modelSearch, setModelSearch] = useState('');
  const [expandedModel, setExpandedModel] = useState<number | null>(null);

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

  const openDrawer = (key: number) => { setSelectedKey(key); setDrawerOpen(true); setDrawerTab('overview'); };
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

  /* ── Tab bar ─── */
  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'quotes', label: 'Quotes' },
    { key: 'catalog', label: 'Catalog' },
    { key: 'models', label: 'Models' },
  ];

  const statusSegments = [
    { label: 'All', value: '' }, { label: 'Draft', value: 'Draft' }, { label: 'Quoted', value: 'Quoted' },
    { label: 'Approved', value: 'Approved' }, { label: 'Billed', value: 'Billed' }, { label: 'Cancelled', value: 'Cancelled' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Sub-Tab Bar ─── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--neutral-200)', background: 'var(--neutral-50)', flexShrink: 0 }}>
        {tabs.map(t => (
          <div key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '9px 18px', fontSize: 12, fontWeight: activeTab === t.key ? 700 : 500, cursor: 'pointer',
            color: activeTab === t.key ? 'var(--primary)' : 'var(--muted)',
            borderBottom: activeTab === t.key ? '2.5px solid var(--primary)' : '2.5px solid transparent',
            marginBottom: -1.5, transition: 'all 0.12s',
          }}>{t.label}</div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* QUOTES TAB                                              */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'quotes' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

          {/* Stat Strip */}
          <div className="tsi-stat-strip">
            <StatChip label="Total Quotes" value={stats.total} iconBg="rgba(var(--navy-rgb), 0.12)" iconColor="var(--navy)" valueColor="var(--navy)" icon={<IconFile />} active={chipFilter === ''} onClick={() => { setChipFilter(''); setPage(1); }} />
            <StatChip label="Draft" value={stats.draft} iconBg="rgba(var(--amber-rgb), 0.13)" iconColor="var(--warning)" valueColor="var(--warning)" icon={<IconPen />} active={chipFilter === 'Draft'} onClick={() => { setChipFilter(f => f === 'Draft' ? '' : 'Draft'); setPage(1); }} />
            <StatChip label="Quoted" value={stats.quoted} iconBg="rgba(var(--primary-rgb), 0.12)" iconColor="var(--primary)" valueColor="var(--primary)" icon={<IconChat />} active={chipFilter === 'Quoted'} onClick={() => { setChipFilter(f => f === 'Quoted' ? '' : 'Quoted'); setPage(1); }} />
            <StatChip label="Approved" value={stats.approved} iconBg="rgba(var(--success-rgb), 0.12)" iconColor="var(--success)" valueColor="var(--success)" icon={<IconCheck />} active={chipFilter === 'Approved'} onClick={() => { setChipFilter(f => f === 'Approved' ? '' : 'Approved'); setPage(1); }} />
            <StatChip label="Billed" value={stats.billed} iconBg="rgba(101, 84, 192, 0.12)" iconColor="rgb(101, 84, 192)" valueColor="rgb(101, 84, 192)" icon={<IconDollar />} active={chipFilter === 'Billed'} onClick={() => { setChipFilter(f => f === 'Billed' ? '' : 'Billed'); setPage(1); }} />
            <StatChip label="Pipeline Value" value={fmtMoneyShort(stats.pipelineValue)} iconBg="rgba(var(--navy-rgb), 0.12)" iconColor="var(--navy)" valueColor="var(--navy)" icon={<IconTrend />} />
          </div>

          {/* Toolbar */}
          <div className="tsi-toolbar">
            <button style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 5, background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Quote
            </button>
            <div style={{ width: 1, height: 22, background: 'var(--border-dk)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>Status</span>
            <SegmentedControl items={statusSegments} value={filters.status} onChange={v => { setFilters(f => ({ ...f, status: v })); setChipFilter(''); setPage(1); }} />
            <div style={{ width: 1, height: 22, background: 'var(--border-dk)', flexShrink: 0 }} />
            <select value={filters.rep} onChange={e => { setFilters(f => ({ ...f, rep: e.target.value })); setPage(1); }} style={{
              height: 30, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 8px', fontSize: 11, fontFamily: 'inherit',
              color: 'var(--text)', background: 'var(--card)', outline: 'none', cursor: 'pointer', minWidth: 130,
            }}>
              <option value="">All Sales Reps</option>
              {SALES_REPS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><IconSearch /></span>
              <input placeholder="Search quote#, client, model..." value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} style={{
                height: 30, width: 200, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 10px 0 30px', fontSize: 11, fontFamily: 'inherit', outline: 'none', background: 'var(--card)',
              }} />
            </div>
          </div>

          {/* Data Table */}
          <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
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
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>No records match current filters.</td></tr>
                ) : displayQuotes.map((q, idx) => (
                  <tr key={q.lQuoteKey} style={rowStyle(idx, q.lQuoteKey === selectedKey)} onClick={() => openDrawer(q.lQuoteKey)}>
                    <td style={cellStyle}><span style={{ fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' }}>{q.quoteNum}</span></td>
                    <td style={cellStyle}>{q.clientName}</td>
                    <td style={cellStyle}>{q.deptName}</td>
                    <td style={cellStyle}>{q.cartModel}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{q.itemCount}</td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(q.total)}</td>
                    <td style={cellStyle}><Badge text={q.status} style={STATUS_BADGE[q.status]} /></td>
                    <td style={cellStyle}>{fmtDate(q.dateCreated)}</td>
                    <td style={cellStyle}>{fmtDate(q.dateQuoted)}</td>
                    <td style={cellStyle}>{q.salesRep}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--neutral-50)', borderTop: '1.5px solid var(--border-dk)', flexShrink: 0, fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ fontWeight: 500 }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' }}>
                Rows:
                <select value={pageSize} onChange={e => { setPageSize(e.target.value === 'All' ? 9999 : Number(e.target.value)); setPage(1); }} style={{ height: 26, border: '1px solid var(--border-dk)', borderRadius: 4, padding: '0 6px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value="All">All</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ height: 26, minWidth: 26, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, background: 'var(--card)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', opacity: page <= 1 ? 0.4 : 1 }}>&laquo;</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(p => (
                  <button key={p} onClick={() => setPage(p)} style={{
                    height: 26, minWidth: 26, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                    background: p === page ? 'var(--navy)' : 'var(--card)', color: p === page ? '#fff' : 'var(--muted)', fontWeight: p === page ? 600 : 400,
                  }}>{p}</button>
                ))}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ height: 26, minWidth: 26, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, background: 'var(--card)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', opacity: page >= totalPages ? 0.4 : 1 }}>&raquo;</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* CATALOG TAB                                             */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="tsi-toolbar">
            <button disabled style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 5, background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'not-allowed', opacity: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Component
            </button>
            <div style={{ width: 1, height: 22, background: 'var(--border-dk)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>Category</span>
            <select value={catCategory} onChange={e => setCatCategory(e.target.value)} style={{
              height: 30, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 8px', fontSize: 11, fontFamily: 'inherit',
              color: 'var(--text)', background: 'var(--card)', outline: 'none', cursor: 'pointer', minWidth: 130,
            }}>
              <option value="">All Categories</option>
              {CATALOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><IconSearch /></span>
              <input placeholder="Search parts..." value={catSearch} onChange={e => setCatSearch(e.target.value)} style={{
                height: 30, width: 200, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 10px 0 30px', fontSize: 11, fontFamily: 'inherit', outline: 'none', background: 'var(--card)',
              }} />
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: 100, background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' }}>Part #</th>
                  <th style={{ background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' }}>Description</th>
                  <th style={{ width: 90, background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' }}>Category</th>
                  <th style={{ width: 90, background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' }}>Unit Cost</th>
                  <th style={{ width: 70, background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' }}>Stock</th>
                  <th style={{ width: 80, background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' }}>Reorder Pt</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map((p, idx) => (
                  <tr key={p.partNum} style={{ background: idx % 2 === 1 ? 'var(--row-alt, #F9FAFB)' : 'var(--card)' }}>
                    <td style={{ ...cellStyle, fontWeight: 700, color: 'var(--navy)' }}>{p.partNum}</td>
                    <td style={cellStyle}>{p.desc}</td>
                    <td style={cellStyle}><Badge text={p.category} style={CAT_BADGE[p.category]} /></td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600 }}>{fmtMoney(p.unitCost)}</td>
                    <td style={{ ...cellStyle, textAlign: 'center', color: p.stock <= p.reorderPt ? 'var(--danger)' : undefined, fontWeight: p.stock <= p.reorderPt ? 700 : 400 }}>{p.stock}</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{p.reorderPt}</td>
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
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="tsi-toolbar">
            <button disabled style={{ height: 30, padding: '0 14px', border: 'none', borderRadius: 5, background: 'var(--navy)', color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'not-allowed', opacity: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Model
            </button>
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><IconSearch /></span>
              <input placeholder="Search models..." value={modelSearch} onChange={e => setModelSearch(e.target.value)} style={{
                height: 30, width: 200, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 10px 0 30px', fontSize: 11, fontFamily: 'inherit', outline: 'none', background: 'var(--card)',
              }} />
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: 160, background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' }}>Model Name</th>
                  <th style={{ background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' }}>Description</th>
                  <th style={{ width: 90, background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' }}>Components</th>
                  <th style={{ width: 100, background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' }}>Base Price</th>
                  <th style={{ width: 80, background: 'var(--neutral-50)', color: 'var(--neutral-500, #6B7280)', fontWeight: 700, padding: '9px 10px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((m, idx) => (
                  <>
                    <tr key={m.lModelKey} style={{ background: idx % 2 === 1 ? 'var(--row-alt, #F9FAFB)' : 'var(--card)', cursor: 'pointer' }} onClick={() => setExpandedModel(k => k === m.lModelKey ? null : m.lModelKey)}>
                      <td style={{ ...cellStyle, fontWeight: 700, color: 'var(--navy)' }}>{m.modelName}</td>
                      <td style={cellStyle}>{m.desc}</td>
                      <td style={{ ...cellStyle, textAlign: 'center' }}>{m.componentCount}</td>
                      <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(m.basePrice)}</td>
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <button onClick={e => { e.stopPropagation(); setExpandedModel(k => k === m.lModelKey ? null : m.lModelKey); }} style={{ height: 24, padding: '0 10px', fontSize: 10.5, borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <IconExpand open={expandedModel === m.lModelKey} /> BOM
                        </button>
                      </td>
                    </tr>
                    {expandedModel === m.lModelKey && (
                      <tr key={`bom-${m.lModelKey}`}>
                        <td colSpan={5} style={{ padding: 0, borderBottom: '1px solid var(--border)' }}>
                          <div style={{ padding: '8px 16px 12px 32px', background: 'var(--neutral-50)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
                              <thead>
                                <tr>
                                  <th style={{ background: 'var(--primary-light)', padding: '4px 8px', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', textAlign: 'left' }}>Part #</th>
                                  <th style={{ background: 'var(--primary-light)', padding: '4px 8px', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', textAlign: 'left' }}>Description</th>
                                  <th style={{ background: 'var(--primary-light)', padding: '4px 8px', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', textAlign: 'center' }}>Qty</th>
                                  <th style={{ background: 'var(--primary-light)', padding: '4px 8px', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', textAlign: 'right' }}>Unit Cost</th>
                                  <th style={{ background: 'var(--primary-light)', padding: '4px 8px', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', textAlign: 'right' }}>Line Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {m.components.map((c, ci) => (
                                  <tr key={ci}>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{c.partNum}</td>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)' }}>{c.desc}</td>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{c.qty}</td>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmtMoney(c.unitCost)}</td>
                                    <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmtMoney(c.unitCost * c.qty)}</td>
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
      {/* QUOTE DETAIL DRAWER                                     */}
      {/* ════════════════════════════════════════════════════════ */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
        title={selectedQuote ? selectedQuote.quoteNum : '\u2014'}
        styles={{ header: { background: 'var(--navy)', padding: '14px 18px' }, body: { padding: 0 } }}
      >
        {selectedQuote && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer Tabs */}
            <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border-dk)', background: 'var(--neutral-50)', flexShrink: 0 }}>
              {['overview', 'bom', 'docs'].map(t => (
                <div key={t} onClick={() => setDrawerTab(t)} style={{
                  padding: '8px 14px', fontSize: 11.5, fontWeight: drawerTab === t ? 700 : 500, cursor: 'pointer',
                  color: drawerTab === t ? 'var(--primary)' : 'var(--muted)',
                  borderBottom: drawerTab === t ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: -1.5, transition: 'all 0.12s',
                }}>{t === 'overview' ? 'Overview' : t === 'bom' ? 'BOM Items' : 'Documents'}</div>
              ))}
            </div>

            {/* Overview pane */}
            {drawerTab === 'overview' && (
              <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SectionCard title="Quote Info">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Field label="Quote #" value={selectedQuote.quoteNum} />
                    <Field label="Status" value={selectedQuote.status} />
                    <Field label="Client" value={selectedQuote.clientName} />
                    <Field label="Department" value={selectedQuote.deptName} />
                    <Field label="Cart Model" value={selectedQuote.cartModel} />
                    <Field label="Date Created" value={fmtDate(selectedQuote.dateCreated)} />
                  </div>
                </SectionCard>
                <SectionCard title="Settings & Payment">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Field label="Sales Rep" value={selectedQuote.salesRep} />
                    <Field label="Date Quoted" value={fmtDate(selectedQuote.dateQuoted)} />
                    <Field label="Subtotal" value={fmtMoney(selectedQuote.total)} />
                    <Field label="Grand Total" value={fmtMoney(selectedQuote.total)} />
                  </div>
                </SectionCard>
                <SectionCard title="Notes">
                  <span style={{ fontSize: 11.5, color: 'var(--text, #1F2937)', lineHeight: 1.5 }}>{selectedQuote.notes || '\u2014'}</span>
                </SectionCard>
              </div>
            )}

            {/* BOM pane */}
            {drawerTab === 'bom' && (
              <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SectionCard title="Bill of Materials">
                  <div style={{ margin: '-10px -12px', padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
                      <thead>
                        <tr>
                          <th style={{ background: 'var(--neutral-50)', padding: '5px 8px', fontSize: 9, fontWeight: 600, color: 'var(--neutral-500, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', borderBottom: '1px solid var(--neutral-200)' }}>Part #</th>
                          <th style={{ background: 'var(--neutral-50)', padding: '5px 8px', fontSize: 9, fontWeight: 600, color: 'var(--neutral-500, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', borderBottom: '1px solid var(--neutral-200)' }}>Description</th>
                          <th style={{ background: 'var(--neutral-50)', padding: '5px 8px', fontSize: 9, fontWeight: 600, color: 'var(--neutral-500, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', borderBottom: '1px solid var(--neutral-200)' }}>Qty</th>
                          <th style={{ background: 'var(--neutral-50)', padding: '5px 8px', fontSize: 9, fontWeight: 600, color: 'var(--neutral-500, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', borderBottom: '1px solid var(--neutral-200)' }}>Unit Cost</th>
                          <th style={{ background: 'var(--neutral-50)', padding: '5px 8px', fontSize: 9, fontWeight: 600, color: 'var(--neutral-500, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right', borderBottom: '1px solid var(--neutral-200)' }}>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuote.items.map((it, i) => (
                          <tr key={i}>
                            <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{it.partNum}</td>
                            <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{it.desc}</td>
                            <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>{it.qty}</td>
                            <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmtMoney(it.unitCost)}</td>
                            <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>{fmtMoney(it.unitCost * it.qty)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: 700, background: 'var(--neutral-50)' }}>
                          <td colSpan={4} style={{ padding: '5px 8px', textAlign: 'right' }}>Subtotal</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMoney(selectedQuote.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Documents pane */}
            {drawerTab === 'docs' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--muted)', textAlign: 'center', gap: 8 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--border-dk)" strokeWidth="1.5" style={{ width: 40, height: 40 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>No documents attached</div>
                <div style={{ fontSize: 11 }}>Quotes, specs, and supporting documents will appear here.</div>
              </div>
            )}

            {/* Drawer Footer */}
            <div style={{ padding: '10px 18px', borderTop: '1.5px solid var(--border-dk)', background: 'var(--neutral-50)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>Quote detail</span>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
