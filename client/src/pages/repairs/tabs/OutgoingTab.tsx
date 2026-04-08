import React from 'react';
import { message, Modal } from 'antd';
import type { RepairFull, RepairLineItem } from '../types';
import { createDraftInvoice } from '../../../api/repairs';

// ── Extracted static styles ──
const fLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 };
const fValueBaseStyle: React.CSSProperties = { height: 26, border: '1px solid var(--neutral-200)', borderRadius: 3, background: 'var(--card)', padding: '0 7px', fontSize: 11, display: 'flex', alignItems: 'center' };
const sectionCardStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: 10 };
const sectionTitleStyle: React.CSSProperties = { background: 'var(--neutral-50, var(--bg))', padding: '6px 10px', fontSize: 11.5, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)' };
const sectionBodyStyle: React.CSSProperties = { padding: 10 };
const badgeBaseStyle: React.CSSProperties = { display: 'inline-block', padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 700 };
const outgoingGridStyle: React.CSSProperties = { padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const shipGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' };
const trackingReqLabelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 };
const trackingRadioRowStyle: React.CSSProperties = { display: 'flex', gap: 12 };
const radioLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 };
const shipAddrColStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 };
const createLabelBtnStyle: React.CSSProperties = { height: 28, padding: '0 12px', fontSize: 11, fontWeight: 600, background: 'var(--neutral-50, var(--bg))', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' };
const invoiceCardStyle: React.CSSProperties = { background: 'var(--primary)', color: 'var(--card)', borderRadius: 6, padding: 14, marginBottom: 10 };
const invoiceHeaderStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 };
const invoiceLabelStyle: React.CSSProperties = { fontSize: 11, opacity: .6, textTransform: 'uppercase', fontWeight: 700 };
const invoiceNumStyle: React.CSSProperties = { fontSize: 22, fontWeight: 900 };
const invoiceDateStyle: React.CSSProperties = { fontSize: 14, fontWeight: 700 };
const invoiceBtnRowStyle: React.CSSProperties = { display: 'flex', gap: 6 };
const invoiceBtnBaseStyle: React.CSSProperties = { padding: '4px 10px', fontSize: 11, fontWeight: 700, color: 'var(--card)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' };
const lineItemsWrapStyle: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' };
const lineItemsTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 11 };
const lineItemsHeaderRowStyle: React.CSSProperties = { background: 'var(--navy)', color: 'var(--card)' };
const thLeftStyle: React.CSSProperties = { padding: '5px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11 };
const thCenterStyle: React.CSSProperties = { padding: '5px 8px', textAlign: 'center', fontWeight: 600, fontSize: 11 };
const thRightStyle: React.CSSProperties = { padding: '5px 8px', textAlign: 'right', fontWeight: 600, fontSize: 11 };
const tdLeftStyle: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid var(--border)' };
const tdCenterStyle: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' };
const tdAmountBaseStyle: React.CSSProperties = { padding: '5px 8px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 700 };
const totalsBarStyle: React.CSSProperties = { background: 'var(--navy)', color: 'var(--card)', padding: '7px 10px', display: 'flex', justifyContent: 'flex-end', gap: 20, alignItems: 'center' };
const totalLabelStyle: React.CSSProperties = { fontSize: 11, opacity: .7 };
const totalValueStyle: React.CSSProperties = { fontSize: 13, fontWeight: 900 };

interface OutgoingTabProps {
  repair: RepairFull;
  items: RepairLineItem[];
}

const F = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <div style={fLabelStyle}>{label}</div>
    <div style={{
      ...fValueBaseStyle,
      color: value ? 'var(--label)' : 'var(--muted)', fontStyle: value ? 'normal' : 'italic',
    }}>
      {value || '—'}
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={sectionCardStyle}>
    <div style={sectionTitleStyle}>
      {title}
    </div>
    <div style={sectionBodyStyle}>{children}</div>
  </div>
);

const causeBadgeStyle = (cause: string): React.CSSProperties => {
  if (cause?.toUpperCase() === 'UA') return { background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--badge-red-border)' };
  if (cause?.toUpperCase() === 'NW') return { background: 'var(--badge-orange-bg-lt)', color: 'var(--badge-orange-text-dk)', border: '1px solid var(--badge-orange-border-lt)' };
  return { background: 'var(--neutral-50)', color: 'var(--muted)', border: '1px solid var(--border)' };
};

const fixBadgeStyle = (fix: string): React.CSSProperties => {
  const map: Record<string, React.CSSProperties> = {
    W:  { background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success-border)' },
    NC: { background: 'var(--danger-light)', color: 'var(--danger)',  border: '1px solid var(--badge-red-border)' },
    C:  { background: 'var(--info-bg)', color: 'var(--primary)', border: '1px solid var(--badge-blue-border)' },
    A:  { background: 'var(--purple-light)', color: 'var(--purple)',        border: '1px solid var(--badge-purple-border-lt)' },
  };
  return map[fix?.toUpperCase()] ?? { background: 'var(--neutral-50)', color: 'var(--muted)', border: '1px solid var(--border)' };
};

const Badge = ({ label, style }: { label: string; style: React.CSSProperties }) => (
  <span style={{ ...badgeBaseStyle, ...style }}>
    {label || '—'}
  </span>
);

export const OutgoingTab = ({ repair, items }: OutgoingTabProps) => {
  const warrantyTotal = items.filter(i => i.fixType?.toUpperCase() === 'W').reduce((s, i) => s + (i.amount ?? 0), 0);
  const customerTotal = items.filter(i => i.fixType?.toUpperCase() !== 'W').reduce((s, i) => s + (i.amount ?? 0), 0);
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div style={outgoingGridStyle}>
      {/* LEFT */}
      <div>
        <Section title="Outbound Shipping">
          <div style={shipGridStyle}>
            <F label="Outbound Service Level" value={repair.deliveryServiceLevel} />
            <F label="Ship Date" value={repair.shipDate} />
            <F label="Outbound Tracking" value={repair.trackingNumber} />
            <F label="Package Type" value={repair.packageType} />
            <F label="Package Weight" value={repair.shipWeight} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={trackingReqLabelStyle}>
              Tracking Required
            </div>
            <div style={trackingRadioRowStyle}>
              {(['Yes', 'No'] as const).map(opt => (
                <label key={opt} style={radioLabelStyle}>
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
          <div style={shipGridStyle}>
            <F label="GTD Delivery Date & Time" value={repair.gtdDeliveryDate} />
            <F label="Winscope GTD Delivery" value={repair.winscopeGtdDate} />
            <F label="Actual Delivery Date & Time" value={repair.actualDeliveryDate} />
          </div>
        </Section>

        <Section title="Ship To Address">
          <div style={shipAddrColStyle}>
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
            style={createLabelBtnStyle}
          >
            Create Label
          </button>
        </Section>
      </div>

      {/* RIGHT — Invoice */}
      <div>
        <Section title="Invoice">
          {/* Invoice card */}
          <div style={invoiceCardStyle}>
            <div style={invoiceHeaderStyle}>
              <div>
                <div style={invoiceLabelStyle}>Invoice Number</div>
                <div style={invoiceNumStyle}>{repair.invoiceNumber || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={invoiceLabelStyle}>Invoice Date</div>
                <div style={invoiceDateStyle}>{repair.shipDate || '—'}</div>
              </div>
            </div>
            <div style={invoiceBtnRowStyle}>
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
                    ...invoiceBtnBaseStyle,
                    background: btn.danger ? 'rgba(var(--danger-rgb),.7)' : 'rgba(255,255,255,.15)',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line items summary */}
          <div style={lineItemsWrapStyle}>
            <table style={lineItemsTableStyle}>
              <thead>
                <tr style={lineItemsHeaderRowStyle}>
                  <th style={thLeftStyle}>Description</th>
                  <th style={thCenterStyle}>Cause</th>
                  <th style={thCenterStyle}>Fix</th>
                  <th style={thRightStyle}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.tranKey}>
                    <td style={tdLeftStyle}>{item.description}</td>
                    <td style={tdCenterStyle}>
                      <Badge label={item.cause} style={causeBadgeStyle(item.cause)} />
                    </td>
                    <td style={tdCenterStyle}>
                      <Badge label={item.fixType} style={fixBadgeStyle(item.fixType)} />
                    </td>
                    <td style={{
                      ...tdAmountBaseStyle,
                      color: item.fixType?.toUpperCase() === 'W' ? 'var(--success)' : undefined,
                    }}>
                      {fmt(item.amount ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={totalsBarStyle}>
              <span style={totalLabelStyle}>Warranty: <span style={{ color: 'var(--stat-green)', fontWeight: 700 }}>{fmt(warrantyTotal)}</span></span>
              <span style={totalLabelStyle}>Non-Warranty: <span style={{ color: 'var(--stat-amber-lt)', fontWeight: 700 }}>{fmt(customerTotal)}</span></span>
              <span style={totalValueStyle}>Total: {fmt(warrantyTotal + customerTotal)}</span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};
