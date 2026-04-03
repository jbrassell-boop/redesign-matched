import { Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { DepartmentFull, SaveState } from './types';
import './DeptToolbar.css';

interface DeptToolbarProps {
  dept: DepartmentFull;
  saveState: SaveState;
  onSave: () => void;
  onToggleActive: () => void;
}

export const DeptToolbar = ({ dept, saveState, onSave, onToggleActive }: DeptToolbarProps) => {
  const navigate = useNavigate();

  return (
    <div className="dept-toolbar">
      <span className="dept-toolbar__name">{dept.name}</span>
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

      <div className="dept-toolbar__save-indicator">
        {saveState === 'saving' ? (
          <Spin size="small" />
        ) : (
          <span className={`dept-toolbar__dot dept-toolbar__dot--${saveState}`} />
        )}
        <span className={`dept-toolbar__save-text--${saveState}`}>
          {saveState === 'ready' && 'Ready'}
          {saveState === 'unsaved' && 'Unsaved'}
          {saveState === 'saving' && 'Saving...'}
          {saveState === 'saved' && 'Saved'}
        </span>
      </div>

      <button
        className="dept-toolbar__btn"
        disabled={saveState !== 'unsaved'}
        onClick={onSave}
      >
        Save
      </button>

      <button
        className="dept-toolbar__btn dept-toolbar__btn--toggle"
        onClick={onToggleActive}
      >
        {dept.isActive ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
};
