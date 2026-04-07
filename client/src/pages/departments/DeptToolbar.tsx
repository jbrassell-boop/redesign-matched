import { useNavigate } from 'react-router-dom';
import type { DepartmentFull } from './types';
import type { AutosaveStatus } from '../../hooks/useAutosave';
import { AutosaveIndicator } from '../../components/common/AutosaveIndicator';
import './DeptToolbar.css';

interface DeptToolbarProps {
  dept: DepartmentFull;
  autosaveStatus: AutosaveStatus;
  onToggleActive: () => void;
}

export const DeptToolbar = ({ dept, autosaveStatus, onToggleActive }: DeptToolbarProps) => {
  const navigate = useNavigate();

  return (
    <div className="dept-toolbar">
      <h2 className="dept-toolbar__name">{dept.name}</h2>
      <span
        className="dept-toolbar__client"
        onClick={() => navigate(`/clients?id=${dept.clientKey}`)}
      >
        {dept.clientName}
      </span>
      <span className="dept-toolbar__id">#{dept.deptKey}</span>

      <span style={{
        display: 'inline-flex',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        background: dept.isActive ? 'rgba(var(--success-rgb), 0.1)' : 'var(--neutral-100)',
        border: `1px solid ${dept.isActive ? 'rgba(var(--success-rgb), 0.3)' : 'var(--neutral-200)'}`,
        color: dept.isActive ? 'var(--success)' : 'var(--muted)',
      }}>
        {dept.isActive ? 'Active' : 'Inactive'}
      </span>

      <div className="dept-toolbar__spacer" />

      <AutosaveIndicator status={autosaveStatus} />

      <button
        className="dept-toolbar__btn dept-toolbar__btn--toggle"
        onClick={onToggleActive}
      >
        {dept.isActive ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
};
