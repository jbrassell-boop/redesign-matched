import './print.css';
import './UpdateSlipForm.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

const em = '—';
const g = 6;

export const UpdateSlipForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="us-overlay"
    >
      {/* Action bar */}
      <div className="no-print us-action-bar">
        <button onClick={() => window.print()} className="us-btn-print">Print</button>
        <button onClick={onClose} className="us-btn-close">Close</button>
      </div>

      {/* Printable page */}
      <div className="print-form us-page">

        {/* Internal Use Banner */}
        <div className="us-banner">
          <div className="us-banner__title">Internal Use Only</div>
          <div className="us-banner__sub">Do not send to customer — for TSI technician use only</div>
        </div>

        {/* Header */}
        <div className="us-header">
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="us-header__logo" />
          <div className="us-header__right">
            <div className="us-header__title">Update Slip</div>
            <div className="us-header__subtitle">Technician Update Request</div>
            <div className="us-header__doc">OM15-2</div>
          </div>
        </div>

        {/* Scope Information */}
        <div className="us-sb">Scope Information</div>
        <div className="us-scope-grid">
          <div>
            <span className="us-fl">Update Request Date</span>
            <div className="us-fv">{today}</div>
          </div>
          <div className="us-span2">
            <span className="us-fl">Hospital / Facility</span>
            <div className="us-fv">{repair.client ?? em}</div>
          </div>
          <div className="us-span2">
            <span className="us-fl">Department</span>
            <div className="us-fv">{repair.dept ?? em}</div>
          </div>
          <div>
            <span className="us-fl">Work Order #</span>
            <div className="us-fv">{repair.wo ?? em}</div>
          </div>
          <div className="us-span2">
            <span className="us-fl">Model</span>
            <div className="us-fv">{[repair.scopeType, repair.scopeModel].filter(Boolean).join(' ') || em}</div>
          </div>
          <div>
            <span className="us-fl">Serial #</span>
            <div className="us-fv">{repair.serial ?? em}</div>
          </div>
          <div className="us-span2">
            <span className="us-fl">Technician</span>
            <div className="us-fv">{repair.tech ?? em}</div>
          </div>
        </div>

        {/* Reason for Update */}
        <div className="us-sb">Reason for Update</div>
        <div className="us-reason-grid">
          {['Image', 'Lights', 'Buttons', 'Leaks', 'Angulation', 'Video Features'].map(label => (
            <div key={label} className="us-reason-item">
              <div className="us-reason-label">{label}</div>
              <div className="us-reason-box" />
            </div>
          ))}
        </div>

        {/* Completed By */}
        <div className="us-sb">Completed By</div>
        <div className="us-completed-row">
          <div className="us-sig-block">
            <div className="us-sig-line" />
            <div className="us-sig-label">Technician / Signature</div>
          </div>
          <div className="us-sig-block--narrow">
            <div className="us-sig-line" />
            <div className="us-sig-label">Date</div>
          </div>
          <div className="us-sig-block">
            <div className="us-sig-line" />
            <div className="us-sig-label">Reviewed By / Signature</div>
          </div>
          <div className="us-sig-block--narrow">
            <div className="us-sig-line" />
            <div className="us-sig-label">Date</div>
          </div>
        </div>

        {/* Footer */}
        <div className="us-footer">
          <div className="us-footer__primary">Total Scope, Inc. — ISO 13485 Certified — Internal Document <span className="us-footer__doc-num">OM15-2</span></div>
          <div className="us-footer__addresses">
            <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
            <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
            <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
          </div>
        </div>
      </div>
    </div>
  );
};
