import type { ContractDetail } from '../types';
import { Field, FormGrid } from '../../../components/shared';
import { tabPaddingFlexStyle, panelBodyStyle, noAddressStyle } from './shared';

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

export const AddressTab = ({ detail }: { detail: ContractDetail }) => (
  <div style={tabPaddingFlexStyle}>
    <Panel>
      <PanelHead><span>Bill To</span></PanelHead>
      <div style={panelBodyStyle}>
        <FormGrid cols={2}>
          {detail.billName && <div className="span-2"><Field label="Name" value={detail.billName} /></div>}
          {detail.billAddress && <div className="span-2"><Field label="Address" value={detail.billAddress} /></div>}
          <Field label="City" value={detail.billCity || '\u2014'} />
          <Field label="State / Zip" value={[detail.billState, detail.billZip].filter(Boolean).join(' ') || '\u2014'} />
          {detail.phone && <Field label="Phone" value={detail.phone} />}
          {detail.billEmail && <Field label="Email" value={detail.billEmail} />}
        </FormGrid>
        {!detail.billName && !detail.billAddress && (
          <div style={noAddressStyle}>No billing address on file.</div>
        )}
      </div>
    </Panel>
    <Panel>
      <PanelHead><span>Ship To</span></PanelHead>
      <div style={panelBodyStyle}>
        <div style={noAddressStyle}>
          No separate shipping address configured. Shipments default to the billing address above.
        </div>
      </div>
    </Panel>
  </div>
);
