import './WorkspaceToolbar.css';

interface WorkspaceToolbarProps {
  preset: string;
  editing: boolean;
  onPresetChange: (preset: string) => void;
  onToggleEdit: () => void;
}

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const WorkspaceToolbar = ({ preset, editing, onPresetChange, onToggleEdit }: WorkspaceToolbarProps) => (
  <div className="workspace-toolbar">
    <div className="workspace-toolbar__left">
      <h2 className="workspace-toolbar__title">My Workspace</h2>
      <span className="workspace-toolbar__greeting">{getGreeting()}</span>
    </div>
    <div className="workspace-toolbar__right">
      <select
        className="workspace-toolbar__preset"
        value={preset}
        onChange={e => onPresetChange(e.target.value)}
      >
        <option value="processor">Processor</option>
        <option value="manager">Manager</option>
        <option value="billing">Billing</option>
        <option value="custom">Custom</option>
      </select>
      <button
        className={`workspace-toolbar__edit-btn${editing ? ' workspace-toolbar__edit-btn--active' : ''}`}
        onClick={onToggleEdit}
      >
        {editing ? 'Done Editing' : 'Edit Layout'}
      </button>
    </div>
  </div>
);
