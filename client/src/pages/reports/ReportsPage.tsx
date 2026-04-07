import { useState, useMemo } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { StatStrip } from '../../components/shared/StatStrip';
import type { StatChipDef } from '../../components/shared/StatStrip';
import { REPORTS, CATEGORIES } from './reportData';
import { ReportBuilder, handleGenerate } from './ReportBuilder';
import type { ReportDef } from './types';

/* ── Report Card ─────────────────────────────────────────────── */
const ReportCard = ({ report, favorited, onToggleFav, paramOpen, onToggleParams, onGenerate }: {
  report: ReportDef; favorited: boolean; onToggleFav: () => void;
  paramOpen: boolean; onToggleParams: () => void; onGenerate: (id: string) => void;
}) => {
  const runLabel = report.extractOnly ? 'Extract' : 'Run';
  return (
    <div style={{
      background: 'var(--card)', border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 6, transition: 'box-shadow 0.15s, border-color 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{report.name}</span>
        {report.extractOnly && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'var(--neutral-50)', border: '1px solid var(--border)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>EXTRACT</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{report.desc}</div>
      {report.lastRun != null && (
        <div style={{ fontSize: 10, color: 'var(--muted)' }}>
          {report.lastRun === 0 ? 'Just now' : `Last run: ${report.lastRun}d ago`}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <button
          onClick={onToggleFav}
          style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1, color: favorited ? 'var(--warning)' : 'var(--border-dk)', transition: 'color 0.15s' }}
        >
          {favorited ? '\u2605' : '\u2606'}
        </button>
        <button
          onClick={onToggleParams}
          style={{
            height: 36, minWidth: 36, padding: '0 12px', border: 'none', borderRadius: 4, background: 'var(--navy)', color: 'var(--card)',
            fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', marginLeft: 'auto', transition: 'background 0.1s',
          }}
        >
          {runLabel}
        </button>
      </div>
      {paramOpen && (
        <ReportBuilder
          reportId={report.id}
          paramType={report.params ?? 'default'}
          extractOnly={report.extractOnly}
          onGenerate={onGenerate}
        />
      )}
    </div>
  );
};

/* ── Category Section ────────────────────────────────────────── */
const CategorySection = ({ category, reports, collapsed, onToggle, favorites, onToggleFav, openParamId, onToggleParams, onGenerate }: {
  category: string; reports: ReportDef[]; collapsed: boolean; onToggle: () => void;
  favorites: Set<string>; onToggleFav: (id: string) => void;
  openParamId: string | null; onToggleParams: (id: string) => void; onGenerate: (id: string) => void;
}) => (
  <div style={{ background: 'var(--card)', border: '1.5px solid var(--border-dk)', borderRadius: 8, overflow: 'hidden' }}>
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      aria-expanded={!collapsed}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--neutral-50)', cursor: 'pointer', userSelect: 'none', borderBottom: collapsed ? 'none' : '1px solid var(--border)', transition: 'background 0.1s' }}
    >
      <span style={{ fontSize: 10, color: 'var(--muted)', transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block' }}>{'\u25B6'}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', flex: 1 }}>{category}</span>
      <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--navy)', color: 'var(--card)', padding: '1px 7px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>{reports.length}</span>
    </div>
    {!collapsed && (
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {reports.map(r => (
            <ReportCard
              key={r.id}
              report={r}
              favorited={favorites.has(r.id)}
              onToggleFav={() => onToggleFav(r.id)}
              paramOpen={openParamId === r.id}
              onToggleParams={() => onToggleParams(r.id)}
              onGenerate={onGenerate}
            />
          ))}
        </div>
      </div>
    )}
  </div>
);

/* ═════════════════════════════════════════════════════════════ */
/*  REPORTS PAGE                                                */
/* ═════════════════════════════════════════════════════════════ */
export const ReportsPage = () => {
  const [search, setSearch] = useState('');
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('tsi_report_favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set(['repair-volume', 'outstanding-aging', 'stock-level', 'client-activity', 'mgmt-report']);
    } catch { return new Set(['repair-volume', 'outstanding-aging', 'stock-level', 'client-activity', 'mgmt-report']); }
  });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openParamId, setOpenParamId] = useState<string | null>(null);

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('tsi_report_favorites', JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  };

  const toggleParams = (id: string) => {
    setOpenParamId(prev => prev === id ? null : id);
  };

  const onGenerate = (id: string) => {
    setOpenParamId(null);
    handleGenerate(id);
  };

  const toggleCollapse = (cat: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return REPORTS.filter(r => {
      if (showFavsOnly && !favorites.has(r.id)) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.desc.toLowerCase().includes(q) && !r.cat.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, showFavsOnly, favorites]);

  const recentCount = REPORTS.filter(r => r.lastRun != null).length;

  const chips: StatChipDef[] = [
    { id: 'available', label: 'Reports Available', value: REPORTS.length, color: 'navy' },
    { id: 'favorites', label: 'Favorites',         value: favorites.size,  color: 'amber' },
    { id: 'recent',    label: 'Recently Run',       value: recentCount,     color: 'green' },
    { id: 'scheduled', label: 'Scheduled',          value: 3,               color: 'blue' },
  ];

  /* ── Toolbar ─────────────────────────────────────────────── */
  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)' }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search reports..."
        aria-label="Search reports"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ height: 30, width: 240, fontSize: 11 }}
        allowClear
      />
      <button
        onClick={() => setShowFavsOnly(!showFavsOnly)}
        style={{
          height: 30, padding: '0 14px', border: '1.5px solid var(--border-dk)', borderRadius: 6, fontSize: 11,
          fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          background: showFavsOnly ? 'var(--navy)' : 'var(--card)', color: showFavsOnly ? 'var(--card)' : 'var(--muted)',
          borderColor: showFavsOnly ? 'var(--navy)' : 'var(--border-dk)', transition: 'all 0.15s',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
        Show Favorites Only
      </button>
      <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }} aria-live="polite" aria-atomic="true">
        Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {REPORTS.length} reports
      </div>
    </div>
  );

  return (
    <section aria-label="Reports" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      <StatStrip chips={chips} />
      {toolbar}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg)' }}>
        {CATEGORIES.map(cat => {
          const catReports = filtered.filter(r => r.cat === cat);
          if (catReports.length === 0) return null;
          return (
            <CategorySection
              key={cat}
              category={cat}
              reports={catReports}
              collapsed={collapsed.has(cat)}
              onToggle={() => toggleCollapse(cat)}
              favorites={favorites}
              onToggleFav={toggleFav}
              openParamId={openParamId}
              onToggleParams={toggleParams}
              onGenerate={onGenerate}
            />
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>No reports match your search</div>
        )}
      </div>
    </section>
  );
};
