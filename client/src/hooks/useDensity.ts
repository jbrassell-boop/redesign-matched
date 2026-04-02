import { useState, useCallback, useEffect } from 'react';

export type Density = 'comfortable' | 'compact';

const STORAGE_KEY = 'tsi_density';

function getStored(): Density {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'compact') return 'compact';
  } catch { /* noop */ }
  return 'comfortable';
}

export function useDensity() {
  const [density, setDensityState] = useState<Density>(getStored);

  // Sync attribute on body
  useEffect(() => {
    if (density === 'compact') {
      document.body.setAttribute('data-density', 'compact');
    } else {
      document.body.removeAttribute('data-density');
    }
  }, [density]);

  const toggle = useCallback(() => {
    setDensityState(prev => {
      const next = prev === 'compact' ? 'comfortable' : 'compact';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* noop */ }
      return next;
    });
  }, []);

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    try { localStorage.setItem(STORAGE_KEY, d); } catch { /* noop */ }
  }, []);

  return { density, toggle, setDensity };
}
