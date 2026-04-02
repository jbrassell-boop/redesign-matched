import { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    setError(null);
    try {
      await login(values.username, values.password);
      navigate('/dashboard');
    } catch {
      setError('Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--sidebar)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Card style={{ width: 380, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.16)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={4} style={{ margin: 0, color: 'var(--primary-dark)' }}>Total Scope Inc.</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>WinScope — Sign in</Text>
        </div>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Username is required' }]}>
            <Input size="large" placeholder="Username" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Password is required' }]}>
            <Input.Password size="large" placeholder="Password" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
              style={{ background: 'var(--primary)', fontWeight: 600 }}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
