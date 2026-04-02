import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppShell = () => {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 56 : 240;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
        marginLeft: sidebarWidth,
        transition: 'margin-left 0.2s ease',
      }}>
        <Topbar sidebarCollapsed={collapsed} />
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', marginTop: 64 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};
