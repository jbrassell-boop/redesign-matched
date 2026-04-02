import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getDepartmentSubGroups } from '../../../api/departments';
import type { DepartmentSubGroup } from '../types';

interface SubGroupsTabProps {
  deptKey: number;
}

export const SubGroupsTab = ({ deptKey }: SubGroupsTabProps) => {
  const [subGroups, setSubGroups] = useState<DepartmentSubGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDepartmentSubGroups(deptKey)
      .then(data => { if (!cancelled) setSubGroups(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deptKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  if (subGroups.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        No sub-groups assigned to this department.
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        border: '1px solid var(--neutral-200)',
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '8px 12px',
          background: 'var(--neutral-50)',
          borderBottom: '1px solid var(--neutral-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>Assigned Sub Groups</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>({subGroups.length})</span>
        </div>
        <div>
          {subGroups.map((sg, i) => (
            <div
              key={sg.subGroupKey}
              style={{
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--text)',
                borderBottom: i < subGroups.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
              }}
            >
              {sg.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
