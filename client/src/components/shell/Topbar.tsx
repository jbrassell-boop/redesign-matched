import { useAuth } from '../../hooks/useAuth';

interface TopbarProps {
  sidebarCollapsed: boolean;
}


const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export const Topbar = ({ sidebarCollapsed }: TopbarProps) => {
  const { username, logout } = useAuth();
  const sidebarWidth = sidebarCollapsed ? 56 : 240;

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
      padding: '0 24px',
      zIndex: 199,
      transition: 'left 0.2s ease',
      boxSizing: 'border-box',
    }}>
      {/* Left: logo image */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <img src="/logo-white.png" alt="Total Scope, Inc." style={{ height: 48 }} />
      </div>

      {/* Right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
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
          + Work Orders
          <ChevronDownIcon />
        </button>

        <span style={{ opacity: 0.4 }}>|</span>

        {/* Service location */}
        <span style={{ whiteSpace: 'nowrap' }}>Service Location</span>
        <select style={{
          height: 28,
          padding: '0 8px',
          borderRadius: 5,
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'rgba(255,255,255,0.12)',
          color: '#fff',
          fontSize: 12,
          cursor: 'pointer',
          outline: 'none',
        }}>
          <option value="1" style={{ color: '#111', background: '#fff' }}>Upper Chichester</option>
          <option value="2" style={{ color: '#111', background: '#fff' }}>Nashville</option>
        </select>

        {/* User avatar + welcome */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          letterSpacing: '0.03em',
        }}>
          {initials}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, whiteSpace: 'nowrap' }}>
          Welcome back, <strong style={{ color: '#fff' }}>{username ?? 'User'}</strong>
        </span>

        {/* Sign out */}
        <button
          onClick={logout}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: 5,
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
