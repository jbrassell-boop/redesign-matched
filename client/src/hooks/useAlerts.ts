import { useState, useCallback } from 'react';

export type AlertType = 'warning' | 'info' | 'opportunity';

export interface Alert {
  id: string;
  type: AlertType;
  msg: string;
}

let alertId = 0;

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const setAll = useCallback((newAlerts: Omit<Alert, 'id'>[]) => {
    setAlerts(newAlerts.map(a => ({ ...a, id: `alert-${++alertId}` })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const clear = useCallback(() => {
    setAlerts([]);
  }, []);

  return { alerts, setAll, dismiss, clear };
}
