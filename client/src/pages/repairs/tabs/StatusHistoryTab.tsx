import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getRepairStatusHistory } from '../../../api/repairs';
import type { RepairStatusLogEntry } from '../../../api/repairs';

export const StatusHistoryTab = ({ repairKey }: { repairKey: number }) => {
  const [entries, setEntries] = useState<RepairStatusLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRepairStatusHistory(repairKey)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [repairKey]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>;

  if (entries.length === 0) {
    return <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No status history recorded</div>;
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
        Status Change History ({entries.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {entries.map((entry, idx) => (
          <div key={entry.logId} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 0',
            borderBottom: idx < entries.length - 1 ? '1px solid var(--neutral-100)' : 'none',
          }}>
            {/* Timeline dot */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: idx === 0 ? 'var(--primary)' : 'var(--neutral-200)',
            }} />
            {/* Status name */}
            <div style={{ flex: 1 }}>
              <span style={{
                fontSize: 12, fontWeight: idx === 0 ? 700 : 500,
                color: idx === 0 ? 'var(--navy)' : 'var(--text)',
              }}>{entry.statusName}</span>
            </div>
            {/* Timestamp */}
            <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {new Date(entry.changedAt).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
