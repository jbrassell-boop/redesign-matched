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
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle grid pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, position: 'relative', zIndex: 1 }}>
        {/* Company identity above card */}
        <div style={{ textAlign: 'center' }}>
          <img src="/logo-white.png" alt="Total Scope, Inc." style={{ height: 64, marginBottom: 12, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>
            Medical Device Repair Management
          </p>
        </div>

        {/* Login card */}
        <div style={{
          width: 380,
          background: 'var(--card)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}>
          {/* Card body */}
          <div style={{ padding: '32px 32px 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)', marginBottom: 4 }}>
              Sign In
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 24 }}>
              WinScope Operations Portal
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 6,
                padding: '10px 14px',
                fontSize: 12,
                color: 'var(--danger)',
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} autoComplete="off">
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: 'var(--navy)', marginBottom: 6,
                }}>Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="Enter your username"
                  autoComplete="username"
                  style={{
                    width: '100%', height: 40, border: '1.5px solid var(--border-dk)',
                    borderRadius: 6, padding: '0 14px', fontSize: 13,
                    fontFamily: 'inherit', color: 'var(--text)', outline: 'none',
                    boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46,117,182,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-dk)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: 'var(--navy)', marginBottom: 6,
                }}>Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{
                    width: '100%', height: 40, border: '1.5px solid var(--border-dk)',
                    borderRadius: 6, padding: '0 14px', fontSize: 13,
                    fontFamily: 'inherit', color: 'var(--text)', outline: 'none',
                    boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46,117,182,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-dk)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: 44,
                  background: loading ? 'rgba(15,23,42,0.6)' : 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                  color: '#fff', border: 'none',
                  borderRadius: 6,
                  fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', letterSpacing: '0.04em',
                  transition: 'all 0.15s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Certifications footer */}
          <div style={{
            padding: '14px 32px',
            borderTop: '1px solid var(--border)',
            background: 'var(--neutral-50)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '3px 10px', borderRadius: 4,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
            }}>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth={2.5}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--primary)', letterSpacing: '.03em' }}>ISO 13485:2016</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
          &copy; {new Date().getFullYear()} Total Scope, Inc. &mdash; WinScope Platform
        </div>
      </div>
    </div>
  );
};
