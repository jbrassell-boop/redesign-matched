import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface LoginForm {
  username: string;
  password: string;
}

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginForm>({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) return;
    setLoading(true);
    setError(null);
    try {
      await login(form.username, form.password);
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
      background: 'linear-gradient(135deg, #EDF2F4 0%, #D0D9EB 50%, #BCC8DB 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 400,
        background: 'var(--card)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 12px 48px rgba(var(--primary-rgb), 0.12), 0 2px 8px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {/* Card Header */}
        <div style={{
          background: 'var(--primary-dark)',
          padding: '28px 32px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
              <circle cx="11" cy="11" r="8" />
              <path d="M11 7v4l2.5 2.5" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, letterSpacing: '0.04em', margin: 0 }}>
            Total Scope, Inc.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 4, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Operations Portal
          </p>
        </div>

        {/* Card Body */}
        <div style={{ padding: '32px' }}>
          {error && (
            <div style={{
              background: 'rgba(var(--danger-rgb), 0.07)',
              border: '1px solid rgba(var(--danger-rgb), 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--danger)',
              marginBottom: 16,
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} autoComplete="off">
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--muted)', textTransform: 'uppercase',
                letterSpacing: '0.05em', marginBottom: 6,
              }}>Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Username"
                autoComplete="username"
                style={{
                  width: '100%', height: 40, border: '1.5px solid var(--border-dk)',
                  borderRadius: 'var(--radius-md)', padding: '0 14px', fontSize: 13,
                  fontFamily: 'inherit', color: 'var(--text)', outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb), 0.08)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-dk)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: 'var(--muted)', textTransform: 'uppercase',
                letterSpacing: '0.05em', marginBottom: 6,
              }}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Password"
                autoComplete="current-password"
                style={{
                  width: '100%', height: 40, border: '1.5px solid var(--border-dk)',
                  borderRadius: 'var(--radius-md)', padding: '0 14px', fontSize: 13,
                  fontFamily: 'inherit', color: 'var(--text)', outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--primary-rgb), 0.08)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-dk)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: 42,
                background: loading ? 'rgba(var(--navy-rgb), 0.6)' : 'var(--navy)',
                color: '#fff', border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Card Footer */}
        <div style={{
          padding: '16px 32px',
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
          fontSize: 10,
          color: 'var(--muted)',
        }}>
          Total Scope, Inc. &mdash; WinScope &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};
