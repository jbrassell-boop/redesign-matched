import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearch, type SearchResult } from '../../api/search';
import { navSections } from './navItems';

/* ── Types ──────────────────────────────────────────────────────────── */

type ResultType = 'repair' | 'client' | 'department' | 'contract' | 'action' | 'page';

interface PaletteItem {
  type: ResultType;
  title: string;
  subtitle: string;
  path: string;
  key: number | null;
}

interface ResultGroup {
  label: string;
  items: PaletteItem[];
}

/* ── Badge colors per type ──────────────────────────────────────────── */

const BADGE_STYLES: Record<ResultType, { bg: string; color: string }> = {
  repair:     { bg: 'rgba(var(--primary-rgb), 0.12)', color: 'var(--primary)' },
  client:     { bg: 'rgba(var(--navy-rgb), 0.12)',    color: 'var(--navy)' },
  department: { bg: 'rgba(var(--muted-rgb), 0.12)',    color: 'var(--muted)' },
  contract:   { bg: 'rgba(var(--success-rgb), 0.12)',  color: 'var(--success)' },
  action:     { bg: 'rgba(var(--amber-rgb), 0.12)',    color: 'var(--amber)' },
  page:       { bg: 'rgba(var(--navy-rgb), 0.08)',     color: 'var(--navy)' },
};

/* ── Quick actions ──────────────────────────────────────────────────── */

const QUICK_ACTIONS: PaletteItem[] = [
  { type: 'action', title: 'New Repair Order',      subtitle: '', path: '/repairs',      key: null },
  { type: 'action', title: 'New Product Sale',      subtitle: '', path: '/product-sale', key: null },
  { type: 'action', title: 'New Instrument Repair', subtitle: '', path: '/instruments',  key: null },
  { type: 'action', title: 'New Endocart Order',    subtitle: '', path: '/endocarts',    key: null },
];

/* ── Recent items (localStorage) ────────────────────────────────────── */

const RECENT_KEY = 'tsi_cmd_recent';

function getRecent(): PaletteItem[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

function addRecent(item: PaletteItem) {
  const list = getRecent().filter(r => !(r.key === item.key && r.type === item.type));
  list.unshift(item);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10))); } catch { /* noop */ }
}

/* ── Nav pages for "go to" results ──────────────────────────────────── */

const ALL_PAGES: PaletteItem[] = navSections.flatMap(s =>
  s.items.map(i => ({
    type: 'page' as ResultType,
    title: `Go to ${i.label}`,
    subtitle: s.label,
    path: i.path,
    key: null,
  }))
);

/* ── Flatten groups ─────────────────────────────────────────────────── */

function flatten(groups: ResultGroup[]): PaletteItem[] {
  return groups.flatMap(g => g.items);
}

/* ── Component ──────────────────────────────────────────────────────── */

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* ── Global shortcut: Ctrl+K / Cmd+K ─────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  /* ── Focus input on open ─────────────────────────────────────────── */
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  /* ── Build default results (recent + quick actions) ──────────────── */
  const buildDefaultGroups = useCallback((): ResultGroup[] => {
    const g: ResultGroup[] = [];
    const recent = getRecent();
    if (recent.length) g.push({ label: 'Recent', items: recent });
    g.push({ label: 'Quick Actions', items: QUICK_ACTIONS });
    return g;
  }, []);

  /* ── Search ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;

    if (!query || query.length < 2) {
      setGroups(buildDefaultGroups());
      setSelectedIdx(0);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const lower = query.toLowerCase();
      const g: ResultGroup[] = [];

      // Page matches (instant, client-side)
      const pageHits = ALL_PAGES.filter(p =>
        p.title.toLowerCase().includes(lower) || p.subtitle.toLowerCase().includes(lower)
      );
      if (pageHits.length) g.push({ label: 'Pages', items: pageHits.slice(0, 5) });

      // API search
      try {
        const data = await globalSearch(query);

        if (data.repairs.length) {
          g.push({ label: 'Repairs', items: data.repairs.map((r: SearchResult) => ({
            type: 'repair' as ResultType, title: r.title, subtitle: r.subtitle, path: '/repairs', key: r.key,
          }))});
        }
        if (data.clients.length) {
          g.push({ label: 'Clients', items: data.clients.map((r: SearchResult) => ({
            type: 'client' as ResultType, title: r.title, subtitle: r.subtitle, path: '/clients', key: r.key,
          }))});
        }
        if (data.departments.length) {
          g.push({ label: 'Departments', items: data.departments.map((r: SearchResult) => ({
            type: 'department' as ResultType, title: r.title, subtitle: r.subtitle, path: '/departments', key: r.key,
          }))});
        }
        if (data.contracts.length) {
          g.push({ label: 'Contracts', items: data.contracts.map((r: SearchResult) => ({
            type: 'contract' as ResultType, title: r.title, subtitle: r.subtitle, path: '/contracts', key: r.key,
          }))});
        }
      } catch (err) { console.error('[CommandPalette] search failed', err); }

      setGroups(g);
      setSelectedIdx(0);
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [query, open, buildDefaultGroups]);

  /* ── Navigate to selection ───────────────────────────────────────── */
  const handleNavigate = useCallback((item: PaletteItem) => {
    setOpen(false);
    if (item.key != null) addRecent(item);
    navigate(item.path);
  }, [navigate]);

  /* ── Keyboard nav ────────────────────────────────────────────────── */
  const flat = flatten(groups);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => (i + 1) % (flat.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => (i - 1 + flat.length) % (flat.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flat[selectedIdx]) handleNavigate(flat[selectedIdx]);
    }
  }, [flat, selectedIdx, handleNavigate]);

  /* ── Scroll selected into view ───────────────────────────────────── */
  useEffect(() => {
    const el = resultsRef.current?.querySelector('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  if (!open) return null;

  /* ── Render ──────────────────────────────────────────────────────── */
  let itemIdx = 0;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      role="presentation"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        zIndex: 'var(--z-cmd)' as unknown as number,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 100,
      }}
    >
      <div style={{
        width: 560, maxHeight: 460,
        background: 'var(--card)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-modal)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ width: 16, height: 16, color: 'var(--muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search repairs, clients, or type a command..."
            aria-label="Search repairs, clients, or type a command"
            aria-controls="cmd-palette-results"
            autoComplete="off"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 14, color: 'var(--text)',
              background: 'transparent',
              fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontSize: 10, padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
            background: 'var(--neutral-50)',
            fontFamily: 'inherit',
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div ref={resultsRef} id="cmd-palette-results" role="listbox" aria-label="Search results" style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {flat.length === 0 && query.length >= 2 && (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              fontSize: 13, color: 'var(--muted)',
            }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {groups.map(group => {
            const rows = group.items.map(item => {
              const idx = itemIdx++;
              const isSelected = idx === selectedIdx;
              const badge = BADGE_STYLES[item.type] || BADGE_STYLES.page;

              return (
                <div
                  key={`${item.type}-${item.key ?? item.title}-${idx}`}
                  data-selected={isSelected}
                  onClick={() => handleNavigate(item)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNavigate(item); } }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--primary-light)' : 'transparent',
                    transition: 'background 0.08s',
                  }}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    background: badge.bg,
                    color: badge.color,
                    textTransform: 'capitalize',
                    flexShrink: 0,
                  }}>
                    {item.type}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.title}
                    </div>
                    {item.subtitle && (
                      <div style={{
                        fontSize: 11, color: 'var(--muted)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
                      Enter
                    </span>
                  )}
                </div>
              );
            });

            return (
              <div key={group.label}>
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: 'var(--muted)',
                  padding: '8px 16px 4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {group.label}
                </div>
                {rows}
              </div>
            );
          })}
        </div>

        <div aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
          {query.length >= 2 ? `${flat.length} result${flat.length !== 1 ? 's' : ''} found` : ''}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          fontSize: 10, color: 'var(--muted)',
        }}>
          <span><kbd style={kbdStyle}>&uarr;</kbd> <kbd style={kbdStyle}>&darr;</kbd> navigate</span>
          <span><kbd style={kbdStyle}>&crarr;</kbd> select</span>
          <span><kbd style={kbdStyle}>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};

const kbdStyle: React.CSSProperties = {
  fontSize: 9, padding: '1px 4px',
  borderRadius: 3,
  border: '1px solid var(--border)',
  background: 'var(--neutral-50)',
  fontFamily: 'inherit',
};
