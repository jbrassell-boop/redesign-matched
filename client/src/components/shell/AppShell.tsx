import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { InspectorProvider } from '../../contexts/InspectorContext';
import { DevInspectorPanel } from '../inspector/DevInspectorPanel';

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
    <InspectorProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
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
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
        <CommandPalette />
        <DevInspectorPanel />
        <div aria-live="polite" id="status-announcer" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }} />
      </div>
    </InspectorProvider>
  );
};
