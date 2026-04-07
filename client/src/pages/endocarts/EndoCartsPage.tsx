import { useState, useEffect, useMemo, useCallback } from 'react';
import { Spin } from 'antd';
import { QUOTES, CATALOG, MODELS, SALES_REPS, CATALOG_CATEGORIES } from './endoCartData';
import { getEndoCartScopeInventory, getEndoCartServiceHistory } from '../../api/endocarts';
import type { EndoCartFilters, CatalogPart, CartModel, EndoCartScopeItem, EndoCartServiceHistoryItem } from './types';
import { Field, FormGrid, StatusBadge, DetailHeader, TabBar } from '../../components/shared';
import type { TabDef } from '../../components/shared';

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
  <span style={{ ...badgeInnerStyle, background: style.bg, border: `1px solid ${style.border}`, color: style.color }}>{text}</span>
);

/* ── Stat Chip ───────────────────────────────────────────────── */
const StatChip = ({ label, value, iconBg, iconColor, valueColor, icon, active, onClick }: {
  label: string; value: string | number; iconBg: string; iconColor: string; valueColor: string;
  icon: React.ReactNode; active?: boolean; onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    aria-pressed={onClick ? active : undefined}
    style={{
      flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: onClick ? 'pointer' : 'default',
      borderRight: '1px solid var(--border)', transition: 'background 0.12s',
      background: active ? 'var(--primary-light)' : 'var(--card)',
      outline: active ? '2.5px solid var(--navy)' : 'none', outlineOffset: active ? -2 : 0,
    }}
  >
    <span style={{ ...statChipIconBoxStyle, background: iconBg, color: iconColor }}>{icon}</span>
    <span style={statChipTextColStyle}>
      <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1, color: valueColor }}>{value}</span>
      <span style={statChipLabelStyle}>{label}</span>
    </span>
  </div>
);

/* ── SVG Icons ───────────────────────────────────────────────── */
const IconFile = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={icon14Style}><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 5h6M5 8h6M5 11h4" /></svg>;
const IconPen = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={icon14Style}><path d="M11 2.5a1.5 1.5 0 0 1 2.12 0l.38.38a1.5 1.5 0 0 1 0 2.12L6 12.5 2.5 13.5 3.5 10z" /></svg>;
const IconChat = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={icon14Style}><path d="M14 3H2v8h5l3 3v-3h4z" /></svg>;
const IconCheck = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={icon14Style}><circle cx="8" cy="8" r="5.5" /><polyline points="5.5 8 7 10 10.5 6" /></svg>;
const IconDollar = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={icon14Style}><line x1="8" y1="1.5" x2="8" y2="14.5" /><path d="M11 4.5H6.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H5" /></svg>;
const IconTrend = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={icon14Style}><polyline points="14 4 9 9 6 6 2 12" /><polyline points="10 4 14 4 14 8" /></svg>;
const IconSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={icon13Style}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
const IconExpand = ({ open }: { open: boolean }) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 4 10 8 6 12" /></svg>;

/* ── Segmented Control ───────────────────────────────────────── */
const SegmentedControl = ({ items, value, onChange }: { items: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) => (
  <div style={segmentedContainerStyle}>
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
    {currentSort === sortKey && <span style={sortArrowStyle}>{currentDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
  </th>
);

// ── Extracted static styles (performance: avoid re-creating objects each render) ──
const endoPageContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' };
const endoTabFlexStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 };
const endoToolbarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, flexWrap: 'wrap' };
const endoTableCardBg: React.CSSProperties = { flex: 1, overflow: 'auto', background: 'var(--card)' };
const endoTableFixed: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' };
const endoSeparatorStyle: React.CSSProperties = { width: 1, height: 22, background: 'var(--border-dk)', flexShrink: 0 };
const endoThBase: React.CSSProperties = { background: 'var(--neutral-50)', color: 'var(--neutral-500)', fontWeight: 700, padding: '9px 10px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, borderBottom: '1px solid var(--neutral-200)' };
const endoFooterStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--neutral-50)', borderTop: '1.5px solid var(--border-dk)', flexShrink: 0, fontSize: 11, color: 'var(--muted)' };
const bomThStyle: React.CSSProperties = { background: 'var(--neutral-50)', padding: '5px 8px', fontSize: 9, fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', borderBottom: '1px solid var(--neutral-200)' };
const bomThCenterStyle: React.CSSProperties = { ...bomThStyle, textAlign: 'center' };
const bomThRightStyle: React.CSSProperties = { ...bomThStyle, textAlign: 'right' };
const bomTdStyle: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid var(--border)' };
const bomTdCenterStyle: React.CSSProperties = { ...bomTdStyle, textAlign: 'center' };
const bomTdRightStyle: React.CSSProperties = { ...bomTdStyle, textAlign: 'right' };
const cellStyleCenter: React.CSSProperties = { ...cellStyle, textAlign: 'center' };
const cellStyleRightBold: React.CSSProperties = { ...cellStyle, textAlign: 'right', fontWeight: 700 };
const cellStyleNavyBold: React.CSSProperties = { ...cellStyle, fontWeight: 700, color: 'var(--navy)' };
const cellStyleRightWeight600: React.CSSProperties = { ...cellStyle, textAlign: 'right', fontWeight: 600 };
const navyBtnStyle: React.CSSProperties = { height: 30, padding: '0 14px', border: 'none', borderRadius: 5, background: 'var(--navy)', color: 'var(--card)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 };
const navyBtnDisabledStyle: React.CSSProperties = { ...navyBtnStyle, cursor: 'not-allowed', opacity: 0.5 };
const plusIconStyle: React.CSSProperties = { width: 12, height: 12 };
const filterLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.04em' };
const selectStyle: React.CSSProperties = { height: 30, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 8px', fontSize: 11, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--card)', outline: 'none', cursor: 'pointer', minWidth: 130 };
const searchWrapStyle: React.CSSProperties = { position: 'relative', marginLeft: 'auto' };
const searchIconWrapStyle: React.CSSProperties = { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' };
const searchInputStyle: React.CSSProperties = { height: 30, width: 200, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 10px 0 30px', fontSize: 11, fontFamily: 'inherit', outline: 'none', background: 'var(--card)' };
const searchInputWideStyle: React.CSSProperties = { ...searchInputStyle, width: 220 };
const pagerBtnStyle: React.CSSProperties = { height: 36, minWidth: 36, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, background: 'var(--card)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' };
const pagerRowSelectStyle: React.CSSProperties = { height: 36, border: '1px solid var(--border-dk)', borderRadius: 4, padding: '0 6px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' };
const noRecordsStyle: React.CSSProperties = { textAlign: 'center', padding: 30, color: 'var(--muted)' };
const bomExpandThStyle: React.CSSProperties = { background: 'var(--primary-light)', padding: '4px 8px', fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', textAlign: 'left' };
const bomExpandThCenterStyle: React.CSSProperties = { ...bomExpandThStyle, textAlign: 'center' };
const bomExpandThRightStyle: React.CSSProperties = { ...bomExpandThStyle, textAlign: 'right' };
const bomExpandTdStyle: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid var(--border)' };
const bomExpandTdCenterStyle: React.CSSProperties = { ...bomExpandTdStyle, textAlign: 'center' };
const bomExpandTdRightStyle: React.CSSProperties = { ...bomExpandTdStyle, textAlign: 'right' };
const bomExpandContainerStyle: React.CSSProperties = { padding: '8px 16px 12px 32px', background: 'var(--neutral-50)' };
const bomExpandTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 11 };
const expandBomBtnStyle: React.CSSProperties = { height: 36, minWidth: 36, padding: '0 10px', fontSize: 11, borderRadius: 4, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 };
const spinnerCenterStyle: React.CSSProperties = { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const detailPaneStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' };
const detailCloseRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '6px 12px', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 };
const detailCloseBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', lineHeight: 1, padding: '0 4px' };
const detailScrollStyle: React.CSSProperties = { flex: 1, overflow: 'auto' };
const overviewPaneStyle: React.CSSProperties = { padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 };
const docEmptyStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--muted)', textAlign: 'center', gap: 8 };
const docIconStyle: React.CSSProperties = { width: 40, height: 40 };
const detailFooterStyle: React.CSSProperties = { padding: '10px 18px', borderTop: '1.5px solid var(--border-dk)', background: 'var(--neutral-50)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 };
const notesTextStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text)', lineHeight: 1.5 };
const bomTableWrapStyle: React.CSSProperties = { margin: '-10px -12px', padding: 0 };
const bomTableInnerStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 11 };
const bomFooterRowStyle: React.CSSProperties = { fontWeight: 700, background: 'var(--neutral-50)' };
const bomFooterTdStyle: React.CSSProperties = { padding: '5px 8px', textAlign: 'right' };
const statStripBarStyle: React.CSSProperties = { display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' };
const splitFlexStyle: React.CSSProperties = { display: 'flex', flex: 1, overflow: 'hidden' };
const pagerContainerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 };
const pagerRowsStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' };
const pagerBtnsStyle: React.CSSProperties = { display: 'flex', gap: 3, alignItems: 'center' };
const rightPanelStyle: React.CSSProperties = { width: 520, minWidth: 520, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--card)' };
const pagerSpanStyle: React.CSSProperties = { fontSize: 11, padding: '0 8px' };
const detailFooterTextStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)' };
const docEmptyTitleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--muted)' };
const docSubtextStyle: React.CSSProperties = { fontSize: 11 };
const icon14Style: React.CSSProperties = { width: 14, height: 14 };
const icon13Style: React.CSSProperties = { width: 13, height: 13 };
const icon12Style: React.CSSProperties = { width: 12, height: 12 };
const footerRecordCountStyle: React.CSSProperties = { fontWeight: 500 };
const footerPagerRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12 };
const footerRowsCountStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted)' };
const segmentedContainerStyle: React.CSSProperties = { display: 'inline-flex', border: '1.5px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden' };
const sortArrowStyle: React.CSSProperties = { fontSize: 9, marginLeft: 3 };
const quoteNumCellStyle: React.CSSProperties = { fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' };
const cellStyleComplaintWrap: React.CSSProperties = { ...cellStyle, whiteSpace: 'normal', lineHeight: 1.3 };
const bomExpandTdBorderStyle: React.CSSProperties = { padding: 0, borderBottom: '1px solid var(--border)' };
const badgeInnerStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' };
const statChipIconBoxStyle: React.CSSProperties = { width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 };
const statChipTextColStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const statChipLabelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.2, whiteSpace: 'nowrap' };
const sectionCardOuterStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden', flexShrink: 0 };
const sectionCardHeadStyle: React.CSSProperties = { background: 'var(--neutral-50)', padding: '6px 12px', fontSize: 10, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' };
const sectionCardBodyStyle: React.CSSProperties = { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 };

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
const cellStyle: React.CSSProperties = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

/* ── Section Card (for detail pane) ─────────────────────────── */
const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={sectionCardOuterStyle}>
    <div style={sectionCardHeadStyle}>{title}</div>
    <div style={sectionCardBodyStyle}>{children}</div>
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
    } catch { /* silently handle */ }
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
    } catch { /* silently handle */ }
    finally { setServiceLoading(false); }
  }, [serviceSearch, servicePage]);

  useEffect(() => {
    if (activeTab === 'service-history') { const t = setTimeout(() => loadServiceHistory(), serviceSearch ? 300 : 0); return () => clearTimeout(t); }
  }, [activeTab, loadServiceHistory, serviceSearch]);

  /* ── Tab bar and status segments use module-level constants ─── */

  /* ── Quote detail pane content ─── */
  const quoteDetailPane = selectedQuote ? (
    <div style={detailPaneStyle}>
      {/* Close row */}
      <div style={detailCloseRowStyle}>
        <button
          onClick={() => setSelectedKey(null)}
          style={detailCloseBtnStyle}
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

      <div style={detailScrollStyle}>
        {/* Overview pane */}
        {drawerTab === 'overview' && (
          <div style={overviewPaneStyle}>
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
              <span style={notesTextStyle}>{selectedQuote.notes || '\u2014'}</span>
            </SectionCard>
          </div>
        )}

        {/* BOM pane */}
        {drawerTab === 'bom' && (
          <div style={overviewPaneStyle}>
            <SectionCard title="Bill of Materials">
              <div style={bomTableWrapStyle}>
                <table style={bomTableInnerStyle}>
                  <thead>
                    <tr>
                      <th style={bomThStyle}>Part #</th>
                      <th style={bomThStyle}>Description</th>
                      <th style={bomThCenterStyle}>Qty</th>
                      <th style={bomThRightStyle}>Unit Cost</th>
                      <th style={bomThRightStyle}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuote.items.map((it, i) => (
                      <tr key={i}>
                        <td style={bomTdStyle}>{it.partNum}</td>
                        <td style={bomTdStyle}>{it.desc}</td>
                        <td style={bomTdCenterStyle}>{it.qty}</td>
                        <td style={bomTdRightStyle}>{fmtMoney(it.unitCost)}</td>
                        <td style={bomTdRightStyle}>{fmtMoney(it.unitCost * it.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={bomFooterRowStyle}>
                      <td colSpan={4} style={bomFooterTdStyle}>Subtotal</td>
                      <td style={bomFooterTdStyle}>{fmtMoney(selectedQuote.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        {/* Documents pane */}
        {drawerTab === 'docs' && (
          <div style={docEmptyStyle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--border-dk)" strokeWidth="1.5" style={docIconStyle}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
            <div style={docEmptyTitleStyle}>No documents attached</div>
            <div style={docSubtextStyle}>Quotes, specs, and supporting documents will appear here.</div>
          </div>
        )}
      </div>

      {/* Detail footer */}
      <div style={detailFooterStyle}>
        <span style={detailFooterTextStyle}>Quote detail</span>
      </div>
    </div>
  ) : null;

  return (
    <div style={endoPageContainerStyle}>

      {/* ── Sub-Tab Bar ─── */}
      <TabBar tabs={ENDO_TABS} activeKey={activeTab} onChange={k => { setActiveTab(k as typeof activeTab); setSelectedKey(null); }} />

      {/* ════════════════════════════════════════════════════════ */}
      {/* QUOTES TAB — split-pane                                 */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'quotes' && (
        <div style={splitFlexStyle}>
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
            <div style={statStripBarStyle}>
              <StatChip label="Total Quotes" value={stats.total} iconBg="rgba(var(--navy-rgb), 0.12)" iconColor="var(--navy)" valueColor="var(--navy)" icon={<IconFile />} active={chipFilter === ''} onClick={() => { setChipFilter(''); setPage(1); }} />
              <StatChip label="Draft" value={stats.draft} iconBg="rgba(var(--amber-rgb), 0.13)" iconColor="var(--warning)" valueColor="var(--warning)" icon={<IconPen />} active={chipFilter === 'Draft'} onClick={() => { setChipFilter(f => f === 'Draft' ? '' : 'Draft'); setPage(1); }} />
              <StatChip label="Quoted" value={stats.quoted} iconBg="rgba(var(--primary-rgb), 0.12)" iconColor="var(--primary)" valueColor="var(--primary)" icon={<IconChat />} active={chipFilter === 'Quoted'} onClick={() => { setChipFilter(f => f === 'Quoted' ? '' : 'Quoted'); setPage(1); }} />
              <StatChip label="Approved" value={stats.approved} iconBg="rgba(var(--success-rgb), 0.12)" iconColor="var(--success)" valueColor="var(--success)" icon={<IconCheck />} active={chipFilter === 'Approved'} onClick={() => { setChipFilter(f => f === 'Approved' ? '' : 'Approved'); setPage(1); }} />
              <StatChip label="Billed" value={stats.billed} iconBg="rgba(var(--navy-rgb), 0.12)" iconColor="var(--navy)" valueColor="var(--navy)" icon={<IconDollar />} active={chipFilter === 'Billed'} onClick={() => { setChipFilter(f => f === 'Billed' ? '' : 'Billed'); setPage(1); }} />
              <StatChip label="Pipeline Value" value={fmtMoneyShort(stats.pipelineValue)} iconBg="rgba(var(--navy-rgb), 0.12)" iconColor="var(--navy)" valueColor="var(--navy)" icon={<IconTrend />} />
            </div>

            {/* Toolbar */}
            <div style={endoToolbarStyle}>
              <button style={navyBtnStyle}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={icon12Style}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                New Quote
              </button>
              <div style={endoSeparatorStyle} />
              <span style={filterLabelStyle}>Status</span>
              <SegmentedControl items={STATUS_SEGMENTS} value={filters.status} onChange={v => { setFilters(f => ({ ...f, status: v })); setChipFilter(''); setPage(1); }} />
              <div style={endoSeparatorStyle} />
              <select value={filters.rep} onChange={e => { setFilters(f => ({ ...f, rep: e.target.value })); setPage(1); }} style={selectStyle}>
                <option value="">All Sales Reps</option>
                {SALES_REPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div style={searchWrapStyle}>
                <span style={searchIconWrapStyle}><IconSearch /></span>
                <input placeholder="Search quote#, client, model..." aria-label="Search EndoCart quotes" value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} style={{
                  height: 30, width: 200, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 10px 0 30px', fontSize: 11, fontFamily: 'inherit', outline: 'none', background: 'var(--card)',
                }} />
              </div>
            </div>

            {/* Data Table */}
            <div style={endoTableCardBg}>
              <table style={endoTableFixed}>
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
                    <tr><td colSpan={10} style={noRecordsStyle}>No records match current filters.</td></tr>
                  ) : displayQuotes.map((q, idx) => (
                    <tr
                      key={q.lQuoteKey}
                      style={rowStyle(idx, false, q.lQuoteKey === selectedKey)}
                      onClick={() => openDetail(q.lQuoteKey)}
                      onMouseEnter={e => { if (q.lQuoteKey !== selectedKey) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }}
                      onMouseLeave={e => { if (q.lQuoteKey !== selectedKey) (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 1 ? 'var(--row-alt)' : 'var(--card)'; }}
                    >
                      <td style={cellStyle}><span style={quoteNumCellStyle}>{q.quoteNum}</span></td>
                      <td style={cellStyle}>{q.clientName}</td>
                      <td style={cellStyle}>{q.deptName}</td>
                      <td style={cellStyle}>{q.cartModel}</td>
                      <td style={cellStyleCenter}>{q.itemCount}</td>
                      <td style={cellStyleRightBold}>{fmtMoney(q.total)}</td>
                      <td style={cellStyle}><StatusBadge status={q.status} /></td>
                      <td style={cellStyle}>{fmtDate(q.dateCreated)}</td>
                      <td style={cellStyle}>{fmtDate(q.dateQuoted)}</td>
                      <td style={cellStyle}>{q.salesRep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div style={endoFooterStyle}>
              <span style={footerRecordCountStyle}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
              <div style={footerPagerRowStyle}>
                <div style={footerRowsCountStyle}>
                  Rows:
                  <select value={pageSize} onChange={e => { setPageSize(e.target.value === 'All' ? 9999 : Number(e.target.value)); setPage(1); }} style={pagerRowSelectStyle}>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value="All">All</option>
                  </select>
                </div>
                <div style={pagerBtnsStyle}>
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ ...pagerBtnStyle, opacity: page <= 1 ? 0.4 : 1 }}>&laquo;</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(p => (
                    <button key={p} onClick={() => setPage(p)} style={{
                      ...pagerBtnStyle,
                      background: p === page ? 'var(--navy)' : 'var(--card)', color: p === page ? 'var(--card)' : 'var(--muted)', fontWeight: p === page ? 600 : 400,
                    }}>{p}</button>
                  ))}
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ ...pagerBtnStyle, opacity: page >= totalPages ? 0.4 : 1 }}>&raquo;</button>
                </div>
              </div>
            </div>
          </aside>

          {/* Right panel — quote detail */}
          {selectedKey && (
            <section aria-label="Quote details" style={rightPanelStyle}>
              {quoteDetailPane}
            </section>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* CATALOG TAB                                             */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'catalog' && (
        <div style={endoTabFlexStyle}>
          <div style={endoToolbarStyle}>
            <button disabled style={navyBtnDisabledStyle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={icon12Style}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Add Component
            </button>
            <div style={endoSeparatorStyle} />
            <span style={filterLabelStyle}>Category</span>
            <select value={catCategory} onChange={e => setCatCategory(e.target.value)} style={{
              height: 30, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 8px', fontSize: 11, fontFamily: 'inherit',
              color: 'var(--text)', background: 'var(--card)', outline: 'none', cursor: 'pointer', minWidth: 130,
            }}>
              <option value="">All Categories</option>
              {CATALOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={searchWrapStyle}>
              <span style={searchIconWrapStyle}><IconSearch /></span>
              <input placeholder="Search parts..." aria-label="Search EndoCart parts catalog" value={catSearch} onChange={e => setCatSearch(e.target.value)} style={searchInputStyle} />
            </div>
          </div>
          <div style={endoTableCardBg}>
            <table style={endoTableFixed}>
              <thead>
                <tr>
                  <th style={{ ...endoThBase, width: 100 }}>Part #</th>
                  <th style={endoThBase}>Description</th>
                  <th style={{ ...endoThBase, width: 90 }}>Category</th>
                  <th style={{ ...endoThBase, width: 90, textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ ...endoThBase, width: 70, textAlign: 'center' }}>Stock</th>
                  <th style={{ ...endoThBase, width: 80, textAlign: 'center' }}>Reorder Pt</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map((p, idx) => (
                  <tr key={p.partNum} style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : 'var(--card)' }}>
                    <td style={cellStyleNavyBold}>{p.partNum}</td>
                    <td style={cellStyle}>{p.desc}</td>
                    <td style={cellStyle}><Badge text={p.category} style={CAT_BADGE[p.category]} /></td>
                    <td style={cellStyleRightWeight600}>{fmtMoney(p.unitCost)}</td>
                    <td style={{ ...cellStyleCenter, color: p.stock <= p.reorderPt ? 'var(--danger)' : undefined, fontWeight: p.stock <= p.reorderPt ? 700 : 400 }}>{p.stock}</td>
                    <td style={cellStyleCenter}>{p.reorderPt}</td>
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
        <div style={endoTabFlexStyle}>
          <div style={endoToolbarStyle}>
            <button disabled style={navyBtnDisabledStyle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={icon12Style}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New Model
            </button>
            <div style={searchWrapStyle}>
              <span style={searchIconWrapStyle}><IconSearch /></span>
              <input placeholder="Search models..." aria-label="Search EndoCart models" value={modelSearch} onChange={e => setModelSearch(e.target.value)} style={searchInputStyle} />
            </div>
          </div>
          <div style={endoTableCardBg}>
            <table style={endoTableFixed}>
              <thead>
                <tr>
                  <th style={{ ...endoThBase, width: 160 }}>Model Name</th>
                  <th style={endoThBase}>Description</th>
                  <th style={{ ...endoThBase, width: 90, textAlign: 'center' }}>Components</th>
                  <th style={{ ...endoThBase, width: 100, textAlign: 'right' }}>Base Price</th>
                  <th style={{ ...endoThBase, width: 80, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((m, idx) => (
                  <>
                    <tr key={m.lModelKey} style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : 'var(--card)', cursor: 'pointer' }} onClick={() => setExpandedModel(k => k === m.lModelKey ? null : m.lModelKey)}>
                      <td style={cellStyleNavyBold}>{m.modelName}</td>
                      <td style={cellStyle}>{m.desc}</td>
                      <td style={cellStyleCenter}>{m.componentCount}</td>
                      <td style={cellStyleRightBold}>{fmtMoney(m.basePrice)}</td>
                      <td style={cellStyleCenter}>
                        <button onClick={e => { e.stopPropagation(); setExpandedModel(k => k === m.lModelKey ? null : m.lModelKey); }} style={expandBomBtnStyle}>
                          <IconExpand open={expandedModel === m.lModelKey} /> BOM
                        </button>
                      </td>
                    </tr>
                    {expandedModel === m.lModelKey && (
                      <tr key={`bom-${m.lModelKey}`}>
                        <td colSpan={5} style={bomExpandTdBorderStyle}>
                          <div style={bomExpandContainerStyle}>
                            <table style={bomExpandTableStyle}>
                              <thead>
                                <tr>
                                  <th style={bomExpandThStyle}>Part #</th>
                                  <th style={bomExpandThStyle}>Description</th>
                                  <th style={bomExpandThCenterStyle}>Qty</th>
                                  <th style={bomExpandThRightStyle}>Unit Cost</th>
                                  <th style={bomExpandThRightStyle}>Line Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {m.components.map((c, ci) => (
                                  <tr key={ci}>
                                    <td style={bomExpandTdStyle}>{c.partNum}</td>
                                    <td style={bomExpandTdStyle}>{c.desc}</td>
                                    <td style={bomExpandTdCenterStyle}>{c.qty}</td>
                                    <td style={bomExpandTdRightStyle}>{fmtMoney(c.unitCost)}</td>
                                    <td style={bomExpandTdRightStyle}>{fmtMoney(c.unitCost * c.qty)}</td>
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
        <div style={endoTabFlexStyle}>
          <div style={endoToolbarStyle}>
            <span style={filterLabelStyle}>Type</span>
            <SegmentedControl
              items={[{ label: 'All', value: '' }, { label: 'Flexible', value: 'F' }, { label: 'Rigid', value: 'R' }]}
              value={scopeTypeFilter}
              onChange={v => { setScopeTypeFilter(v); setScopePage(1); }}
            />
            <div style={searchWrapStyle}>
              <span style={searchIconWrapStyle}><IconSearch /></span>
              <input placeholder="Search serial#, type, client..." aria-label="Search EndoCart scopes" value={scopeSearch} onChange={e => { setScopeSearch(e.target.value); setScopePage(1); }} style={searchInputWideStyle} />
            </div>
          </div>
          {scopeLoading ? (
            <div style={spinnerCenterStyle}><Spin /></div>
          ) : (
            <div style={endoTableCardBg}>
              <table style={endoTableFixed}>
                <thead>
                  <tr>
                    {[
                      { label: 'Serial #', w: 120 }, { label: 'Scope Type', w: '20%' as string | number }, { label: 'Manufacturer', w: '14%' },
                      { label: 'Client', w: '18%' }, { label: 'Department', w: '14%' }, { label: 'Type', w: 60 },
                      { label: 'Status', w: 70 }, { label: 'Last Update', w: 95 },
                    ].map(col => (
                      <th key={col.label} style={{ ...endoThBase, width: col.w }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scopeItems.length === 0 ? (
                    <tr><td colSpan={8} style={noRecordsStyle}>No scopes found.</td></tr>
                  ) : scopeItems.map((s, idx) => (
                    <tr key={s.scopeKey} style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : 'var(--card)' }}>
                      <td style={cellStyleNavyBold}>{s.serialNumber || '\u2014'}</td>
                      <td style={cellStyle}>{s.scopeType}</td>
                      <td style={cellStyle}>{s.manufacturer}</td>
                      <td style={cellStyle}>{s.clientName}</td>
                      <td style={cellStyle}>{s.departmentName}</td>
                      <td style={cellStyle}>
                        {s.rigidOrFlexible === 'F'
                          ? <StatusBadge status="Flexible" />
                          : s.rigidOrFlexible === 'R'
                            ? <StatusBadge status="Scope" />
                            : <span>{'\u2014'}</span>}
                      </td>
                      <td style={cellStyle}>
                        <StatusBadge status={s.isDead ? 'Inactive' : 'Active'} />
                      </td>
                      <td style={cellStyle}>{s.lastUpdate || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Footer */}
          <div style={endoFooterStyle}>
            <span style={footerRecordCountStyle}>{scopeTotal} scope{scopeTotal !== 1 ? 's' : ''}</span>
            <div style={pagerBtnsStyle}>
              <button disabled={scopePage <= 1} onClick={() => setScopePage(p => p - 1)} style={{ ...pagerBtnStyle, opacity: scopePage <= 1 ? 0.4 : 1 }}>&laquo;</button>
              <span style={pagerSpanStyle}>Page {scopePage}</span>
              <button disabled={scopePage * 50 >= scopeTotal} onClick={() => setScopePage(p => p + 1)} style={{ ...pagerBtnStyle, opacity: scopePage * 50 >= scopeTotal ? 0.4 : 1 }}>&raquo;</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SERVICE HISTORY TAB                                      */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'service-history' && (
        <div style={endoTabFlexStyle}>
          <div style={endoToolbarStyle}>
            <div style={searchWrapStyle}>
              <span style={searchIconWrapStyle}><IconSearch /></span>
              <input placeholder="Search WO#, serial#, client..." aria-label="Search EndoCart service history" value={serviceSearch} onChange={e => { setServiceSearch(e.target.value); setServicePage(1); }} style={searchInputWideStyle} />
            </div>
          </div>
          {serviceLoading ? (
            <div style={spinnerCenterStyle}><Spin /></div>
          ) : (
            <div style={endoTableCardBg}>
              <table style={endoTableFixed}>
                <thead>
                  <tr>
                    {[
                      { label: 'Work Order', w: 110 }, { label: 'Serial #', w: 110 }, { label: 'Scope Type', w: '16%' as string | number },
                      { label: 'Client', w: '18%' }, { label: 'Status', w: 90 }, { label: 'Date In', w: 90 },
                      { label: 'Date Out', w: 90 }, { label: 'Complaint', w: '20%' }, { label: 'Total', w: 90 },
                    ].map(col => (
                      <th key={col.label} style={{ ...endoThBase, width: col.w, textAlign: col.label === 'Total' ? 'right' : 'left' }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {serviceItems.length === 0 ? (
                    <tr><td colSpan={9} style={noRecordsStyle}>No repair history found.</td></tr>
                  ) : serviceItems.map((r, idx) => (
                    <tr key={r.repairKey} style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : 'var(--card)' }}>
                      <td style={cellStyleNavyBold}>{r.workOrderNumber || '\u2014'}</td>
                      <td style={cellStyle}>{r.serialNumber || '\u2014'}</td>
                      <td style={cellStyle}>{r.scopeType}</td>
                      <td style={cellStyle}>{r.clientName}</td>
                      <td style={cellStyle}>
                        <StatusBadge status={r.repairStatus} />
                      </td>
                      <td style={cellStyle}>{r.dateIn || '\u2014'}</td>
                      <td style={cellStyle}>{r.dateOut || '\u2014'}</td>
                      <td style={cellStyleComplaintWrap}>{r.complaint || '\u2014'}</td>
                      <td style={cellStyleRightBold}>{fmtMoney(r.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Footer */}
          <div style={endoFooterStyle}>
            <span style={footerRecordCountStyle}>{serviceTotal} repair{serviceTotal !== 1 ? 's' : ''}</span>
            <div style={pagerBtnsStyle}>
              <button disabled={servicePage <= 1} onClick={() => setServicePage(p => p - 1)} style={{ ...pagerBtnStyle, opacity: servicePage <= 1 ? 0.4 : 1 }}>&laquo;</button>
              <span style={pagerSpanStyle}>Page {servicePage}</span>
              <button disabled={servicePage * 50 >= serviceTotal} onClick={() => setServicePage(p => p + 1)} style={{ ...pagerBtnStyle, opacity: servicePage * 50 >= serviceTotal ? 0.4 : 1 }}>&raquo;</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
