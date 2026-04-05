import './print.css';
import type { RepairFull, RepairLineItem } from '../types';

interface Props {
  repair: RepairFull;
  lineItems: RepairLineItem[];
  onClose: () => void;
}

const sectionHeader: React.CSSProperties = {
  background: '#2E75B6',
  color: '#fff',
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '4px 8px',
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

const fmt$ = (n: number) => '$' + n.toFixed(2);

export const RequisitionForm = ({ repair, lineItems, onClose }: Props) => {
  const today = new Date().toLocaleDateString('en-US');

  const subtotal = lineItems.reduce((sum, li) => sum + (li.amount ?? 0), 0);
  const shipping = 0; // placeholder
  const tax = 0;      // placeholder
  const total = subtotal + shipping + tax;

  const billAddr = [repair.billAddr1, repair.billAddr2].filter(Boolean).join(', ');
  const billCityLine = [repair.billCity, repair.billState, repair.billZip].filter(Boolean).join(' ');
  const shipAddr = [repair.shipAddr1, repair.shipAddr2].filter(Boolean).join(', ');
  const shipCityLine = [repair.shipCity, repair.shipState, repair.shipZip].filter(Boolean).join(' ');

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
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Requisition for Approval</div>
            <div style={{ fontSize: 9, color: '#777', marginTop: 2 }}>Form: OM07-2</div>
            <div style={{ fontSize: 9, color: '#777' }}>Date: {today}</div>
          </div>
        </div>

        {/* ── Repair Info Grid ── */}
        <div style={sectionBox}>
          <div style={sectionHeader}>Repair Information</div>
          <div style={sectionBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px' }}>
              <div>
                <div style={fieldLabel}>To / Customer</div>
                <div style={fieldValue}>{repair.client}</div>
              </div>
              <div>
                <div style={fieldLabel}>Department</div>
                <div style={fieldValue}>{repair.dept}</div>
              </div>
              <div>
                <div style={fieldLabel}>Work Order #</div>
                <div style={fieldValue}>{repair.wo}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px', marginTop: 6 }}>
              <div>
                <div style={fieldLabel}>Bill To</div>
                <div style={{ fontSize: 11, color: '#1a1a1a', borderBottom: '1px solid #bbb', minHeight: 36, paddingBottom: 1 }}>
                  {repair.billName && <div>{repair.billName}</div>}
                  {billAddr && <div>{billAddr}</div>}
                  {billCityLine && <div>{billCityLine}</div>}
                </div>
              </div>
              <div>
                <div style={fieldLabel}>Ship To</div>
                <div style={{ fontSize: 11, color: '#1a1a1a', borderBottom: '1px solid #bbb', minHeight: 36, paddingBottom: 1 }}>
                  {repair.shipName && <div>{repair.shipName}</div>}
                  {shipAddr && <div>{shipAddr}</div>}
                  {shipCityLine && <div>{shipCityLine}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>
                  <div style={fieldLabel}>Scope Type</div>
                  <div style={fieldValue}>{repair.scopeType}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Serial #</div>
                  <div style={fieldValue}>{repair.serial}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 16px', marginTop: 6 }}>
              <div>
                <div style={fieldLabel}>PO #</div>
                <div style={fieldValue}>{repair.purchaseOrder ?? ''}</div>
              </div>
              <div>
                <div style={fieldLabel}>Contract #</div>
                <div style={fieldValue}>{repair.contractNumber ?? ''}</div>
              </div>
              <div>
                <div style={fieldLabel}>Date In</div>
                <div style={fieldValue}>{repair.dateIn}</div>
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

        {/* ── Repair Items Table ── */}
        <div style={sectionBox}>
          <div style={sectionHeader}>Repair Items</div>
          <div style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', color: '#555', width: '10%' }}>Code</th>
                  <th style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', color: '#555' }}>Description</th>
                  <th style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', color: '#555', width: '12%' }}>Amount</th>
                  <th style={{ textAlign: 'center', padding: '5px 8px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', color: '#555', width: '8%' }}>Approve</th>
                  <th style={{ textAlign: 'center', padding: '5px 8px', fontWeight: 700, fontSize: 9, textTransform: 'uppercase', color: '#555', width: '8%' }}>Decline</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '12px 8px', textAlign: 'center', color: '#999', fontSize: 11, fontStyle: 'italic' }}>
                      No line items
                    </td>
                  </tr>
                ) : (
                  lineItems.map((li, idx) => (
                    <tr key={li.tranKey} style={{ borderBottom: '1px solid #eee', background: idx % 2 === 1 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '4px 8px', fontSize: 10, color: '#555' }}>{li.itemCode}</td>
                      <td style={{ padding: '4px 8px' }}>{li.description}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt$(li.amount)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                        <input type="checkbox" style={{ width: 14, height: 14 }} />
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                        <input type="checkbox" style={{ width: 14, height: 14 }} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Totals ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <table style={{ fontSize: 11, borderCollapse: 'collapse', minWidth: 220 }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 12px 2px 0', color: '#555', textAlign: 'right' }}>Subtotal</td>
                <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #eee' }}>{fmt$(subtotal)}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 12px 2px 0', color: '#555', textAlign: 'right' }}>Shipping</td>
                <td style={{ padding: '2px 0', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmt$(shipping)}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 12px 2px 0', color: '#555', textAlign: 'right' }}>Tax</td>
                <td style={{ padding: '2px 0', textAlign: 'right', borderBottom: '1px solid #eee' }}>{fmt$(tax)}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 12px 0 0', color: '#1a1a1a', fontWeight: 700, textAlign: 'right', fontSize: 12 }}>Total</td>
                <td style={{ padding: '4px 0 0', textAlign: 'right', fontWeight: 800, fontSize: 12, borderTop: '2px solid #2E75B6', color: '#2E75B6' }}>{fmt$(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Disclaimer ── */}
        <div style={{ border: '1px solid #ddd', borderRadius: 3, padding: '6px 8px', marginBottom: 8, background: '#fafafa', fontSize: 9, color: '#666', lineHeight: 1.5 }}>
          <strong>Authorization Notice:</strong> By signing below, the customer authorizes Total Scope Inc. to proceed with the repairs described above at the indicated pricing.
          Approval of individual line items is indicated by the checkboxes in the table above. Items marked as declined will not be repaired.
          Total Scope Inc. is not responsible for any delays resulting from partial approvals.
          All repairs are performed in accordance with TSI quality standards and applicable regulatory requirements.
        </div>

        {/* ── Customer Authorization ── */}
        <div style={sectionBox}>
          <div style={sectionHeader}>Customer Authorization</div>
          <div style={{ ...sectionBody, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            <div>
              <div style={fieldLabel}>Authorized Name (Print)</div>
              <div style={{ ...fieldValue, minHeight: 22 }}></div>
            </div>
            <div>
              <div style={fieldLabel}>Title / Position</div>
              <div style={{ ...fieldValue, minHeight: 22 }}></div>
            </div>
            <div>
              <div style={fieldLabel}>Signature</div>
              <div style={{ ...fieldValue, minHeight: 28 }}></div>
            </div>
            <div>
              <div style={fieldLabel}>Date</div>
              <div style={{ ...fieldValue, minHeight: 28 }}></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#aaa' }}>
          <span>Total Scope Inc. — Confidential</span>
          <span>OM07-2 Rev. A</span>
        </div>
      </div>
    </div>
  );
};
