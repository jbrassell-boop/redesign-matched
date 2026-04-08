import { createContext, useContext, useState, useCallback, useMemo, createElement } from 'react';
import type { ReactNode } from 'react';

export type ServiceLocationKey = 1 | 2;

export interface ServiceLocation {
  key: ServiceLocationKey;
  label: string;
}

const LOCATIONS: ServiceLocation[] = [
  { key: 1, label: 'Upper Chichester' },
  { key: 2, label: 'Nashville' },
];

const STORAGE_KEY = 'tsi_svcLocation';

function getStored(): ServiceLocationKey {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === '2') return 2;
  } catch { /* noop */ }
  return 1;
}

interface ServiceLocationContextValue {
  locationKey: ServiceLocationKey;
  location: ServiceLocation;
  locations: ServiceLocation[];
  setLocationKey: (key: ServiceLocationKey) => void;
}

const ServiceLocationContext = createContext<ServiceLocationContextValue | null>(null);

export function ServiceLocationProvider({ children }: { children: ReactNode }) {
  const [locationKey, setLocationKeyState] = useState<ServiceLocationKey>(getStored);

  const setLocationKey = useCallback((key: ServiceLocationKey) => {
    setLocationKeyState(key);
    try { localStorage.setItem(STORAGE_KEY, String(key)); } catch { /* noop */ }
  }, []);

  const location = useMemo(
    () => LOCATIONS.find(l => l.key === locationKey)!,
    [locationKey],
  );

  const value = useMemo(
    () => ({ locationKey, location, locations: LOCATIONS, setLocationKey }),
    [locationKey, location, setLocationKey],
  );

  return createElement(ServiceLocationContext.Provider, { value }, children);
}

export function useServiceLocation() {
  const ctx = useContext(ServiceLocationContext);
  if (!ctx) throw new Error('useServiceLocation must be used within ServiceLocationProvider');
  return ctx;
}
