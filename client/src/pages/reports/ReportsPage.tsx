import { useState, useMemo } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { StatStrip } from '../../components/shared/StatStrip';
import type { StatChipDef } from '../../components/shared/StatStrip';
import { REPORTS, CATEGORIES } from './reportData';
import { ReportBuilder, handleGenerate } from './ReportBuilder';
import type { ReportDef } from './types';
import './ReportsPage.css';

/* ── Report Card ─────────────────────────────────────────────── */
const ReportCard = ({ report, favorited, onToggleFav, paramOpen, onToggleParams, onGenerate }: {
  report: ReportDef; favorited: boolean; onToggleFav: () => void;
  paramOpen: boolean; onToggleParams: () => void; onGenerate: (id: string) => void;
}) => {
  const runLabel = report.extractOnly ? 'Extract' : 'Run';
  return (
    <div className="rpt-card">
      <div className="rpt-card-top">
        <span className="rpt-card-name">{report.name}</span>
        {report.extractOnly && (
          <span className="rpt-card-badge">EXTRACT</span>
        )}
      </div>
      <div className="rpt-card-desc">{report.desc}</div>
      {report.lastRun != null && (
        <div className="rpt-card-lastrun">
          {report.lastRun === 0 ? 'Just now' : `Last run: ${report.lastRun}d ago`}
        </div>
      )}
      <div className="rpt-card-actions">
        <button
          onClick={onToggleFav}
          className={`rpt-fav-star${favorited ? ' rpt-fav-star--on' : ' rpt-fav-star--off'}`}
        >
          {favorited ? '\u2605' : '\u2606'}
        </button>
        <button
          onClick={onToggleParams}
          className="rpt-run-btn"
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
  <div className="rpt-cat-section">
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      aria-expanded={!collapsed}
      className={`rpt-cat-head${collapsed ? '' : ' rpt-cat-head--open'}`}
    >
      <span className={`rpt-cat-arrow${collapsed ? ' rpt-cat-arrow--collapsed' : ' rpt-cat-arrow--expanded'}`}>{'\u25B6'}</span>
      <span className="rpt-cat-name">{category}</span>
      <span className="rpt-cat-count">{reports.length}</span>
    </div>
    {!collapsed && (
      <div className="rpt-cat-body">
        <div className="rpt-card-grid">
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
    <div className="rpt-toolbar">
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
        className={`rpt-fav-btn${showFavsOnly ? ' rpt-fav-btn--on' : ' rpt-fav-btn--off'}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rpt-fav-icon"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
        Show Favorites Only
      </button>
      <div className="rpt-count" aria-live="polite" aria-atomic="true">
        Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {REPORTS.length} reports
      </div>
    </div>
  );

  return (
    <section aria-label="Reports" className="rpt-page">
      <StatStrip chips={chips} />
      {toolbar}
      <div className="rpt-scroll">
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
          <div className="rpt-empty">No reports match your search</div>
        )}
      </div>
    </section>
  );
};
