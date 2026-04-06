import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getDeptGpos, type DeptGpo } from '../../../api/departments';

interface GposTabProps {
  deptKey: number;
}

const th: React.CSSProperties = {
  padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '.04em',
  background: 'var(--neutral-50)', borderBottom: '1px solid var(--border)',
  textAlign: 'left', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '7px 10px', fontSize: 12, color: 'var(--text)',
  borderBottom: '1px solid var(--neutral-200)',
};

const fmt = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const GposTab = ({ deptKey }: GposTabProps) => {
  const [gpos, setGpos]     = useState<DeptGpo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDeptGpos(deptKey)
      .then(data => { if (!cancelled) setGpos(data); })
      .catch(() => message.error('Failed to load GPOs'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deptKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>GPO's</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>({gpos.length})</span>
        </div>
        {gpos.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No GPO affiliations on record for this department's client.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>GPO</th>
                  <th style={th}>Effective Date</th>
                  <th style={th}>End Date</th>
                  <th style={th}>GPO ID</th>
                  <th style={th}>GLN</th>
                  <th style={th}>Reporting Group</th>
                  <th style={th}>Company</th>
                </tr>
              </thead>
              <tbody>
                {gpos.map((g, i) => (
                  <tr key={g.systemCodesKey} style={{ background: i % 2 === 1 ? 'var(--neutral-50)' : undefined }}>
                    <td style={{ ...td, fontWeight: 600, color: 'var(--navy)' }}>{g.gpoName}</td>
                    <td style={td}>{fmt(g.effectiveDate)}</td>
                    <td style={td}>{fmt(g.endDate)}</td>
                    <td style={td}>{g.gpoId || '—'}</td>
                    <td style={td}>{g.gln || '—'}</td>
                    <td style={td}>{g.group || '—'}</td>
                    <td style={td}>{g.company || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
