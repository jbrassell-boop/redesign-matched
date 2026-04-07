import type { ClientFull } from './types';
import type { AutosaveStatus } from '../../hooks/useAutosave';
import { AutosaveIndicator } from '../../components/common/AutosaveIndicator';
import './ClientToolbar.css';

interface ClientToolbarProps {
  client: ClientFull;
  autosaveStatus: AutosaveStatus;
  onToggleActive: () => void;
  onDelete: () => void;
}

export const ClientToolbar = ({ client, autosaveStatus, onToggleActive, onDelete }: ClientToolbarProps) => (
  <div className="client-toolbar">
    <h2 className="client-toolbar__name">{client.name}</h2>
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

    <AutosaveIndicator status={autosaveStatus} />

    <button
      className="client-toolbar__btn client-toolbar__btn--danger"
      onClick={client.isActive ? onToggleActive : onDelete}
    >
      {client.isActive ? 'Deactivate' : 'Delete'}
    </button>
  </div>
);
