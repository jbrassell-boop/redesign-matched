import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard navigation for list panels in split-layout screens.
 * Arrow Up/Down moves selection, Enter opens/selects the current item.
 *
 * @param items       — the array of list items
 * @param selectedIndex — current selected index (derived from selectedKey)
 * @param onSelect    — called with the item at the new index
 */
export function useKeyboardNav<T>(
  items: T[],
  selectedIndex: number,
  onSelect: (item: T) => void,
) {
  const itemsRef = useRef(items);
  const indexRef = useRef(selectedIndex);
  const onSelectRef = useRef(onSelect);

  itemsRef.current = items;
  indexRef.current = selectedIndex;
  onSelectRef.current = onSelect;

  const handler = useCallback((e: KeyboardEvent) => {
    // Skip if user is in an editable field
    const tag = (e.target as HTMLElement)?.tagName?.toUpperCase();
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if ((e.target as HTMLElement)?.isContentEditable) return;

    const list = itemsRef.current;
    if (!list.length) return;
    const idx = indexRef.current;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = idx < list.length - 1 ? idx + 1 : idx;
      if (next !== idx) onSelectRef.current(list[next]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = idx > 0 ? idx - 1 : 0;
      if (prev !== idx) onSelectRef.current(list[prev]);
    } else if (e.key === 'Enter' && idx >= 0 && idx < list.length) {
      // Re-select current to trigger detail reload if needed
      onSelectRef.current(list[idx]);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handler]);
}
