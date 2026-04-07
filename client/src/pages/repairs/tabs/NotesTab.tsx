import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { getRepairNotes, addRepairNote } from '../../../api/repairs';
import type { RepairNote } from '../../../api/repairs';

interface Props {
  repairKey: number;
}

export const NotesTab = ({ repairKey }: Props) => {
  const [notes, setNotes] = useState<RepairNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(() => {
    setLoading(true);
    getRepairNotes(repairKey)
      .then(setNotes)
      .catch(() => message.error('Failed to load notes'))
      .finally(() => setLoading(false));
  }, [repairKey]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await addRepairNote(repairKey, text.trim());
      setText('');
      loadNotes();
    } catch {
      message.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      {/* Add note bar */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-end',
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, padding: 10,
      }}>
        <textarea
          style={{
            flex: 1, minHeight: 48, border: '1px solid var(--border)', borderRadius: 4,
            padding: '6px 8px', fontSize: 12, resize: 'vertical', fontFamily: 'inherit',
          }}
          placeholder="Add a note…"
          aria-label="Add a repair note"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !text.trim()}
          style={{
            height: 32, padding: '0 16px', borderRadius: 4, border: 'none',
            background: text.trim() ? 'var(--primary)' : 'var(--neutral-200)',
            color: text.trim() ? 'var(--card)' : 'var(--muted)',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {saving ? 'Saving…' : 'Add Note'}
        </button>
      </div>

      {/* Notes list */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading && <div style={{ color: 'var(--muted)', fontSize: 12, padding: 20, textAlign: 'center' }}>Loading…</div>}
        {!loading && notes.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 12, padding: 20, textAlign: 'center' }}>
            No notes yet
          </div>
        )}
        {notes.map(n => (
          <div key={n.noteKey} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6,
            padding: '8px 12px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--navy)' }}>{n.user || 'System'}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{n.date}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--danger)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {n.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
