import { useState, useEffect, useCallback } from 'react';
import { Spin } from 'antd';
import { getDepartmentSubGroups, updateDepartmentSubGroups } from '../../../api/departments';
import type { DepartmentSubGroup } from '../types';

interface SubGroupsTabProps {
  deptKey: number;
}

export const SubGroupsTab = ({ deptKey }: SubGroupsTabProps) => {
  const [subGroups, setSubGroups] = useState<DepartmentSubGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    getDepartmentSubGroups(deptKey)
      .then(setSubGroups)
      .finally(() => setLoading(false));
  }, [deptKey]);

  useEffect(() => { reload(); }, [reload]);

  const handleRemove = async (sgKey: number) => {
    const updated = subGroups.filter(sg => sg.subGroupKey !== sgKey);
    setSaving(true);
    try {
      await updateDepartmentSubGroups(deptKey, updated.map(sg => sg.subGroupKey));
      setSubGroups(updated);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

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
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            ({subGroups.length})
            {saving && <Spin size="small" style={{ marginLeft: 6 }} />}
          </span>
        </div>
        <div>
          {subGroups.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No sub-groups assigned to this department.
            </div>
          ) : (
            subGroups.map((sg, i) => (
              <div
                key={sg.subGroupKey}
                style={{
                  padding: '8px 12px',
                  fontSize: 13,
                  color: 'var(--text)',
                  borderBottom: i < subGroups.length - 1 ? '1px solid var(--neutral-200)' : undefined,
                  background: i % 2 === 1 ? 'var(--neutral-50)' : undefined,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{sg.name}</span>
                <button
                  onClick={() => handleRemove(sg.subGroupKey)}
                  disabled={saving}
                  style={{
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    borderRadius: 3,
                    background: 'transparent',
                    color: 'var(--danger)',
                  }}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
