import { Layout, Space, Avatar, Typography } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';

const { Header } = Layout;
const { Text } = Typography;

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export const Topbar = ({ sidebarCollapsed }: TopbarProps) => {
  const { username, logout } = useAuth();
  const sidebarWidth = sidebarCollapsed ? 56 : 240;

  return (
    <Header style={{
      position: 'fixed',
      top: 0,
      left: sidebarWidth,
      right: 0,
      height: 64,
      background: '#1E293B',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 199,
      transition: 'left 0.2s',
    }}>
      <Text style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>WinScope</Text>

      <Space size={12}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{username}</Text>
        <Avatar
          size={32}
          icon={<UserOutlined />}
          style={{ background: 'rgba(255,255,255,0.15)', cursor: 'pointer' }}
        />
        <LogoutOutlined
          style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14 }}
          onClick={logout}
          title="Sign out"
        />
      </Space>
    </Header>
  );
};
