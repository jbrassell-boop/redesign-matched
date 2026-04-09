import './print.css';
import './DiRigidForm.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

const em = '—';
const g = 5;

// 33-point table data
type RigidGroup = { cat: string; items: string[] };
const GROUPS: RigidGroup[] = [
  { cat: 'Image Acceptable', items: ['1. Image Quality', '2. Light Transmission', '3. Focus', '4. Color Rendition'] },
  { cat: 'Eyepiece / Ocular', items: ['5. Eyepiece Lens', '6. Ocular Housing', '7. Focus Ring', '8. Diopter Adjustment', '9. Rubber Eye Guard'] },
  { cat: 'Tubing', items: ['10. Insertion Tube Exterior', '11. Tube Straightness', '12. Working Channel', '13. Irrigation Port', '14. Insufflation Port'] },
  { cat: 'Body / Nosecone / Light Post', items: ['15. Body / Barrel', '16. Nosecone', '17. Light Post', '18. Light Post Connector', '19. Sealing / O-Rings', '20. Bridge / Junction', '21. Proximal End Cap'] },
  { cat: 'Objective / Distal End', items: ['22. Objective Lens', '23. Distal Tip', '24. Prism / Deflector', '25. Distal Window'] },
  { cat: 'Light Fibers', items: ['26. Fiber Bundle Transmission', '27. Fiber Breakage Count', '28. Light Cable Interface'] },
  { cat: 'Image Specifications', items: ['29. Sharpness', '30. Contrast', '31. Field of View', '32. Depth of Field', '33. Distortion'] },
];
const DEF_COLS = ['Nicks', 'Scratches', 'Dirt', 'Chips', 'Cracks', 'Missing', 'Loose', 'Other'];

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div className="dir-sb">{children}</div>
);

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div className={span2 ? 'dir-fld--span2' : 'dir-fld'}>
    <span className="dir-fl">{label}</span>
    <div className="dir-fv" style={h ? { minHeight: h } : undefined}>{value ?? em}</div>
  </div>
);

const Cb = ({ label }: { label: string }) => (
  <span className="dir-cb-label">
    <span className="dir-cb-box" />{label}
  </span>
);

const CbRow = ({ children }: { children: React.ReactNode }) => (
  <div className="dir-cb-row">{children}</div>
);

const Sig = ({ label, narrow }: { label: string; narrow?: boolean }) => (
  <div style={{ flex: narrow ? undefined : 1, maxWidth: narrow ? 120 : undefined, display: 'flex', flexDirection: 'column', gap: 2 }}>
    <div className="dir-sig-line" />
    <div className="dir-sig-label">{label}</div>
  </div>
);

const PfBtn = ({ pass }: { pass?: boolean }) => (
  <span className="dir-pf-btn" style={{ background: pass ? '#16a34a' : '#dc2626', color: '#fff' }}>{pass ? 'P' : 'F'}</span>
);

const TextField = ({ h }: { h: number }) => (
  <div className="dir-text-field" style={{ minHeight: h, marginBottom: g }} />
);

const RigidTable = () => (
  <table className="dir-rigid-table" style={{ marginBottom: g }}>
    <thead>
      <tr>
        <th className="dir-table-th dir-table-th--left">Item</th>
        <th className="dir-table-th dir-table-th--center">P</th>
        <th className="dir-table-th dir-table-th--center">F</th>
        {DEF_COLS.map(c => (
          <th key={c} className="dir-table-th" style={{ textAlign: 'center' }}>{c}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {GROUPS.map(grp => (
        <>
          <tr key={grp.cat}>
            <td colSpan={11} className="dir-group-row">{grp.cat}</td>
          </tr>
          {grp.items.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
              <td className="dir-table-td">{item}</td>
              <td className="dir-table-td--center"><span className="dir-pf-btn" style={{ background: '#16a34a', color: '#fff' }}>P</span></td>
              <td className="dir-table-td--center"><span className="dir-pf-btn" style={{ background: '#dc2626', color: '#fff' }}>F</span></td>
              {DEF_COLS.map(c => (
                <td key={c} className="dir-table-td--center">
                  <span className="dir-cb-inline" />
                </td>
              ))}
            </tr>
          ))}
        </>
      ))}
    </tbody>
  </table>
);

export const DiRigidForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const model = [repair.scopeType, repair.scopeModel].filter(Boolean).join(' ') || em;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="dir-overlay"
    >
      {/* Action bar */}
      <div className="no-print dir-action-bar">
        <button onClick={() => window.print()} className="dir-btn-print">Print</button>
        <button onClick={onClose} className="dir-btn-close">Close</button>
      </div>

      <div className="print-form dir-page">
        {/* Header */}
        <div className="dir-header" style={{ marginBottom: g }}>
          <img src="/logo-horizontal.jpg" alt="Total Scope, Inc." className="dir-logo" />
          <div className="dir-title-block">
            <div className="dir-title">D&amp;I Inspection Report</div>
            <div className="dir-subtitle">Rigid Endoscope</div>
            <div className="dir-doc-num">OM05-3</div>
          </div>
        </div>

        {/* Scope Information */}
        <Bar>Scope Information</Bar>
        <div className="dir-info-grid" style={{ marginBottom: g }}>
          <Fld label="Client / Facility" value={repair.client} span2 />
          <div className="dir-col-flex">
            <span className="dir-fl">Customer Type</span>
            <CbRow><Cb label="CAP" /><Cb label="FFS" /><Cb label="N/A" /></CbRow>
          </div>
          <Fld label="Scope Type / Model" value={model} span2 />
          <Fld label="Complaint" value={repair.complaint} h={24} />
          <Fld label="Work Order #" value={repair.wo} />
          <Fld label="Serial #" value={repair.serial} />
          <Fld label="Date" value={today} />
          <Fld label="Rack #" value={repair.rackLocation} />
          <Fld label="Checked In By" value={null} />
          <div className="dir-col-flex">
            <span className="dir-fl">Shipping Container</span>
            <CbRow><Cb label="Yes" /><Cb label="No" /></CbRow>
          </div>
        </div>

        {/* Item Received Condition */}
        <Bar>Item Received Condition</Bar>
        <div style={{ marginBottom: g }}>
          <CbRow>
            <span className="dir-received-label">Received:</span>
            <Cb label="Clean" /><Cb label="Unclean" />
            <span className="dir-unclean-warn">
              If Unclean — follow OM-22 decontamination protocol before proceeding
            </span>
          </CbRow>
        </div>

        {/* Diagnosis */}
        <Bar>Diagnosis</Bar>
        <div className="dir-diag-grid" style={{ marginBottom: g }}>
          <div className="dir-col-flex">
            <span className="dir-fl">Scope Drawing</span>
            <CbRow><Cb label="Yes" /><Cb label="No" /></CbRow>
          </div>
          <div className="dir-col-flex">
            <span className="dir-fl">Tube System</span>
            <CbRow><Cb label="3" /><Cb label="2" /></CbRow>
          </div>
          <div className="dir-col-flex">
            <span className="dir-fl">Lens System</span>
            <CbRow><Cb label="Rod" /><Cb label="Acromat" /><Cb label="IB" /></CbRow>
          </div>
          <div className="dir-col-flex">
            <span className="dir-fl">Autoclave Damage</span>
            <CbRow><Cb label="Yes" /><Cb label="No" /></CbRow>
          </div>
          <Fld label="Connectors" value={null} />
          <Fld label="Inspected By" value={null} />
        </div>

        {/* 33-Point Checklist */}
        <Bar>Inspection — 33-Point P/F Checklist</Bar>
        <RigidTable />

        {/* Specifications */}
        <Bar>Specifications</Bar>
        <div className="dir-spec-grid" style={{ marginBottom: g }}>
          <Fld label="Insertion Tube Length (mm)" value={null} />
          <Fld label="Insertion Tube Diameter (mm)" value={null} />
          <div className="dir-col-flex">
            <span className="dir-fl">Hot Leak Test</span>
            <div className="dir-pf-row">
              <PfBtn pass /><PfBtn />
            </div>
          </div>
          <div className="dir-col-flex">
            <span className="dir-fl">Cold Leak Test</span>
            <div className="dir-pf-row">
              <PfBtn pass /><PfBtn />
            </div>
          </div>
        </div>

        {/* Items in Need of Repair */}
        <Bar>Items in Need of Repair</Bar>
        <TextField h={34} />

        {/* Comments */}
        <Bar>Comments</Bar>
        <TextField h={26} />

        {/* Signatures */}
        <div className="dir-sig-row" style={{ marginBottom: g }}>
          <Sig label="Inspected By / Signature" />
          <Sig label="Date" narrow />
          <Sig label="Reviewed By / Signature" />
          <Sig label="Date" narrow />
        </div>

        {/* Footer */}
        <div className="dir-footer">
          <div className="dir-footer-name">
            Total Scope, Inc. — ISO 13485 Certified{' '}
            <span className="dir-footer-doc">OM05-3</span>
          </div>
          <div className="dir-footer-addrs">
            <span>PA: 17 Creek Pkwy, Upper Chichester 19061 · (866) 352-7697</span>
            <span>TN: 601 Grassmere Park Dr Ste 2, Nashville 37211 · (844) 843-2055</span>
            <span>FL: 10877 NW 52nd St Ste 3, Sunrise 33351 · (954) 916-7347</span>
          </div>
        </div>
      </div>
    </div>
  );
};
