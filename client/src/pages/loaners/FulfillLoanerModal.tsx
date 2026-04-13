import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getAvailableScopes, bookOutLoaner, evalFailLoaner } from '../../api/loaners';
import { getDeliveryMethods } from '../../api/deliveryMethods';
import { InspectionChecklist } from './InspectionChecklist';
import { DevNotice } from '../../components/shared';
import type { AvailableScope, DeliveryMethod } from './types';
import './FulfillLoanerModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  taskKey: number;
  departmentKey: number;
  salesRepKey: number;
  scopeTypeKey?: number;
  scopeTypeName?: string;
  clientName?: string;
  deptName?: string;
}

type Step = 'pick' | 'inspect' | 'bookout';

export const FulfillLoanerModal = ({
  open, onClose, taskKey, departmentKey, salesRepKey,
  scopeTypeKey, scopeTypeName, clientName, deptName,
}: Props) => {
  const [step, setStep] = useState<Step>('pick');
  const [scopes, setScopes] = useState<AvailableScope[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScope, setSelectedScope] = useState<AvailableScope | null>(null);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [form, setForm] = useState({
    deliveryMethodKey: 0,
    purchaseOrder: '',
    trackingNumber: '',
    onSiteLoaner: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setSelectedScope(null);
    setLoading(true);
    Promise.all([
      getAvailableScopes(scopeTypeKey),
      getDeliveryMethods(),
    ])
      .then(([s, dm]) => { setScopes(s); setDeliveryMethods(dm); })
      .catch(() => message.error('Failed to load available scopes'))
      .finally(() => setLoading(false));
  }, [open, scopeTypeKey]);

  const handleSelectScope = (scope: AvailableScope) => {
    setSelectedScope(scope);
    setStep('inspect');
  };

  const handleInspectionComplete = (results: Record<string, string>, allPassed: boolean) => {
    if (allPassed) {
      setStep('bookout');
    } else {
      setSaving(true);
      evalFailLoaner({
        scopeKey: selectedScope!.scopeKey,
        taskKey,
        failedItems: JSON.stringify(results),
      })
        .then(res => {
          message.success(`Repair WO #${res.workOrder} created — scope sent to repair`);
          setSelectedScope(null);
          setStep('pick');
          getAvailableScopes(scopeTypeKey).then(setScopes).catch(() => {});
        })
        .catch(() => message.error('Failed to create repair'))
        .finally(() => setSaving(false));
    }
  };

  const handleBookOut = async () => {
    if (!selectedScope) return;
    if (form.deliveryMethodKey === 0) {
      message.warning('Select a delivery method');
      return;
    }
    setSaving(true);
    try {
      await bookOutLoaner({
        scopeKey: selectedScope.scopeKey,
        departmentKey,
        deliveryMethodKey: form.deliveryMethodKey,
        salesRepKey,
        taskKey,
        purchaseOrder: form.purchaseOrder || undefined,
        trackingNumber: form.trackingNumber || undefined,
        onSiteLoaner: form.onSiteLoaner,
        outgoingInspection: JSON.stringify({}),
      });
      message.success(`${selectedScope.serial} booked out — ready to ship`);
      onClose();
    } catch {
      message.error('Book out failed');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fulfill-modal-overlay" onClick={onClose} />
      <div className="fulfill-modal">
        <div className="fulfill-modal__header">
          <div>
            <div className="fulfill-modal__title">Fulfill Loaner Request</div>
            <div className="fulfill-modal__subtitle">
              {clientName && <span>{clientName}</span>}
              {deptName && <span> — {deptName}</span>}
              {scopeTypeName && <span> · {scopeTypeName}</span>}
            </div>
          </div>
          <button className="fulfill-modal__close" onClick={onClose}>&times;</button>
        </div>

        <div className="fulfill-modal__steps">
          <div className={`fulfill-modal__step ${step === 'pick' ? 'fulfill-modal__step--active' : step !== 'pick' ? 'fulfill-modal__step--done' : ''}`}>
            1. Pick Scope
          </div>
          <div className={`fulfill-modal__step ${step === 'inspect' ? 'fulfill-modal__step--active' : step === 'bookout' ? 'fulfill-modal__step--done' : ''}`}>
            2. Inspect
          </div>
          <div className={`fulfill-modal__step ${step === 'bookout' ? 'fulfill-modal__step--active' : ''}`}>
            3. Book Out
          </div>
        </div>

        <div className="fulfill-modal__content">
          {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}

          {!loading && step === 'pick' && (
            <>
              {scopes.length === 0 ? (
                <div className="fulfill-modal__empty">
                  No available scopes{scopeTypeName ? ` matching "${scopeTypeName}"` : ''}. Request will need to be waitlisted.
                </div>
              ) : (
                <div className="fulfill-modal__scope-list">
                  <div className="fulfill-modal__scope-header">
                    <span>Serial #</span>
                    <span>Scope Type</span>
                    <span>Rack</span>
                    <span>On-Site</span>
                  </div>
                  {scopes.map(s => (
                    <div
                      key={s.scopeKey}
                      className="fulfill-modal__scope-row"
                      onClick={() => handleSelectScope(s)}
                    >
                      <span className="fulfill-modal__scope-serial">{s.serial}</span>
                      <span>{s.scopeType}</span>
                      <span>{s.rackPosition || '\u2014'}</span>
                      <span>{s.onSiteLoaner ? 'Yes' : 'No'}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && step === 'inspect' && selectedScope && (
            <div>
              <div className="fulfill-modal__scope-info">
                Inspecting: <strong>{selectedScope.serial}</strong> — {selectedScope.scopeType}
              </div>
              {saving ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
              ) : (
                <InspectionChecklist
                  category={selectedScope.category}
                  onComplete={handleInspectionComplete}
                />
              )}
            </div>
          )}

          {!loading && step === 'bookout' && selectedScope && (
            <div className="fulfill-modal__bookout">
              <div className="fulfill-modal__scope-info" style={{ marginBottom: 16 }}>
                Booking out: <strong>{selectedScope.serial}</strong> — {selectedScope.scopeType}
              </div>
              <div className="fulfill-modal__form">
                <div className="fulfill-modal__field">
                  <label>Delivery Method *</label>
                  <select
                    value={form.deliveryMethodKey}
                    onChange={e => setForm(f => ({ ...f, deliveryMethodKey: Number(e.target.value) }))}
                  >
                    <option value={0}>Select...</option>
                    {deliveryMethods.map(dm => (
                      <option key={dm.key} value={dm.key}>{dm.description}</option>
                    ))}
                  </select>
                </div>
                <div className="fulfill-modal__field">
                  <label>PO #</label>
                  <input
                    type="text"
                    value={form.purchaseOrder}
                    onChange={e => setForm(f => ({ ...f, purchaseOrder: e.target.value }))}
                    placeholder="Purchase order"
                  />
                </div>
                <div className="fulfill-modal__field">
                  <label>Tracking #</label>
                  <input
                    type="text"
                    value={form.trackingNumber}
                    onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))}
                    placeholder="Tracking number"
                  />
                </div>
                <div className="fulfill-modal__field fulfill-modal__field--checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.onSiteLoaner}
                      onChange={e => setForm(f => ({ ...f, onSiteLoaner: e.target.checked }))}
                    />
                    On-Site Loaner
                  </label>
                </div>
              </div>
              <div className="fulfill-modal__actions">
                <button
                  className="fulfill-modal__btn fulfill-modal__btn--secondary"
                  onClick={() => setStep('inspect')}
                >
                  Back
                </button>
                <DevNotice
                  title="Book Out — Schema Changes Required"
                  requirement="Two new columns needed on tblLoanerTran before book-out can persist task link and inspection results."
                  sql={'ALTER TABLE tblLoanerTran ADD lTaskKey int NULL;\nALTER TABLE tblLoanerTran ADD sOutgoingInspection nvarchar(max) NULL;'}
                >
                  <button
                    className="fulfill-modal__btn fulfill-modal__btn--primary"
                    onClick={handleBookOut}
                    disabled={saving}
                  >
                    {saving ? 'Booking out...' : 'Book Out & Ship'}
                  </button>
                </DevNotice>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
