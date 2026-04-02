import { useState, useMemo } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { REPORTS, CATEGORIES } from './reportData';
import type { ReportDef } from './types';

/* ── Stat Chip (non-clickable) ───────────────────────────────── */
const StatChip = ({ label, value, iconBg, iconColor, valueColor, icon }: {
  label: string; value: number; iconBg: string; iconColor: string; valueColor: string; icon: React.ReactNode;
}) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--card)' }}>
    <span style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: iconBg, color: iconColor }}>{icon}</span>
    <span style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 18, fontWeight: 800, color: valueColor, lineHeight: 1.2 }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  </div>
);

/* ── SVG Icons ───────────────────────────────────────────────── */
const IconReport = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>;
const IconStar = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
const IconRecent = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg>;
const IconScheduled = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;

/* ── Report Card ─────────────────────────────────────────────── */
const ReportCard = ({ report, favorited, onToggleFav }: { report: ReportDef; favorited: boolean; onToggleFav: () => void }) => (
  <div style={{
    background: 'var(--card)', border: '1.5px solid var(--border-dk)', borderRadius: 6, padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 6, transition: 'box-shadow 0.15s, border-color 0.15s',
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>{report.name}</span>
      {report.extractOnly && (
        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'var(--neutral-50)', border: '1px solid var(--border)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>EXTRACT</span>
      )}
    </div>
    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{report.desc}</div>
    {report.lastRun != null && (
      <div style={{ fontSize: 10, color: 'var(--muted)' }}>Last run: {report.lastRun}d ago</div>
    )}
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
      <button
        onClick={onToggleFav}
        style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1, color: favorited ? 'var(--warning)' : 'var(--border-dk)', transition: 'color 0.15s' }}
      >
        {favorited ? '\u2605' : '\u2606'}
      </button>
      <button style={{
        height: 26, padding: '0 12px', border: 'none', borderRadius: 4, background: 'var(--navy)', color: '#fff',
        fontSize: 10.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', marginLeft: 'auto', transition: 'background 0.1s',
      }}>
        Run
      </button>
    </div>
  </div>
);

/* ── Category Section ────────────────────────────────────────── */
const CategorySection = ({ category, reports, collapsed, onToggle, favorites, onToggleFav }: {
  category: string; reports: ReportDef[]; collapsed: boolean; onToggle: () => void;
  favorites: Set<string>; onToggleFav: (id: string) => void;
}) => (
  <div style={{ background: 'var(--card)', border: '1.5px solid var(--border-dk)', borderRadius: 8, overflow: 'hidden' }}>
    <div
      onClick={onToggle}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--neutral-50)', cursor: 'pointer', userSelect: 'none', borderBottom: collapsed ? 'none' : '1px solid var(--border)', transition: 'background 0.1s' }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', flex: 1 }}>{category}</span>
      <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--navy)', color: '#fff', padding: '1px 7px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>{reports.length}</span>
      <span style={{ fontSize: 10, color: 'var(--muted)', transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>{'\u25BC'}</span>
    </div>
    {!collapsed && (
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {reports.map(r => (
            <ReportCard key={r.id} report={r} favorited={favorites.has(r.id)} onToggleFav={() => onToggleFav(r.id)} />
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
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(['repair-volume', 'outstanding-aging', 'stock-level', 'client-activity', 'mgmt-report']));
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleFav = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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

  /* ── Stat Strip ──────────────────────────────────────────── */
  const statStrip = (
    <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)' }}>
      <StatChip label="Reports Available" value={REPORTS.length} iconBg="rgba(var(--navy-rgb), 0.10)" iconColor="var(--navy)" valueColor="var(--navy)" icon={<IconReport />} />
      <StatChip label="Favorites" value={favorites.size} iconBg="rgba(var(--amber-rgb), 0.10)" iconColor="#92400E" valueColor="#92400E" icon={<IconStar />} />
      <StatChip label="Recently Run" value={recentCount} iconBg="rgba(var(--success-rgb), 0.10)" iconColor="var(--success)" valueColor="var(--success)" icon={<IconRecent />} />
      <StatChip label="Scheduled" value={3} iconBg="rgba(var(--primary-rgb), 0.10)" iconColor="var(--primary)" valueColor="var(--primary)" icon={<IconScheduled />} />
    </div>
  );

  /* ── Toolbar ─────────────────────────────────────────────── */
  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--card)', borderBottom: '1px solid var(--neutral-200)' }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search reports..."
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
          background: showFavsOnly ? 'var(--navy)' : 'var(--card)', color: showFavsOnly ? '#fff' : 'var(--muted)',
          borderColor: showFavsOnly ? 'var(--navy)' : 'var(--border-dk)', transition: 'all 0.15s',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
        Show Favorites Only
      </button>
      <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
        Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> of {REPORTS.length} reports
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      {statStrip}
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
            />
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>No reports match your search</div>
        )}
      </div>
    </div>
  );
};
