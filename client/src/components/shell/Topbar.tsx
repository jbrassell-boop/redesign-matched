import { useAuth } from '../../hooks/useAuth';

interface TopbarProps {
  sidebarCollapsed: boolean;
}

const SignOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export const Topbar = ({ sidebarCollapsed }: TopbarProps) => {
  const { username, logout } = useAuth();
  const sidebarWidth = sidebarCollapsed ? 56 : 240;

  // Derive initials from username
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: sidebarWidth,
      right: 0,
      height: 64,
      background: 'var(--topbar)',
      borderBottom: '1px solid var(--topbar-border)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 199,
      transition: 'left 0.2s ease',
      boxSizing: 'border-box',
    }}>
      {/* Left: avatar + welcome text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          letterSpacing: '0.03em',
        }}>
          {initials}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
          Welcome back, <strong style={{ color: '#fff' }}>{username ?? 'User'}</strong>
        </span>
      </div>

      {/* Right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Work Orders button */}
        <button style={{
          height: 30,
          padding: '0 12px',
          borderRadius: 6,
          border: 'none',
          background: '#22C55E',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}>
          Work Orders
          <ChevronDownIcon />
        </button>

        {/* Service location select */}
        <select style={{
          height: 32,
          padding: '0 10px',
          borderRadius: 6,
          border: '1.5px solid rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.12)',
          color: '#fff',
          fontSize: 12,
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}>
          <option value="upper-chichester" style={{ color: '#111', background: '#fff' }}>Upper Chichester</option>
          <option value="nashville" style={{ color: '#111', background: '#fff' }}>Nashville</option>
        </select>

        {/* Connected indicator */}
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
          Connected
        </span>

        {/* Sign out button */}
        <button
          onClick={logout}
          title="Sign out"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            borderRadius: 4,
          }}
        >
          <SignOutIcon />
        </button>
      </div>
    </div>
  );
};
