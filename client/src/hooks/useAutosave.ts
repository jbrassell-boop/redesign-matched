import { useState, useEffect, useRef, useCallback } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutosaveReturn<T> {
  pendingChanges: Partial<T>;
  handleChange: (field: keyof T, value: unknown) => void;
  status: AutosaveStatus;
  reset: () => void;
}

export function useAutosave<T>(
  saveFn: (data: Partial<T>) => Promise<void>,
  delay: number = 1000,
): UseAutosaveReturn<T> {
  const [pendingChanges, setPendingChanges] = useState<Partial<T>>({});
  const [status, setStatus] = useState<AutosaveStatus>('idle');

  // Ref to always have the latest pending changes in the timer callback
  const pendingRef = useRef<Partial<T>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (data: Partial<T>) => {
      if (Object.keys(data).length === 0) return;
      setStatus('saving');
      try {
        await saveFn(data);
        setPendingChanges({});
        pendingRef.current = {};
        setStatus('saved');
        // Fade out "Saved" after 2 seconds
        if (fadingRef.current) clearTimeout(fadingRef.current);
        fadingRef.current = setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('error');
      }
    },
    [saveFn],
  );

  const handleChange = useCallback(
    (field: keyof T, value: unknown) => {
      setPendingChanges(prev => {
        const next = { ...prev, [field]: value };
        pendingRef.current = next;
        return next;
      });
      setStatus('idle'); // will move to saving when timer fires

      // Cancel any existing debounce timer
      if (timerRef.current) clearTimeout(timerRef.current);
      // Schedule save
      timerRef.current = setTimeout(() => {
        save(pendingRef.current);
      }, delay);
    },
    [delay, save],
  );

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadingRef.current) clearTimeout(fadingRef.current);
    setPendingChanges({});
    pendingRef.current = {};
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadingRef.current) clearTimeout(fadingRef.current);
    };
  }, []);

  return { pendingChanges, handleChange, status, reset };
}
