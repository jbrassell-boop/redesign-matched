// client/src/contexts/InspectorContext.tsx
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { FIELD_VERIFIER_API, ROUTE_TO_SCREEN, type ScreenRegistry } from '../types/fieldRegistry';

interface InspectorContextValue {
  enabled: boolean;
  toggle: () => void;
  activeScreen: string | null;       // e.g. 'Repairs'
  registry: ScreenRegistry[];        // all 11 screens, cached after first fetch
  selectedFieldId: string | null;
  setSelectedFieldId: (id: string | null) => void;
  loading: boolean;
  error: string;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function InspectorProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const [registry, setRegistry] = useState<ScreenRegistry[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchedRef = useRef(false);
  const location = useLocation();

  // Derive active screen from current route
  const activeScreen = ROUTE_TO_SCREEN[location.pathname] ?? null;

  // Reset selected field when navigating to a different screen
  useEffect(() => {
    setSelectedFieldId(null);
  }, [activeScreen]);

  // Fetch registry the first time inspect mode is enabled
  const toggle = useCallback(async () => {
    const next = !enabledRef.current;       // read from ref — never stale
    enabledRef.current = next;              // update ref immediately
    setEnabled(next);
    if (next && !fetchedRef.current) {
      fetchedRef.current = true;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${FIELD_VERIFIER_API}/registry`);
        if (!res.ok) throw new Error(`Registry fetch failed: ${res.status}`);
        const data: ScreenRegistry[] = await res.json();
        setRegistry(data);
      } catch {
        setError('Could not load field registry');
        fetchedRef.current = false; // allow retry
      } finally {
        setLoading(false);
      }
    }
  }, []);   // empty deps — reads from ref, not closure

  return (
    <InspectorContext.Provider value={{ enabled, toggle, activeScreen, registry, selectedFieldId, setSelectedFieldId, loading, error }}>
      {children}
    </InspectorContext.Provider>
  );
}

export function useInspector() {
  const ctx = useContext(InspectorContext);
  if (!ctx) throw new Error('useInspector must be used within InspectorProvider');
  return ctx;
}
