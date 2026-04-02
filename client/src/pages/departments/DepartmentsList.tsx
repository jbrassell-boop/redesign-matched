import { Input, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { DepartmentListItem } from './types';

interface DepartmentsListProps {
  departments: DepartmentListItem[];
  loading: boolean;
  selectedKey: number | null;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (d: DepartmentListItem) => void;
}

export const DepartmentsList = ({ departments, loading, selectedKey, search, onSearchChange, onSelect }: DepartmentsListProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--neutral-200)' }}>
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--muted)', fontSize: 12 }} />}
        placeholder="Search departments..."
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        style={{ height: 30, fontSize: 12 }}
        allowClear
      />
    </div>
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="small" /></div>
      ) : departments.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>No departments found</div>
      ) : (
        departments.map(d => (
          <div
            key={d.deptKey}
            onClick={() => onSelect(d)}
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--neutral-200)',
              cursor: 'pointer',
              background: selectedKey === d.deptKey ? '#FEF3C7' : 'var(--card)',
              borderLeft: selectedKey === d.deptKey ? '2px solid #F59E0B' : '2px solid transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>{d.name}</span>
              <span style={{
                display: 'inline-flex', padding: '1px 6px', borderRadius: 9999,
                fontSize: 10, fontWeight: 700,
                background: d.isActive ? '#F0FDF4' : 'var(--neutral-100)',
                border: `1px solid ${d.isActive ? '#BBF7D0' : 'var(--neutral-200)'}`,
                color: d.isActive ? 'var(--success)' : 'var(--muted)',
              }}>
                {d.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.clientName}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{d.scopeCount} scope{d.scopeCount !== 1 ? 's' : ''}</span>
              {d.openRepairs > 0 && <span style={{ fontSize: 10, color: 'var(--primary)' }}>{d.openRepairs} open</span>}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);
