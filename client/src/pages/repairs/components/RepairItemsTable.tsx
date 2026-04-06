import { useState, useRef, useCallback } from 'react';
import { message } from 'antd';
import type { RepairLineItem, RepairCatalogItem } from '../types';
import { addRepairLineItem, deleteRepairLineItem, patchLineItemCauseComments, bulkApproveLineItems } from '../../../api/repairs';
import { RepairItemAutoComplete } from './RepairItemAutoComplete';
import { RepairItemPicker } from './RepairItemPicker';

interface RepairItemsTableProps {
  repairKey: number;
  items: RepairLineItem[];
  onItemsChanged: () => void;
  onOpenAmendments: (tranKey?: number) => void;
  hasAmendments: boolean;
}

type FixType = 'R' | 'W' | 'N' | 'C' | 'A' | '';
type CauseType = 'UA' | 'NW' | '';

interface AddState {
  selectedItem: RepairCatalogItem | null;
  fixType: FixType;
  cause: CauseType;
  amount: number;
  comment: string;
}

const EMPTY_ADD: AddState = {
  selectedItem: null, fixType: 'C', cause: '', amount: 0, comment: '',
};

const causeBadge = (cause: string) => {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    UA: { bg: '#FEF2F2', color: 'var(--danger)', border: '#FECACA' },
    NW: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  };
  const s = styles[cause?.toUpperCase()] ?? { bg: 'var(--neutral-50)', color: 'var(--muted)', border: 'var(--border)' };
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 10,
      fontSize: 10, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {cause || '—'}
    </span>
  );
};

const fixBadge = (fix: string) => {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    W:  { bg: '#F0FDF4', color: 'var(--success)', border: '#BBF7D0' },
    N:  { bg: '#FEF2F2', color: 'var(--danger)',  border: '#FECACA' },
    R:  { bg: '#FFF7ED', color: '#C2410C',        border: '#FED7AA' },
    C:  { bg: '#EFF6FF', color: 'var(--primary)', border: '#BFDBFE' },
    A:  { bg: '#F5F3FF', color: '#7C3AED',        border: '#DDD6FE' },
  };
  const s = styles[fix?.toUpperCase()] ?? { bg: 'var(--neutral-50)', color: 'var(--muted)', border: 'var(--border)' };
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 10,
      fontSize: 10, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {fix || '—'}
    </span>
  );
};

const approvalDot = (approved: string) => {
  const color = approved === 'Y' ? 'var(--success)' : approved === 'N' ? 'var(--danger)' : 'var(--amber)';
  return <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} />;
};

export const RepairItemsTable = ({
  repairKey, items, onItemsChanged, onOpenAmendments, hasAmendments,
}: RepairItemsTableProps) => {
  const [addRow, setAddRow] = useState<AddState>(EMPTY_ADD);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const warrantyTotal = items
    .filter(i => i.fixType?.toUpperCase() === 'W')
    .reduce((sum, i) => sum + (i.baseAmount ?? i.amount ?? 0), 0);
  const customerTotal = items
    .filter(i => i.fixType?.toUpperCase() !== 'W')
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const grandTotal = warrantyTotal + customerTotal;

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleItemSelect = (item: RepairCatalogItem) => {
    setAddRow(r => ({
      ...r,
      selectedItem: item,
      amount: addRow.fixType === 'W' ? 0 : item.defaultPrice,
    }));
  };

  const handleFixType = (ft: FixType) => {
    setAddRow(r => ({
      ...r,
      fixType: ft,
      amount: ft === 'W' ? 0 : (r.selectedItem?.defaultPrice ?? r.amount),
    }));
  };

  const handleAdd = useCallback(async () => {
    if (!addRow.selectedItem) return;
    setSaving(true);
    try {
      await addRepairLineItem(repairKey, {
        itemKey: addRow.selectedItem.itemKey,
        itemCode: addRow.selectedItem.itemCode,
        description: addRow.selectedItem.description,
        fixType: addRow.fixType || 'C',
        cause: addRow.cause || undefined,
        amount: addRow.fixType === 'W' ? 0 : addRow.amount,
        baseAmount: addRow.selectedItem.defaultPrice,
        comments: addRow.comment || undefined,
      });
      setAddRow(EMPTY_ADD);
      onItemsChanged();
      // Refocus search after add
      setTimeout(() => searchRef.current?.focus(), 50);
    } catch {
      message.error('Failed to add item');
    } finally {
      setSaving(false);
    }
  }, [addRow, repairKey, onItemsChanged]);

  const handleDelete = async (tranKey: number) => {
    try {
      await deleteRepairLineItem(repairKey, tranKey);
      onItemsChanged();
    } catch {
      message.error('Failed to remove item');
    }
  };

  const handlePatchCause = async (tranKey: number, cause: string) => {
    try {
      const item = items.find(i => i.tranKey === tranKey);
      await patchLineItemCauseComments(repairKey, tranKey, cause, item?.comments ?? null);
      onItemsChanged();
    } catch {
      message.error('Failed to update cause');
    }
  };

  const handlePatchComment = async (tranKey: number, comments: string) => {
    try {
      const item = items.find(i => i.tranKey === tranKey);
      await patchLineItemCauseComments(repairKey, tranKey, item?.cause ?? null, comments);
      onItemsChanged();
    } catch {
      message.error('Failed to update comment');
    }
  };

  const thStyle: React.CSSProperties = {
    background: 'var(--neutral-50)', color: 'var(--muted)',
    padding: '6px 10px', textAlign: 'left',
    fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
    letterSpacing: '0.04em', textTransform: 'uppercase',
    borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0,
  };
  const tdStyle: React.CSSProperties = {
    padding: '5px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', fontSize: 12,
  };
  const addTdStyle: React.CSSProperties = { ...tdStyle, background: 'var(--neutral-50)' };

  const fixTypeButtons: { label: string; value: FixType }[] = [
    { label: 'R', value: 'R' },
    { label: 'W', value: 'W' },
    { label: 'N', value: 'N' },
    { label: 'C', value: 'C' },
    { label: 'A', value: 'A' },
  ];

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Section head */}
      <div style={{
        background: 'var(--neutral-50)',
        borderBottom: '1px solid var(--border)',
        padding: '7px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>Repair Items</span>
          <button onClick={() => setPickerOpen(true)} style={{
            background: 'var(--card)', color: 'var(--navy)',
            border: '1px solid var(--border)', borderRadius: 3,
            padding: '2px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
          }}>+ Add Items</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {items.length} item{items.length !== 1 ? 's' : ''} ·{' '}
            <span style={{ color: 'var(--success)' }}>{fmt(warrantyTotal)} warranty</span> ·{' '}
            <span style={{ color: 'var(--amber)' }}>{fmt(customerTotal)} customer</span>
          </span>
          {items.length > 0 && (
            <>
              <button
                onClick={async () => {
                  try { await bulkApproveLineItems(repairKey, 'Y'); onItemsChanged(); }
                  catch { message.error('Failed to approve'); }
                }}
                style={{
                  background: 'var(--card)', color: 'var(--navy)',
                  border: '1px solid var(--border)', borderRadius: 3,
                  padding: '2px 8px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Approve All
              </button>
              <button
                onClick={async () => {
                  try { await bulkApproveLineItems(repairKey, ''); onItemsChanged(); }
                  catch { message.error('Failed to unapprove'); }
                }}
                style={{
                  background: 'var(--card)', color: 'var(--navy)',
                  border: '1px solid var(--border)', borderRadius: 3,
                  padding: '2px 8px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Unapprove All
              </button>
            </>
          )}
          {hasAmendments && (
            <button
              onClick={() => onOpenAmendments()}
              style={{
                background: 'var(--card)', color: 'var(--navy)',
                border: '1px solid var(--border)', borderRadius: 3,
                padding: '2px 8px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Amendments
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 28, textAlign: 'center' }}></th>
              <th style={{ ...thStyle, minWidth: 72 }}>Code</th>
              <th style={{ ...thStyle, minWidth: 200 }}>Repair Item</th>
              <th style={{ ...thStyle, minWidth: 70, textAlign: 'center' }}>Cause</th>
              <th style={{ ...thStyle, minWidth: 70, textAlign: 'center' }}>Fix Type</th>
              <th style={{ ...thStyle, minWidth: 80, textAlign: 'center' }}>Approval</th>
              <th style={{ ...thStyle, minWidth: 80, textAlign: 'right' }}>Amount</th>
              <th style={{ ...thStyle, minWidth: 54 }}>Tech</th>
              <th style={{ ...thStyle, minWidth: 160 }}>Comments</th>
              <th style={{ ...thStyle, width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <RepairItemRow
                key={item.tranKey}
                item={item}
                fmt={fmt}
                tdStyle={tdStyle}
                onDelete={() => handleDelete(item.tranKey)}
                onOpenAmendments={() => onOpenAmendments(item.tranKey)}
                onPatchCause={(cause) => handlePatchCause(item.tranKey, cause)}
                onPatchComment={(comment) => handlePatchComment(item.tranKey, comment)}
              />
            ))}

            {/* Fast add row */}
            <tr style={{ borderTop: '2px dashed var(--border)' }}>
              {/* Approval dot — empty for new row */}
              <td style={addTdStyle}></td>
              {/* Autocomplete search spans Code + Description */}
              <td style={{ ...addTdStyle, minWidth: 280 }} colSpan={2}>
                <RepairItemAutoComplete
                  repairKey={repairKey}
                  onSelect={handleItemSelect}
                  inputRef={searchRef}
                />
              </td>
              {/* Cause toggles */}
              <td style={{ ...addTdStyle, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                  {(['UA', 'NW'] as CauseType[]).map(c => (
                    <button key={c} onClick={() => setAddRow(r => ({ ...r, cause: r.cause === c ? '' : c }))}
                      style={{
                        padding: '1px 5px', fontSize: 10, fontWeight: 700,
                        borderRadius: 3, cursor: 'pointer',
                        background: addRow.cause === c ? 'var(--danger)' : 'var(--neutral-50)',
                        color: addRow.cause === c ? '#fff' : 'var(--muted)',
                        border: `1px solid ${addRow.cause === c ? 'var(--danger)' : 'var(--border)'}`,
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </td>
              {/* Fix Type button group */}
              <td style={{ ...addTdStyle, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  {fixTypeButtons.map(({ label, value }) => (
                    <button key={value} onClick={() => handleFixType(value)}
                      style={{
                        padding: '1px 5px', fontSize: 10, fontWeight: 700,
                        borderRadius: 3, cursor: 'pointer',
                        background: addRow.fixType === value ? 'var(--primary)' : 'var(--neutral-50)',
                        color: addRow.fixType === value ? '#fff' : 'var(--muted)',
                        border: `1px solid ${addRow.fixType === value ? 'var(--primary)' : 'var(--border)'}`,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </td>
              {/* Approval — empty */}
              <td style={addTdStyle}></td>
              {/* Amount */}
              <td style={{ ...addTdStyle, textAlign: 'right' }}>
                <input
                  style={{
                    width: 72, height: 24, textAlign: 'right',
                    border: '1px solid var(--border)', borderRadius: 3,
                    fontSize: 11, padding: '0 4px', background: '#fff',
                    boxSizing: 'border-box' as const,
                  }}
                  type="number" min="0" step="0.01"
                  value={addRow.fixType === 'W' ? 0 : (addRow.amount || '')}
                  disabled={addRow.fixType === 'W'}
                  onChange={e => setAddRow(r => ({ ...r, amount: parseFloat(e.target.value) || 0 }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                />
              </td>
              {/* Tech — empty */}
              <td style={addTdStyle}></td>
              {/* Comment */}
              <td style={addTdStyle}>
                <input
                  style={{
                    width: '100%', height: 24,
                    border: '1px solid var(--border)', borderRadius: 3,
                    fontSize: 11, padding: '0 4px', background: '#fff',
                    boxSizing: 'border-box' as const,
                  }}
                  placeholder="Comment…"
                  maxLength={80}
                  value={addRow.comment}
                  onChange={e => setAddRow(r => ({ ...r, comment: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                />
              </td>
              {/* Add button */}
              <td style={addTdStyle}>
                <button onClick={handleAdd} disabled={saving || !addRow.selectedItem}
                  style={{
                    background: addRow.selectedItem ? 'var(--primary)' : 'var(--neutral-200)',
                    color: addRow.selectedItem ? '#fff' : 'var(--muted)',
                    border: 'none', borderRadius: 3,
                    padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  }}>
                  {saving ? '…' : '+'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals footer */}
      <div style={{
        background: 'var(--neutral-50)',
        borderTop: '1px solid var(--border)',
        padding: '7px 14px',
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 24,
      }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          Warranty: <span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(warrantyTotal)}</span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          Non-Warranty: <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{fmt(customerTotal)}</span>
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Total: {fmt(grandTotal)}</span>
      </div>

      <RepairItemPicker
        repairKey={repairKey}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onItemsAdded={onItemsChanged}
      />
    </div>
  );
};

// ── Sub-component: single row with inline cause/comment editing ──
interface RowProps {
  item: RepairLineItem;
  fmt: (n: number) => string;
  tdStyle: React.CSSProperties;
  onDelete: () => void;
  onOpenAmendments: () => void;
  onPatchCause: (cause: string) => void;
  onPatchComment: (comment: string) => void;
}

const RepairItemRow = ({ item, fmt, tdStyle, onDelete, onOpenAmendments, onPatchCause, onPatchComment }: RowProps) => {
  const [editingComment, setEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(item.comments);

  return (
    <tr style={{ cursor: 'default' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f0f6ff')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        {approvalDot(item.approved)}
      </td>
      <td style={tdStyle}>{item.itemCode}</td>
      <td style={{ ...tdStyle, fontWeight: 500 }}>{item.description}</td>
      {/* Cause — click to cycle UA → NW → blank */}
      <td style={{ ...tdStyle, textAlign: 'center', cursor: 'pointer' }}
        onClick={() => {
          const next = item.cause === '' ? 'UA' : item.cause === 'UA' ? 'NW' : '';
          onPatchCause(next);
        }}
        title="Click to change cause">
        {causeBadge(item.cause)}
      </td>
      {/* Fix Type — click to open amendments */}
      <td style={{ ...tdStyle, textAlign: 'center', cursor: 'pointer' }}
        onClick={onOpenAmendments} title="Click to amend">
        {fixBadge(item.fixType)}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        {item.approved === 'Y'
          ? <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 11 }}>✓ Approved</span>
          : <span style={{ color: 'var(--amber)', fontSize: 11 }}>Pending</span>}
      </td>
      {/* Amount — click to amend */}
      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        onClick={onOpenAmendments} title="Click to amend">
        {fmt(item.amount ?? 0)}
        {item.fixType?.toUpperCase() === 'W' && item.baseAmount > 0 && (
          <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 400 }}>
            (list: {fmt(item.baseAmount)})
          </div>
        )}
      </td>
      <td style={tdStyle}>{item.tech || '—'}</td>
      {/* Comment — click to edit inline */}
      <td style={{ ...tdStyle, color: item.comments ? '#374151' : 'var(--muted)', fontSize: 11 }}>
        {editingComment ? (
          <input
            autoFocus
            style={{ width: '100%', fontSize: 11, border: '1px solid var(--primary)', borderRadius: 2, padding: '1px 4px' }}
            maxLength={80}
            value={commentDraft}
            onChange={e => setCommentDraft(e.target.value)}
            onBlur={() => { setEditingComment(false); onPatchComment(commentDraft); }}
            onKeyDown={e => { if (e.key === 'Enter') { setEditingComment(false); onPatchComment(commentDraft); } }}
          />
        ) : (
          <span style={{ cursor: 'pointer' }} onClick={() => { setCommentDraft(item.comments); setEditingComment(true); }}
            title="Click to edit">
            {item.comments || '—'}
          </span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        <button onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: 0 }}
          title="Remove item">×</button>
      </td>
    </tr>
  );
};
