import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: 'calc(100vh - 64px)', gap: 16,
      color: 'var(--muted)',
    }}>
      <div style={{ fontSize: 64, fontWeight: 800, color: 'var(--navy)', opacity: 0.15 }}>404</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)' }}>Page Not Found</div>
      <div style={{ fontSize: 13 }}>The page you requested does not exist or has been moved.</div>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          marginTop: 8, height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600,
          background: 'var(--primary)', color: 'var(--card)', border: 'none',
          borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
};
