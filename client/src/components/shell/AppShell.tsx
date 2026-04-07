import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';

const getInitialCollapsed = () => {
  const pref = localStorage.getItem('tsi_sidebarCollapsed');
  if (pref !== null) return pref === '1';
  return window.innerWidth <= 1280;
};

export const AppShell = () => {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  const handleCollapse = (val: boolean) => {
    localStorage.setItem('tsi_sidebarCollapsed', val ? '1' : '0');
    setCollapsed(val);
  };
  const sidebarWidth = collapsed ? 56 : 240;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <a href="#main-content" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden', zIndex: 9999 }} onFocus={(e) => { e.currentTarget.style.position = 'fixed'; e.currentTarget.style.left = '8px'; e.currentTarget.style.top = '8px'; e.currentTarget.style.width = 'auto'; e.currentTarget.style.height = 'auto'; e.currentTarget.style.overflow = 'visible'; e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.padding = '8px 16px'; e.currentTarget.style.borderRadius = '4px'; e.currentTarget.style.fontSize = '14px'; e.currentTarget.style.fontWeight = '600'; e.currentTarget.style.textDecoration = 'none'; }} onBlur={(e) => { e.currentTarget.style.position = 'absolute'; e.currentTarget.style.left = '-9999px'; e.currentTarget.style.width = '1px'; e.currentTarget.style.height = '1px'; e.currentTarget.style.overflow = 'hidden'; }}>Skip to main content</a>
      <Sidebar collapsed={collapsed} onCollapse={handleCollapse} />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        marginLeft: sidebarWidth,
        transition: 'margin-left 0.2s ease',
        willChange: 'margin-left',
      }}>
        <Topbar sidebarCollapsed={collapsed} />
        <main role="main" id="main-content" style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', marginTop: 64 }}>
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <div aria-live="polite" id="status-announcer" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }} />
    </div>
  );
};
