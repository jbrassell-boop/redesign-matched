import { useState } from 'react';
import './print.css';
import type { RepairFull } from '../types';

interface Props {
  repair: RepairFull;
  onClose: () => void;
}

const CHECKLIST_ITEMS = [
  'Leak Test',
  'Image Quality',
  'Angulation — Up/Down',
  'Angulation — Left/Right',
  'Air/Water Function',
  'Suction Function',
  'Forcep Channel',
  'Light Fiber Transmission',
  'Distal Tip Condition',
  'Insertion Tube / Universal Cord',
];

type PfVal = 'P' | 'F' | 'N' | null;

const sectionHeader: React.CSSProperties = {
  background: '#2E75B6',
  color: '#fff',
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '4px 8px',
  marginBottom: 0,
};

const fieldLabel: React.CSSProperties = {
  fontSize: 8.5,
  color: '#555',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 600,
  marginBottom: 1,
};

const fieldValue: React.CSSProperties = {
  fontSize: 11,
  color: '#1a1a1a',
  borderBottom: '1px solid #bbb',
  minHeight: 18,
  paddingBottom: 1,
};

const sectionBox: React.CSSProperties = {
  border: '1px solid #ccc',
  borderRadius: 3,
  overflow: 'hidden',
  marginBottom: 8,
};

const sectionBody: React.CSSProperties = {
  padding: '6px 8px',
};

export const DiInspectionForm = ({ repair, onClose }: Props) => {
  const [condition, setCondition] = useState<'clean' | 'unclean' | null>(null);
  const [pfState, setPfState] = useState<PfVal[]>(CHECKLIST_ITEMS.map(() => null));
  const [needsRepair, setNeedsRepair] = useState('');
  const [comments, setComments] = useState('');

  const today = new Date().toLocaleDateString('en-US');

  const setPf = (idx: number, val: PfVal) => {
    setPfState(prev => {
      const next = [...prev];
      next[idx] = next[idx] === val ? null : val;
      return next;
    });
  };

  const pfBtn = (idx: number, val: PfVal, label: string, activeColor: string) => (
    <button
      className="no-print"
      onClick={() => setPf(idx, val)}
      style={{
        width: 32, height: 22, border: '1px solid #ccc', borderRadius: 3,
        fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        background: pfState[idx] === val ? activeColor : '#f9f9f9',
        color: pfState[idx] === val ? '#fff' : '#666',
      }}
    >{label}</button>
  );

  const pfPrintCell = (idx: number, val: PfVal, label: string) => (
    <span style={{
      display: 'inline-block', width: 20, height: 16, border: '1px solid #999',
      fontSize: 8, textAlign: 'center', lineHeight: '16px', marginRight: 2,
      background: pfState[idx] === val ? (val === 'P' ? '#4CAF50' : val === 'F' ? '#f44336' : '#999') : '#fff',
      color: pfState[idx] === val ? '#fff' : '#333',
    }}>{label}</span>
  );

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
      {/* No-print action bar */}
      <div className="no-print" style={{
        position: 'fixed', top: 16, right: 32, display: 'flex', gap: 8, zIndex: 1200,
      }}>
        <button
          onClick={() => window.print()}
          style={{
            height: 32, padding: '0 16px', border: 'none', borderRadius: 5,
            background: '#2E75B6', color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Print</button>
        <button
          onClick={onClose}
          style={{
            height: 32, padding: '0 14px', border: '1px solid #ccc', borderRadius: 5,
            background: '#fff', color: '#555',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Close</button>
      </div>

      {/* The printable form */}
      <div
        className="print-form"
        style={{
          width: '8.5in', maxWidth: '100%',
          background: '#fff', padding: '0.4in',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          fontFamily: 'Arial, sans-serif',
          fontSize: 11,
          color: '#1a1a1a',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, borderBottom: '2px solid #2E75B6', paddingBottom: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#2E75B6', letterSpacing: '-0.02em' }}>Total Scope Inc.</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>Medical Device Repair Services</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>D&I Inspection Report</div>
            <div style={{ fontSize: 9, color: '#777', marginTop: 2 }}>Form: OM05-2</div>
            <div style={{ fontSize: 9, color: '#777' }}>Date: {today}</div>
          </div>
        </div>

        {/* ── Scope Information ── */}
        <div style={sectionBox}>
          <div style={sectionHeader}>Scope Information</div>
          <div style={sectionBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '6px 12px' }}>
              <div>
                <div style={fieldLabel}>Client / Facility</div>
                <div style={fieldValue}>{repair.client}</div>
              </div>
              <div>
                <div style={fieldLabel}>Work Order #</div>
                <div style={fieldValue}>{repair.wo}</div>
              </div>
              <div>
                <div style={fieldLabel}>Serial #</div>
                <div style={fieldValue}>{repair.serial}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px 12px', marginTop: 6 }}>
              <div>
                <div style={fieldLabel}>Date In</div>
                <div style={fieldValue}>{repair.dateIn}</div>
              </div>
              <div>
                <div style={fieldLabel}>Rack #</div>
                <div style={fieldValue}>{repair.rackLocation ?? ''}</div>
              </div>
              <div>
                <div style={fieldLabel}>Scope Type</div>
                <div style={fieldValue}>{repair.scopeType}</div>
              </div>
              <div>
                <div style={fieldLabel}>Department</div>
                <div style={fieldValue}>{repair.dept}</div>
              </div>
            </div>
            {repair.complaint && (
              <div style={{ marginTop: 6 }}>
                <div style={fieldLabel}>Complaint / Description</div>
                <div style={{ ...fieldValue, minHeight: 28, whiteSpace: 'pre-wrap' }}>{repair.complaint}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Item Received Condition ── */}
        <div style={sectionBox}>
          <div style={sectionHeader}>Item Received Condition</div>
          <div style={{ ...sectionBody, display: 'flex', gap: 32, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11 }}>
              <input
                type="checkbox"
                checked={condition === 'clean'}
                onChange={() => setCondition(prev => prev === 'clean' ? null : 'clean')}
                style={{ width: 14, height: 14, cursor: 'pointer' }}
              />
              Clean
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11 }}>
              <input
                type="checkbox"
                checked={condition === 'unclean'}
                onChange={() => setCondition(prev => prev === 'unclean' ? null : 'unclean')}
                style={{ width: 14, height: 14, cursor: 'pointer' }}
              />
              Unclean / Contaminated
            </label>
          </div>
        </div>

        {/* ── Inspection Checklist ── */}
        <div style={sectionBox}>
          <div style={sectionHeader}>Inspection Checklist</div>
          <div style={sectionBody}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', color: '#555', width: '60%' }}>Inspection Item</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', color: '#555' }}>Pass</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', color: '#555' }}>Fail</th>
                  <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', color: '#555' }}>N/A</th>
                </tr>
              </thead>
              <tbody>
                {CHECKLIST_ITEMS.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '4px 6px', fontSize: 11 }}>{item}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                      {/* Screen buttons */}
                      {pfBtn(idx, 'P', 'P', '#4CAF50')}
                      {/* Print marker */}
                      <span className="print-only" style={{ display: 'none' }}>{pfPrintCell(idx, 'P', 'P')}</span>
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                      {pfBtn(idx, 'F', 'F', '#f44336')}
                      <span className="print-only" style={{ display: 'none' }}>{pfPrintCell(idx, 'F', 'F')}</span>
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                      {pfBtn(idx, 'N', 'N/A', '#9e9e9e')}
                      <span className="print-only" style={{ display: 'none' }}>{pfPrintCell(idx, 'N', 'N')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Items in Need of Repair ── */}
        <div style={sectionBox}>
          <div style={sectionHeader}>Items in Need of Repair</div>
          <div style={sectionBody}>
            <textarea
              value={needsRepair}
              onChange={e => setNeedsRepair(e.target.value)}
              rows={3}
              placeholder="Describe items requiring repair..."
              style={{
                width: '100%', resize: 'vertical', border: '1px solid #ddd', borderRadius: 3,
                padding: '4px 6px', fontSize: 11, fontFamily: 'Arial, sans-serif',
                color: '#1a1a1a', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* ── Comments ── */}
        <div style={sectionBox}>
          <div style={sectionHeader}>Comments</div>
          <div style={sectionBody}>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              rows={3}
              placeholder="Additional comments..."
              style={{
                width: '100%', resize: 'vertical', border: '1px solid #ddd', borderRadius: 3,
                padding: '4px 6px', fontSize: 11, fontFamily: 'Arial, sans-serif',
                color: '#1a1a1a', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* ── Signature Block ── */}
        <div style={sectionBox}>
          <div style={sectionHeader}>Authorization</div>
          <div style={{ ...sectionBody, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 24px' }}>
            <div>
              <div style={fieldLabel}>Inspector Name</div>
              <div style={{ ...fieldValue, minHeight: 22 }}></div>
            </div>
            <div>
              <div style={fieldLabel}>Signature</div>
              <div style={{ ...fieldValue, minHeight: 22 }}></div>
            </div>
            <div>
              <div style={fieldLabel}>Date</div>
              <div style={{ ...fieldValue, minHeight: 22 }}></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#aaa' }}>
          <span>Total Scope Inc. — Confidential</span>
          <span>OM05-2 Rev. A</span>
        </div>
      </div>
    </div>
  );
};
