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

  const loadTrays = useCallback(async (key: number) => {
    setTraysLoading(true);
    try {
      const t = await getOnsiteServiceTrays(key);
      setTrays(t);
    } catch {
      message.error('Failed to load trays');
    } finally {
      setTraysLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && serviceKey) {
      setActiveTab('summary');
      setDetail(null);
      setTrays([]);
      load(serviceKey);
    }
  }, [open, serviceKey, load]);

  useEffect(() => {
    if (activeTab === 'trays' && serviceKey && trays.length === 0 && !traysLoading) {
      loadTrays(serviceKey);
    }
  }, [activeTab, serviceKey, trays.length, traysLoading, loadTrays]);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
            {detail?.invoiceNum || 'Visit Detail'}
          </span>
          {detail && <StatusBadge status={detail.status} />}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}
        >
          &times;
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>
      ) : !detail ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Action bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
            background: 'var(--neutral-50)', borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            {canSubmit && (
              <button
                onClick={handleSubmitForInvoicing}
                disabled={submitting}
                style={{
                  height: 30, padding: '0 14px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  background: submitting ? 'var(--muted)' : 'var(--primary)', color: 'var(--card)',
                  border: 'none', borderRadius: 6, cursor: submitting ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}>
                  <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
                {submitting ? 'Submitting...' : 'Submit for Invoicing'}
              </button>
            )}
            {!canSubmit && (
              <span style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                Visit is {detail.status} — no further actions available
              </span>
            )}
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
              Key: <strong style={{ color: 'var(--text)' }}>{detail.onsiteServiceKey}</strong>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{
            display: 'flex', background: 'var(--card)', borderBottom: '1px solid var(--border)',
            padding: '0 16px', flexShrink: 0,
          }}>
            {TAB_LABELS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  height: 38, padding: '0 14px', fontSize: 12, fontFamily: 'inherit',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                  color: activeTab === tab.key ? 'var(--primary)' : 'var(--muted)',
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
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
  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{detail.notes}</div>
      </InfoCard>
    )}
  </div>
);

/* ── Trays Tab ────────────────────────────────────────────── */
const TraysTab = ({ trays, loading }: { trays: OnsiteServiceTray[]; loading: boolean }) => {
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin size="small" /></div>;
  if (trays.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
      No tray data recorded for this visit
    </div>
  );

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          background: 'var(--neutral-50)', padding: '6px 12px', fontSize: 10, fontWeight: 700,
          color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Trays</span>
          <span style={{ fontWeight: 600, color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>{trays.length} trays</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
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
                  background: 'var(--neutral-50)', padding: '5px 8px',
                  fontSize: 9, fontWeight: 600, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  textAlign: col.align || 'left',
                  borderBottom: '1px solid var(--neutral-200)',
                  width: col.width,
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trays.map(tray => (
              <tr key={tray.trayKey}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--primary-light)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
              >
                <td style={tdStyle}>{tray.trayNumber}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{tray.trayName || `Tray ${tray.trayNumber}`}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{tray.instrumentsCount}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>{tray.repairedCount}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--primary)', fontWeight: 600 }}>{tray.sentToTsiCount}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--danger)', fontWeight: 600 }}>{tray.beyondEconomicalRepairCount}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--amber)', fontWeight: 600 }}>{tray.replacedCount}</td>
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
  <div style={{ padding: '14px 16px' }}>
    <div style={{ background: 'var(--card)', border: '1px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{
        background: 'var(--neutral-50)', padding: '6px 12px', fontSize: 10, fontWeight: 700,
        color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em',
        borderBottom: '1px solid var(--border)',
      }}>
        Expense Breakdown
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            {['Description', 'Category', 'Qty', 'Unit Cost', 'Total'].map((label, i) => (
              <th key={label} style={{
                background: 'var(--neutral-50)', padding: '5px 8px',
                fontSize: 9, fontWeight: 600, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                textAlign: i >= 2 ? 'right' : 'left',
                borderBottom: '1px solid var(--neutral-200)',
              }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5} style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              No itemized expenses linked to this visit
            </td>
          </tr>
        </tbody>
      </table>

      {/* Total footer */}
      <div style={{
        background: 'var(--neutral-50)', borderTop: '1.5px solid var(--border-dk)',
        padding: '8px 12px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16,
      }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Total Billed</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)', fontFamily: 'monospace' }}>
          ${detail.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  </div>
);

/* ── Shared sub-components ────────────────────────────────── */
const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: 'var(--card)', border: '1px solid var(--border-dk)', borderRadius: 6, overflow: 'hidden' }}>
    <div style={{
      background: 'var(--neutral-50)', padding: '6px 12px', fontSize: 10, fontWeight: 700,
      color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)',
    }}>
      {title}
    </div>
    <div style={{ padding: '12px 14px' }}>{children}</div>
  </div>
);

const TwoColGrid = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
      {label}
    </div>
    <div style={{ fontSize: 12, color: 'var(--text)' }}>{value}</div>
  </div>
);

const tdStyle: React.CSSProperties = {
  padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 11,
};
