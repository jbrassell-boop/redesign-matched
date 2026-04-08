import { useState, useEffect, useCallback } from 'react';
import { Spin, message } from 'antd';
import { getOnsiteServiceDetail, getOnsiteServiceTrays, submitOnsiteForInvoicing } from '../../api/onsite-services';
import { StatusBadge } from '../../components/shared';
import type { OnsiteServiceDetail, OnsiteServiceTray } from './types';

interface Props {
  open: boolean;
  serviceKey: number | null;
  onClose: () => void;
  onUpdated: () => void;
}

type TabKey = 'summary' | 'trays' | 'expenses';

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'trays', label: 'Trays' },
  { key: 'expenses', label: 'Expenses' },
];

// ── Extracted static styles ──
const drawerContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%' };
const drawerHeaderStyle: React.CSSProperties = { background: 'var(--navy)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 };
const drawerHeaderLeftStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };
const drawerTitleStyle: React.CSSProperties = { fontWeight: 700, color: 'var(--card)', fontSize: 14, margin: 0 };
const drawerCloseBtnStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '2px 6px' };
const drawerSpinnerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', padding: 40 };
const drawerBodyStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' };
const drawerActionBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--neutral-50)', borderBottom: '1px solid var(--border)', flexShrink: 0 };
const submitBtnBaseStyle: React.CSSProperties = { height: 30, padding: '0 14px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', color: 'var(--card)', border: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 };
const noActionLabelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' };
const keyLabelStyle: React.CSSProperties = { marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' };
const keyValueStyle: React.CSSProperties = { color: 'var(--text)' };
const drawerTabBarStyle: React.CSSProperties = { display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '0 16px', flexShrink: 0 };
const tabBtnBaseStyle: React.CSSProperties = { height: 38, padding: '0 14px', fontSize: 12, fontFamily: 'inherit', background: 'none', border: 'none', cursor: 'pointer', marginBottom: -1 };
const tabContentStyle: React.CSSProperties = { flex: 1, overflow: 'auto' };
const summaryPadStyle: React.CSSProperties = { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 };
const notesTextStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' };
const emptyPadStyle: React.CSSProperties = { padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 };
const traysPadStyle: React.CSSProperties = { padding: '14px 16px' };
const cardBorderStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden' };
const cardHeaderStyle: React.CSSProperties = { background: 'var(--neutral-50)', padding: '6px 12px', fontSize: 10, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' };
const traysCardHeaderStyle: React.CSSProperties = { ...cardHeaderStyle, display: 'flex', justifyContent: 'space-between' };
const trayCountLabelStyle: React.CSSProperties = { fontWeight: 600, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 };
const trayTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 11 };
const trayThBaseStyle: React.CSSProperties = { background: 'var(--neutral-50)', padding: '5px 8px', fontSize: 9, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--neutral-200)' };
const trayTdBoldStyle: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600 };
const trayTdCenterBoldStyle: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 11, textAlign: 'center', fontWeight: 700 };
const trayTdCenterSuccessStyle: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 11, textAlign: 'center', color: 'var(--success)', fontWeight: 600 };
const trayTdCenterPrimaryStyle: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 11, textAlign: 'center', color: 'var(--primary)', fontWeight: 600 };
const trayTdCenterDangerStyle: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 11, textAlign: 'center', color: 'var(--danger)', fontWeight: 600 };
const trayTdCenterAmberStyle: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 11, textAlign: 'center', color: 'var(--amber)', fontWeight: 600 };
const expenseEmptyStyle: React.CSSProperties = { padding: '28px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 };
const expenseFooterStyle: React.CSSProperties = { background: 'var(--neutral-50)', borderTop: '1.5px solid var(--border-dk)', padding: '8px 12px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 };
const expenseTotalLabelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', fontWeight: 600 };
const expenseTotalValueStyle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: 'var(--navy)', fontFamily: 'monospace' };
const cardBodyPadStyle: React.CSSProperties = { padding: '12px 14px' };
const twoColGridOnsiteStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' };
const fieldLabelStyle: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 };
const fieldValueStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text)' };

export const OnsiteServiceDetailDrawer = ({ open, serviceKey, onClose, onUpdated }: Props) => {
  const [detail, setDetail] = useState<OnsiteServiceDetail | null>(null);
  const [trays, setTrays] = useState<OnsiteServiceTray[]>([]);
  const [loading, setLoading] = useState(false);
  const [traysLoading, setTraysLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (key: number) => {
    setLoading(true);
    try {
      const d = await getOnsiteServiceDetail(key);
      setDetail(d);
    } catch {
      message.error('Failed to load visit details');
    } finally {
      setLoading(false);
    }
  }, []);

  // loadTrays removed — inlined into useEffect with cancellation cleanup

  useEffect(() => {
    if (!open || !serviceKey) return;
    let cancelled = false;
    setActiveTab('summary');
    setDetail(null);
    setTrays([]);
    setLoading(true);
    getOnsiteServiceDetail(serviceKey)
      .then(d => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) message.error('Failed to load visit details'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, serviceKey]);

  useEffect(() => {
    if (activeTab !== 'trays' || !serviceKey || trays.length > 0 || traysLoading) return;
    let cancelled = false;
    setTraysLoading(true);
    getOnsiteServiceTrays(serviceKey)
      .then(t => { if (!cancelled) setTrays(t); })
      .catch(() => { if (!cancelled) message.error('Failed to load trays'); })
      .finally(() => { if (!cancelled) setTraysLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, serviceKey, trays.length, traysLoading]);

  const handleSubmitForInvoicing = async () => {
    if (!serviceKey) return;
    setSubmitting(true);
    try {
      await submitOnsiteForInvoicing(serviceKey);
      message.success('Visit submitted for invoicing');
      onUpdated();
      if (serviceKey) load(serviceKey);
    } catch {
      message.error('Failed to submit for invoicing');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = detail?.status === 'Draft';

  if (!open) return null;

  return (
    <div style={drawerContainerStyle}>
      {/* Header */}
      <div style={drawerHeaderStyle}>
        <div style={drawerHeaderLeftStyle}>
          <h2 style={drawerTitleStyle}>
            {detail?.invoiceNum || 'Visit Detail'}
          </h2>
          {detail && <StatusBadge status={detail.status} />}
        </div>
        <button
          onClick={onClose}
          style={drawerCloseBtnStyle}
        >
          &times;
        </button>
      </div>

      {loading ? (
        <div style={drawerSpinnerStyle}><Spin /></div>
      ) : !detail ? null : (
        <div style={drawerBodyStyle}>
          {/* Action bar */}
          <div style={drawerActionBarStyle}>
            {canSubmit && (
              <button
                onClick={handleSubmitForInvoicing}
                disabled={submitting}
                style={{
                  ...submitBtnBaseStyle,
                  background: submitting ? 'var(--muted)' : 'var(--primary)',
                  cursor: submitting ? 'default' : 'pointer',
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}>
                  <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                {submitting ? 'Submitting...' : 'Submit for Invoicing'}
              </button>
            )}
            {!canSubmit && (
              <span style={noActionLabelStyle}>
                Visit is {detail.status} — no further actions available
              </span>
            )}
            <div style={keyLabelStyle}>
              Key: <strong style={keyValueStyle}>{detail.onsiteServiceKey}</strong>
            </div>
          </div>

          {/* Tab bar */}
          <div style={drawerTabBarStyle}>
            {TAB_LABELS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  ...tabBtnBaseStyle,
                  borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === tab.key ? 'var(--primary)' : 'var(--muted)',
                  fontWeight: activeTab === tab.key ? 600 : 400,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={tabContentStyle}>
            {activeTab === 'summary' && <SummaryTab detail={detail} />}
            {activeTab === 'trays' && <TraysTab trays={trays} loading={traysLoading} />}
            {activeTab === 'expenses' && <ExpensesTab detail={detail} />}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Summary Tab ──────────────────────────────────────────── */
const SummaryTab = ({ detail }: { detail: OnsiteServiceDetail }) => (
  <div style={summaryPadStyle}>
    <InfoCard title="Visit Info">
      <TwoColGrid>
        <Field label="Invoice #" value={detail.invoiceNum} />
        <Field label="Status" value={<StatusBadge status={detail.status} />} />
        <Field label="Client" value={detail.clientName} />
        <Field label="Department" value={detail.deptName} />
        <Field label="Technician" value={detail.techName} />
        <Field label="Visit Date" value={detail.visitDate ?? '—'} />
        <Field label="Submitted" value={detail.submittedDate ?? '—'} />
        <Field label="PO #" value={detail.purchaseOrder ?? '—'} />
        <Field label="Truck #" value={detail.truckNumber ?? '—'} />
      </TwoColGrid>
    </InfoCard>

    <InfoCard title="Counts">
      <TwoColGrid>
        <Field label="Trays" value={detail.trayCount} />
        <Field label="Instruments" value={detail.instrumentCount} />
        <Field label="Total Billed" value={`$${detail.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
      </TwoColGrid>
    </InfoCard>

    {detail.notes && (
      <InfoCard title="Notes">
        <div style={notesTextStyle}>{detail.notes}</div>
      </InfoCard>
    )}
  </div>
);

/* ── Trays Tab ────────────────────────────────────────────── */
const TraysTab = ({ trays, loading }: { trays: OnsiteServiceTray[]; loading: boolean }) => {
  if (loading) return <div style={drawerSpinnerStyle}><Spin size="small" /></div>;
  if (trays.length === 0) return (
    <div style={emptyPadStyle}>
      No tray data recorded for this visit
    </div>
  );

  return (
    <div style={traysPadStyle}>
      <div style={cardBorderStyle}>
        <div style={traysCardHeaderStyle}>
          <span>Trays</span>
          <span style={trayCountLabelStyle}>{trays.length} trays</span>
        </div>
        <table style={trayTableStyle}>
          <thead>
            <tr>
              {[
                { label: '#', width: 40 },
                { label: 'Tray Name', width: 180 },
                { label: 'Instruments', width: 90, align: 'center' as const },
                { label: 'Repaired', width: 80, align: 'center' as const },
                { label: 'Sent to TSI', width: 90, align: 'center' as const },
                { label: 'BER', width: 60, align: 'center' as const },
                { label: 'Replaced', width: 80, align: 'center' as const },
              ].map(col => (
                <th key={col.label} style={{
                  ...trayThBaseStyle,
                  textAlign: col.align || 'left',
                  width: col.width,
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trays.map(tray => (
              <tr key={tray.trayKey} className="hover-row-light">
                <td style={tdStyle}>{tray.trayNumber}</td>
                <td style={trayTdBoldStyle}>{tray.trayName || `Tray ${tray.trayNumber}`}</td>
                <td style={trayTdCenterBoldStyle}>{tray.instrumentsCount}</td>
                <td style={trayTdCenterSuccessStyle}>{tray.repairedCount}</td>
                <td style={trayTdCenterPrimaryStyle}>{tray.sentToTsiCount}</td>
                <td style={trayTdCenterDangerStyle}>{tray.beyondEconomicalRepairCount}</td>
                <td style={trayTdCenterAmberStyle}>{tray.replacedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ── Expenses Tab ─────────────────────────────────────────── */
const ExpensesTab = ({ detail }: { detail: OnsiteServiceDetail }) => (
  <div style={traysPadStyle}>
    <div style={cardBorderStyle}>
      <div style={cardHeaderStyle}>
        Expense Breakdown
      </div>
      <table style={trayTableStyle}>
        <thead>
          <tr>
            {['Description', 'Category', 'Qty', 'Unit Cost', 'Total'].map((label, i) => (
              <th key={label} style={{
                ...trayThBaseStyle,
                textAlign: i >= 2 ? 'right' : 'left',
              }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5} style={expenseEmptyStyle}>
              No itemized expenses linked to this visit
            </td>
          </tr>
        </tbody>
      </table>

      {/* Total footer */}
      <div style={expenseFooterStyle}>
        <span style={expenseTotalLabelStyle}>Total Billed</span>
        <span style={expenseTotalValueStyle}>
          ${detail.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  </div>
);

/* ── Shared sub-components ────────────────────────────────── */
const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={cardBorderStyle}>
    <div style={cardHeaderStyle}>
      {title}
    </div>
    <div style={cardBodyPadStyle}>{children}</div>
  </div>
);

const TwoColGrid = ({ children }: { children: React.ReactNode }) => (
  <div style={twoColGridOnsiteStyle}>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div style={fieldLabelStyle}>
      {label}
    </div>
    <div style={fieldValueStyle}>{value}</div>
  </div>
);

const tdStyle: React.CSSProperties = {
  padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 11,
};
