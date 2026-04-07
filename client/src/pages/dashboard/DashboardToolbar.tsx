import type { DashboardToolbarState, DashboardView, ScopeTypeFilter, LocationFilter, GroupBy } from './types';
import './DashboardToolbar.css';

const VIEWS: { key: DashboardView; label: string }[] = [
  { key: 'briefing', label: 'Briefing' },
  { key: 'repairs', label: 'Repairs' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'flags', label: 'Flags' },
  { key: 'emails', label: 'Emails' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'techbench', label: 'Tech Bench' },
];

const TYPES: { key: ScopeTypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Flexible', label: 'Flexible' },
  { key: 'Rigid', label: 'Rigid' },
  { key: 'Instrument', label: 'Instrument' },
  { key: 'Camera', label: 'Camera' },
  { key: 'Carts', label: 'Carts' },
];

const LOCATIONS: { key: LocationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'inhouse', label: 'In House' },
  { key: 'outsourced', label: 'Outsourced' },
  { key: 'hotlist', label: 'Hot List' },
];

const GROUPS: { key: GroupBy; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'Client', label: 'Client' },
  { key: 'Status', label: 'Status' },
  { key: 'Tech', label: 'Tech' },
  { key: 'ScopeType', label: 'Scope Type' },
];

interface DashboardToolbarProps {
  state: DashboardToolbarState;
  onChange: (partial: Partial<DashboardToolbarState>) => void;
  selectedCount: number;
  onExport: () => void;
}

export const DashboardToolbar = ({ state, onChange, selectedCount, onExport }: DashboardToolbarProps) => {
  return (
    <div className="dash-toolbar">
      {/* View selector */}
      <div className="seg-group">
        {VIEWS.map(v => (
          <button
            key={v.key}
            className={`seg-group__btn${state.view === v.key ? ' seg-group__btn--active' : ''}`}
            onClick={() => onChange({ view: v.key, page: 1 })}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="dash-toolbar__sep" />

      {/* Type filter + Location filter + Group By — repairs view only */}
      {state.view === 'repairs' && (
        <>
          <div className="seg-group">
            {TYPES.map(t => (
              <button
                key={t.key}
                className={`seg-group__btn${state.type === t.key ? ' seg-group__btn--active' : ''}`}
                onClick={() => onChange({ type: t.key, page: 1 })}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="seg-group">
            {LOCATIONS.map(l => (
              <button
                key={l.key}
                className={`seg-group__btn${state.location === l.key ? ' seg-group__btn--active' : ''}`}
                onClick={() => onChange({ location: l.key, page: 1 })}
              >
                {l.label}
              </button>
            ))}
          </div>

          <select
            className="dash-toolbar__select"
            value={state.groupBy}
            aria-label="Group by"
            onChange={e => onChange({ groupBy: e.target.value as GroupBy, page: 1 })}
          >
            {GROUPS.map(g => (
              <option key={g.key} value={g.key}>
                Group: {g.label}
              </option>
            ))}
          </select>
        </>
      )}

      <div className="dash-toolbar__spacer" />

      {/* Search */}
      <input
        className="dash-toolbar__search"
        type="text"
        placeholder="Search WO, client, serial..."
        aria-label="Search work orders by WO number, client, or serial"
        value={state.search}
        onChange={e => onChange({ search: e.target.value, page: 1 })}
      />

      {/* Export CSV */}
      <button className="dash-toolbar__icon-btn" title="Export CSV" onClick={onExport}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      {/* Print */}
      <button className="dash-toolbar__icon-btn" title="Print" onClick={() => window.print()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      </button>

      {selectedCount > 0 && (
        <>
          <div className="dash-toolbar__sep" />
          <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
            {selectedCount} selected
          </span>
        </>
      )}
    </div>
  );
};
