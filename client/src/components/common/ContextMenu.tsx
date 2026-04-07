import { memo, useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export const ContextMenu = memo(function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [position, onClose]);

  if (!position) return null;

  // Adjust position if menu would overflow viewport
  const MENU_WIDTH = 180;
  const MENU_ITEM_HEIGHT = 28;
  const PADDING = 8;
  const estimatedHeight = items.length * MENU_ITEM_HEIGHT + PADDING * 2;

  const left = Math.min(position.x, window.innerWidth - MENU_WIDTH - 8);
  const top = Math.min(position.y, window.innerHeight - estimatedHeight - 8);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 9999,
        background: 'var(--card)',
        border: '1px solid var(--neutral-200)',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        minWidth: MENU_WIDTH,
        padding: `${PADDING}px 0`,
        userSelect: 'none',
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          onClick={() => {
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }}
          style={{
            padding: '5px 14px',
            fontSize: 11,
            fontFamily: 'inherit',
            cursor: item.disabled ? 'default' : 'pointer',
            color: item.disabled
              ? 'var(--muted)'
              : item.danger
              ? 'var(--danger)'
              : 'var(--text)',
            opacity: item.disabled ? 0.5 : 1,
            transition: 'background 0.08s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            if (!item.disabled)
              (e.currentTarget as HTMLDivElement).style.background = 'var(--neutral-50)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.background = 'transparent';
          }}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
});
