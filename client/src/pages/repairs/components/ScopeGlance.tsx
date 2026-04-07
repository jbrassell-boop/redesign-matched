import type { RepairFull } from '../types';
import type { ClientFlag } from '../../clients/types';

interface ScopeGlanceProps {
  repair: RepairFull;
  flags: ClientFlag[];
}

export const ScopeGlance = ({ repair, flags }: ScopeGlanceProps) => {
  const within40 = repair.withinFortyDay ??
    (repair.daysLastIn != null && repair.daysLastIn <= 40);

  return (
    <div style={{
      background: 'var(--primary-hover-bg)',
      borderBottom: '2px solid var(--border)',
      padding: '5px 14px',
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      flexWrap: 'wrap',
      flexShrink: 0,
    }}>
      {[
        { label: 'Manufacturer', value: repair.manufacturer },
        { label: 'Category',     value: repair.scopeType },
        { label: 'Model',        value: repair.scopeModel },
        { label: 'SN#',          value: repair.serial, title: 'Serial Number' },
        { label: 'Cap / FFS',    value: repair.capFfs, title: 'Capital / Fee For Service pricing model' },
      ].map(({ label, value, title }) => (
        <div key={label} title={title} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            {label}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
            {value || '—'}
          </div>
        </div>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Days Last In</div>
          <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>
            {repair.daysLastIn != null ? `${repair.daysLastIn}d` : '—'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }} title="Scope returned for repair within 40 days of last repair">
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Within 40 Day</div>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: within40 ? 'var(--danger)' : 'var(--success)',
          }}>
            {within40 ? 'YES' : 'No'}
          </div>
        </div>

        {repair.isUrgent && (
          <span style={{
            background: 'var(--danger)', color: 'var(--card)',
            padding: '2px 9px', borderRadius: 10,
            fontSize: 10, fontWeight: 700,
          }}>⚑ Rush</span>
        )}
        {flags.map((f) => (
          <span key={f.flagKey} style={{
            background: 'var(--amber-light)', color: 'var(--badge-amber-text)',
            border: '1px solid var(--amber-border)',
            padding: '2px 9px', borderRadius: 10,
            fontSize: 10, fontWeight: 700,
          }}>⚑ {f.flag}</span>
        ))}
      </div>
    </div>
  );
};
