import { Spin } from 'antd';
import type { ClientFull, SaveState } from './types';
import './ClientToolbar.css';

interface ClientToolbarProps {
  client: ClientFull;
  saveState: SaveState;
  onSave: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

export const ClientToolbar = ({ client, saveState, onSave, onToggleActive, onDelete }: ClientToolbarProps) => (
  <div className="client-toolbar">
    <span className="client-toolbar__name">{client.name}</span>
    <span className="client-toolbar__id">#{client.clientKey}</span>

    <span style={{
      display: 'inline-flex',
      padding: '2px 8px',
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 700,
      background: client.isActive ? 'rgba(var(--success-rgb), 0.1)' : 'var(--neutral-100)',
      border: `1px solid ${client.isActive ? 'rgba(var(--success-rgb), 0.3)' : 'var(--neutral-200)'}`,
      color: client.isActive ? 'var(--success)' : 'var(--muted)',
    }}>
      {client.isActive ? 'Active' : 'Inactive'}
    </span>

    <div className="client-toolbar__spacer" />

    <div className="client-toolbar__save-indicator">
      {saveState === 'saving' ? (
        <Spin size="small" />
      ) : (
        <span className={`client-toolbar__dot client-toolbar__dot--${saveState}`} />
      )}
      <span className={`client-toolbar__save-text--${saveState}`}>
        {saveState === 'ready' && 'Ready'}
        {saveState === 'unsaved' && 'Unsaved'}
        {saveState === 'saving' && 'Saving...'}
        {saveState === 'saved' && 'Saved'}
      </span>
    </div>

    <button
      className="client-toolbar__btn"
      disabled={saveState !== 'unsaved'}
      onClick={onSave}
    >
      Save
    </button>

    <button
      className="client-toolbar__btn client-toolbar__btn--danger"
      onClick={client.isActive ? onToggleActive : onDelete}
    >
      {client.isActive ? 'Deactivate' : 'Delete'}
    </button>
  </div>
);
