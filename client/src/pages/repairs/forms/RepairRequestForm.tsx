import './print.css';
import './RepairRequestForm.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

export const RepairRequestForm = ({ repair, onClose }: Props) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    className="rr-overlay"
  >
    {/* Action bar */}
    <div className="no-print rr-action-bar">
      <button onClick={() => window.print()} className="rr-btn-print">Print</button>
      <button onClick={onClose} className="rr-btn-close">Close</button>
    </div>

    {/* Printable page */}
    <div className="print-form rr-page">

      {/* Form Header */}
      <div className="rr-header">
        <img src="/logo-horizontal.jpg" alt="Total Scope Inc." className="rr-header-logo" />
        <div className="rr-header-right">
          <div className="rr-header-title">Repair Request Form</div>
          <div className="rr-header-ref">OM03-2</div>
        </div>
      </div>

      {/* 1. Facility Information */}
      <div className="rr-sb">Facility Information</div>
      <div className="rr-grid-2">
        <div className="rr-field rr-span-2">
          <span className="rr-fl">Facility / Hospital Name</span>
          <div className="rr-fv">{repair.client ?? ''}</div>
        </div>
        <div className="rr-field rr-span-2">
          <span className="rr-fl">Department</span>
          <div className="rr-fv">{repair.dept ?? ''}</div>
        </div>
        <div className="rr-field rr-span-2">
          <span className="rr-fl">Address</span>
          <div className="rr-fv"></div>
        </div>
        <div className="rr-field">
          <span className="rr-fl">City</span>
          <div className="rr-fv"></div>
        </div>
        <div className="rr-grid-state-zip">
          <div className="rr-field">
            <span className="rr-fl">State</span>
            <div className="rr-fv"></div>
          </div>
          <div className="rr-field">
            <span className="rr-fl">Zip</span>
            <div className="rr-fv"></div>
          </div>
        </div>
        <div className="rr-field">
          <span className="rr-fl">Contact Name</span>
          <div className="rr-fv"></div>
        </div>
        <div className="rr-field">
          <span className="rr-fl">Phone / Extension</span>
          <div className="rr-fv"></div>
        </div>
        <div className="rr-field">
          <span className="rr-fl">Email</span>
          <div className="rr-fv"></div>
        </div>
        <div className="rr-field">
          <span className="rr-fl">PO Number</span>
          <div className="rr-fv"></div>
        </div>
      </div>

      {/* 2. Equipment Information */}
      <div className="rr-sb">Equipment Information</div>
      <div className="rr-grid-3">
        <div className="rr-field rr-span-2">
          <span className="rr-fl">Scope / Equipment Model</span>
          <div className="rr-fv">{repair.scopeModel ?? ''}</div>
        </div>
        <div className="rr-field">
          <span className="rr-fl">Manufacturer</span>
          <div className="rr-fv"></div>
        </div>
        <div className="rr-field">
          <span className="rr-fl">Serial Number</span>
          <div className="rr-fv">{repair.serial ?? ''}</div>
        </div>
        <div className="rr-field">
          <span className="rr-fl">Equipment Type</span>
          <div className="rr-fv">{repair.scopeType ?? ''}</div>
        </div>
        <div className="rr-field">
          <span className="rr-fl">Last Repair WO#</span>
          <div className="rr-fv">{repair.wo ?? ''}</div>
        </div>
        <div className="rr-field rr-span-3">
          <span className="rr-fl">Complaint / Reason for Repair</span>
          <div className="rr-fv--tall">{repair.complaint ?? ''}</div>
        </div>
      </div>

      {/* 3. Additional Information */}
      <div className="rr-sb">Additional Information</div>
      <div className="rr-info-block">
        <div className="rr-info-row">
          <div className="rr-checkbox" />
          <div className="rr-info-flex">
            <strong>Failure During Case / Patient Involvement</strong>
            <div className="rr-info-note">Scope failed while in use on a patient. Incident report may be required.</div>
          </div>
        </div>
        <div className="rr-info-row">
          <div className="rr-checkbox" />
          <div className="rr-info-flex">
            <strong>Equipment Has Been Cleaned and Disinfected</strong>
            <div className="rr-info-note">I confirm this equipment has been properly cleaned and high-level disinfected prior to shipment.</div>
          </div>
        </div>
      </div>

      {/* 4. Quote / Approval Preference */}
      <div className="rr-sb">Quote / Approval Preference</div>
      <div className="rr-quote-row">
        <div className="rr-quote-opt"><div className="rr-radio" /> Repair without quote (PO on file)</div>
        <div className="rr-quote-opt"><div className="rr-radio" /> Send written quote first</div>
        <div className="rr-quote-opt"><div className="rr-radio" /> Call before proceeding</div>
      </div>
      <div className="rr-quote-note">
        Quote contact (if different from above):&nbsp;
        <span className="rr-quote-line">&nbsp;</span>
      </div>

      {/* 5. Return / Pickup Method */}
      <div className="rr-sb">Return / Pickup Method</div>
      <div className="rr-method-row">
        {['TSI Will Pick Up', 'FedEx (TSI Account)', 'UPS (TSI Account)', 'Customer Arranges'].map(opt => (
          <div key={opt} className="rr-method-opt">
            <div className="rr-radio" /> {opt}
          </div>
        ))}
      </div>

      {/* Return Address */}
      <div className="rr-return-box">
        <div className="rr-return-label">Return Address — Ship Equipment To:</div>
        <div className="rr-return-addr">
          Total Scope Inc.<br />
          17 Creek Pkwy, Upper Chichester, PA 19061<br />
          Attn: Receiving / Repair Department<br />
          Phone: (610) 485-3838
        </div>
      </div>

      {/* Footer */}
      <div className="rr-footer">
        <span>ISO 13485 Certified</span>
        <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
        <span>OM03-2</span>
      </div>
    </div>
  </div>
);
