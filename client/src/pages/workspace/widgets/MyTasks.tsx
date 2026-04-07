import { useState, useEffect } from 'react';
import { Skeleton } from 'antd';
import { getDashboardTasks } from '../../../api/dashboard';
import type { DashboardTask } from '../../dashboard/types';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'var(--danger)',
  medium: 'var(--warning)',
  normal: 'var(--primary)',
  low: 'var(--muted)',
};

export const MyTasks = () => {
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDashboardTasks({ pageSize: 8 })
      .then(r => { if (!cancelled) setTasks(r.tasks.slice(0, 8)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Skeleton active paragraph={{ rows: 4 }} />;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        background: 'var(--neutral-50)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>My Tasks</span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--card)',
          background: 'var(--primary)', borderRadius: 'var(--radius-pill)',
          padding: '1px 7px', minWidth: 18, textAlign: 'center',
        }}>{tasks.length}</span>
      </div>
      <div style={{ padding: '6px 10px' }}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 11 }}>No tasks</div>
        ) : (
          tasks.map(task => (
            <div key={task.taskKey} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 4px', borderBottom: '1px solid var(--border)',
              fontSize: 12, color: 'var(--text)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: PRIORITY_COLORS[task.priority?.toLowerCase()] ?? 'var(--muted)',
              }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {task.title}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{task.client}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
