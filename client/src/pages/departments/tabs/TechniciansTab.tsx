import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getDepartmentRepairs } from '../../../api/departments';

interface TechniciansTabProps {
  deptKey: number;
}

interface TechSummary {
  name: string;
  repairCount: number;
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = { padding: '8px 12px', color: 'var(--text)' };

export const TechniciansTab = ({ deptKey }: TechniciansTabProps) => {
  const [techs, setTechs] = useState<TechSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Load all repairs (large page size to capture all techs) and derive unique technicians
    getDepartmentRepairs(deptKey, { page: 1, pageSize: 500 })
      .then(data => {
        if (cancelled) return;

        // Aggregate by technician — the repair item has no tech field in current types
        // so we show a graceful empty state if none available
        const techMap = new Map<string, number>();
        data.items.forEach(r => {
          // DepartmentRepairItem doesn't include a tech field currently
          // This is intentionally a no-op — see empty state below
          void r;
        });

        const summary: TechSummary[] = Array.from(techMap.entries())
          .map(([name, repairCount]) => ({ name, repairCount }))
          .sort((a, b) => b.repairCount - a.repairCount);

        setTechs(summary);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [deptKey]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  }

  if (techs.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        <div style={{ marginBottom: 8, fontSize: 28 }}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ width: 36, height: 36, margin: '0 auto', display: 'block', color: 'var(--neutral-300)' }}>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
        <div style={{ fontWeight: 600, color: 'var(--navy)', marginBottom: 4 }}>No technician data available</div>
        <div style={{ fontSize: 12 }}>Technician assignment data is not included in department repair records.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
        {techs.length} technician{techs.length !== 1 ? 's' : ''} active at this department
      </div>
      <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              <th style={thStyle}>Technician</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Repairs</th>
            </tr>
          </thead>
          <tbody>
            {techs.map((t, i) => (
              <tr
                key={t.name}
                style={{
                  borderBottom: i < techs.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                  background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                }}
              >
                <td style={{ ...tdStyle, fontWeight: 500 }}>{t.name}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                  {t.repairCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
