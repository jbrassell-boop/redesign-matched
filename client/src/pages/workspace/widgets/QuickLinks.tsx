import { useNavigate } from 'react-router-dom';

const links = [
  { label: 'New Repair', route: '/repairs',   bg: 'var(--primary-light)', border: 'rgba(var(--primary-rgb), 0.3)', color: 'var(--primary)' },
  { label: 'Inventory',  route: '/inventory',  bg: 'var(--success-light)', border: 'var(--success-border)',         color: 'var(--success)' },
  { label: 'Reports',    route: '/reports',     bg: 'var(--purple-light)',  border: 'rgba(var(--purple-rgb), 0.3)',  color: 'var(--purple)' },
  { label: 'Clients',    route: '/clients',     bg: 'var(--amber-light)',   border: 'var(--amber-border)',           color: 'var(--warning)' },
];

export const QuickLinks = () => {
  const navigate = useNavigate();

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{
        padding: '9px 14px', borderBottom: '1px solid var(--border)',
        background: 'var(--neutral-50)', fontSize: 11, fontWeight: 700,
        color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        Quick Links
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 12 }}>
        {links.map(link => (
          <button
            key={link.label}
            onClick={() => navigate(link.route)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '12px 8px', border: `1px solid ${link.border}`,
              borderRadius: 'var(--radius-md)', background: link.bg,
              color: link.color, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
};
