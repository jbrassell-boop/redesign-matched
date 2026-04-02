import { useState, useEffect, useRef } from 'react';

/**
 * Fetches badge counts for tabs. Each entry maps a tab key to an async
 * function that returns a count (number) or an array (uses .length).
 */
type CountFetcher = () => Promise<number | unknown[]>;

export function useTabBadges(
  fetchers: Record<string, CountFetcher>,
  deps: unknown[],
) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const versionRef = useRef(0);

  useEffect(() => {
    const version = ++versionRef.current;
    setCounts({});

    const entries = Object.entries(fetchers);
    if (entries.length === 0) return;

    entries.forEach(async ([key, fn]) => {
      try {
        const result = await fn();
        if (versionRef.current !== version) return;
        const count = Array.isArray(result) ? result.length : result;
        setCounts(prev => ({ ...prev, [key]: count as number }));
      } catch {
        // silently ignore — badge just won't show
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return counts;
}
