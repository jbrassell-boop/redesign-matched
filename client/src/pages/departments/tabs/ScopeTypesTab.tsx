import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getDepartmentScopes } from '../../../api/departments';
import type { DepartmentScope } from '../types';

interface ScopeTypesTabProps {
  deptKey: number;
}

interface TypeSummary {
  type: string;
  count: number;
  categories: string[];
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = { padding: '8px 12px', color: 'var(--text)' };

const typeColor = (type: string) => {
  const lower = type.toLowerCase();
  if (lower === 'flexible' || lower === 'f') return { bg: 'rgba(var(--success-rgb), 0.1)', fg: 'var(--success)' };
  if (lower === 'rigid' || lower === 'r') return { bg: 'rgba(var(--primary-rgb), 0.1)', fg: 'var(--primary)' };
  if (lower === 'camera' || lower === 'c') return { bg: 'rgba(var(--amber-rgb), 0.1)', fg: 'var(--warning)' };
  if (lower.includes('instrument') || lower === 'i') return { bg: 'var(--neutral-100)', fg: 'var(--navy)' };
  return { bg: 'var(--neutral-100)', fg: 'var(--muted)' };
};

export const ScopeTypesTab = ({ deptKey }: ScopeTypesTabProps) => {
  const [scopes, setScopes] = useState<DepartmentScope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDepartmentScopes(deptKey)
      .then(data => { if (!cancelled) setScopes(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deptKey]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  }

  if (scopes.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        No scopes on record for this department.
      </div>
    );
  }

  // Build type summary: group scopes by type, collect unique categories
  const typeMap = new Map<string, { count: number; categories: Set<string> }>();
  scopes.forEach(s => {
    const key = s.type || 'Unknown';
    if (!typeMap.has(key)) typeMap.set(key, { count: 0, categories: new Set() });
    const entry = typeMap.get(key)!;
    entry.count += 1;
    if (s.category) entry.categories.add(s.category);
  });

  const summary: TypeSummary[] = Array.from(typeMap.entries())
    .map(([type, { count, categories }]) => ({
      type,
      count,
      categories: Array.from(categories).sort(),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div style={{ padding: 16 }}>
      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {summary.map(s => {
          const c = typeColor(s.type);
          return (
            <div key={s.type} style={{
              padding: '8px 14px', borderRadius: 6,
              border: '1px solid var(--neutral-200)',
              background: 'var(--card)', textAlign: 'center', minWidth: 80,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.fg }}>{s.count}</div>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                color: 'var(--muted)', letterSpacing: '0.04em', marginTop: 2,
              }}>{s.type}</div>
            </div>
          );
        })}
      </div>

      {/* Breakdown table */}
      <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>Type</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Count</th>
              <th style={thStyle}>Categories</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s, i) => {
              const c = typeColor(s.type);
              return (
                <tr
                  key={s.type}
                  style={{
                    borderBottom: i < summary.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                    background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                  }}
                >
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex', padding: '2px 10px', borderRadius: 9999,
                      fontSize: 11, fontWeight: 600, background: c.bg, color: c.fg,
                    }}>
                      {s.type}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }}>
                    {s.count}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: 12 }}>
                    {s.categories.length > 0 ? s.categories.join(', ') : '\u2014'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
