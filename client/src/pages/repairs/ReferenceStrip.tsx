import { useState, useCallback } from 'react';
import type { RepairFull, ClientSummary, PrimaryContact } from './types';
import './ReferenceStrip.css';

interface ReferenceStripProps {
  repair: RepairFull;
  clientSummary: ClientSummary | null;
  contact: PrimaryContact | null;
  onClientClick?: () => void;
  onDeptClick?: () => void;
  onSerialClick?: () => void;
  onPOChange?: (po: string) => void;
}

export const ReferenceStrip = ({
  repair, clientSummary, contact,
  onClientClick, onDeptClick, onSerialClick, onPOChange,
}: ReferenceStripProps) => {
  const [poValue, setPoValue] = useState(repair.purchaseOrder ?? '');
  const [poEditing, setPoEditing] = useState(false);

  const handlePOBlur = useCallback(() => {
    setPoEditing(false);
    if (poValue !== (repair.purchaseOrder ?? '')) {
      onPOChange?.(poValue);
    }
  }, [poValue, repair.purchaseOrder, onPOChange]);

  const contactName = contact
    ? [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '—'
    : '—';

  return (
    <div className="reference-strip">
      <div className="reference-strip__cell">
        <span className="reference-strip__label">Client</span>
        <span className="reference-strip__value reference-strip__value--link" onClick={onClientClick}>
          {repair.client}
        </span>
      </div>
      <div className="reference-strip__cell">
        <span className="reference-strip__label">Department</span>
        <span className="reference-strip__value reference-strip__value--link" onClick={onDeptClick}>
          {repair.dept}
        </span>
      </div>
      <div className="reference-strip__cell">
        <span className="reference-strip__label">Scope</span>
        <span className="reference-strip__value reference-strip__value--link" onClick={onSerialClick}>
          {repair.scopeType} &middot; {repair.serial}
        </span>
      </div>
      <div className="reference-strip__cell">
        <span className="reference-strip__label">Pricing</span>
        <span className="reference-strip__value">
          {clientSummary?.pricingCategory || '—'}
        </span>
      </div>
      <div className="reference-strip__cell">
        <span className="reference-strip__label">Terms</span>
        <span className="reference-strip__value">
          {clientSummary?.paymentTerms || '—'}
        </span>
      </div>
      <div className="reference-strip__cell">
        <span className="reference-strip__label">TAT</span>
        <span className="reference-strip__value" style={{
          color: repair.daysIn > 14 ? 'var(--danger)' : repair.daysIn > 7 ? 'var(--amber)' : 'var(--text)',
          fontWeight: 600,
        }}>
          {repair.daysIn}d
        </span>
      </div>
      <div className="reference-strip__cell">
        <span className="reference-strip__label">Contact</span>
        <span className="reference-strip__value">{contactName}</span>
      </div>
      <div className="reference-strip__cell">
        <span className="reference-strip__label">PO #</span>
        {poEditing ? (
          <input
            className="reference-strip__po-input"
            value={poValue}
            onChange={e => setPoValue(e.target.value)}
            onBlur={handlePOBlur}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            autoFocus
          />
        ) : (
          <span
            className="reference-strip__value reference-strip__value--link"
            onClick={() => setPoEditing(true)}
          >
            {poValue || 'Click to add'}
          </span>
        )}
      </div>
    </div>
  );
};
