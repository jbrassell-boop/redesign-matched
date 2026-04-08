import { useState, useEffect } from 'react';
import { message } from 'antd';
import { getContractHealth } from '../../../api/contracts';
import type { ContractHealth } from '../types';
import { healthCenterStyle, healthBarBgStyle, healthRowStyle, healthLabelStyle, healthValueStyle, fmtMoneyDecimal } from './shared';

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
    {children}
  </div>
);

const PanelHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: 'var(--neutral-50)', padding: '7px 12px',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>
    {children}
  </div>
);

export const HealthIndicator = ({ contractKey }: { contractKey: number }) => {
  const [health, setHealth] = useState<ContractHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getContractHealth(contractKey)
      .then(h => { if (!cancelled) setHealth(h); })
      .catch(() => { if (!cancelled) message.error('Failed to load contract health'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  if (loading) return null;
  if (!health || (health.revenue === 0 && health.consumption === 0)) return null;

  const gradeColor = health.grade === 'Healthy' ? 'var(--success)' : health.grade === 'At Risk' ? 'var(--warning)' : 'var(--danger)';
  const gradeBg = health.grade === 'Healthy' ? 'rgba(var(--success-rgb), 0.1)' : health.grade === 'At Risk' ? 'rgba(var(--amber-rgb), 0.1)' : 'rgba(var(--danger-rgb), 0.1)';

  return (
    <Panel>
      <PanelHead><span>Contract Health</span></PanelHead>
      <div style={healthCenterStyle}>
        <div style={{ fontSize: 28, fontWeight: 900, color: gradeColor }}>{health.margin}%</div>
        <div style={{
          display: 'inline-block', padding: '2px 12px', borderRadius: 12,
          fontSize: 11, fontWeight: 700, color: gradeColor, background: gradeBg, marginTop: 4,
        }}>
          {health.grade.toUpperCase()}
        </div>
        <div style={{ marginTop: 12, textAlign: 'left' }}>
          {[
            { label: 'Revenue', value: fmtMoneyDecimal(health.revenue), pct: 100, color: 'var(--navy)' },
            { label: 'Consumption', value: fmtMoneyDecimal(health.consumption), pct: health.percentConsumed, color: 'var(--warning)' },
            { label: 'Time Elapsed', value: `${health.percentTimeElapsed}%`, pct: health.percentTimeElapsed, color: 'var(--primary)' },
          ].map(f => (
            <div key={f.label} style={healthRowStyle}>
              <span style={healthLabelStyle}>{f.label}</span>
              <div style={healthBarBgStyle}>
                <div style={{ width: `${Math.min(f.pct, 100)}%`, height: '100%', background: f.color, borderRadius: 3 }} />
              </div>
              <span style={healthValueStyle}>{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
};
