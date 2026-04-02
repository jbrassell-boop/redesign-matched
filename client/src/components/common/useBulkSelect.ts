import { useState, useCallback, useMemo } from 'react';

export interface BulkSelectReturn<K extends string | number = number> {
  selectedKeys: Set<K>;
  isSelected: (key: K) => boolean;
  toggle: (key: K) => void;
  toggleAll: (allKeys: K[]) => void;
  clear: () => void;
  count: number;
  isAllSelected: (allKeys: K[]) => boolean;
}

export function useBulkSelect<K extends string | number = number>(): BulkSelectReturn<K> {
  const [selectedKeys, setSelectedKeys] = useState<Set<K>>(new Set());

  const isSelected = useCallback((key: K) => selectedKeys.has(key), [selectedKeys]);

  const toggle = useCallback((key: K) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback((allKeys: K[]) => {
    setSelectedKeys(prev => {
      if (prev.size === allKeys.length) return new Set();
      return new Set(allKeys);
    });
  }, []);

  const clear = useCallback(() => setSelectedKeys(new Set()), []);

  const isAllSelected = useCallback(
    (allKeys: K[]) => allKeys.length > 0 && selectedKeys.size === allKeys.length,
    [selectedKeys],
  );

  const count = useMemo(() => selectedKeys.size, [selectedKeys]);

  return { selectedKeys, isSelected, toggle, toggleAll, clear, count, isAllSelected };
}
