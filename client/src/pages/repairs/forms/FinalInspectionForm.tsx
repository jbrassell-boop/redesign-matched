import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

// ── Styles matching OM10-2 exactly ──
const sectionBar: React.CSSProperties = {
  background: 'var(--primary)',
  color: '#fff',
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '4px 10px',
  marginTop: 6,
};

const fl: React.CSSProperties = {
  fontSize: 8.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#555',
  letterSpacing: '0.04em',
};

const fv: React.CSSProperties = {
  borderBottom: '1px solid #999',
  minHeight: 16,
  fontSize: 11,
  padding: '1px 2px',
};

const pfTableTh: React.CSSProperties = {
  background: 'var(--primary)',
  color: '#fff',
  fontSize: 8.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '4px 8px',
  textAlign: 'left',
  letterSpacing: '0.04em',
};

const pfTableTd: React.CSSProperties = {
  padding: '3px 8px',
  fontSize: 10.5,
  borderBottom: '1px solid #ddd',
  verticalAlign: 'middle',
};

const pfBtnBase: React.CSSProperties = {
  display: 'inline-block',
  width: 28,
  height: 16,
  border: '1px solid #aaa',
  borderRadius: 2,
  textAlign: 'center',
  lineHeight: '16px',
  fontSize: 9,
  fontWeight: 700,
  margin: '0 1px',
};

const pfP: React.CSSProperties = { ...pfBtnBase, borderColor: 'var(--success)', color: 'var(--success)' };
const pfF: React.CSSProperties = { ...pfBtnBase, borderColor: 'var(--danger)', color: 'var(--danger)' };
const pfNA: React.CSSProperties = { ...pfBtnBase };

const FUNCTIONAL_TESTS = [
  '1. Leak Test — Immersion',
  '2. Bending Section — All 4 Directions',
  '3. Bending Lock',
  '4. Channel Patency — Biopsy / Suction',
  '5. Air / Water Function',
  '6. Suction Function',
  '7. Image Quality / Clarity',
  '8. Light Transmission',
  '9. Distal Tip / Insertion Tube Integrity',
  '10. Umbilical / Control Body Integrity',
  '11. Electrical Safety / Isolation',
];

const SCOPE_INCLUDES = [
  'Biopsy Cap',
  'Water Bottle',
  'Suction Valve',
  'Air / Water Valve',
  'Light Connector Cap',
  'Carrying / Storage Case',
  'Original Equipment Manual',
];

const REPAIRS_PERFORMED = [
  'Bending Section Replacement',
  'Insertion Tube Replacement',
  'Distal Tip Rebuild',
  'Control Body Rebuild',
  'Air / Water Valve Replacement',
  'Suction Valve Replacement',
  'Biopsy Valve Replacement',
  'Channel Cleaning / Repair',
  'Image Chip / CCD Replacement',
  'Fiber Bundle Replacement',
  'Light Guide Replacement',
  'Umbilical Replacement',
  'Leak Test / Pressure Test',
  'Angulation Adjustment',
  'Cleaning & Cosmetic Restoration',
  'Connector Service',
  'Bending Rubber Replacement',
  'Scope Recoating / Reskin',
  'Elevator Repair / Replacement',
  'Full Overhaul',
  'Other: ___________________',
];

const cbBox: React.CSSProperties = {
  content: '',
  display: 'inline-block',
  width: 11,
  height: 11,
  border: '1px solid #aaa',
  borderRadius: 2,
  flexShrink: 0,
};

export const FinalInspectionForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
    >
      {/* Action bar */}
      <div className="no-print" style={{
        position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200,
      }}>
        <button
          onClick={() => window.print()}
          style={{
            height: 32, padding: '0 16px', border: 'none', borderRadius: 5,
            background: 'var(--primary)', color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Print</button>
        <button
          onClick={onClose}
          style={{
            height: 32, padding: '0 14px', border: '1px solid #ccc', borderRadius: 5,
            background: 'var(--card)', color: '#555',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Close</button>
      </div>

      {/* Printable page */}
      <div
        className="print-form"
        style={{
          width: '8.5in',
          minHeight: '11in',
          background: 'var(--card)',
          padding: '0.5in',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontFamily: "'Inter', Arial, sans-serif",
          fontSize: 11,
          color: '#111',
          boxSizing: 'border-box',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        }}
      >
        {/* ── Form Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--navy)' }}>
            <span style={{ color: 'var(--primary)' }}>T</span>otal <span style={{ color: 'var(--primary)' }}>S</span>cope <span style={{ color: 'var(--primary)' }}>I</span>nc.
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>Final Inspection Report</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 }}>Flexible Endoscope</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>OM10-2</div>
          </div>
        </div>

        {/* ── Scope Information ── */}
        <div style={{ ...sectionBar, marginTop: 0 }}>Scope Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', padding: '6px 0 2px' }}>
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Client / Facility</span>
            <div style={fv}>{repair.client ?? ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Date</span>
            <div style={fv}>{today}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Work Order #</span>
            <div style={fv}>{repair.wo ?? ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Serial #</span>
            <div style={fv}>{repair.serial ?? ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={fl}>Scope Model</span>
            <div style={fv}>{repair.scopeModel ?? repair.scopeType ?? ''}</div>
          </div>
        </div>

        {/* ── Functional Tests ── */}
        <div style={{ ...sectionBar, marginTop: 0 }}>Functional Tests</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
          <thead>
            <tr>
              <th style={pfTableTh}>Test Item</th>
              <th style={{ ...pfTableTh, textAlign: 'center', width: 42 }}>Pass</th>
              <th style={{ ...pfTableTh, textAlign: 'center', width: 42 }}>Fail</th>
              <th style={{ ...pfTableTh, textAlign: 'center', width: 42 }}>N/A</th>
            </tr>
          </thead>
          <tbody>
            {FUNCTIONAL_TESTS.map((test, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? 'var(--bg)' : 'var(--card)' }}>
                <td style={pfTableTd}>{test}</td>
                <td style={{ ...pfTableTd, textAlign: 'center' }}><span style={pfP}>P</span></td>
                <td style={{ ...pfTableTd, textAlign: 'center' }}><span style={pfF}>F</span></td>
                <td style={{ ...pfTableTd, textAlign: 'center' }}><span style={pfNA}>N/A</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Two-column: Broken Fibers + Scope Includes ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
          {/* Broken Fibers */}
          <div>
            <div style={{ ...sectionBar, marginTop: 6 }}>Broken Fibers</div>
            <div style={{ padding: '6px 0' }}>
              {/* Insertion Tube IN */}
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 12px', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #eee' }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>Insertion Tube (IN)</span>
                <div style={{ borderBottom: '1px solid #999', minHeight: 16, fontSize: 10.5 }}></div>
                <div style={{ borderBottom: '1px solid #999', minHeight: 16, fontSize: 10.5 }}></div>
              </div>
              {/* Bending Section OUT */}
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 12px', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #eee' }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#555', whiteSpace: 'nowrap' }}>Bending Section (OUT)</span>
                <div style={{ borderBottom: '1px solid #999', minHeight: 16, fontSize: 10.5 }}></div>
                <div style={{ borderBottom: '1px solid #999', minHeight: 16, fontSize: 10.5 }}></div>
              </div>
              <div style={{ marginTop: 4, fontSize: 8.5, color: '#555' }}>Count IN before repair / OUT after repair</div>
            </div>
          </div>

          {/* Scope Includes */}
          <div>
            <div style={{ ...sectionBar, marginTop: 6 }}>Scope Includes</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0' }}>
              {SCOPE_INCLUDES.map((inc, i) => (
                <li key={i} style={{ padding: '3px 0', fontSize: 10.5, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={cbBox}></span>{inc}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Repairs Performed ── */}
        <div style={{ ...sectionBar, marginTop: 6 }}>Repairs Performed</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 20px', marginTop: 4 }}>
          {REPAIRS_PERFORMED.map((rep, i) => (
            <div key={i} style={{ padding: '2px 0', fontSize: 10, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={cbBox}></span>{rep}
            </div>
          ))}
        </div>

        {/* ── Result Footer ── */}
        <div style={{
          display: 'flex', gap: 0, border: '2px solid var(--primary)', borderRadius: 4,
          overflow: 'hidden', marginTop: 10,
        }}>
          <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderRight: '2px solid var(--primary)' }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>Condition</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700 }}>
                <div style={{ width: 16, height: 16, border: '1.5px solid #999', borderRadius: '50%', flexShrink: 0 }}></div>USABLE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700 }}>
                <div style={{ width: 16, height: 16, border: '1.5px solid #999', borderRadius: '50%', flexShrink: 0 }}></div>UNUSABLE
              </div>
            </div>
          </div>
          <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', color: '#555', letterSpacing: '0.05em' }}>Final Result</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700 }}>
                <div style={{ width: 16, height: 16, border: '1.5px solid #999', borderRadius: '50%', flexShrink: 0 }}></div>PASSED
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700 }}>
                <div style={{ width: 16, height: 16, border: '1.5px solid #999', borderRadius: '50%', flexShrink: 0 }}></div>FAILED
              </div>
            </div>
          </div>
        </div>

        {/* ── Signature Block ── */}
        <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #999', minHeight: 28 }}></div>
            <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>Repair Technician / Signature</div>
          </div>
          <div style={{ flex: 1, maxWidth: 140, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #999', minHeight: 28 }}></div>
            <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>Date</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #999', minHeight: 28 }}></div>
            <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>Final Inspector / Signature</div>
          </div>
          <div style={{ flex: 1, maxWidth: 140, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ borderBottom: '1px solid #999', minHeight: 28 }}></div>
            <div style={{ fontSize: 8.5, color: '#555', fontWeight: 600, marginTop: 2 }}>Date</div>
          </div>
        </div>

        {/* ── Form Footer ── */}
        <div style={{
          marginTop: 'auto',
          paddingTop: 8,
          borderTop: '1px solid #ccc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 8,
          color: '#888',
        }}>
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc.&nbsp;|&nbsp;17 Creek Pkwy, Upper Chichester PA 19061&nbsp;|&nbsp;(610) 485-3838</span>
          <span>OM10-2</span>
        </div>
      </div>
    </div>
  );
};
