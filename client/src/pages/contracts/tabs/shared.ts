// Shared utilities used across all contract tab components.
// Centralised here to avoid duplication and keep tabs thin.

export const fmtDate = (d: string | null | undefined): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const fmtMoney = (v: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

export const fmtMoneyDecimal = (v: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);

export const repairStatusColor = (s: string): string => {
  const lower = s.toLowerCase();
  if (lower.includes('complete') || lower.includes('closed')) return 'var(--success)';
  if (lower.includes('repair') || lower.includes('progress')) return 'var(--warning)';
  return 'var(--muted)';
};

// ── Shared style objects ──────────────────────────────────────────

export const spinnerContainerStyle: React.CSSProperties = { padding: 24, textAlign: 'center' };
export const emptyStateStyle: React.CSSProperties = { padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' };
export const tabPaddingStyle: React.CSSProperties = { padding: '10px 14px' };
export const tabPaddingFlexStyle: React.CSSProperties = { padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 };
export const tableContainerStyle: React.CSSProperties = { padding: 0, maxHeight: 500, overflowY: 'auto' };
export const tableContainerShortStyle: React.CSSProperties = { padding: 0, maxHeight: 400, overflowY: 'auto' };
export const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
export const miniStatCardStyle: React.CSSProperties = { flex: 1, background: 'var(--card)', border: '1px solid var(--neutral-200)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' };
export const miniStatLabelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' };
export const panelBodyStyle: React.CSSProperties = { padding: '12px 14px' };
export const panelBodyLargeStyle: React.CSSProperties = { padding: '16px 14px' };
export const formLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 };
export const formActionsStyle: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8 };
export const amendCancelBtnStyle: React.CSSProperties = { padding: '5px 14px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 5, background: 'var(--card)', cursor: 'pointer', color: 'var(--text)' };
export const amendSaveBtnStyle: React.CSSProperties = { padding: '5px 14px', fontSize: 12, border: 'none', borderRadius: 5, background: 'var(--primary)', color: 'var(--card)', cursor: 'pointer', fontWeight: 600 };
export const amendFormContainerStyle: React.CSSProperties = { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 };
export const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 };
export const formGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' };
export const notesBlockStyle: React.CSSProperties = { marginTop: 10, fontSize: 13, color: 'var(--text)', lineHeight: 1.5, borderTop: '1px solid var(--neutral-200)', paddingTop: 10 };
export const newAmendBtnStyle: React.CSSProperties = { padding: '2px 10px', fontSize: 11, fontWeight: 600, border: '1px solid var(--primary)', borderRadius: 4, background: 'rgba(var(--primary-rgb), 0.07)', color: 'var(--primary)', cursor: 'pointer' };
export const inlineFlexIconStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center' };
export const healthCenterStyle: React.CSSProperties = { padding: '12px 14px', textAlign: 'center' };
export const healthBarBgStyle: React.CSSProperties = { flex: 1, height: 6, background: 'var(--neutral-200)', borderRadius: 3, overflow: 'hidden' };
export const healthRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 };
export const healthLabelStyle: React.CSSProperties = { width: 90, flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--muted)' };
export const healthValueStyle: React.CSSProperties = { width: 70, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--text)' };
export const reportMetricContainerStyle: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap' };
export const reportMetricCardStyle: React.CSSProperties = { flex: '1 1 140px', padding: '12px 14px', border: '1px solid var(--neutral-200)', borderRadius: 8, background: 'var(--card)', textAlign: 'center' };
export const reportMetricLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.04em', marginBottom: 4 };
export const expensePlaceholderStyle: React.CSSProperties = { padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' };
export const expenseTitleStyle: React.CSSProperties = { fontWeight: 600, fontSize: 14, color: 'var(--navy)', marginBottom: 6 };
export const expenseDescStyle: React.CSSProperties = { fontSize: 12, lineHeight: 1.6, maxWidth: 300, margin: '0 auto' };
export const noAddressStyle: React.CSSProperties = { color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' };
export const notesBodyStyle: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5 };
export const miniStatStripStyle: React.CSSProperties = { display: 'flex', gap: 8, marginBottom: 10 };

export const thStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
  textAlign: 'left', background: 'var(--neutral-50)', whiteSpace: 'nowrap',
};
export const tdStyle: React.CSSProperties = {
  padding: '7px 10px', fontSize: 12, borderBottom: '1px solid var(--neutral-200)',
  color: 'var(--text)',
};
