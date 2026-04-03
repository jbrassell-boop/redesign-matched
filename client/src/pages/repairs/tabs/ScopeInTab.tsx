import type { RepairFull } from '../types';

interface ScopeInTabProps {
  repair: RepairFull;
}

const F = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 }}>
      {label}
    </div>
    <div style={{
      height: 26, border: '1px solid #d1d5db', borderRadius: 3,
      background: '#fff', padding: '0 7px', fontSize: 11,
      color: value != null && value !== '' ? '#374151' : '#9ca3af',
      fontStyle: value != null && value !== '' ? 'normal' : 'italic',
      display: 'flex', alignItems: 'center',
    }}>
      {value != null && value !== '' ? String(value) : '—'}
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

export const ScopeInTab = ({ repair }: ScopeInTabProps) => (
  <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
    {/* LEFT */}
    <div>
      <Section title="Inbound Shipping">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
          <F label="Inbound Service Level" value={repair.inboundServiceLevel} />
          <F label="Inbound Tracking" value={repair.trackingNumberIn} />
          <F label="Shipping Cost In" value={repair.shippingCostIn != null ? `$${repair.shippingCostIn}` : null} />
          <F label="Distributor" value={repair.distributor} />
        </div>
      </Section>

      <Section title="Approval & Requisition">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', marginBottom: 8 }}>
          <F label="Sent Date" value={repair.approvalSentDate} />
          <F label="Received Approval" value={repair.dateApproved} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <F label="Name on Approval via Portal" value={repair.approvalName} />
        </div>
        <F label="Requisition #" value={repair.requisition} />
      </Section>

      <Section title="Sales & Reporting">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
          <F label="Sales Rep" value={repair.salesRep} />
          <F label="Reporting Group" value={repair.reportingGroup} />
          <F label="Pricing Category" value={repair.pricingCategory} />
          <F label="Discount %" value={repair.discountPct != null ? `${repair.discountPct}%` : null} />
        </div>
      </Section>
    </div>

    {/* RIGHT */}
    <div>
      <Section title="Shipping Address">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <F label="Ship to Name" value={repair.shipName} />
          <F label="Address" value={repair.shipAddr1} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', gap: '0 6px' }}>
            <F label="City" value={repair.shipCity} />
            <F label="ST" value={repair.shipState} />
            <F label="ZIP" value={repair.shipZip} />
          </div>
        </div>
      </Section>

      <Section title="Billing Address">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <F label="Bill to Name" value={repair.billName} />
          <F label="Address" value={repair.billAddr1} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', gap: '0 6px' }}>
            <F label="City" value={repair.billCity} />
            <F label="ST" value={repair.billState} />
            <F label="ZIP" value={repair.billZip} />
          </div>
        </div>
      </Section>

      <Section title="Invoice Options">
        {[
          { key: 'displayComplaintOnInvoice', label: 'Display customer complaint on invoice' },
          { key: 'displayItemizedDesc',       label: 'Display itemized description' },
          { key: 'displayItemizedAmounts',    label: 'Display itemized amounts' },
        ].map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151', padding: '3px 0' }}>
            <input type="checkbox" readOnly
              checked={!!(repair as unknown as Record<string, unknown>)[key]}
            />
            {label}
          </div>
        ))}
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
          <F label="Bill to Customer / Distro" value={repair.billToCustomer} />
          <F label="Payment Terms" value={repair.paymentTerms} />
        </div>
      </Section>
    </div>
  </div>
);
