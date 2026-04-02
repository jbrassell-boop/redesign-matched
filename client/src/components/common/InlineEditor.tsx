import { useState, useRef, useEffect, useCallback } from 'react';

interface InlineEditorProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
}

export const InlineEditor = ({
  value,
  onSave,
  placeholder = 'Click to add note...',
  multiline = false,
  maxLength,
}: InlineEditorProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const handleSave = useCallback(async () => {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      // keep editing on failure
    } finally {
      setSaving(false);
    }
  }, [draft, value, onSave]);

  const handleCancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Enter' && multiline && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel, multiline]);

  if (editing) {
    const sharedStyle: React.CSSProperties = {
      width: '100%',
      border: '1px solid var(--primary)',
      borderRadius: 4,
      padding: '4px 8px',
      fontSize: 12,
      fontFamily: 'inherit',
      fontStyle: 'italic',
      color: 'var(--text)',
      outline: 'none',
      boxShadow: '0 0 0 3px rgba(var(--primary-rgb), 0.1)',
      background: 'var(--card)',
      opacity: saving ? 0.6 : 1,
    };

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={e => setDraft(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={saving}
          rows={3}
          style={{ ...sharedStyle, resize: 'vertical', minHeight: 60 }}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={e => setDraft(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={saving}
        style={{ ...sharedStyle, height: 28 }}
      />
    );
  }

  const hasValue = value.trim().length > 0;

  return (
    <span
      onClick={() => setEditing(true)}
      title={hasValue ? value : placeholder}
      style={{
        display: 'inline-block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
        fontStyle: 'italic',
        color: hasValue ? 'var(--danger)' : 'var(--neutral-200)',
        cursor: 'pointer',
        padding: '1px 4px',
        borderRadius: 4,
        transition: 'background 0.1s',
        maxWidth: '100%',
        fontSize: 12,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; if (hasValue) e.currentTarget.style.color = 'var(--text)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = hasValue ? 'var(--danger)' : 'var(--neutral-200)'; }}
    >
      {hasValue ? value : placeholder}
    </span>
  );
};
