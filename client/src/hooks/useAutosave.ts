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
  // Indirection so a finished save can reschedule itself without a circular ref.
  const saveRef = useRef<(data: Partial<T>) => void>(() => {});

  const save = useCallback(
    async (data: Partial<T>) => {
      if (Object.keys(data).length === 0) return;
      setStatus('saving');
      try {
        await saveFn(data);
        // Preserve edits that arrived while this save was in flight: drop only
        // the keys we just persisted, and only if they haven't changed since.
        const remaining: Partial<T> = { ...pendingRef.current };
        (Object.keys(data) as (keyof T)[]).forEach(k => {
          if (Object.is(remaining[k], data[k])) delete remaining[k];
        });
        pendingRef.current = remaining;
        setPendingChanges(remaining);

        if (Object.keys(remaining).length > 0) {
          // Flush the edits that landed during the in-flight save.
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => saveRef.current(pendingRef.current), delay);
          setStatus('idle');
        } else {
          setStatus('saved');
          // Fade out "Saved" after 2 seconds
          if (fadingRef.current) clearTimeout(fadingRef.current);
          fadingRef.current = setTimeout(() => setStatus('idle'), 2000);
        }
      } catch {
        setStatus('error');
      }
    },
    [saveFn, delay],
  );

  // Keep saveRef pointed at the latest save closure.
  useEffect(() => { saveRef.current = save; }, [save]);

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
      // Schedule save (via ref so the latest closure runs)
      timerRef.current = setTimeout(() => saveRef.current(pendingRef.current), delay);
    },
    [delay],
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
