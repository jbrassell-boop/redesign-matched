import { useState } from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const { Content } = Layout;

export const AppShell = () => {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 56 : 240;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout style={{ marginLeft: sidebarWidth, transition: 'margin-left 0.2s' }}>
        <Topbar sidebarCollapsed={collapsed} />
        <Content style={{ marginTop: 64, minHeight: 'calc(100vh - 64px)', background: 'var(--bg)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
