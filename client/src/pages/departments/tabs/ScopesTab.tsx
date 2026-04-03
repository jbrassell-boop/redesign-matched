import { useState, useEffect, useMemo } from 'react';
import { Spin } from 'antd';
import { getDepartmentScopes } from '../../../api/departments';
import type { DepartmentScope } from '../types';

interface ScopesTabProps {
  deptKey: number;
  onScopeClick: (scopeKey: number) => void;
}

export const ScopesTab = ({ deptKey, onScopeClick }: ScopesTabProps) => {
  const [scopes, setScopes] = useState<DepartmentScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDepartmentScopes(deptKey)
      .then(data => { if (!cancelled) setScopes(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deptKey]);

  const filtered = useMemo(() => {
    if (!search.trim()) return scopes;
    const q = search.toLowerCase();
    return scopes.filter(s =>
      s.serialNumber.toLowerCase().includes(q) ||
      s.model.toLowerCase().includes(q) ||
      s.manufacturer.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  }, [scopes, search]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Search scopes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: 260,
            padding: '5px 10px',
            fontSize: 12,
            border: '1px solid var(--neutral-200)',
            borderRadius: 4,
            outline: 'none',
            background: 'var(--card)',
            color: 'var(--text)',
          }}
        />
        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)' }}>
          {filtered.length} of {scopes.length} scopes
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          {scopes.length === 0 ? 'No scopes on record for this department.' : 'No scopes match your search.'}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
                <th style={thStyle}>Serial Number</th>
                <th style={thStyle}>Model</th>
                <th style={{ ...thStyle, width: 120 }}>Manufacturer</th>
                <th style={{ ...thStyle, width: 90 }}>Type</th>
                <th style={thStyle}>Category</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.scopeKey}
                  onClick={() => onScopeClick(s.scopeKey)}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                    background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--primary)' }}>{s.serialNumber || '\u2014'}</td>
                  <td style={tdStyle}>{s.model || '\u2014'}</td>
                  <td style={tdStyle}>{s.manufacturer || '\u2014'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex',
                      padding: '2px 8px',
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: s.type === 'Flexible' ? 'rgba(var(--success-rgb), 0.1)' :
                                  s.type === 'Rigid' ? 'rgba(var(--primary-rgb), 0.1)' :
                                  'var(--neutral-100)',
                      color: s.type === 'Flexible' ? 'var(--success)' :
                             s.type === 'Rigid' ? 'var(--primary)' :
                             'var(--muted)',
                    }}>
                      {s.type || '\u2014'}
                    </span>
                  </td>
                  <td style={tdStyle}>{s.category || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--muted)',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: 'var(--text)',
};
