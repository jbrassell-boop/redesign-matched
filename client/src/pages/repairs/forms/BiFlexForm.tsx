import './print.css';
import type { RepairFull } from '../types';

interface Props { repair: RepairFull; onClose: () => void; }

const sb: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px' };
const fl: React.CSSProperties = { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.04em' };
const fv: React.CSSProperties = { borderBottom: '1px solid #ccc', fontSize: 9, padding: '0 2px', minHeight: 13 };
const em = '—';
const cbBox: React.CSSProperties = { display: 'inline-block', width: 10, height: 10, border: '1px solid #999', borderRadius: 2, verticalAlign: 'middle', flexShrink: 0 };
const costField: React.CSSProperties = { borderBottom: '1px solid #aaa', minWidth: 54, display: 'inline-block', height: 12, verticalAlign: 'middle' };
const sigMini: React.CSSProperties = { borderBottom: '1px solid #aaa', minWidth: 90, display: 'inline-block', height: 12, verticalAlign: 'middle' };
const pfBtnP: React.CSSProperties = { display: 'inline-block', width: 20, height: 13, border: '1px solid var(--success)', borderRadius: 2, textAlign: 'center', lineHeight: '13px', fontSize: 7, fontWeight: 700, color: 'var(--success)', margin: '0 1px' };
const pfBtnF: React.CSSProperties = { display: 'inline-block', width: 20, height: 13, border: '1px solid var(--danger)', borderRadius: 2, textAlign: 'center', lineHeight: '13px', fontSize: 7, fontWeight: 700, color: 'var(--danger)', margin: '0 1px' };
const pfBtnNA: React.CSSProperties = { display: 'inline-block', width: 24, height: 13, border: '1px solid #aaa', borderRadius: 2, textAlign: 'center', lineHeight: '13px', fontSize: 7, fontWeight: 700, color: '#666', margin: '0 1px' };

const pageStyle: React.CSSProperties = {
  width: '8.5in', minHeight: '11in', background: '#fff', padding: '0.4in',
  fontFamily: "'Inter', Arial, sans-serif", fontSize: 9, color: '#222',
  boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)', marginBottom: 24,
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div style={{ ...sb, marginBottom: 3 }}>{children}</div>
);

const Fld = ({ label, value, span2, h }: { label: string; value?: string | null; span2?: boolean; h?: number }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, ...(span2 ? { gridColumn: 'span 2' } : {}) }}>
    <span style={fl}>{label}</span>
    <div style={{ ...fv, minHeight: h ?? 13 }}>{value ?? em}</div>
  </div>
);

const Cb = ({ label }: { label: string }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5 }}>
    <span style={cbBox} />{label}
  </span>
);

const tdC: React.CSSProperties = { padding: '3px 6px', borderBottom: '1px solid #eee', verticalAlign: 'middle', borderRight: '1px solid #eee', fontSize: 8.5 };
const thC: React.CSSProperties = { background: 'var(--primary)', color: '#fff', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', padding: '3px 6px', textAlign: 'left', letterSpacing: '0.03em', borderRight: '1px solid rgba(255,255,255,0.2)' };

const REPAIR_ITEMS = [
  'Pressure Test / Leak Test',
  'Angulation Repair (U/D/R/L)',
  'Bending Rubber Replacement',
  'Distal Tip Repair / Replacement',
  'Insertion Tube Repair / Replacement',
  'Universal Cord Repair / Replacement',
  'Light Guide Connector Repair',
  'Control Body Repair',
  'A/W Channel Repair',
  'Suction / Forcep Channel Repair',
  'Image Bundle Repair',
  'Light Bundle Repair',
  'Elevator / Forcep Raiser Repair',
  'IT Tensioner Adjustment',
  'Eyepiece Repair / Replacement',
  'Video Component Repair',
  'Control Knob / Switch Repair',
  'Other: _________________________',
];

const FINAL_ITEMS: { cat: string; items: string[] }[] = [
  { cat: 'Leak & Pressure', items: ['1. Pressure Test (pass)'] },
  { cat: 'Water & Channels', items: ['2. Auxiliary Water Function', '3. A/W Flow — Air', '4. A/W Flow — Water', '5. Forcep Channel', '6. Suction Channel', '7. Elevator / Forcep Raiser'] },
  { cat: 'Control Body & Switches', items: ['8. Control Body Condition', '9. Control Switches Function'] },
  { cat: 'Angulation', items: ['10. Angulation — Up (factory: 180°)', '11. Angulation — Down (factory: 180°)', '12. Angulation — Right (factory: 160°)', '13. Angulation — Left (factory: 160°)', '14. Angulation Tightness', '15. Angulation Orientation', '16. Angulation Knobs'] },
  { cat: 'Insertion Tube, Cord & Connector', items: ['17. IT Tensioner', '18. Insertion Tube Condition', '19. Universal Cord Condition', '20. Light Guide Connector', '21. Bending Rubber (max epoxy 13.64)'] },
  { cat: 'Optics & Image', items: ['22. Distal Tip Condition', '23. Eyepiece Condition', '24. Light Bundle Transmission'] },
  { cat: 'Video Image', items: ['25. Video Image Quality', '26. Video Features / Functions', '27. Image Bundle — Broken Fibers', '28. Image Bundle — Half Tones'] },
];

const Footer = ({ page }: { page: string }) => (
  <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', fontSize: 7.5, color: 'var(--muted)' }}>
    <span>ISO 13485 Certified</span>
    <span>Total Scope Inc. | 17 Creek Pkwy, Upper Chichester PA 19061 | (610) 485-3838</span>
    <span>{page}</span>
  </div>
);

const FormHeader = ({ subtitle }: { subtitle: string }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
    <img src="/assets/logo-color.jpg" alt="TSI Logo" style={{ height: 40 }} />
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy)' }}>Blank Inspection Report</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Flexible Endoscope{subtitle ? ` — ${subtitle}` : ''}</div>
      <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>OM07-3</div>
    </div>
  </div>
);

export const BiFlexForm = ({ repair, onClose }: Props) => (
  <div
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto', flexDirection: 'column' }}
  >
    <div className="no-print" style={{ position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200 }}>
      <button onClick={() => window.print()} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Print</button>
      <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid #ddd', borderRadius: 5, background: '#fff', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
    </div>

    {/* PAGE 1 — Items Found / Approved + Comments */}
    <div className="print-form" style={{ ...pageStyle, alignSelf: 'center' }}>
      <FormHeader subtitle="" />

      <Bar>Scope Information</Bar>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 10px', marginBottom: 6 }}>
        <Fld label="Client / Facility" value={repair.client} span2 />
        <Fld label="Date" value={fmt(repair.dateIn)} />
        <Fld label="Work Order #" value={repair.wo} />
        <Fld label="Serial #" value={repair.serial} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Technician</span>
          <div style={fv}>{repair.tech ?? '—'}</div>
        </div>
        <Fld label="Scope Model" value={repair.scopeModel} span2 />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Rack #</span><div style={fv}></div>
        </div>
        <Fld label="Complaint" value={repair.complaint} span2 h={22} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={fl}>Cust. Expected Delivery</span><div style={fv}></div>
        </div>
      </div>

      <Bar>Items Found to be in Need of Repair</Bar>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5, marginBottom: 4 }}>
        <thead>
          <tr>
            <th style={{ ...thC, width: 20 }}></th>
            <th style={thC}>Item</th>
            <th style={{ ...thC, textAlign: 'center', width: 74 }}>Est. Cost</th>
            <th style={{ ...thC, textAlign: 'center', width: 54 }}>Approved</th>
          </tr>
        </thead>
        <tbody>
          {REPAIR_ITEMS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={cbBox} /></td>
              <td style={tdC}>{item}</td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={costField} /></td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={cbBox} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6, gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
          <span style={fl}>Subtotal Estimate</span>
          <div style={{ borderBottom: '1px solid #ccc', minWidth: 90, height: 15 }}></div>
        </div>
      </div>

      <Bar>Comments / Additional Notes</Bar>
      <div style={{ border: '1px solid #ddd', borderRadius: 3, minHeight: 32, padding: '3px 6px', fontSize: 8.5, marginBottom: 6 }}></div>

      <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Technician / Estimator</div>
        </div>
        <div style={{ maxWidth: 120, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Date</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Customer Authorization</div>
        </div>
        <div style={{ maxWidth: 120, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Date</div>
        </div>
      </div>

      <Footer page="OM07-3 | Page 1" />
    </div>

    {/* PAGE 2 — Items Approved and Repaired */}
    <div className="print-form" style={{ ...pageStyle, alignSelf: 'center' }}>
      <FormHeader subtitle="Items Approved & Repaired" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', marginBottom: 6 }}>
        <Fld label="Work Order #" value={repair.wo} />
        <Fld label="Serial #" value={repair.serial} />
        <Fld label="Date" value={fmt(repair.dateIn)} />
      </div>

      <Bar>Items Approved and Repaired</Bar>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5, marginBottom: 4 }}>
        <thead>
          <tr>
            <th style={{ ...thC, width: 20 }}></th>
            <th style={thC}>Item Repaired</th>
            <th style={{ ...thC, textAlign: 'center', width: 74 }}>Actual Cost</th>
            <th style={thC}>Repaired By (Initials)</th>
          </tr>
        </thead>
        <tbody>
          {REPAIR_ITEMS.map((item, i) => (
            <tr key={item} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={cbBox} /></td>
              <td style={tdC}>{item}</td>
              <td style={{ ...tdC, textAlign: 'center' }}><span style={costField} /></td>
              <td style={tdC}><span style={sigMini} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6, gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
          <span style={fl}>Total Repair Cost</span>
          <div style={{ borderBottom: '2px solid var(--primary)', minWidth: 90, height: 15, fontWeight: 700 }}></div>
        </div>
      </div>

      <Bar>Additional Repair Notes</Bar>
      <div style={{ border: '1px solid #ddd', borderRadius: 3, minHeight: 44, padding: '3px 6px', fontSize: 8.5, marginBottom: 8 }}></div>

      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Lead Technician / Signature</div>
        </div>
        <div style={{ maxWidth: 120, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 22 }} />
          <div style={{ fontSize: 7.5, color: '#888', fontWeight: 600 }}>Date</div>
        </div>
      </div>

      <Footer page="OM07-3 | Page 2" />
    </div>

    {/* PAGE 3 — Final Inspection */}
    <div className="print-form" style={{ ...pageStyle, alignSelf: 'center' }}>
      <FormHeader subtitle="Final Inspection" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 12px', marginBottom: 6 }}>
        <Fld label="Work Order #" value={repair.wo} />
        <Fld label="Serial #" value={repair.serial} />
        <Fld label="Date" value={fmt(repair.dateIn)} />
      </div>

      <Bar>Final Inspection Checklist — 24-Point</Bar>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5, marginBottom: 6 }}>
        <thead>
          <tr>
            <th style={{ ...thC, width: '46%' }}>Item</th>
            <th style={{ ...thC, textAlign: 'center', width: 32 }}>Y</th>
            <th style={{ ...thC, textAlign: 'center', width: 32 }}>N</th>
            <th style={{ ...thC, textAlign: 'center', width: 38 }}>N/A</th>
            <th style={thC}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {FINAL_ITEMS.map(g => (
            <>
              <tr key={g.cat}>
                <td colSpan={5} style={{ padding: '2px 6px', fontSize: 8, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #ddd', background: '#E8F0FE' }}>{g.cat}</td>
              </tr>
              {g.items.map((item, i) => (
                <tr key={item} style={{ background: i % 2 === 1 ? '#F9FAFB' : '#fff' }}>
                  <td style={tdC}>{item}</td>
                  <td style={{ ...tdC, textAlign: 'center' }}><span style={pfBtnP}>Y</span></td>
                  <td style={{ ...tdC, textAlign: 'center' }}><span style={pfBtnF}>N</span></td>
                  <td style={{ ...tdC, textAlign: 'center' }}><span style={pfBtnNA}>N/A</span></td>
                  <td style={tdC}></td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>

      <Bar>Scope Includes</Bar>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px 12px', padding: '5px 0', marginBottom: 6 }}>
        {['Scope Only', 'Light Cable', 'Soak Cap', 'Elevator Cap', 'Suction Valve', 'A/W Valve', 'Biopsy Cap', 'Storage Case', 'Other: ___________'].map(item => (
          <Cb key={item} label={item} />
        ))}
      </div>

      <Bar>QC Sign-Off</Bar>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px 10px', border: '1px solid #ddd', borderRadius: 3, padding: '8px 10px', background: '#F9FAFB', marginBottom: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Scope Usable</span>
          <div style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
            <Cb label="Y" /><Cb label="N" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Rework Required</span>
          <div style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
            <Cb label="Y" /><Cb label="N" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Alcohol Wipe</span>
          <div style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
            <Cb label="Done" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Responsible Tech</span>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>QC Initials</span>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, gridColumn: 'span 2' }}>
          <span style={fl}>Test Equipment Used</span>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Commercial QC</span>
          <div style={{ display: 'flex', gap: 6, padding: '2px 0' }}>
            <span style={pfBtnP}>P</span><span style={pfBtnF}>F</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={fl}>Inspected By</span>
          <div style={{ borderBottom: '1px solid #ccc', minHeight: 16, marginTop: 2 }}></div>
        </div>
      </div>

      <Footer page="OM07-3 | Page 3" />
    </div>
  </div>
);
