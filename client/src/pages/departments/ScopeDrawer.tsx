import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getScopeDetail, getDepartmentRepairs } from '../../api/departments';
import type { ScopeDetail, DepartmentRepairItem } from './types';
import './ScopeDrawer.css';

interface ScopeDrawerProps {
  scopeKey: number | null;
  deptKey: number;
  open: boolean;
  onClose: () => void;
}

export const ScopeDrawer = ({ scopeKey, deptKey, open, onClose }: ScopeDrawerProps) => {
  const navigate = useNavigate();
  const [scope, setScope] = useState<ScopeDetail | null>(null);
  const [repairs, setRepairs] = useState<DepartmentRepairItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!scopeKey || !open) return;
    setLoading(true);
    getScopeDetail(deptKey, scopeKey)
      .then(setScope)
      .catch(() => setScope(null))
      .finally(() => setLoading(false));
  }, [scopeKey, deptKey, open]);

  useEffect(() => {
    if (!scopeKey || !open) return;
    getDepartmentRepairs(deptKey, { pageSize: 20 })
      .then(res => {
        const filtered = res.items.filter(r => r.serialNumber === scope?.serialNumber);
        setRepairs(filtered.length > 0 ? filtered : res.items.slice(0, 10));
      })
      .catch(() => setRepairs([]));
  }, [scopeKey, deptKey, open, scope?.serialNumber]);

  const typeBadgeClass = scope?.type?.toLowerCase() === 'flexible'
    ? 'scope-drawer__badge--flexible'
    : scope?.type?.toLowerCase() === 'rigid'
      ? 'scope-drawer__badge--rigid'
      : 'scope-drawer__badge--flexible';

  return (
    <div className={`scope-drawer ${open ? 'scope-drawer--open' : ''}`}>
      <div className="scope-drawer__header">
        <div>
          <div className="scope-drawer__title">
            {scope?.serialNumber || 'Loading...'}
          </div>
          <div className="scope-drawer__subtitle">
            {scope?.model || ''}
          </div>
        </div>
        <button className="scope-drawer__close" onClick={onClose}>&times;</button>
      </div>

      <div className="scope-drawer__body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : scope ? (
          <>
            <div className="scope-drawer__section">
              <div className="scope-drawer__section-title">Instrument Info</div>
              <div className="scope-drawer__field-grid">
                <div className="scope-drawer__field">
                  <span className="scope-drawer__field-label">Serial Number</span>
                  <span className="scope-drawer__field-value">{scope.serialNumber || '\u2014'}</span>
                </div>
                <div className="scope-drawer__field">
                  <span className="scope-drawer__field-label">Model</span>
                  <span className="scope-drawer__field-value">{scope.model || '\u2014'}</span>
                </div>
                <div className="scope-drawer__field">
                  <span className="scope-drawer__field-label">Manufacturer</span>
                  <span className="scope-drawer__field-value">{scope.manufacturer || '\u2014'}</span>
                </div>
                <div className="scope-drawer__field">
                  <span className="scope-drawer__field-label">Type</span>
                  <span className={`scope-drawer__badge ${typeBadgeClass}`}>
                    {scope.type || '\u2014'}
                  </span>
                </div>
                <div className="scope-drawer__field">
                  <span className="scope-drawer__field-label">Category</span>
                  <span className="scope-drawer__field-value">{scope.category || '\u2014'}</span>
                </div>
                <div className="scope-drawer__field">
                  <span className="scope-drawer__field-label">Status</span>
                  <span className={`scope-drawer__badge ${scope.isActive ? 'scope-drawer__badge--active' : 'scope-drawer__badge--inactive'}`}>
                    {scope.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="scope-drawer__field">
                  <span className="scope-drawer__field-label">Repair Count</span>
                  <span className="scope-drawer__field-value">{scope.repairCount}</span>
                </div>
                <div className="scope-drawer__field">
                  <span className="scope-drawer__field-label">Last Repair</span>
                  <span className="scope-drawer__field-value">{scope.lastRepairDate || '\u2014'}</span>
                </div>
              </div>
            </div>

            <div className="scope-drawer__section">
              <div className="scope-drawer__section-title">Repair History</div>
              {repairs.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>
                  No repair history found.
                </div>
              ) : (
                <table className="scope-drawer__repairs-table">
                  <thead>
                    <tr>
                      <th>WO#</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>TAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repairs.map(r => (
                      <tr key={r.repairKey}>
                        <td>
                          <span
                            className="scope-drawer__wo-link"
                            onClick={() => navigate(`/repairs?id=${r.repairKey}`)}
                          >
                            {r.workOrderNumber || '\u2014'}
                          </span>
                        </td>
                        <td>{r.dateIn ? new Date(r.dateIn).toLocaleDateString() : '\u2014'}</td>
                        <td>{r.status || '\u2014'}</td>
                        <td>{r.tat}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>
            Scope not found.
          </div>
        )}
      </div>
    </div>
  );
};
