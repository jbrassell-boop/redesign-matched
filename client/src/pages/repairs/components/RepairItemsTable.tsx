import React, { useState, useRef, useCallback, useEffect } from 'react';
import { message } from 'antd';
import type { RepairLineItem, RepairCatalogItem } from '../types';
import { addRepairLineItem, deleteRepairLineItem, patchLineItemCauseComments, bulkApproveLineItems } from '../../../api/repairs';
import { RepairItemAutoComplete } from './RepairItemAutoComplete';
import { RepairItemPicker } from './RepairItemPicker';
import './RepairItemsTable.css';

// styles moved to RepairItemsTable.css

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

const CAUSE_TITLES: Record<string, string> = {
  UA: 'User Abuse',
  NW: 'Normal Wear',
};

const causeBadge = (cause: string) => {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    UA: { bg: 'var(--danger-light)', color: 'var(--danger)', border: 'var(--badge-red-border)' },
    NW: { bg: 'var(--badge-orange-bg-lt)', color: 'var(--badge-orange-text-dk)', border: 'var(--badge-orange-border-lt)' },
  };
  const s = styles[cause?.toUpperCase()] ?? { bg: 'var(--neutral-50)', color: 'var(--muted)', border: 'var(--border)' };
  return (
    <span title={CAUSE_TITLES[cause?.toUpperCase()] ?? undefined} style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 10,
      fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {cause || '—'}
    </span>
  );
};

const FIX_TITLES: Record<string, string> = {
  R: 'Repair',
  W: 'Warranty',
  N: 'New',
  C: 'Consumable',
  A: 'Accessory',
};

const fixBadge = (fix: string) => {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    W:  { bg: 'var(--success-light)', color: 'var(--success)', border: 'var(--success-border)' },
    N:  { bg: 'var(--danger-light)', color: 'var(--danger)',  border: 'var(--badge-red-border)' },
    R:  { bg: 'var(--badge-orange-bg-lt)', color: 'var(--badge-orange-text-dk)',        border: 'var(--badge-orange-border-lt)' },
    C:  { bg: 'var(--info-bg)', color: 'var(--primary)', border: 'var(--badge-blue-border)' },
    A:  { bg: 'var(--purple-light)', color: 'var(--purple)',        border: 'var(--badge-purple-border-lt)' },
  };
  const s = styles[fix?.toUpperCase()] ?? { bg: 'var(--neutral-50)', color: 'var(--muted)', border: 'var(--border)' };
  return (
    <span title={FIX_TITLES[fix?.toUpperCase()] ?? undefined} style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 10,
      fontSize: 11, fontWeight: 700,
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

  // Undo-delete state: track items pending deletion
  const [pendingDeleteKeys, setPendingDeleteKeys] = useState<Set<number>>(new Set());
  const pendingDeletes = useRef<Map<number, { timeout: ReturnType<typeof setTimeout>; item: RepairLineItem }>>(new Map());

  // Clean up pending timeouts on unmount
  useEffect(() => {
    const pending = pendingDeletes.current;
    return () => {
      pending.forEach(({ timeout }) => clearTimeout(timeout));
    };
  }, []);

  // Filter out items that are pending deletion
  const visibleItems = items.filter(i => !pendingDeleteKeys.has(i.tranKey));

  const warrantyTotal = visibleItems
    .filter(i => i.fixType?.toUpperCase() === 'W')
    .reduce((sum, i) => sum + (i.baseAmount ?? i.amount ?? 0), 0);
  const customerTotal = visibleItems
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

  const undoDelete = useCallback((tranKey: number) => {
    const pending = pendingDeletes.current.get(tranKey);
    if (pending) {
      clearTimeout(pending.timeout);
      pendingDeletes.current.delete(tranKey);
    }
    setPendingDeleteKeys(prev => {
      const next = new Set(prev);
      next.delete(tranKey);
      return next;
    });
    message.destroy(`delete-${tranKey}`);
    message.info('Item restored');
  }, []);

  const handleDelete = useCallback((item: RepairLineItem) => {
    // Optimistically hide the item
    setPendingDeleteKeys(prev => new Set(prev).add(item.tranKey));

    // Set a 5-second timeout to actually call the delete API
    const timeout = setTimeout(async () => {
      pendingDeletes.current.delete(item.tranKey);
      try {
        await deleteRepairLineItem(repairKey, item.tranKey);
        onItemsChanged();
      } catch {
        // Restore on failure
        setPendingDeleteKeys(prev => {
          const next = new Set(prev);
          next.delete(item.tranKey);
          return next;
        });
        message.error('Failed to delete item');
      }
    }, 5000);

    pendingDeletes.current.set(item.tranKey, { timeout, item });

    const tranKey = item.tranKey;
    message.success({
      content: React.createElement('span', null,
        'Item removed. ',
        React.createElement('a', {
          onClick: () => undoDelete(tranKey),
          style: { fontWeight: 600 },
        }, 'Undo'),
      ),
      duration: 5,
      key: `delete-${tranKey}`,
    });
  }, [repairKey, onItemsChanged, undoDelete]);

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

  // cell styles moved to RepairItemsTable.css (.rit-th, .rit-td, .rit-add-td)

  const fixTypeButtons: { label: string; value: FixType; title: string }[] = [
    { label: 'R', value: 'R', title: 'Repair' },
    { label: 'W', value: 'W', title: 'Warranty' },
    { label: 'N', value: 'N', title: 'New' },
    { label: 'C', value: 'C', title: 'Consumable' },
    { label: 'A', value: 'A', title: 'Accessory' },
  ];

  return (
    <div className="rit-container">
      {/* Section head */}
      <div className="rit-section-head">
        <div className="rit-head-flex">
          <span className="rit-title">Repair Items</span>
          <button onClick={() => setPickerOpen(true)} className="rit-add-btn">+ Add Items</button>
        </div>
        <div className="rit-tool-flex">
          <span className="rit-count-text">
            {visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''} ·{' '}
            <span className="rit-count-warranty">{fmt(warrantyTotal)} warranty</span> ·{' '}
            <span className="rit-count-customer">{fmt(customerTotal)} customer</span>
          </span>
          {visibleItems.length > 0 && (
            <>
              <button
                onClick={async () => {
                  try { await bulkApproveLineItems(repairKey, 'Y'); onItemsChanged(); }
                  catch { message.error('Failed to approve'); }
                }}
                className="rit-tool-btn"
              >
                Approve All
              </button>
              <button
                onClick={async () => {
                  try { await bulkApproveLineItems(repairKey, ''); onItemsChanged(); }
                  catch { message.error('Failed to unapprove'); }
                }}
                className="rit-tool-btn"
              >
                Unapprove All
              </button>
            </>
          )}
          {hasAmendments && (
            <button onClick={() => onOpenAmendments()} className="rit-tool-btn">
              Amendments
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rit-overflow">
        <table className="rit-table">
          <thead>
            <tr>
              <th className="rit-th" style={{ width: 28, textAlign: 'center' }}></th>
              <th className="rit-th" style={{ minWidth: 72 }}>Code</th>
              <th className="rit-th" style={{ minWidth: 200 }}>Repair Item</th>
              <th className="rit-th" style={{ minWidth: 70, textAlign: 'center' }}>Cause</th>
              <th className="rit-th" style={{ minWidth: 70, textAlign: 'center' }}>Fix Type</th>
              <th className="rit-th" style={{ minWidth: 80, textAlign: 'center' }} title="Approval Status (Y=Yes, N=No, P=Pending)">Approval</th>
              <th className="rit-th" style={{ minWidth: 80, textAlign: 'right' }}>Amount</th>
              <th className="rit-th" style={{ minWidth: 54 }}>Tech</th>
              <th className="rit-th" style={{ minWidth: 160 }}>Comments</th>
              <th className="rit-th" style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map(item => (
              <RepairItemRow
                key={item.tranKey}
                item={item}
                fmt={fmt}
                onDelete={() => handleDelete(item)}
                onOpenAmendments={() => onOpenAmendments(item.tranKey)}
                onPatchCause={(cause) => handlePatchCause(item.tranKey, cause)}
                onPatchComment={(comment) => handlePatchComment(item.tranKey, comment)}
              />
            ))}

            {/* Fast add row */}
            <tr style={{ borderTop: '2px dashed var(--border)' }}>
              {/* Approval dot — empty for new row */}
              <td className="rit-add-td"></td>
              {/* Autocomplete search spans Code + Description */}
              <td className="rit-add-td" style={{ minWidth: 280 }} colSpan={2}>
                <RepairItemAutoComplete
                  repairKey={repairKey}
                  onSelect={handleItemSelect}
                  inputRef={searchRef}
                />
              </td>
              {/* Cause toggles */}
              <td className="rit-add-td" style={{ textAlign: 'center' }}>
                <div className="rit-cause-row">
                  {(['UA', 'NW'] as CauseType[]).map(c => (
                    <button key={c} title={c === 'UA' ? 'User Abuse' : 'Normal Wear'} onClick={() => setAddRow(r => ({ ...r, cause: r.cause === c ? '' : c }))}
                      style={{
                        padding: '1px 5px', fontSize: 11, fontWeight: 700,
                        borderRadius: 3, cursor: 'pointer',
                        background: addRow.cause === c ? 'var(--danger)' : 'var(--neutral-50)',
                        color: addRow.cause === c ? 'var(--card)' : 'var(--muted)',
                        border: `1px solid ${addRow.cause === c ? 'var(--danger)' : 'var(--border)'}`,
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </td>
              {/* Fix Type button group */}
              <td className="rit-add-td" style={{ textAlign: 'center' }}>
                <div className="rit-fix-row">
                  {fixTypeButtons.map(({ label, value, title }) => (
                    <button key={value} title={title} onClick={() => handleFixType(value)}
                      style={{
                        padding: '1px 5px', fontSize: 11, fontWeight: 700,
                        borderRadius: 3, cursor: 'pointer',
                        background: addRow.fixType === value ? 'var(--primary)' : 'var(--neutral-50)',
                        color: addRow.fixType === value ? 'var(--card)' : 'var(--muted)',
                        border: `1px solid ${addRow.fixType === value ? 'var(--primary)' : 'var(--border)'}`,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </td>
              {/* Approval — empty */}
              <td className="rit-add-td"></td>
              {/* Amount */}
              <td className="rit-add-td" style={{ textAlign: 'right' }}>
                <input
                  className="rit-amount-input"
                  type="number" min="0" step="0.01"
                  value={addRow.fixType === 'W' ? 0 : (addRow.amount || '')}
                  disabled={addRow.fixType === 'W'}
                  onChange={e => setAddRow(r => ({ ...r, amount: parseFloat(e.target.value) || 0 }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                />
              </td>
              {/* Tech — empty */}
              <td className="rit-add-td"></td>
              {/* Comment */}
              <td className="rit-add-td">
                <input
                  className="rit-comment-input"
                  placeholder="Comment…"
                  aria-label="Repair item comment"
                  maxLength={80}
                  value={addRow.comment}
                  onChange={e => setAddRow(r => ({ ...r, comment: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                />
              </td>
              {/* Add button */}
              <td className="rit-add-td">
                <button onClick={handleAdd} disabled={saving || !addRow.selectedItem}
                  style={{
                    background: addRow.selectedItem ? 'var(--primary)' : 'var(--neutral-200)',
                    color: addRow.selectedItem ? 'var(--card)' : 'var(--muted)',
                    border: 'none', borderRadius: 3,
                    padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>
                  {saving ? '…' : '+'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals footer */}
      <div className="rit-footer">
        <span className="rit-footer-warranty">
          Warranty: <span className="rit-footer-warranty-val">{fmt(warrantyTotal)}</span>
        </span>
        <span className="rit-footer-nonwarranty">
          Non-Warranty: <span className="rit-footer-nonwarranty-val">{fmt(customerTotal)}</span>
        </span>
        <span className="rit-footer-total">Total: {fmt(grandTotal)}</span>
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
  onDelete: () => void;
  onOpenAmendments: () => void;
  onPatchCause: (cause: string) => void;
  onPatchComment: (comment: string) => void;
}

const RepairItemRow = ({ item, fmt, onDelete, onOpenAmendments, onPatchCause, onPatchComment }: RowProps) => {
  const [editingComment, setEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(item.comments);

  return (
    <tr className="repair-items-add-btn" style={{ cursor: 'default' }}>
      <td className="rit-td" style={{ textAlign: 'center' }}>
        {approvalDot(item.approved)}
      </td>
      <td className="rit-td">{item.itemCode}</td>
      <td className="rit-td" style={{ fontWeight: 500 }}>{item.description}</td>
      {/* Cause — click to cycle UA → NW → blank */}
      <td className="rit-td" style={{ textAlign: 'center', cursor: 'pointer' }}
        onClick={() => {
          const next = item.cause === '' ? 'UA' : item.cause === 'UA' ? 'NW' : '';
          onPatchCause(next);
        }}
        title="Click to change cause">
        {causeBadge(item.cause)}
      </td>
      {/* Fix Type — click to open amendments */}
      <td className="rit-td" style={{ textAlign: 'center', cursor: 'pointer' }}
        onClick={onOpenAmendments} title="Click to amend">
        {fixBadge(item.fixType)}
      </td>
      <td className="rit-td" style={{ textAlign: 'center' }}>
        {item.approved === 'Y'
          ? <span className="rit-approved">✓ Approved</span>
          : <span className="rit-pending">Pending</span>}
      </td>
      {/* Amount — click to amend */}
      <td className="rit-td" style={{ textAlign: 'right', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        onClick={onOpenAmendments} title="Click to amend">
        {fmt(item.amount ?? 0)}
        {item.fixType?.toUpperCase() === 'W' && item.baseAmount > 0 && (
          <div className="rit-warranty-list">
            (list: {fmt(item.baseAmount)})
          </div>
        )}
      </td>
      <td className="rit-td">{item.tech || '—'}</td>
      {/* Comment — click to edit inline */}
      <td className="rit-td" style={{ color: item.comments ? 'var(--label)' : 'var(--muted)', fontSize: 11 }}>
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
          <span style={{ cursor: 'pointer' }} onClick={() => { setCommentDraft(item.comments); setEditingComment(true); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCommentDraft(item.comments); setEditingComment(true); } }}
            title="Click to edit">
            {item.comments || '—'}
          </span>
        )}
      </td>
      <td className="rit-td" style={{ textAlign: 'center' }}>
        <button onClick={onDelete}
          className="rit-delete-btn"
          title="Remove item">×</button>
      </td>
    </tr>
  );
};
