import { useState, useEffect, useCallback } from 'react';
import { Spin, message } from 'antd';
import {
  getDepartmentSubGroups, getAvailableSubGroups, updateDepartmentSubGroups,
} from '../../../api/departments';
import type { DepartmentSubGroup } from '../types';

interface SubGroupsTabProps {
  deptKey: number;
}

const panel: React.CSSProperties = {
  flex: 1, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden',
  display: 'flex', flexDirection: 'column', minHeight: 0,
};
const panelHead: React.CSSProperties = {
  padding: '8px 12px', background: 'var(--neutral-50)',
  borderBottom: '1px solid var(--border)',
  fontSize: 12, fontWeight: 700, color: 'var(--navy)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const panelBody: React.CSSProperties = {
  flex: 1, overflowY: 'auto', minHeight: 120, maxHeight: 380,
};
const row: React.CSSProperties = {
  padding: '7px 12px', fontSize: 12, color: 'var(--text)',
  borderBottom: '1px solid var(--neutral-200)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const actionBtn = (variant: 'remove' | 'add'): React.CSSProperties => ({
  fontSize: 11, fontWeight: 700, padding: '2px 8px',
  border: 'none', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
  background: variant === 'remove' ? 'transparent' : 'var(--navy)',
  color: variant === 'remove' ? 'var(--danger)' : 'var(--card)',
});

export const SubGroupsTab = ({ deptKey }: SubGroupsTabProps) => {
  const [assigned, setAssigned]   = useState<DepartmentSubGroup[]>([]);
  const [available, setAvailable] = useState<DepartmentSubGroup[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [search, setSearch]       = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [a, av] = await Promise.all([
        getDepartmentSubGroups(deptKey),
        getAvailableSubGroups(deptKey),
      ]);
      setAssigned(a);
      setAvailable(av);
    } catch {
      message.error('Failed to load sub-groups');
    } finally {
      setLoading(false);
    }
  }, [deptKey]);

  useEffect(() => {
    let cancelled = false;
    reload().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, [reload]);

  const persist = async (next: DepartmentSubGroup[]) => {
    setSaving(true);
    try {
      await updateDepartmentSubGroups(deptKey, next.map(sg => sg.subGroupKey));
      await reload();
    } catch {
      message.error('Failed to update sub-groups');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (sg: DepartmentSubGroup) => {
    persist(assigned.filter(a => a.subGroupKey !== sg.subGroupKey));
  };

  const handleAdd = (sg: DepartmentSubGroup) => {
    persist([...assigned, sg]);
  };

  const filteredAvailable = search.trim()
    ? available.filter(sg => sg.name.toLowerCase().includes(search.toLowerCase()))
    : available;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;

  return (
    <div style={{ padding: 16, display: 'flex', gap: 12 }}>
      {/* Assigned panel */}
      <div style={panel}>
        <div style={panelHead}>
          <span>Assigned Sub Groups</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
            ({assigned.length}){saving && <Spin size="small" style={{ marginLeft: 6 }} />}
          </span>
        </div>
        <div style={panelBody}>
          {assigned.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              No sub-groups assigned.
            </div>
          ) : (
            assigned.map(sg => (
              <div key={sg.subGroupKey} style={row}>
                <span>{sg.name}</span>
                <button
                  onClick={() => handleRemove(sg)}
                  disabled={saving}
                  style={actionBtn('remove')}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Available panel */}
      <div style={panel}>
        <div style={panelHead}>
          <span>Available Sub Groups</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
            ({filteredAvailable.length})
          </span>
        </div>
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
          <input
            placeholder="Search sub groups..."
            aria-label="Search available sub groups"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: 28, padding: '0 8px', fontSize: 12,
              border: '1px solid var(--border)', borderRadius: 4,
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
        <div style={panelBody}>
          {filteredAvailable.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              {available.length === 0 ? 'All sub-groups assigned.' : 'No matches.'}
            </div>
          ) : (
            filteredAvailable.map(sg => (
              <div key={sg.subGroupKey} style={row}>
                <span>{sg.name}</span>
                <button
                  onClick={() => handleAdd(sg)}
                  disabled={saving}
                  style={actionBtn('add')}
                >
                  + Add
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
