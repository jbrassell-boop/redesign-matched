import { useState, useEffect, useCallback, useRef } from 'react';
import { message, Modal, Form, Input, Select } from 'antd';
import { getQualityInspections, getQualityStats, getQualityNcr, getQualityRework } from '../../api/quality';
import type { QualityInspectionListItem, QualityStats, QualityFilters, NcrListItem, ReworkListItem } from './types';
import { ExportButton } from '../../components/common/ExportButton';

const EXPORT_COLS = [
  { key: 'workOrderNumber', label: 'WO#' },
  { key: 'inspectionType', label: 'Inspection Type' },
  { key: 'result', label: 'Result' },
  { key: 'inspectionDate', label: 'Inspection Date' },
  { key: 'clientName', label: 'Client' },
];
import { StatusBadge } from '../../components/shared/StatusBadge';
import { TabBar } from '../../components/shared/TabBar';
import type { TabDef } from '../../components/shared/TabBar';

// ── Stat Strip ─────────────────────────────────────────────────────────────────

interface StatChipProps {
  label: string;
  value: string | number;
  iconColor: string;
  iconBg: string;
  valueColor: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  clickable?: boolean;
}

const StatChip = ({ label, value, iconColor, iconBg, valueColor, icon, active, onClick, clickable = true }: StatChipProps) => (
  <div
    onClick={clickable ? onClick : undefined}
    role={clickable ? 'button' : undefined}
    tabIndex={clickable ? 0 : undefined}
    onKeyDown={clickable && onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    aria-pressed={clickable ? active : undefined}
    style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 16px',
      cursor: clickable ? 'pointer' : 'default',
      borderRight: '1px solid var(--neutral-200)',
      background: active ? 'var(--primary-light)' : undefined,
      outline: active ? '2.5px solid var(--navy)' : undefined,
      outlineOffset: active ? -2 : undefined,
      transition: 'background 0.12s',
    }}
    className={active ? 'active' : clickable ? 'tab-card-hover' : undefined}
  >
    <div style={{ ...iconBgBaseStyle, background: iconBg, color: iconColor }}>
      {icon}
    </div>
    <div>
      <div style={{ ...statValueStyle, color: valueColor }}>{value}</div>
      <div style={statLabelStyle}>{label}</div>
    </div>
  </div>
);

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const IconShield = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconCheck = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconCheckDouble = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IconWarn = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconX = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const IconDollar = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const TABS: TabDef[] = [
  { key: 'QC Inspections', label: 'QC Inspections' },
  { key: 'Non-Conformances', label: 'Non-Conformances' },
  { key: 'CAPA Log', label: 'CAPA Log' },
  { key: 'Rework Tracking', label: 'Rework Tracking' },
  { key: 'Reports', label: 'Reports' },
];

// ── Extracted static styles (performance: avoid re-creating objects each render) ──
const pageContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' };
const statStripStyle: React.CSSProperties = { display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0 };
const tabFlexColumnStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 };
const toolbarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)', flexShrink: 0, flexWrap: 'wrap' };
const filterLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
const segmentedWrapStyle: React.CSSProperties = { display: 'inline-flex', border: '1px solid var(--border-dk)', borderRadius: 'var(--radius-md)', overflow: 'hidden' };
const separatorStyle: React.CSSProperties = { width: 1, height: 22, background: 'var(--border-dk)', flexShrink: 0 };
const dateInputStyle: React.CSSProperties = { height: 30, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 8px', fontSize: 11, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--card)', outline: 'none', cursor: 'pointer', width: 120 };
const dateToLabelStyle: React.CSSProperties = { fontSize: 10, color: 'var(--muted)' };
const searchInputStyle: React.CSSProperties = { marginLeft: 'auto', height: 30, width: 220, border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '0 10px 0 30px', fontSize: 11, fontFamily: 'inherit', outline: 'none', background: `var(--card) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='M21 21l-4.35-4.35'/%3E%3C/svg%3E") no-repeat 10px center` };
const ncrSearchInputStyle: React.CSSProperties = { ...searchInputStyle, width: 240 };
const capaSearchInputStyle: React.CSSProperties = { ...searchInputStyle, width: 260 };
const tableCardBgStyle: React.CSSProperties = { flex: 1, overflow: 'auto', background: 'var(--card)' };
const tableFixedStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' };
const thCellStyle: React.CSSProperties = { background: 'var(--neutral-50)', color: 'var(--neutral-500)', fontWeight: 700, padding: '8px 10px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11, position: 'sticky', top: 0, zIndex: 2, whiteSpace: 'nowrap', borderRight: '1px solid rgba(var(--primary-rgb), 0.15)', borderBottom: '1px solid var(--neutral-200)', userSelect: 'none' };
const tdCellStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const tdCellMutedStyle: React.CSSProperties = { ...tdCellStyle, color: 'var(--muted)' };
const tdCellNoBorderStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid var(--border)' };
const tdCellDateMutedStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', color: 'var(--muted)' };
const emptyRowStyle: React.CSSProperties = { textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 };
const footerBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'var(--neutral-50)', borderTop: '1.5px solid var(--border-dk)', flexShrink: 0, fontSize: 11, color: 'var(--muted)' };
const paginationWrapStyle: React.CSSProperties = { display: 'flex', gap: 3, alignItems: 'center' };
const navyBoldStyle: React.CSSProperties = { fontWeight: 700, color: 'var(--navy)' };
const newBtnStyle: React.CSSProperties = { height: 30, padding: '0 14px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', background: 'var(--navy)', color: 'var(--card)', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 };
const woLinkStyle: React.CSSProperties = { fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' };
const fontWeight500Style: React.CSSProperties = { fontWeight: 500 };
const pageBtnBaseStyle: React.CSSProperties = { height: 36, minWidth: 36, padding: '0 6px', border: '1px solid var(--border-dk)', borderRadius: 4, background: 'var(--card)', fontSize: 11, color: 'var(--label)', fontFamily: 'inherit' };
const reportCardBaseStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--neutral-200)', borderRadius: 'var(--radius-lg)', padding: 18, cursor: 'pointer', transition: 'box-shadow 0.15s' };
const reportIconWrapStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 };
const reportIconBoxStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: 6, background: 'rgba(var(--navy-rgb), 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)' };
const reportTitleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)' };
const reportDescStyle: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 };
const reportGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 };
const reportsTabContentStyle: React.CSSProperties = { flex: 1, overflow: 'auto', padding: 16 };
const iconBgBaseStyle: React.CSSProperties = { width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const statValueStyle: React.CSSProperties = { fontSize: 16, fontWeight: 800, lineHeight: 1.2 };
const statLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' };

const QC_COLS = [
  { label: 'WO#', width: 90 },
  { label: 'Type', width: 120 },
  { label: 'Client', width: 200 },
  { label: 'Scope S/N', width: 130 },
  { label: 'Tech Key', width: 100 },
  { label: 'Date', width: 100 },
  { label: 'Result', width: 110 },
];

const NCR_COLS = [
  { label: 'NCR#', width: 90 },
  { label: 'WO#', width: 90 },
  { label: 'Description', width: 220 },
  { label: 'Category', width: 100 },
  { label: 'Severity', width: 90 },
  { label: 'Status', width: 110 },
  { label: 'Date Filed', width: 100 },
];

const CAPA_COLS = [
  { label: 'CAPA#', width: 90 },
  { label: 'NCR Ref', width: 90 },
  { label: 'Type', width: 100 },
  { label: 'Description', width: 220 },
  { label: 'Owner', width: 120 },
  { label: 'Due Date', width: 100 },
  { label: 'Status', width: 100 },
];

const REWORK_COLS = [
  { label: 'RW#', width: 80 },
  { label: 'WO#', width: 90 },
  { label: 'Serial#', width: 120 },
  { label: 'Reason', width: 210 },
  { label: 'Tech', width: 120 },
  { label: 'Original Complete', width: 110 },
  { label: 'Rework Due', width: 100 },
  { label: 'Status', width: 100 },
];

export const QualityPage = () => {
  const [activeTab, setActiveTab] = useState('QC Inspections');
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [inspections, setInspections] = useState<QualityInspectionListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [chipFilter, setChipFilter] = useState('');

  // NCR state
  const [ncrItems, setNcrItems] = useState<NcrListItem[]>([]);
  const [ncrTotal, setNcrTotal] = useState(0);
  const [ncrLoading, setNcrLoading] = useState(false);
  const [ncrSearch, setNcrSearch] = useState('');
  const [ncrStatusFilter, setNcrStatusFilter] = useState('');
  const [ncrPage, setNcrPage] = useState(1);

  // Rework state
  const [reworkItems, setReworkItems] = useState<ReworkListItem[]>([]);
  const [reworkTotal, setReworkTotal] = useState(0);
  const [reworkLoading, setReworkLoading] = useState(false);
  const [reworkSearch, setReworkSearch] = useState('');
  const [reworkStatusFilter, setReworkStatusFilter] = useState('');
  const [reworkPage, setReworkPage] = useState(1);

  // NCR modal
  const [ncrModalOpen, setNcrModalOpen] = useState(false);
  const [ncrForm] = Form.useForm();

  // CAPA modal
  const [capaModalOpen, setCapaModalOpen] = useState(false);
  const [capaForm] = Form.useForm();

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load stats once
  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    getQualityStats()
      .then(s => { if (!cancelled) setStats(s); })
      .catch(() => { if (!cancelled) message.error('Failed to load quality stats'); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const loadInspections = useCallback(async (filters: QualityFilters, cancelled: () => boolean) => {
    setLoading(true);
    try {
      const result = await getQualityInspections(filters);
      if (!cancelled()) {
        setInspections(result.inspections);
        setTotalCount(result.totalCount);
      }
    } catch {
      if (!cancelled()) message.error('Failed to load inspections');
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const delay = search ? 300 : 0;
    searchTimeout.current = setTimeout(() => {
      loadInspections({ search, dateFrom, dateTo, resultFilter, page, pageSize: PAGE_SIZE }, () => cancelled);
    }, delay);
    return () => { cancelled = true; if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search, dateFrom, dateTo, resultFilter, page, loadInspections]);

  // NCR data loading
  const loadNcr = useCallback(async (cancelled: () => boolean) => {
    setNcrLoading(true);
    try {
      const result = await getQualityNcr({
        search: ncrSearch || undefined,
        status: ncrStatusFilter || undefined,
        page: ncrPage,
        pageSize: PAGE_SIZE,
      });
      if (!cancelled()) {
        setNcrItems(result.items);
        setNcrTotal(result.totalCount);
      }
    } catch {
      if (!cancelled()) message.error('Failed to load non-conformances');
    } finally {
      if (!cancelled()) setNcrLoading(false);
    }
  }, [ncrSearch, ncrStatusFilter, ncrPage]);

  useEffect(() => {
    if (activeTab !== 'Non-Conformances') return;
    let cancelled = false;
    loadNcr(() => cancelled);
    return () => { cancelled = true; };
  }, [activeTab, loadNcr]);

  // Rework data loading
  const loadRework = useCallback(async (cancelled: () => boolean) => {
    setReworkLoading(true);
    try {
      const result = await getQualityRework({
        search: reworkSearch || undefined,
        status: reworkStatusFilter || undefined,
        page: reworkPage,
        pageSize: PAGE_SIZE,
      });
      if (!cancelled()) {
        setReworkItems(result.items);
        setReworkTotal(result.totalCount);
      }
    } catch {
      if (!cancelled()) message.error('Failed to load rework items');
    } finally {
      if (!cancelled()) setReworkLoading(false);
    }
  }, [reworkSearch, reworkStatusFilter, reworkPage]);

  useEffect(() => {
    if (activeTab !== 'Rework Tracking') return;
    let cancelled = false;
    loadRework(() => cancelled);
    return () => { cancelled = true; };
  }, [activeTab, loadRework]);

  const ncrTotalPages = Math.max(1, Math.ceil(ncrTotal / PAGE_SIZE));
  const reworkTotalPages = Math.max(1, Math.ceil(reworkTotal / PAGE_SIZE));

  const handleChipFilter = (result: string) => {
    const next = result === chipFilter ? '' : result;
    setChipFilter(next);
    setResultFilter(next || 'all');
    setPage(1);
  };

  const handleResultSegment = (val: string) => {
    setResultFilter(val);
    setChipFilter('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const segBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: active ? 700 : 500,
    color: active ? 'var(--navy)' : 'var(--muted)',
    background: active ? 'var(--primary-light)' : 'var(--card)',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.1s',
  });

  return (
    <section aria-label="Quality" style={pageContainerStyle}>

      {/* ── Stat Strip ── */}
      <div style={statStripStyle}>
        <StatChip
          label="Total Inspections"
          value={statsLoading ? '—' : (stats?.totalInspections ?? 0)}
          icon={<IconShield />}
          iconColor="var(--navy)"
          iconBg="rgba(var(--navy-rgb), 0.13)"
          valueColor="var(--navy)"
          active={chipFilter === ''}
          onClick={() => handleChipFilter('')}
        />
        <StatChip
          label="Pass"
          value={statsLoading ? '—' : (stats?.passCount ?? 0)}
          icon={<IconCheck />}
          iconColor="var(--success)"
          iconBg="rgba(var(--success-rgb), 0.13)"
          valueColor="var(--success)"
          active={chipFilter === 'Pass'}
          onClick={() => handleChipFilter('Pass')}
        />
        <StatChip
          label="First-Pass Yield"
          value={statsLoading ? '—' : `${stats?.firstPassYield ?? 0}%`}
          icon={<IconCheckDouble />}
          iconColor="var(--primary)"
          iconBg="rgba(var(--primary-rgb), 0.13)"
          valueColor="var(--primary)"
          active={false}
          clickable={false}
        />
        <StatChip
          label="Conditionals"
          value={statsLoading ? '—' : (stats?.conditionalCount ?? 0)}
          icon={<IconWarn />}
          iconColor="var(--warning)"
          iconBg="rgba(var(--amber-rgb), 0.13)"
          valueColor="var(--warning)"
          active={chipFilter === 'Conditional'}
          onClick={() => handleChipFilter('Conditional')}
        />
        <StatChip
          label="Failures"
          value={statsLoading ? '—' : (stats?.failCount ?? 0)}
          icon={<IconX />}
          iconColor="var(--danger)"
          iconBg="rgba(var(--danger-rgb), 0.13)"
          valueColor="var(--danger)"
          active={chipFilter === 'Fail'}
          onClick={() => handleChipFilter('Fail')}
        />
        <StatChip
          label="COPQ"
          value="—"
          icon={<IconDollar />}
          iconColor="var(--muted)"
          iconBg="rgba(var(--muted-rgb), 0.13)"
          valueColor="var(--muted)"
          clickable={false}
          active={false}
        />
      </div>

      {/* ── Subnav Tab Bar ── */}
      <TabBar
        tabs={TABS}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {/* ── Tab Content ── */}

      {activeTab === 'QC Inspections' && (
        <div style={tabFlexColumnStyle}>

          {/* Toolbar */}
          <div style={toolbarStyle}>
            {/* Result segmented control */}
            <span style={filterLabelStyle}>
              Result
            </span>
            <div style={segmentedWrapStyle}>
              {(['all', 'Pass', 'Conditional', 'Fail'] as const).map((v, i) => (
                <button
                  key={v}
                  onClick={() => handleResultSegment(v)}
                  style={{
                    ...segBtnStyle(resultFilter === v),
                    borderRight: i < 3 ? '1px solid var(--border-dk)' : 'none',
                  }}
                >
                  {v === 'all' ? 'All' : v}
                </button>
              ))}
            </div>

            {/* Separator */}
            <div style={separatorStyle} />

            {/* Date range */}
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              title="From date"
              aria-label="Filter from date"
              style={dateInputStyle}
            />
            <span style={dateToLabelStyle}>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              title="To date"
              aria-label="Filter to date"
              style={dateInputStyle}
            />

            {/* Search — right aligned */}
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search WO#, Serial#, Client..."
              aria-label="Search QC inspections"
              style={searchInputStyle}
            />

            {/* Export */}
            <ExportButton
              data={inspections as unknown as Record<string, unknown>[]}
              columns={EXPORT_COLS}
              filename="quality-inspections"
            />
          </div>

          {/* Table */}
          <div style={tableCardBgStyle}>
            <table style={tableFixedStyle}>
              <thead>
                <tr>
                  {QC_COLS.map(col => (
                    <th
                      key={col.label}
                      style={{ ...thCellStyle, width: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={emptyRowStyle}>
                      Loading...
                    </td>
                  </tr>
                ) : inspections.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={emptyRowStyle}>
                      No inspections found.
                    </td>
                  </tr>
                ) : (
                  inspections.map((item, idx) => (
                    <tr
                      key={item.inspectionKey}
                      style={{
                        background: idx % 2 === 1 ? 'var(--row-alt)' : undefined,
                        cursor: 'pointer',
                      }}
                      className="hover-row-light" 
                    >
                      <td style={tdCellStyle}>
                        <span style={woLinkStyle}>
                          {item.workOrderNumber}
                        </span>
                      </td>
                      <td style={tdCellStyle}>
                        <StatusBadge
                          status={item.inspectionType}
                          variant={item.inspectionType === 'D&I Intake' ? 'blue' : 'purple'}
                        />
                      </td>
                      <td style={tdCellStyle}>
                        {item.clientName}
                      </td>
                      <td style={tdCellMutedStyle}>
                        {item.scopeSN ?? '—'}
                      </td>
                      <td style={tdCellMutedStyle}>
                        {item.technicianKey ?? '—'}
                      </td>
                      <td style={tdCellMutedStyle}>
                        {item.inspectionDate}
                      </td>
                      <td style={tdCellStyle}>
                        <StatusBadge
                          status={item.result}
                          variant={item.result === 'Pass' ? 'green' : item.result === 'Fail' ? 'red' : 'amber'}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div style={footerBarStyle}>
            <span style={fontWeight500Style}>{totalCount.toLocaleString()} records</span>
            <div style={paginationWrapStyle}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={{
                  ...pageBtnBaseStyle,
                  cursor: page <= 1 ? 'default' : 'pointer',
                  opacity: page <= 1 ? 0.4 : 1,
                }}
              >
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const pg = i + 1;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    style={{
                      ...pageBtnBaseStyle,
                      background: page === pg ? 'var(--navy)' : 'var(--card)',
                      color: page === pg ? 'var(--card)' : 'var(--label)',
                      fontWeight: page === pg ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{
                  ...pageBtnBaseStyle,
                  cursor: page >= totalPages ? 'default' : 'pointer',
                  opacity: page >= totalPages ? 0.4 : 1,
                }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Non-Conformances' && (
        <div style={tabFlexColumnStyle}>
          {/* Toolbar */}
          <div style={toolbarStyle}>
            <button
              onClick={() => setNcrModalOpen(true)}
              style={newBtnStyle}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={12} height={12}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New NCR
            </button>
            <div style={separatorStyle} />
            <span style={filterLabelStyle}>Status</span>
            <div style={segmentedWrapStyle}>
              {(['', 'Open', 'Under Review', 'Closed'] as const).map((v, i) => (
                <button key={v} onClick={() => { setNcrStatusFilter(v); setNcrPage(1); }}
                  style={{ ...segBtnStyle(ncrStatusFilter === v), borderRight: i < 3 ? '1px solid var(--border-dk)' : 'none' }}>
                  {v || 'All'}
                </button>
              ))}
            </div>
            <input type="text" value={ncrSearch} onChange={e => { setNcrSearch(e.target.value); setNcrPage(1); }}
              placeholder="Search NCR#, WO#, description..."
              aria-label="Search non-conformance reports"
              style={ncrSearchInputStyle}
            />
          </div>

          {/* Table */}
          <div style={tableCardBgStyle}>
            <table style={tableFixedStyle}>
              <thead>
                <tr>
                  {NCR_COLS.map(col => (
                    <th key={col.label} style={{ ...thCellStyle, width: col.width }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ncrLoading ? (
                  <tr><td colSpan={7} style={emptyRowStyle}>Loading...</td></tr>
                ) : ncrItems.length === 0 ? (
                  <tr><td colSpan={7} style={emptyRowStyle}>No non-conformances match current filters</td></tr>
                ) : ncrItems.map((item, idx) => (
                  <tr key={item.isoComplaintKey}
                    style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : undefined, cursor: 'pointer' }}
                    className="hover-row-light" 
                  >
                    <td style={tdCellStyle}>
                      <span style={navyBoldStyle}>{item.ncrNumber}</span>
                    </td>
                    <td style={tdCellStyle}>{item.workOrderNumber}</td>
                    <td style={tdCellStyle} title={item.description}>{item.description}</td>
                    <td style={tdCellStyle}>{item.category}</td>
                    <td style={tdCellNoBorderStyle}>
                      <StatusBadge
                        status={item.severity}
                        variant={item.severity === 'Critical' ? 'red' : item.severity === 'Major' ? 'amber' : 'blue'}
                      />
                    </td>
                    <td style={tdCellNoBorderStyle}>
                      <StatusBadge
                        status={item.status}
                        variant={item.status === 'Open' ? 'red' : item.status === 'Under Review' ? 'amber' : 'gray'}
                      />
                    </td>
                    <td style={tdCellDateMutedStyle}>{item.dateFiled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={footerBarStyle}>
            <span style={fontWeight500Style}>{ncrTotal.toLocaleString()} records</span>
            <div style={paginationWrapStyle}>
              <button disabled={ncrPage <= 1} onClick={() => setNcrPage(p => p - 1)}
                style={{ ...pageBtnBaseStyle, cursor: ncrPage <= 1 ? 'default' : 'pointer', opacity: ncrPage <= 1 ? 0.4 : 1 }}>
                &#8249;
              </button>
              {Array.from({ length: Math.min(ncrTotalPages, 7) }, (_, i) => {
                const pg = i + 1;
                return (
                  <button key={pg} onClick={() => setNcrPage(pg)}
                    style={{ ...pageBtnBaseStyle, background: ncrPage === pg ? 'var(--navy)' : 'var(--card)', color: ncrPage === pg ? 'var(--card)' : 'var(--label)', fontWeight: ncrPage === pg ? 600 : 400, cursor: 'pointer' }}>
                    {pg}
                  </button>
                );
              })}
              <button disabled={ncrPage >= ncrTotalPages} onClick={() => setNcrPage(p => p + 1)}
                style={{ ...pageBtnBaseStyle, cursor: ncrPage >= ncrTotalPages ? 'default' : 'pointer', opacity: ncrPage >= ncrTotalPages ? 0.4 : 1 }}>
                &#8250;
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CAPA Log' && (
        <div style={tabFlexColumnStyle}>
          {/* Toolbar */}
          <div style={toolbarStyle}>
            <button
              onClick={() => setCapaModalOpen(true)}
              style={newBtnStyle}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={12} height={12}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              New CAPA
            </button>
            <div style={separatorStyle} />
            <span style={filterLabelStyle}>Type</span>
            <div style={segmentedWrapStyle}>
              {['All', 'Corrective', 'Preventive'].map((v, i) => (
                <button key={v} style={{ ...segBtnStyle(i === 0), borderRight: i < 2 ? '1px solid var(--border-dk)' : 'none' }}>{v}</button>
              ))}
            </div>
            <div style={separatorStyle} />
            <span style={filterLabelStyle}>Status</span>
            <div style={segmentedWrapStyle}>
              {['All', 'Open', 'In Progress', 'Completed', 'Overdue'].map((v, i) => (
                <button key={v} style={{ ...segBtnStyle(i === 0), borderRight: i < 4 ? '1px solid var(--border-dk)' : 'none' }}>{v}</button>
              ))}
            </div>
            <input type="text" placeholder="Search CAPA#, NCR ref, description..." aria-label="Search CAPA records" readOnly
              style={capaSearchInputStyle}
            />
          </div>

          {/* Table */}
          <div style={tableCardBgStyle}>
            <table style={tableFixedStyle}>
              <thead>
                <tr>
                  {CAPA_COLS.map(col => (
                    <th key={col.label} style={{ ...thCellStyle, width: col.width }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={7} style={emptyRowStyle}>No CAPA records found. CAPA tracking will be available when linked to NCR records.</td></tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={footerBarStyle}>
            <span style={fontWeight500Style}>0 records</span>
          </div>
        </div>
      )}

      {activeTab === 'Rework Tracking' && (
        <div style={tabFlexColumnStyle}>
          {/* Toolbar */}
          <div style={toolbarStyle}>
            <span style={filterLabelStyle}>Status</span>
            <div style={segmentedWrapStyle}>
              {(['', 'In Progress', 'Complete'] as const).map((v, i) => (
                <button key={v || 'all'} onClick={() => { setReworkStatusFilter(v); setReworkPage(1); }}
                  style={{ ...segBtnStyle(reworkStatusFilter === v), borderRight: i < 2 ? '1px solid var(--border-dk)' : 'none' }}>
                  {v || 'All'}
                </button>
              ))}
            </div>
            <input type="text" value={reworkSearch} onChange={e => { setReworkSearch(e.target.value); setReworkPage(1); }}
              placeholder="Search RW#, WO#, Serial#..."
              aria-label="Search rework records"
              style={searchInputStyle}
            />
          </div>

          {/* Table */}
          <div style={tableCardBgStyle}>
            <table style={tableFixedStyle}>
              <thead>
                <tr>
                  {REWORK_COLS.map(col => (
                    <th key={col.label} style={{ ...thCellStyle, width: col.width }}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reworkLoading ? (
                  <tr><td colSpan={8} style={emptyRowStyle}>Loading...</td></tr>
                ) : reworkItems.length === 0 ? (
                  <tr><td colSpan={8} style={emptyRowStyle}>No rework records match current filters</td></tr>
                ) : reworkItems.map((item, idx) => (
                  <tr key={item.repairKey}
                    style={{ background: idx % 2 === 1 ? 'var(--row-alt)' : undefined, cursor: 'pointer' }}
                    className="hover-row-light" 
                  >
                    <td style={tdCellStyle}>
                      <span style={navyBoldStyle}>{item.reworkNumber}</span>
                    </td>
                    <td style={tdCellStyle}>{item.workOrderNumber}</td>
                    <td style={tdCellStyle}>{item.serialNumber}</td>
                    <td style={tdCellStyle} title={item.reason}>{item.reason}</td>
                    <td style={tdCellStyle}>{item.techName || '—'}</td>
                    <td style={tdCellDateMutedStyle}>{item.originalComplete || '—'}</td>
                    <td style={tdCellDateMutedStyle}>{item.reworkDue || '—'}</td>
                    <td style={tdCellNoBorderStyle}>
                      <StatusBadge
                        status={item.status}
                        variant={item.status === 'Complete' ? 'green' : item.status === 'In Progress' ? 'blue' : 'amber'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={footerBarStyle}>
            <span style={fontWeight500Style}>{reworkTotal.toLocaleString()} records</span>
            <div style={paginationWrapStyle}>
              <button disabled={reworkPage <= 1} onClick={() => setReworkPage(p => p - 1)}
                style={{ ...pageBtnBaseStyle, cursor: reworkPage <= 1 ? 'default' : 'pointer', opacity: reworkPage <= 1 ? 0.4 : 1 }}>
                &#8249;
              </button>
              {Array.from({ length: Math.min(reworkTotalPages, 7) }, (_, i) => {
                const pg = i + 1;
                return (
                  <button key={pg} onClick={() => setReworkPage(pg)}
                    style={{ ...pageBtnBaseStyle, background: reworkPage === pg ? 'var(--navy)' : 'var(--card)', color: reworkPage === pg ? 'var(--card)' : 'var(--label)', fontWeight: reworkPage === pg ? 600 : 400, cursor: 'pointer' }}>
                    {pg}
                  </button>
                );
              })}
              <button disabled={reworkPage >= reworkTotalPages} onClick={() => setReworkPage(p => p + 1)}
                style={{ ...pageBtnBaseStyle, cursor: reworkPage >= reworkTotalPages ? 'default' : 'pointer', opacity: reworkPage >= reworkTotalPages ? 0.4 : 1 }}>
                &#8250;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NCR Modal */}
      <Modal
        title="New Non-Conformance Report"
        open={ncrModalOpen}
        onCancel={() => { setNcrModalOpen(false); ncrForm.resetFields(); }}
        onOk={() => {
          ncrForm.validateFields().then(() => {
            message.success('NCR submitted (demo — no backend call)');
            setNcrModalOpen(false);
            ncrForm.resetFields();
          }).catch(() => { message.error('Please fill in all required fields'); });
        }}
        okText="Submit NCR"
        okButtonProps={{ style: { background: 'var(--navy)', borderColor: 'var(--navy)' } }}
        width={480}
        destroyOnClose
      >
        <Form form={ncrForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Description is required' }]}>
            <Input.TextArea rows={3} placeholder="Describe the non-conformance..." />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Category is required' }]}>
            <Select placeholder="Select category" options={[
              { value: 'Process', label: 'Process' },
              { value: 'Material', label: 'Material' },
              { value: 'Equipment', label: 'Equipment' },
              { value: 'Documentation', label: 'Documentation' },
              { value: 'Other', label: 'Other' },
            ]} />
          </Form.Item>
          <Form.Item name="severity" label="Severity" rules={[{ required: true, message: 'Severity is required' }]}>
            <Select placeholder="Select severity" options={[
              { value: 'Critical', label: 'Critical' },
              { value: 'Major', label: 'Major' },
              { value: 'Minor', label: 'Minor' },
            ]} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Additional notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* CAPA Modal */}
      <Modal
        title="New Corrective / Preventive Action"
        open={capaModalOpen}
        onCancel={() => { setCapaModalOpen(false); capaForm.resetFields(); }}
        onOk={() => {
          capaForm.validateFields().then(() => {
            message.success('CAPA submitted (demo — no backend call)');
            setCapaModalOpen(false);
            capaForm.resetFields();
          }).catch(() => { message.error('Please fill in all required fields'); });
        }}
        okText="Submit CAPA"
        okButtonProps={{ style: { background: 'var(--navy)', borderColor: 'var(--navy)' } }}
        width={480}
        destroyOnClose
      >
        <Form form={capaForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Description is required' }]}>
            <Input.TextArea rows={3} placeholder="Describe the corrective or preventive action..." />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Type is required' }]}>
            <Select placeholder="Select type" options={[
              { value: 'Corrective', label: 'Corrective' },
              { value: 'Preventive', label: 'Preventive' },
            ]} />
          </Form.Item>
          <Form.Item name="severity" label="Severity">
            <Select placeholder="Select severity" options={[
              { value: 'Critical', label: 'Critical' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
            ]} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Additional notes..." />
          </Form.Item>
        </Form>
      </Modal>

      {activeTab === 'Reports' && (
        <div style={tabFlexColumnStyle}>
          <div style={reportsTabContentStyle}>
            <div style={reportGridStyle}>
              {[
                { title: 'Inspection Summary', desc: 'Pass/Fail/Conditional breakdown by period', icon: <IconShield /> },
                { title: 'First-Pass Yield Trend', desc: 'FPY percentage over last 12 months', icon: <IconCheckDouble /> },
                { title: 'NCR Aging Report', desc: 'Open non-conformances by age bucket', icon: <IconWarn /> },
                { title: 'CAPA Effectiveness', desc: 'Closure rates and recurrence analysis', icon: <IconCheck /> },
                { title: 'Rework Rate by Technician', desc: 'Rework frequency per tech over time', icon: <IconX /> },
                { title: 'Cost of Poor Quality', desc: 'COPQ trends including rework and scrap costs', icon: <IconDollar /> },
              ].map(report => (
                <div key={report.title} style={reportCardBaseStyle}
                  className="quality-card-hover" 
                >
                  <div style={reportIconWrapStyle}>
                    <div style={reportIconBoxStyle}>
                      {report.icon}
                    </div>
                    <span style={reportTitleStyle}>{report.title}</span>
                  </div>
                  <div style={reportDescStyle}>{report.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
