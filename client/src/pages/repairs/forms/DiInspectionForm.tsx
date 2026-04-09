import './print.css';
import './DiInspectionForm.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

const em = '—';
const g = 6;

const Cb = ({ label }: { label: string }) => (
  <span className="dii-cbx"><span className="dii-cbx-box" />{label}</span>
);

const PfTable = ({ items }: { items: string[] }) => (
  <table className="dii-pf-table">
    <thead>
      <tr>
        <th className="dii-pf-th">Test Item</th>
        <th className="dii-pf-th--center">Y</th>
        <th className="dii-pf-th--center">N</th>
        <th className="dii-pf-th--center">N/A</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item, i) => (
        <tr key={item} className={i % 2 === 1 ? 'dii-pf-tr--even' : 'dii-pf-tr--odd'}>
          <td className="dii-pf-td">{item}</td>
          <td className="dii-pf-td--center"><span className="dii-pf-cell-box" /></td>
          <td className="dii-pf-td--center"><span className="dii-pf-cell-box" /></td>
          <td className="dii-pf-td--center"><span className="dii-pf-cell-box" /></td>
        </tr>
      ))}
    </tbody>
  </table>
);

const SigLine = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div className={narrow ? 'dii-sig--narrow' : 'dii-sig'}>
    <div className="dii-sig-line" />
    <div className="dii-sig-label">{label}</div>
  </div>
);

export const DiInspectionForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="dii-overlay"
    >
      <div className="no-print dii-action-bar">
        <button onClick={() => window.print()} className="dii-btn-print">Print</button>
        <button onClick={onClose} className="dii-btn-close">Close</button>
      </div>

      <div className="print-form dii-page">

        {/* Header */}
        <div className="dii-header dii-mb-g">
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="dii-header-logo" />
          <div className="dii-header-right">
            <div className="dii-header-title">D&amp;I Inspection Report</div>
            <div className="dii-header-sub">Camera System</div>
            <div className="dii-header-ref">OM05-2</div>
          </div>
        </div>

        {/* Camera Information */}
        <div className="dii-sb">Camera Information</div>
        <div className="dii-cam-grid dii-mb-g">
          <div className="dii-cam-span2"><span className="dii-fl">Client / Facility</span><div className="dii-fv">{repair.client ?? em}</div></div>
          <div>
            <span className="dii-fl">Customer Type</span>
            <div className="dii-cam-type-row">
              <Cb label="CAP" /><Cb label="FFS" />
            </div>
          </div>
          <div><span className="dii-fl">Date</span><div className="dii-fv">{today}</div></div>
          <div className="dii-cam-span2"><span className="dii-fl">Camera Type / Model</span><div className="dii-fv">{`${repair.scopeType ?? ''} ${repair.scopeModel ?? ''}`.trim() || em}</div></div>
          <div><span className="dii-fl">Work Order #</span><div className="dii-fv">{repair.wo ?? em}</div></div>
          <div><span className="dii-fl">Serial #</span><div className="dii-fv">{repair.serial ?? em}</div></div>
          <div className="dii-cam-span3"><span className="dii-fl">Complaint</span><div className="dii-fv--tall">{repair.complaint ?? em}</div></div>
          <div><span className="dii-fl">Rack #</span><div className="dii-fv">{repair.rackLocation ?? em}</div></div>
          <div className="dii-cam-span2"><span className="dii-fl">Inspected By</span><div className="dii-fv">&nbsp;</div></div>
        </div>

        {/* Accessories Received */}
        <div className="dii-sb--mb3">Accessories Received</div>
        <div className="dii-acc-row dii-mb-g">
          <Cb label="Camera Head" /><Cb label="Coupler" /><Cb label="Soak Cap" /><Cb label="Edge Card Protector" />
        </div>

        {/* Item Received Condition */}
        <div className="dii-sb--mb3">Item Received Condition</div>
        <div className="dii-cond-row dii-mb-g">
          <span className="dii-cond-label">Received:</span>
          <Cb label="Clean" /><Cb label="Unclean" />
          <span className="dii-warn-badge">
            If Unclean — follow OM-22 decontamination protocol before proceeding
          </span>
        </div>

        {/* Camera Inspection + Coupler Inspection side by side */}
        <div className="dii-inspect-cols dii-mb-g">
          <div>
            <div className="dii-sb">Camera Inspection</div>
            <PfTable items={['1. Leak Test','2. Focus Test','3. Fog Test','4. White Balance','5. Control Buttons','6. Cable Connector','7. Video Image','8. Edge Card Protector','9. Focus Mechanism','10. Scope Retaining Mechanism']} />
          </div>
          <div>
            <div className="dii-sb">Coupler Inspection <span className="dii-coupler-note">(complete if coupler received)</span></div>
            <PfTable items={['1. Image Quality','2. Soak Cap Assembly','3. Leak Test','4. Pass Test']} />
          </div>
        </div>

        {/* Items in Need of Repair */}
        <div className="dii-section-block">
          <div className="dii-sb">Items in Need of Repair</div>
          <div className="dii-text-area" />
        </div>

        {/* Comments */}
        <div className="dii-section-block">
          <div className="dii-sb">Comments</div>
          <div className="dii-text-area--sm" />
        </div>

        {/* Signatures */}
        <div className="dii-sigs-row dii-mb-g">
          <SigLine label="Inspected By / Signature" />
          <SigLine label="Date" narrow />
          <SigLine label="Reviewed By / Signature" />
          <SigLine label="Date" narrow />
        </div>

        {/* Footer */}
        <div className="dii-footer">
          <div className="dii-footer-title">Total Scope, Inc. — ISO 13485 Certified <span className="dii-footer-ref">OM05-2</span></div>
          <div className="dii-footer-locs">
            <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
            <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
            <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
          </div>
        </div>
      </div>
    </div>
  );
};
