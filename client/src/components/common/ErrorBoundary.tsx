import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, gap: 12 }}>
        <div style={{ fontSize: 40, opacity: 0.15, fontWeight: 800, color: 'var(--navy)' }}>!</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)' }}>Something went wrong</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 400, textAlign: 'center' }}>
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </div>
        {import.meta.env.DEV && this.state.error && (
          <pre style={{ fontSize: 11, color: 'var(--danger)', background: 'var(--neutral-50)', padding: 12, borderRadius: 6, maxWidth: 600, overflow: 'auto', marginTop: 8 }}>
            {this.state.error.message}
          </pre>
        )}
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          style={{ marginTop: 8, height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600, background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Try Again
        </button>
      </div>
    );
  }
}
