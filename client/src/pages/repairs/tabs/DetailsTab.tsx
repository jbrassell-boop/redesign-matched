import type { RepairFull } from '../types';
import { Field, FormGrid, SectionCard } from '../../../components/shared';

interface DetailsTabProps {
  repair: RepairFull;
}

const fmt = (n: number | undefined | null) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : null;

const AccessoryCheckbox = ({ label, checked }: { label: string; checked: boolean }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text)' }}>
    <input type="checkbox" checked={checked} readOnly style={{ margin: 0 }} />
    {label}
  </label>
);

export const DetailsTab = ({ repair }: DetailsTabProps) => (
  <div style={{ display: 'flex', gap: 16, padding: 16, overflow: 'auto' }}>
    {/* Left column */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionCard title="Repair Information">
        <FormGrid cols={2}>
          <Field label="Date In" value={repair.dateIn} />
          <Field label="Date Out" value={repair.dateOut} />
          <Field label="Technician" value={repair.tech} />
          <Field label="Tech 2" value={repair.tech2} />
          <Field label="Date Approved" value={repair.dateApproved} />
          <Field label="Approval Name" value={repair.approvalName} />
          <Field label="Est. Delivery" value={repair.estDelivery} />
          <Field label="Approved Amount" value={fmt(repair.amountApproved)} />
          <Field label="Invoice #" value={repair.invoiceNumber} />
          <Field label="Repair Reason" value={repair.repairReason} />
          <Field label="Contract #" value={repair.contractNumber} />
          <Field label="Inspector" value={repair.inspector} />
        </FormGrid>
      </SectionCard>

      {repair.complaint && (
        <SectionCard title="Complaint">
          <div style={{
            fontSize: 12, color: 'var(--text)', padding: '8px 10px',
            background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)',
            borderRadius: 4, whiteSpace: 'pre-wrap',
          }}>
            {repair.complaint}
          </div>
          {repair.customerRef && (
            <div style={{ marginTop: 6 }}>
              <Field label="Customer Ref" value={repair.customerRef} />
            </div>
          )}
        </SectionCard>
      )}

      {repair.loanerRequested && (
        <SectionCard title="Loaner">
          <FormGrid cols={2}>
            <Field label="Loaner Requested" value="Yes" />
            <Field label="Loaner Provided" value={repair.loanerProvided ? 'Yes' : 'No'} />
            <Field label="Loaner Scope" value={repair.loanerRepair} />
          </FormGrid>
        </SectionCard>
      )}
    </div>

    {/* Right column */}
    <div style={{ width: 310, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionCard title="Billing Address">
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
          {repair.billName && <div style={{ fontWeight: 600 }}>{repair.billName}</div>}
          {repair.billAddr1 && <div>{repair.billAddr1}</div>}
          {repair.billAddr2 && <div>{repair.billAddr2}</div>}
          {(repair.billCity || repair.billState || repair.billZip) && (
            <div>{[repair.billCity, repair.billState].filter(Boolean).join(', ')} {repair.billZip}</div>
          )}
          {repair.billEmail && <div style={{ color: 'var(--primary)' }}>{repair.billEmail}</div>}
          {!repair.billName && !repair.billAddr1 && <div style={{ color: 'var(--muted)' }}>—</div>}
        </div>
      </SectionCard>

      <SectionCard title="Shipping Address">
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
          {repair.shipName && <div style={{ fontWeight: 600 }}>{repair.shipName}</div>}
          {repair.shipAddr1 && <div>{repair.shipAddr1}</div>}
          {repair.shipAddr2 && <div>{repair.shipAddr2}</div>}
          {(repair.shipCity || repair.shipState || repair.shipZip) && (
            <div>{[repair.shipCity, repair.shipState].filter(Boolean).join(', ')} {repair.shipZip}</div>
          )}
          {!repair.shipName && !repair.shipAddr1 && <div style={{ color: 'var(--muted)' }}>—</div>}
        </div>
      </SectionCard>

      <SectionCard title="Shipping & Tracking">
        <FormGrid cols={2}>
          <Field label="Ship Date" value={repair.shipDate} />
          <Field label="Weight" value={repair.shipWeight} />
          <Field label="Service Level" value={repair.deliveryServiceLevel} />
          <Field label="Tracking # (Out)" value={repair.trackingNumber} />
          <Field label="Tracking # (In)" value={repair.trackingNumberIn} />
          <Field label="FedEx #" value={repair.trackingNumberFedEx} />
        </FormGrid>
      </SectionCard>

      <SectionCard title="Accessories">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
          <AccessoryCheckbox label="Box" checked={repair.includesBox} />
          <AccessoryCheckbox label="Case" checked={repair.includesCase} />
          <AccessoryCheckbox label="ETO Cap" checked={repair.includesETOCap} />
          <AccessoryCheckbox label="CO2 Cap" checked={repair.includesCO2Cap} />
          <AccessoryCheckbox label="Camera" checked={repair.includesCamera} />
          <AccessoryCheckbox label="Hood" checked={repair.includesHood} />
          <AccessoryCheckbox label="Light Post Adapter" checked={repair.includesLightPostAdapter} />
          <AccessoryCheckbox label="Suction Valve" checked={repair.includesSuctionValve} />
          <AccessoryCheckbox label="Waterproof Cap" checked={repair.includesWaterProofCap} />
          <AccessoryCheckbox label="Air/Water Valve" checked={repair.includesAirWaterValve} />
        </div>
      </SectionCard>
    </div>
  </div>
);
