import { useState, useEffect, useRef } from 'react';
import { Spin, DatePicker, InputNumber, Popconfirm, message } from 'antd';
import dayjs from 'dayjs';
import { getBillSchedule, regenerateBillSchedule, setManualBillSchedule } from '../../../api/contracts';
import type { ContractBillSchedule } from '../types';
import {
  spinnerContainerStyle, emptyStateStyle, tabPaddingFlexStyle,
  tableContainerStyle, tableStyle, thStyle, tdStyle,
  formActionsStyle, amendCancelBtnStyle, amendSaveBtnStyle,
  newAmendBtnStyle, fmtDate, fmtMoneyDecimal,
} from './shared';

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
    {children}
  </div>
);

const PanelHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: 'var(--neutral-50)', padding: '7px 12px',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  }}>
    {children}
  </div>
);

// apiClient (api/client.ts interceptor) already unwraps a failed response into a plain
// Error whose message is the server's data.message/error/detail — so surface that. This
// is what carries the actionable 409 text (manual-clobber confirm, finalized invoices).
const errMessage = (e: unknown, fallback: string): string =>
  (e instanceof Error && e.message) ? e.message : fallback;

const miniCardStyle: React.CSSProperties = { flex: 1, background: 'var(--card)', border: '1px solid var(--neutral-200)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' };
const miniLabelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' };
const iconBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 13, lineHeight: 1 };

// billDateEnd is carried through (preserved) but not edited in the grid — the period-end
// is informational; this prevents a manual save from nulling out existing period-end dates.
interface EditRow { billDate: string; billDateEnd: string | null; amount: number }

export const BillingScheduleTab = ({ contractKey }: { contractKey: number }) => {
  const [sched, setSched] = useState<ContractBillSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<EditRow[]>([]);
  // Tracks the currently-selected contract so in-flight load/mutation responses for a
  // previously-selected contract are discarded (never show or save the wrong contract's data).
  const activeKeyRef = useRef(contractKey);

  useEffect(() => {
    activeKeyRef.current = contractKey;
    let cancelled = false;
    setLoading(true);
    setEditing(false);
    setBusy(false);
    setSched(null); // clear stale data: a failed load must not show or let us save the previous contract's schedule
    getBillSchedule(contractKey)
      .then(s => { if (!cancelled) setSched(s); })
      .catch(() => { if (!cancelled) message.error('Failed to load billing schedule'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [contractKey]);

  const startEdit = () => {
    const seed = (sched?.rows ?? []).map(r => ({ billDate: r.billDate.slice(0, 10), billDateEnd: r.billDateEnd ? r.billDateEnd.slice(0, 10) : null, amount: r.amount }));
    setRows(seed.length > 0 ? seed : [{ billDate: dayjs().format('YYYY-MM-DD'), billDateEnd: null, amount: 0 }]);
    setEditing(true);
  };

  const regenerate = async (force: boolean) => {
    const key = contractKey;
    setBusy(true);
    try {
      const s = await regenerateBillSchedule(key, force);
      if (activeKeyRef.current !== key) return; // contract switched mid-request — drop stale result
      setSched(s);
      message.success('Schedule regenerated from contract terms');
    } catch (e) {
      if (activeKeyRef.current === key) message.error(errMessage(e, 'Failed to regenerate schedule'));
    } finally {
      if (activeKeyRef.current === key) setBusy(false);
    }
  };

  const saveManual = async () => {
    const key = contractKey;
    const clean = rows.filter(r => r.billDate);
    if (clean.length === 0) { message.error('Add at least one billing row'); return; }
    setBusy(true);
    try {
      const s = await setManualBillSchedule(key, clean.map(r => ({ billDate: r.billDate, billDateEnd: r.billDateEnd, amount: r.amount })));
      if (activeKeyRef.current !== key) return; // contract switched mid-request — drop stale result
      setSched(s);
      setEditing(false);
      message.success('Manual schedule saved');
    } catch (e) {
      if (activeKeyRef.current === key) message.error(errMessage(e, 'Failed to save manual schedule'));
    } finally {
      if (activeKeyRef.current === key) setBusy(false);
    }
  };

  if (loading) return <div style={spinnerContainerStyle}><Spin size="small" /></div>;
  if (!sched) return <div style={emptyStateStyle}>No billing schedule available.</div>;

  const editTotal = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const editDiff = editTotal - sched.contractTotal;

  return (
    <div style={tabPaddingFlexStyle}>
      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={miniCardStyle}>
          <div style={{ fontSize: 15, fontWeight: 800, color: sched.manual ? 'var(--warning)' : 'var(--success)' }}>
            {sched.manual ? 'Manual' : 'Auto'}
          </div>
          <div style={miniLabelStyle}>Mode</div>
        </div>
        <div style={miniCardStyle}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>{fmtMoneyDecimal(sched.contractTotal)}</div>
          <div style={miniLabelStyle}>Contract Total</div>
        </div>
        <div style={miniCardStyle}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)' }}>{fmtMoneyDecimal(sched.scheduledTotal)}</div>
          <div style={miniLabelStyle}>Scheduled</div>
        </div>
        <div style={miniCardStyle}>
          <div style={{ fontSize: 15, fontWeight: 800, color: sched.balanced ? 'var(--success)' : 'var(--danger)' }}>
            {sched.balanced ? 'Balanced' : fmtMoneyDecimal(sched.scheduledTotal - sched.contractTotal)}
          </div>
          <div style={miniLabelStyle}>{sched.balanced ? 'Ties to total' : 'Off by'}</div>
        </div>
      </div>

      {editing ? (
        <Panel>
          <PanelHead>
            <span>Edit Schedule (Manual)</span>
            <button onClick={() => setRows(r => [...r, { billDate: dayjs().format('YYYY-MM-DD'), billDateEnd: null, amount: 0 }])} style={newAmendBtnStyle}>+ Add Row</button>
          </PanelHead>
          <div style={tableContainerStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Bill Date</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  <th style={thStyle} aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>
                      <DatePicker
                        value={r.billDate ? dayjs(r.billDate) : null}
                        onChange={(d) => setRows(rs => rs.map((x, j) => j === i ? { ...x, billDate: d ? d.format('YYYY-MM-DD') : '' } : x))}
                        size="small" style={{ width: '100%' }} aria-label={`Bill date row ${i + 1}`}
                      />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <InputNumber
                        value={r.amount}
                        onChange={(v) => setRows(rs => rs.map((x, j) => j === i ? { ...x, amount: v ?? 0 } : x))}
                        min={0} prefix="$" size="small" style={{ width: 140 }} aria-label={`Amount row ${i + 1}`}
                      />
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => setRows(rs => rs.filter((_, j) => j !== i))} style={iconBtnStyle} aria-label={`Remove row ${i + 1}`}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 700 }} colSpan={2}>Total ({rows.length} rows)</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: Math.abs(editDiff) < 0.005 ? 'var(--success)' : 'var(--danger)' }}>{fmtMoneyDecimal(editTotal)}</td>
                  <td style={tdStyle} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ ...formActionsStyle, padding: '10px 12px' }}>
            {Math.abs(editDiff) >= 0.005 && (
              <span style={{ flex: 1, fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>
                {fmtMoneyDecimal(Math.abs(editDiff))} {editDiff > 0 ? 'over' : 'under'} the contract total — saving anyway is allowed (manual override).
              </span>
            )}
            <button onClick={() => setEditing(false)} disabled={busy} style={amendCancelBtnStyle}>Cancel</button>
            <button onClick={saveManual} disabled={busy} style={amendSaveBtnStyle}>{busy ? 'Saving…' : 'Save Manual Schedule'}</button>
          </div>
        </Panel>
      ) : (
        <Panel>
          <PanelHead>
            <span>Billing Schedule ({sched.rows.length})</span>
            <span style={{ display: 'flex', gap: 6 }}>
              {sched.manual ? (
                <Popconfirm
                  title="Discard manual schedule?"
                  description="Regenerating rebuilds from the contract terms and discards your hand-entered rows."
                  okText="Regenerate" cancelText="Cancel"
                  onConfirm={() => regenerate(true)}
                >
                  <button disabled={busy} style={newAmendBtnStyle}>Regenerate from terms</button>
                </Popconfirm>
              ) : (
                <button onClick={() => regenerate(false)} disabled={busy} style={newAmendBtnStyle}>Regenerate from terms</button>
              )}
              <button onClick={startEdit} disabled={busy} style={newAmendBtnStyle}>Edit / Build manually</button>
            </span>
          </PanelHead>
          <div style={tableContainerStyle}>
            {sched.rows.length === 0 ? (
              <div style={emptyStateStyle}>No billing schedule. Regenerate from terms, or build one manually.</div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Bill Date</th>
                    <th style={thStyle}>Period End</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sched.rows.map((r, i) => (
                    <tr key={r.scheduleKey}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>{fmtDate(r.billDate)}</td>
                      <td style={tdStyle}>{fmtDate(r.billDateEnd)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtMoneyDecimal(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ ...tdStyle, fontWeight: 700 }} colSpan={3}>Total</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: sched.balanced ? 'var(--navy)' : 'var(--danger)' }}>{fmtMoneyDecimal(sched.scheduledTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
};
