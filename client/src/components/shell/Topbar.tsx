import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { NewOrderWizard } from './NewOrderWizard';
import { useDensity } from '../../hooks/useDensity';

interface TopbarProps {
  sidebarCollapsed: boolean;
}

const ChevronDownIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

interface WizardState {
  open: boolean;
  orderType: string;
  title: string;
}

export const Topbar = ({ sidebarCollapsed }: TopbarProps) => {
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  const { density, toggle: toggleDensity } = useDensity();
  const sidebarWidth = sidebarCollapsed ? 56 : 240;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [wizard, setWizard] = useState<WizardState>({ open: false, orderType: '', title: '' });

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : 'U';

  // Close menu on outside click or Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const openWizard = (orderType: string, title: string) => {
    setMenuOpen(false);
    setWizard({ open: true, orderType, title });
  };

  const menuItems = [
    { label: 'Receiving', desc: 'Check in incoming scopes and create work orders', type: 'receiving', icon: 'repair', border: true },
    { label: 'Repair Order', desc: 'New scope repair work order', type: 'repair', icon: 'repair', border: true },
    { label: 'Instrument Repair', desc: 'New surgical instrument repair order', type: 'instrument', icon: 'repair', border: true },
    { label: 'Product Sale', desc: 'New product sale order', type: 'product-sale', icon: 'sale', border: true },
    { label: 'Endocart Order', desc: 'New endoscopy cart order', type: 'endocart', icon: 'endocart', border: false },
  ];

  return (
    <>
      <header style={{
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
        willChange: 'left',
        boxSizing: 'border-box',
      }}>
        {/* Left: logo image */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo-white.png" alt="Total Scope, Inc." loading="lazy" style={{ height: 48 }} />
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
          {/* Work Orders dropdown */}
          <div ref={menuRef} style={{ position: 'relative', marginRight: 12 }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              style={{
                height: 30, padding: '0 12px', borderRadius: 6, border: 'none',
                background: 'var(--success)', color: 'var(--card)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 14, height: 14 }}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Work Orders
              <ChevronDownIcon />
            </button>

            {menuOpen && (
              <div role="menu" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: 'var(--card)', border: '1px solid var(--neutral-200)',
                borderRadius: 8, boxShadow: '0 8px 24px rgba(var(--primary-rgb), 0.18)',
                minWidth: 220, zIndex: 9999, overflow: 'hidden',
              }}>
                {menuItems.map((item) => {
                  const handleAction = () => { setMenuOpen(false); item.type === 'receiving' ? navigate('/receiving') : openWizard(item.type, `New ${item.label}`); };
                  return (
                  <div
                    key={item.type}
                    role="menuitem"
                    tabIndex={0}
                    onClick={handleAction}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAction(); } }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      borderBottom: item.border ? '1px solid var(--neutral-100)' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--neutral-50)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: 'rgba(var(--navy-rgb), 0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <MenuItemIcon type={item.icon} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{item.desc}</div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <span style={{ opacity: 0.4 }}>|</span>

          {/* Service location */}
          <span style={{ whiteSpace: 'nowrap' }}>Service Location</span>
          <select aria-label="Service location" style={{
            height: 28,
            padding: '0 8px',
            borderRadius: 5,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.12)',
            color: 'var(--card)',
            fontSize: 12,
            cursor: 'pointer',
            outline: 'none',
          }}>
            <option value="1" style={{ color: 'var(--text)', background: 'var(--card)' }}>Upper Chichester</option>
            <option value="2" style={{ color: 'var(--text)', background: 'var(--card)' }}>Nashville</option>
          </select>

          {/* Density toggle */}
          <button
            onClick={toggleDensity}
            title={density === 'compact' ? 'Switch to comfortable' : 'Switch to compact'}
            style={{
              height: 28, width: 28, padding: 0, borderRadius: 5,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.12)',
              color: 'var(--card)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {density === 'compact' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="M4 14h16M4 10h16M7 18l5-4 5 4M17 6l-5 4-5-4"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="M4 14h16M4 10h16M7 6l5 4 5-4M17 18l-5-4-5 4"/>
              </svg>
            )}
          </button>

          {/* User avatar + welcome */}
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--card)', fontSize: 13, fontWeight: 700, flexShrink: 0, letterSpacing: '0.03em',
          }}>
            {initials}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, whiteSpace: 'nowrap' }}>
            Welcome back, <strong style={{ color: 'var(--card)' }}>{username ?? 'User'}</strong>
          </span>

          {/* Sign out */}
          <button
            onClick={logout}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'var(--card)', padding: '4px 10px', borderRadius: 5,
              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* New Order Wizard Modal */}
      <NewOrderWizard
        open={wizard.open}
        onClose={() => setWizard(w => ({ ...w, open: false }))}
        orderType={wizard.orderType}
        title={wizard.title}
      />
    </>
  );
};

const MenuItemIcon = ({ type }: { type: string }) => {
  const style = { width: 14, height: 14 };
  if (type === 'repair') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" style={style}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  if (type === 'endocart') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" style={style}>
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /><line x1="12" y1="11" x2="12" y2="15" />
      </svg>
    );
  }
  // sale / default
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--navy)" strokeWidth="2" style={style}>
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
};
