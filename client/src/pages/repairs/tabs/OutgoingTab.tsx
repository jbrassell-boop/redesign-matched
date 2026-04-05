import React from 'react';
import { message, Modal } from 'antd';
import type { RepairFull, RepairLineItem } from '../types';
import { createDraftInvoice } from '../../../api/repairs';

interface OutgoingTabProps {
  repair: RepairFull;
  items: RepairLineItem[];
}

const F = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 }}>{label}</div>
    <div style={{
      height: 26, border: '1px solid #d1d5db', borderRadius: 3,
      background: '#fff', padding: '0 7px', fontSize: 11,
      color: value ? '#374151' : '#9ca3af', fontStyle: value ? 'normal' : 'italic',
      display: 'flex', alignItems: 'center',
    }}>
      {value || '—'}
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
    <div style={{
      background: 'var(--neutral-50, #f9fafb)', padding: '6px 10px',
      fontSize: 9.5, fontWeight: 700, color: 'var(--navy)',
      textTransform: 'uppercase', letterSpacing: '.05em',
      borderBottom: '1px solid var(--border)',
    }}>
      {title}
    </div>
    <div style={{ padding: 10 }}>{children}</div>
  </div>
);

const causeBadgeStyle = (cause: string): React.CSSProperties => {
  if (cause?.toUpperCase() === 'UA') return { background: '#FEF2F2', color: 'var(--danger)', border: '1px solid #FECACA' };
  if (cause?.toUpperCase() === 'NW') return { background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' };
  return { background: 'var(--neutral-50)', color: 'var(--muted)', border: '1px solid var(--border)' };
};

const fixBadgeStyle = (fix: string): React.CSSProperties => {
  const map: Record<string, React.CSSProperties> = {
    W:  { background: '#F0FDF4', color: 'var(--success)', border: '1px solid #BBF7D0' },
    NC: { background: '#FEF2F2', color: 'var(--danger)',  border: '1px solid #FECACA' },
    C:  { background: '#EFF6FF', color: 'var(--primary)', border: '1px solid #BFDBFE' },
    A:  { background: '#F5F3FF', color: '#7C3AED',        border: '1px solid #DDD6FE' },
  };
  return map[fix?.toUpperCase()] ?? { background: 'var(--neutral-50)', color: 'var(--muted)', border: '1px solid var(--border)' };
};

const Badge = ({ label, style }: { label: string; style: React.CSSProperties }) => (
  <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 700, ...style }}>
    {label || '—'}
  </span>
);

export const OutgoingTab = ({ repair, items }: OutgoingTabProps) => {
  const warrantyTotal = items.filter(i => i.fixType?.toUpperCase() === 'W').reduce((s, i) => s + (i.amount ?? 0), 0);
  const customerTotal = items.filter(i => i.fixType?.toUpperCase() !== 'W').reduce((s, i) => s + (i.amount ?? 0), 0);
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* LEFT */}
      <div>
        <Section title="Outbound Shipping">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
            <F label="Outbound Service Level" value={repair.deliveryServiceLevel} />
            <F label="Ship Date" value={repair.shipDate} />
            <F label="Outbound Tracking" value={repair.trackingNumber} />
            <F label="Package Type" value={repair.packageType} />
            <F label="Package Weight" value={repair.shipWeight} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Tracking Required
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['Yes', 'No'] as const).map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <input type="radio" name="trackingReq" readOnly
                    checked={opt === 'Yes' ? !!repair.trackingRequired : !repair.trackingRequired}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Delivery Dates">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
            <F label="GTD Delivery Date & Time" value={repair.gtdDeliveryDate} />
            <F label="Winscope GTD Delivery" value={repair.winscopeGtdDate} />
            <F label="Actual Delivery Date & Time" value={repair.actualDeliveryDate} />
          </div>
        </Section>

        <Section title="Ship To Address">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            <F label="Ship to Name" value={repair.shipName} />
            <F label="Address" value={repair.shipAddr1} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', gap: '0 6px' }}>
              <F label="City" value={repair.shipCity} />
              <F label="ST" value={repair.shipState} />
              <F label="ZIP" value={repair.shipZip} />
            </div>
          </div>
          <button
            onClick={() => message.info('Label printing requires local printer configuration — contact IT')}
            style={{
              height: 28, padding: '0 12px', fontSize: 11, fontWeight: 600,
              background: 'var(--neutral-50, #f9fafb)', color: 'var(--navy)',
              border: '1px solid var(--border)', borderRadius: 4,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Create Label
          </button>
        </Section>
      </div>

      {/* RIGHT — Invoice */}
      <div>
        <Section title="Invoice">
          {/* Invoice card */}
          <div style={{
            background: 'var(--primary)', color: '#fff',
            borderRadius: 6, padding: 14, marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, opacity: .6, textTransform: 'uppercase', fontWeight: 700 }}>Invoice Number</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{repair.invoiceNumber || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, opacity: .6, textTransform: 'uppercase', fontWeight: 700 }}>Invoice Date</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{repair.shipDate || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: 'Draft Invoice', onClick: async () => {
                  try {
                    const r = await createDraftInvoice(repair.repairKey);
                    message.success(`Draft invoice #${r.invoiceKey} created`);
                  } catch { message.error('Failed to create draft invoice'); }
                } },
                { label: 'Email Invoice', onClick: () => message.info('Invoice emailing requires SMTP configuration — contact IT') },
                { label: 'Void Invoice',  onClick: () => Modal.confirm({
                  title: 'Void Invoice',
                  content: 'Are you sure you want to void this invoice? This action requires accounting approval and cannot be undone.',
                  okText: 'Request Void',
                  okButtonProps: { danger: true },
                  onOk: () => message.info('Invoice void requires accounting approval'),
                }), danger: true },
              ].map(btn => (
                <button key={btn.label}
                  onClick={btn.onClick}
                  style={{
                    padding: '4px 10px', fontSize: 10, fontWeight: 700,
                    background: btn.danger ? 'rgba(var(--danger-rgb),.7)' : 'rgba(255,255,255,.15)',
                    color: '#fff', border: '1px solid rgba(255,255,255,.3)',
                    borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line items summary */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--navy)', color: '#fff' }}>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600, fontSize: 10 }}>Description</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 600, fontSize: 10 }}>Cause</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 600, fontSize: 10 }}>Fix</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, fontSize: 10 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.tranKey}>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{item.description}</td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                      <Badge label={item.cause} style={causeBadgeStyle(item.cause)} />
                    </td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                      <Badge label={item.fixType} style={fixBadgeStyle(item.fixType)} />
                    </td>
                    <td style={{
                      padding: '5px 8px', borderBottom: '1px solid var(--border)',
                      textAlign: 'right', fontWeight: 700,
                      color: item.fixType?.toUpperCase() === 'W' ? 'var(--success)' : undefined,
                    }}>
                      {fmt(item.amount ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{
              background: 'var(--navy)', color: '#fff', padding: '7px 10px',
              display: 'flex', justifyContent: 'flex-end', gap: 20, alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, opacity: .7 }}>Warranty: <span style={{ color: '#4ade80', fontWeight: 700 }}>{fmt(warrantyTotal)}</span></span>
              <span style={{ fontSize: 11, opacity: .7 }}>Non-Warranty: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{fmt(customerTotal)}</span></span>
              <span style={{ fontSize: 13, fontWeight: 900 }}>Total: {fmt(warrantyTotal + customerTotal)}</span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};
