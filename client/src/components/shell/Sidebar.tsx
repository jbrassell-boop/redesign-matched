import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { navSections } from './navItems';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export const Sidebar = ({ collapsed, onCollapse }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = navSections.map((section) => ({
    key: section.key,
    label: collapsed ? null : (
      <span style={{
        fontSize: 10,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        color: 'rgba(255,255,255,0.4)',
        fontWeight: 700,
      }}>
        {section.label}
      </span>
    ),
    type: 'group' as const,
    children: section.items.map((item) => ({
      key: item.path,
      label: item.label,
      onClick: () => navigate(item.path),
    })),
  }));

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={240}
      collapsedWidth={56}
      style={{
        background: 'var(--sidebar)',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        overflow: 'auto',
        zIndex: 200,
      }}
    >
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '0 12px' : '0 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        {collapsed ? (
          <img src="/logo-white.png" alt="TSI" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        ) : (
          <img src="/logo-white.png" alt="Total Scope Inc." style={{ height: 36, maxWidth: 180, objectFit: 'contain' }} />
        )}
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        style={{ background: 'var(--sidebar)', border: 'none', marginTop: 8 }}
      />
    </Sider>
  );
};
