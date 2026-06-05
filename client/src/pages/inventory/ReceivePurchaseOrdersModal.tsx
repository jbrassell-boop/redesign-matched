import { useState, useCallback } from 'react';
import { Modal, message } from 'antd';
import { getOpenPoReceipts, receivePoLine } from '../../api/inventory';
import type { PoReceiptLine } from './types';

const fld: React.CSSProperties = {
  height: 24, border: '1px solid var(--neutral-200)', borderRadius: 3, background: 'var(--card)',
  padding: '0 6px', fontSize: 11, color: 'var(--label)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const th: React.CSSProperties = { padding: '4px 6px', textAlign: 'left' };
const thR: React.CSSProperties = { padding: '4px 6px', textAlign: 'right' };

interface Props {
  open: boolean;
  onClose: () => void;
  onReceived: () => void;
}

interface RowState { qty: number; bin: string; lot: string; busy: boolean; }

export const ReceivePurchaseOrdersModal = ({ open, onClose, onReceived }: Props) => {
  const [lines, setLines] = useState<PoReceiptLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<number, RowState>>({});

  const load = useCallback(() => {
    setLoading(true);
    getOpenPoReceipts()
      .then(data => {
        setLines(data);
        const init: Record<number, RowState> = {};
        data.forEach(l => { init[l.supplierPOTranKey] = { qty: l.remainingQuantity, bin: '', lot: '', busy: false }; });
        setRows(init);
      })
      .catch(() => message.error('Failed to load open purchase orders'))
      .finally(() => setLoading(false));
  }, []);

  const setRow = (key: number, patch: Partial<RowState>) =>
    setRows(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleReceive = async (line: PoReceiptLine) => {
    const row = rows[line.supplierPOTranKey];
    if (!row || row.qty <= 0) { message.error('Enter a quantity greater than zero'); return; }
    setRow(line.supplierPOTranKey, { busy: true });
    try {
      const res = await receivePoLine({
        supplierPOTranKey: line.supplierPOTranKey,
        quantityReceived: row.qty,
        binNumber: row.bin.trim() || null,
        lotNumberOverride: row.lot.trim() || null,
      });
      message.success(`Received ${row.qty} · lot ${res.lotNumber} · on-hand now ${res.newLocationLevel}`);
      onReceived();
      load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to receive');
      setRow(line.supplierPOTranKey, { busy: false });
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      afterOpenChange={(o) => { if (o) load(); }}
      width={880}
      footer={null}
      title={<span style={{ color: 'var(--navy)', fontWeight: 700 }}>Receive Against Purchase Orders</span>}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', padding: '12px 16px' } }}
    >
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', padding: 16 }}>Loading…</div>
      ) : lines.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--muted)', padding: 16 }}>
          No open purchase-order lines awaiting receipt at this location.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
              <th style={th}>PO #</th>
              <th style={th}>Supplier</th>
              <th style={th}>Item · Size</th>
              <th style={thR}>Ord</th>
              <th style={thR}>Rcv</th>
              <th style={thR}>Rem</th>
              <th style={{ ...th, width: 64 }}>Receive</th>
              <th style={{ ...th, width: 92 }}>Bin</th>
              <th style={{ ...th, width: 92 }}>Lot (opt)</th>
              <th style={{ width: 76 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map(l => {
              const r = rows[l.supplierPOTranKey] ?? { qty: l.remainingQuantity, bin: '', lot: '', busy: false };
              return (
                <tr key={l.supplierPOTranKey} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '4px 6px', fontWeight: 600 }}>{l.poNumber}</td>
                  <td style={{ padding: '4px 6px' }}>{l.supplierName}</td>
                  <td style={{ padding: '4px 6px' }}>{[l.itemDescription, l.sizeDescription].filter(Boolean).join(' · ')}</td>
                  <td style={thR}>{l.orderedQuantity}</td>
                  <td style={thR}>{l.receivedQuantity}</td>
                  <td style={thR}>{l.remainingQuantity}</td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      type="number" min={1} value={r.qty}
                      onChange={e => setRow(l.supplierPOTranKey, { qty: Math.max(0, Number(e.target.value) || 0) })}
                      style={{ ...fld, width: 56 }}
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input value={r.bin} onChange={e => setRow(l.supplierPOTranKey, { bin: e.target.value })} placeholder="—" style={{ ...fld, width: 84 }} />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input value={r.lot} onChange={e => setRow(l.supplierPOTranKey, { lot: e.target.value })} placeholder="auto" style={{ ...fld, width: 84 }} />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <button
                      onClick={() => handleReceive(l)} disabled={r.busy}
                      style={{ height: 24, padding: '0 10px', fontSize: 11, fontWeight: 700, background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 4, cursor: r.busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                    >{r.busy ? '…' : 'Receive'}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onClose}
          style={{ height: 30, padding: '0 16px', fontSize: 12, fontWeight: 600, background: 'var(--neutral-100)', color: 'var(--navy)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
        >Close</button>
      </div>
    </Modal>
  );
};
