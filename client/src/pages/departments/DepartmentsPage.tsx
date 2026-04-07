import { useState, useEffect, useCallback, useRef } from 'react';
import { FixedSizeList } from 'react-window';
import { Input, Button, message } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { getDepartments } from '../../api/departments';
import { DepartmentDetailPane } from './DepartmentDetailPane';
import { NewDepartmentModal } from './NewDepartmentModal';
import { ExportButton } from '../../components/common/ExportButton';
import type { DepartmentListItem } from './types';

const DEPT_EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'clientName', label: 'Client' },
  { key: 'isActive', label: 'Active' },
];

export const DepartmentsPage = () => {
  const [departments, setDepartments] = useState<DepartmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const deptListRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(0);

  useEffect(() => {
    const el = deptListRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setListHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const loadDepartments = useCallback(async (s: string, cancelled: () => boolean) => {
    setLoading(true);
    try {
      const result = await getDepartments({ search: s, pageSize: 500 });
      if (!cancelled()) setDepartments(result.departments);
    } catch {
      if (!cancelled()) message.error('Failed to load departments');
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => loadDepartments(search, () => cancelled), search ? 300 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, loadDepartments]);

  const filtered = departments.filter(d => {
    if (statusFilter === 'active') return d.isActive;
    if (statusFilter === 'inactive') return !d.isActive;
    return true;
  });

  const activeCount = departments.filter(d => d.isActive).length;
  const inactiveCount = departments.filter(d => !d.isActive).length;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Left Panel — Department List */}
      <aside aria-label="Department list" style={{
        width: selectedKey ? 340 : '100%',
        minWidth: selectedKey ? 340 : undefined,
        borderRight: selectedKey ? '1px solid var(--neutral-200)' : undefined,
        display: 'flex', flexDirection: 'column',
        background: 'var(--card)',
        transition: 'width 0.2s ease',
        willChange: 'width',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--neutral-200)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)', margin: 0 }}>Departments</h1>
              <span aria-live="polite" style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: 'var(--primary-light)', color: 'var(--primary)',
              }}>
                {filtered.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <ExportButton data={departments as unknown as Record<string, unknown>[]} columns={DEPT_EXPORT_COLS} filename="departments-export" sheetName="Departments" />
              <Button
                icon={<PlusOutlined />} type="primary" size="small"
                onClick={() => setNewModalOpen(true)}
                style={{ background: 'var(--primary)', borderColor: 'var(--primary)', fontSize: 11, height: 28 }}
              >
                New Department
              </Button>
            </div>
          </div>

          <Input
            prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
            placeholder="Search name, client, zip..."
            aria-label="Search departments"
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            style={{ height: 30, fontSize: 12 }}
          />

          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { key: 'all' as const, label: 'All', count: departments.length },
              { key: 'active' as const, label: 'Active', count: activeCount },
              { key: 'inactive' as const, label: 'Inactive', count: inactiveCount },
            ]).map(s => (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                style={{
                  padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', border: 'none', display: 'flex', gap: 4, alignItems: 'center',
                  background: statusFilter === s.key ? 'var(--navy)' : 'var(--neutral-100)',
                  color: statusFilter === s.key ? 'var(--card)' : 'var(--muted)',
                }}
              >
                {s.label}
                <span style={{
                  fontSize: 9, opacity: .7,
                  background: statusFilter === s.key ? 'rgba(255,255,255,.2)' : 'var(--neutral-200)',
                  padding: '0 5px', borderRadius: 8,
                }}>
                  {s.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Department rows */}
        <div ref={deptListRef} style={{ flex: 1, overflow: 'hidden' }}>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No departments found</div>
          )}
          {!loading && filtered.length > 0 && listHeight > 0 && (
            <FixedSizeList
              height={listHeight}
              itemCount={filtered.length}
              itemSize={54}
              width="100%"
            >
              {({ index, style }) => {
                const d = filtered[index];
                return (
                  <div style={style} key={d.deptKey}>
                    <div
                      onClick={() => setSelectedKey(d.deptKey)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--neutral-100)',
                        cursor: 'pointer',
                        background: d.deptKey === selectedKey ? 'var(--primary-light)' : 'var(--card)',
                        borderLeft: d.deptKey === selectedKey ? '3px solid var(--primary)' : '3px solid transparent',
                        transition: 'background 0.1s',
                        height: '100%',
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={e => { if (d.deptKey !== selectedKey) e.currentTarget.style.background = 'var(--neutral-50)'; }}
                      onMouseLeave={e => { if (d.deptKey !== selectedKey) e.currentTarget.style.background = 'var(--card)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.2 }}>{d.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{d.clientName}</div>
                        </div>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                          background: d.isActive ? 'rgba(var(--success-rgb), 0.1)' : 'var(--neutral-100)',
                          color: d.isActive ? 'var(--success)' : 'var(--muted)',
                        }}>
                          {d.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            </FixedSizeList>
          )}
        </div>
      </aside>

      {/* Right Panel — Detail */}
      {selectedKey && (
        <section aria-label="Department details" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <DepartmentDetailPane deptKey={selectedKey} />
        </section>
      )}

      <NewDepartmentModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreated={() => loadDepartments(search, () => false)}
      />
    </div>
  );
};
