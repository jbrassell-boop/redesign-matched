import { useState, useEffect, useCallback } from 'react';
import { getDepartments } from '../../api/departments';
import { DepartmentsList } from './DepartmentsList';
import { DepartmentDetailPane } from './DepartmentDetailPane';
import type { DepartmentListItem } from './types';

export const DepartmentsPage = () => {
  const [departments, setDepartments] = useState<DepartmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);

  const loadDepartments = useCallback(async (s: string) => {
    setLoading(true);
    try {
      const result = await getDepartments({ search: s, pageSize: 300 });
      setDepartments(result.departments);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadDepartments(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadDepartments]);

  const handleSelect = useCallback((d: DepartmentListItem) => {
    setSelectedKey(d.deptKey);
  }, []);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--neutral-200)', background: 'var(--card)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-dark)' }}>Departments</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{departments.length} records</span>
        </div>
        <DepartmentsList
          departments={departments}
          loading={loading}
          selectedKey={selectedKey}
          search={search}
          onSearchChange={setSearch}
          onSelect={handleSelect}
        />
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--card)' }}>
        <DepartmentDetailPane deptKey={selectedKey} />
      </div>
    </div>
  );
};
