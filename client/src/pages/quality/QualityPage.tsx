import { useState, useEffect, useCallback, useRef } from 'react';
import { getQualityInspections, getQualityStats } from '../../api/quality';
import type { QualityInspectionListItem, QualityStats, QualityFilters } from './types';

// ── Badge helpers ──────────────────────────────────────────────────────────────

const ResultBadge = ({ result }: { result: string }) => {
  const styles: Record<string, React.CSSProperties> = {
    Pass: {
      background: '#F0FDF4',
      border: '1px solid #BBF7D0',
      color: 'var(--success)',
    },
    Fail: {
      background: '#FEF2F2',
      border: '1px solid #FECACA',
      color: 'var(--danger)',
    },
    Conditional: {
      background: '#FFFBEB',
      border: '1px solid #FDE68A',
      color: '#92400E',
    },
  };
  const s = styles[result] ?? styles.Conditional;
  return (
    <span style={{
      ...s,
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 'var(--radius-pill)',
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 1.4,
    }}>
      {result}
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const isDI = type === 'D&I Intake';
  return (
    <span style={{
      background: isDI ? '#EFF6FF' : 'rgba(var(--navy-rgb), 0.08)',
      border: `1px solid ${isDI ? '#BFDBFE' : 'rgba(var(--navy-rgb), 0.2)'}`,
      color: isDI ? 'var(--primary)' : 'var(--navy)',
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 'var(--radius-pill)',
      fontSize: 11,
      fontWeight: 700,
      lineHeight: 1.4,
    }}>
      {type}
    </span>
  );
};

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
    onMouseEnter={e => { if (clickable && !active) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'; }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = ''; }}
  >
    <div style={{
      width: 32,
      height: 32,
      borderRadius: 6,
      background: iconBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: iconColor,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: valueColor, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  </div>
);

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconCheckDouble = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IconWarn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const IconDollar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ── Coming Soon placeholder ────────────────────────────────────────────────────

const ComingSoon = ({ label }: { label: string }) => (
  <div style={{
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 8,
    color: 'var(--muted)',
    padding: 40,
  }}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={36} height={36} style={{ opacity: 0.2 }}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="15" x2="13" y2="15" />
    </svg>
    <div style={{ fontSize: 13, fontWeight: 500 }}>{label} — Coming Soon</div>
    <div style={{ fontSize: 11 }}>This module is under construction.</div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const TABS = ['QC Inspections', 'Non-Conformances', 'CAPA Log', 'Rework Tracking', 'Reports'] as const;
type Tab = typeof TABS[number];

export const QualityPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('QC Inspections');
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

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load stats once
  useEffect(() => {
    setStatsLoading(true);
    getQualityStats()
      .then(setStats)
      .finally(() => setStatsLoading(false));
  }, []);

  const loadInspections = useCallback(async (filters: QualityFilters) => {
    setLoading(true);
    try {
      const result = await getQualityInspections(filters);
      setInspections(result.inspections);
      setTotalCount(result.totalCount);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const delay = search ? 300 : 0;
    searchTimeout.current = setTimeout(() => {
      loadInspections({ search, dateFrom, dateTo, resultFilter, page, pageSize: PAGE_SIZE });
    }, delay);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [search, dateFrom, dateTo, resultFilter, page, loadInspections]);

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

  const exportCSV = () => {
    const headers = ['WO#', 'Type', 'Client', 'Scope S/N', 'Technician Key', 'Date', 'Result'];
    const rows = inspections.map(i => [
      i.workOrderNumber,
      i.inspectionType,
      i.clientName,
      i.scopeSN ?? '',
      i.technicianKey?.toString() ?? '',
      i.inspectionDate,
      i.result,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quality-inspections.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Stat Strip ── */}
      <div style={{
        display: 'flex',
        background: 'var(--card)',
        borderBottom: '1px solid var(--neutral-200)',
        flexShrink: 0,
      }}>
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
      <div style={{
        display: 'flex',
        background: 'var(--neutral-50)',
        borderBottom: '1px solid var(--neutral-200)',
        flexShrink: 0,
        padding: '0 14px',
      }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '9px 16px',
              fontSize: 12,
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? 'var(--primary)' : 'var(--muted)',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
              borderBottom: `2.5px solid ${activeTab === tab ? 'var(--primary)' : 'transparent'}`,
              marginBottom: -1.5,
              fontFamily: 'inherit',
              transition: 'all 0.12s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}

      {activeTab === 'QC Inspections' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

          {/* Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'var(--card)',
            borderBottom: '1px solid var(--neutral-200)',
            flexShrink: 0,
            flexWrap: 'wrap',
          }}>
            {/* Result segmented control */}
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
              Result
            </span>
            <div style={{
              display: 'inline-flex',
              border: '1px solid var(--border-dk)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
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
            <div style={{ width: 1, height: 22, background: 'var(--border-dk)', flexShrink: 0 }} />

            {/* Date range */}
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              title="From date"
              style={{
                height: 30,
                border: '1.5px solid var(--border-dk)',
                borderRadius: 6,
                padding: '0 8px',
                fontSize: 11,
                fontFamily: 'inherit',
                color: 'var(--text)',
                background: 'var(--card)',
                outline: 'none',
                cursor: 'pointer',
                width: 120,
              }}
            />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              title="To date"
              style={{
                height: 30,
                border: '1.5px solid var(--border-dk)',
                borderRadius: 6,
                padding: '0 8px',
                fontSize: 11,
                fontFamily: 'inherit',
                color: 'var(--text)',
                background: 'var(--card)',
                outline: 'none',
                cursor: 'pointer',
                width: 120,
              }}
            />

            {/* Search — right aligned */}
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search WO#, Serial#, Client..."
              style={{
                marginLeft: 'auto',
                height: 30,
                width: 220,
                border: '1.5px solid var(--border-dk)',
                borderRadius: 6,
                padding: '0 10px 0 30px',
                fontSize: 11,
                fontFamily: 'inherit',
                outline: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='M21 21l-4.35-4.35'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: '10px center',
                background: `var(--card) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='M21 21l-4.35-4.35'/%3E%3C/svg%3E") no-repeat 10px center`,
              }}
            />

            {/* Export */}
            <button
              onClick={exportCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 32,
                padding: '0 12px',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--label)',
                background: 'var(--card)',
                border: '1px solid var(--neutral-200)',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <IconDownload />
              Export
            </button>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  {[
                    { label: 'WO#', width: 90 },
                    { label: 'Type', width: 120 },
                    { label: 'Client', width: 200 },
                    { label: 'Scope S/N', width: 130 },
                    { label: 'Tech Key', width: 100 },
                    { label: 'Date', width: 100 },
                    { label: 'Result', width: 110 },
                  ].map(col => (
                    <th
                      key={col.label}
                      style={{
                        width: col.width,
                        background: 'var(--neutral-50)',
                        color: 'var(--neutral-500)',
                        fontWeight: 700,
                        padding: '8px 10px',
                        textAlign: 'left',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        fontSize: 11,
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        whiteSpace: 'nowrap',
                        borderRight: '1px solid rgba(180,200,220,0.3)',
                        borderBottom: '1px solid var(--neutral-200)',
                        userSelect: 'none',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>
                      Loading...
                    </td>
                  </tr>
                ) : inspections.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>
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
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 1 ? 'var(--row-alt)' : ''; }}
                    >
                      <td style={{ padding: '6px 10px', fontSize: 11.5, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ fontWeight: 700, color: 'var(--navy)', cursor: 'pointer' }}>
                          {item.workOrderNumber}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: 11.5, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <TypeBadge type={item.inspectionType} />
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: 11.5, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.clientName}
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: 11.5, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--muted)' }}>
                        {item.scopeSN ?? '—'}
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: 11.5, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--muted)' }}>
                        {item.technicianKey ?? '—'}
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: 11.5, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--muted)' }}>
                        {item.inspectionDate}
                      </td>
                      <td style={{ padding: '6px 10px', fontSize: 11.5, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <ResultBadge result={item.result} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            background: 'var(--neutral-50)',
            borderTop: '1.5px solid var(--border-dk)',
            flexShrink: 0,
            fontSize: 11,
            color: 'var(--muted)',
          }}>
            <span style={{ fontWeight: 500 }}>{totalCount.toLocaleString()} records</span>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                style={{
                  height: 26,
                  minWidth: 26,
                  padding: '0 6px',
                  border: '1px solid var(--border-dk)',
                  borderRadius: 4,
                  background: 'var(--card)',
                  fontSize: 11,
                  color: 'var(--label)',
                  cursor: page <= 1 ? 'default' : 'pointer',
                  opacity: page <= 1 ? 0.4 : 1,
                  fontFamily: 'inherit',
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
                      height: 26,
                      minWidth: 26,
                      padding: '0 6px',
                      border: '1px solid var(--border-dk)',
                      borderRadius: 4,
                      background: page === pg ? 'var(--navy)' : 'var(--card)',
                      color: page === pg ? '#fff' : 'var(--label)',
                      fontSize: 11,
                      fontWeight: page === pg ? 600 : 400,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
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
                  height: 26,
                  minWidth: 26,
                  padding: '0 6px',
                  border: '1px solid var(--border-dk)',
                  borderRadius: 4,
                  background: 'var(--card)',
                  fontSize: 11,
                  color: 'var(--label)',
                  cursor: page >= totalPages ? 'default' : 'pointer',
                  opacity: page >= totalPages ? 0.4 : 1,
                  fontFamily: 'inherit',
                }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Non-Conformances' && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <ComingSoon label="Non-Conformances" />
        </div>
      )}

      {activeTab === 'CAPA Log' && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <ComingSoon label="CAPA Log" />
        </div>
      )}

      {activeTab === 'Rework Tracking' && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <ComingSoon label="Rework Tracking" />
        </div>
      )}

      {activeTab === 'Reports' && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <ComingSoon label="Reports" />
        </div>
      )}

    </div>
  );
};
