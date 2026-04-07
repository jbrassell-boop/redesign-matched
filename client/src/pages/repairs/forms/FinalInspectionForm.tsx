import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

// ── Styles matching OM10-2 exactly ──
const sectionBar: React.CSSProperties = {
  background: 'var(--primary)',
  color: 'var(--card)',
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
  color: 'var(--print-muted)',
  letterSpacing: '0.04em',
};

const fv: React.CSSProperties = {
  borderBottom: '1px solid var(--print-check-border)',
  minHeight: 16,
  fontSize: 11,
  padding: '1px 2px',
};

const pfTableTh: React.CSSProperties = {
  background: 'var(--primary)',
  color: 'var(--card)',
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
  borderBottom: '1px solid var(--print-border-lt)',
  verticalAlign: 'middle',
};

const pfBtnBase: React.CSSProperties = {
  display: 'inline-block',
  width: 28,
  height: 16,
  border: '1px solid var(--print-placeholder)',
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
  border: '1px solid var(--print-placeholder)',
  borderRadius: 2,
  flexShrink: 0,
};

// ── Extracted static styles ──
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1100,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '24px 16px', overflowY: 'auto',
};
const actionBarStyle: React.CSSProperties = {
  position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200,
};
const printBtnStyle: React.CSSProperties = {
  height: 32, padding: '0 16px', border: 'none', borderRadius: 5,
  background: 'var(--primary)', color: 'var(--card)',
  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};
const closeBtnStyle: React.CSSProperties = {
  height: 32, padding: '0 14px', border: '1px solid var(--print-border)', borderRadius: 5,
  background: 'var(--card)', color: 'var(--print-muted)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
const printPageStyle: React.CSSProperties = {
  width: '8.5in',
  minHeight: '11in',
  background: 'var(--card)',
  padding: '0.5in',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontFamily: "'Inter', Arial, sans-serif",
  fontSize: 11,
  color: 'var(--print-text)',
  boxSizing: 'border-box',
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
};
const headerRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 };
const logoStyle: React.CSSProperties = { fontWeight: 800, fontSize: 16, color: 'var(--navy)' };
const primaryLetterStyle: React.CSSProperties = { color: 'var(--primary)' };
const headerRightStyle: React.CSSProperties = { textAlign: 'right' };
const headerTitleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: 'var(--navy)' };
const headerSubtitleStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--primary)', marginTop: 1 };
const headerFormCodeStyle: React.CSSProperties = { fontSize: 10, color: 'var(--print-light)', marginTop: 2 };
const sectionBarNoMargin: React.CSSProperties = { ...sectionBar, marginTop: 0 };
const scopeInfoGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px 12px', padding: '6px 0 2px' };
const fieldColSpan2Style: React.CSSProperties = { gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: 1 };
const fieldColStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1 };
const funcTestTableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginTop: 4 };
const pfTableThCenter: React.CSSProperties = { ...pfTableTh, textAlign: 'center', width: 42 };
const pfTableTdCenter: React.CSSProperties = { ...pfTableTd, textAlign: 'center' };
const twoColGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 };
const sectionBarMt6: React.CSSProperties = { ...sectionBar, marginTop: 6 };
const brokenFiberGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '4px 12px', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--print-border-xlt)' };
const brokenFiberLabelStyle: React.CSSProperties = { fontSize: 9.5, fontWeight: 700, color: 'var(--print-muted)', whiteSpace: 'nowrap' };
const brokenFiberCellStyle: React.CSSProperties = { borderBottom: '1px solid var(--print-check-border)', minHeight: 16, fontSize: 10.5 };
const brokenFiberNoteStyle: React.CSSProperties = { marginTop: 4, fontSize: 8.5, color: 'var(--print-muted)' };
const scopeIncludesListStyle: React.CSSProperties = { listStyle: 'none', padding: 0, margin: '4px 0 0' };
const scopeIncludeItemStyle: React.CSSProperties = { padding: '3px 0', fontSize: 10.5, borderBottom: '1px solid var(--print-border-xlt)', display: 'flex', alignItems: 'center', gap: 8 };
const repairsPerformedGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 20px', marginTop: 4 };
const repairPerformedItemStyle: React.CSSProperties = { padding: '2px 0', fontSize: 10, borderBottom: '1px solid var(--print-border-xlt)', display: 'flex', alignItems: 'center', gap: 6 };
const resultFooterStyle: React.CSSProperties = {
  display: 'flex', gap: 0, border: '2px solid var(--primary)', borderRadius: 4,
  overflow: 'hidden', marginTop: 10,
};
const resultSectionStyle: React.CSSProperties = { flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, borderRight: '2px solid var(--primary)' };
const resultSectionLastStyle: React.CSSProperties = { flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 };
const resultLabelStyle: React.CSSProperties = { fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--print-muted)', letterSpacing: '0.05em' };
const resultOptionsRowStyle: React.CSSProperties = { display: 'flex', gap: 16 };
const resultOptionStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700 };
const radioCircleStyle: React.CSSProperties = { width: 16, height: 16, border: '1.5px solid var(--print-check-border)', borderRadius: '50%', flexShrink: 0 };
const sigBlockRowStyle: React.CSSProperties = { display: 'flex', gap: 20, marginTop: 8 };
const sigFieldStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 };
const sigFieldDateStyle: React.CSSProperties = { flex: 1, maxWidth: 140, display: 'flex', flexDirection: 'column', gap: 2 };
const sigLineStyle: React.CSSProperties = { borderBottom: '1px solid var(--print-check-border)', minHeight: 28 };
const sigLabelStyle: React.CSSProperties = { fontSize: 8.5, color: 'var(--print-muted)', fontWeight: 600, marginTop: 2 };
const formFooterStyle: React.CSSProperties = {
  marginTop: 'auto',
  paddingTop: 8,
  borderTop: '1px solid var(--print-border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 8,
  color: 'var(--print-footer)',
};

export const FinalInspectionForm = ({ repair, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={overlayStyle}
    >
      {/* Action bar */}
      <div className="no-print" style={actionBarStyle}>
        <button onClick={() => window.print()} style={printBtnStyle}>Print</button>
        <button onClick={onClose} style={closeBtnStyle}>Close</button>
      </div>

      {/* Printable page */}
      <div className="print-form" style={printPageStyle}>
        {/* ── Form Header ── */}
        <div style={headerRowStyle}>
          <div style={logoStyle}>
            <span style={primaryLetterStyle}>T</span>otal <span style={primaryLetterStyle}>S</span>cope <span style={primaryLetterStyle}>I</span>nc.
          </div>
          <div style={headerRightStyle}>
            <div style={headerTitleStyle}>Final Inspection Report</div>
            <div style={headerSubtitleStyle}>Flexible Endoscope</div>
            <div style={headerFormCodeStyle}>OM10-2</div>
          </div>
        </div>

        {/* ── Scope Information ── */}
        <div style={sectionBarNoMargin}>Scope Information</div>
        <div style={scopeInfoGridStyle}>
          <div style={fieldColSpan2Style}>
            <span style={fl}>Client / Facility</span>
            <div style={fv}>{repair.client ?? ''}</div>
          </div>
          <div style={fieldColStyle}>
            <span style={fl}>Date</span>
            <div style={fv}>{today}</div>
          </div>
          <div style={fieldColStyle}>
            <span style={fl}>Work Order #</span>
            <div style={fv}>{repair.wo ?? ''}</div>
          </div>
          <div style={fieldColStyle}>
            <span style={fl}>Serial #</span>
            <div style={fv}>{repair.serial ?? ''}</div>
          </div>
          <div style={fieldColStyle}>
            <span style={fl}>Scope Model</span>
            <div style={fv}>{repair.scopeModel ?? repair.scopeType ?? ''}</div>
          </div>
        </div>

        {/* ── Functional Tests ── */}
        <div style={sectionBarNoMargin}>Functional Tests</div>
        <table style={funcTestTableStyle}>
          <thead>
            <tr>
              <th style={pfTableTh}>Test Item</th>
              <th style={pfTableThCenter}>Pass</th>
              <th style={pfTableThCenter}>Fail</th>
              <th style={pfTableThCenter}>N/A</th>
            </tr>
          </thead>
          <tbody>
            {FUNCTIONAL_TESTS.map((test, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? 'var(--bg)' : 'var(--card)' }}>
                <td style={pfTableTd}>{test}</td>
                <td style={pfTableTdCenter}><span style={pfP}>P</span></td>
                <td style={pfTableTdCenter}><span style={pfF}>F</span></td>
                <td style={pfTableTdCenter}><span style={pfNA}>N/A</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Two-column: Broken Fibers + Scope Includes ── */}
        <div style={twoColGridStyle}>
          {/* Broken Fibers */}
          <div>
            <div style={sectionBarMt6}>Broken Fibers</div>
            <div style={{ padding: '6px 0' }}>
              {/* Insertion Tube IN */}
              <div style={brokenFiberGridStyle}>
                <span style={brokenFiberLabelStyle}>Insertion Tube (IN)</span>
                <div style={brokenFiberCellStyle}></div>
                <div style={brokenFiberCellStyle}></div>
              </div>
              {/* Bending Section OUT */}
              <div style={brokenFiberGridStyle}>
                <span style={brokenFiberLabelStyle}>Bending Section (OUT)</span>
                <div style={brokenFiberCellStyle}></div>
                <div style={brokenFiberCellStyle}></div>
              </div>
              <div style={brokenFiberNoteStyle}>Count IN before repair / OUT after repair</div>
            </div>
          </div>

          {/* Scope Includes */}
          <div>
            <div style={sectionBarMt6}>Scope Includes</div>
            <ul style={scopeIncludesListStyle}>
              {SCOPE_INCLUDES.map((inc, i) => (
                <li key={i} style={scopeIncludeItemStyle}>
                  <span style={cbBox}></span>{inc}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Repairs Performed ── */}
        <div style={sectionBarMt6}>Repairs Performed</div>
        <div style={repairsPerformedGridStyle}>
          {REPAIRS_PERFORMED.map((rep, i) => (
            <div key={i} style={repairPerformedItemStyle}>
              <span style={cbBox}></span>{rep}
            </div>
          ))}
        </div>

        {/* ── Result Footer ── */}
        <div style={resultFooterStyle}>
          <div style={resultSectionStyle}>
            <div style={resultLabelStyle}>Condition</div>
            <div style={resultOptionsRowStyle}>
              <div style={resultOptionStyle}>
                <div style={radioCircleStyle}></div>USABLE
              </div>
              <div style={resultOptionStyle}>
                <div style={radioCircleStyle}></div>UNUSABLE
              </div>
            </div>
          </div>
          <div style={resultSectionLastStyle}>
            <div style={resultLabelStyle}>Final Result</div>
            <div style={resultOptionsRowStyle}>
              <div style={resultOptionStyle}>
                <div style={radioCircleStyle}></div>PASSED
              </div>
              <div style={resultOptionStyle}>
                <div style={radioCircleStyle}></div>FAILED
              </div>
            </div>
          </div>
        </div>

        {/* ── Signature Block ── */}
        <div style={sigBlockRowStyle}>
          <div style={sigFieldStyle}>
            <div style={sigLineStyle}></div>
            <div style={sigLabelStyle}>Repair Technician / Signature</div>
          </div>
          <div style={sigFieldDateStyle}>
            <div style={sigLineStyle}></div>
            <div style={sigLabelStyle}>Date</div>
          </div>
          <div style={sigFieldStyle}>
            <div style={sigLineStyle}></div>
            <div style={sigLabelStyle}>Final Inspector / Signature</div>
          </div>
          <div style={sigFieldDateStyle}>
            <div style={sigLineStyle}></div>
            <div style={sigLabelStyle}>Date</div>
          </div>
        </div>

        {/* ── Form Footer ── */}
        <div style={formFooterStyle}>
          <span>ISO 13485 Certified</span>
          <span>Total Scope Inc.&nbsp;|&nbsp;17 Creek Pkwy, Upper Chichester PA 19061&nbsp;|&nbsp;(610) 485-3838</span>
          <span>OM10-2</span>
        </div>
      </div>
    </div>
  );
};
