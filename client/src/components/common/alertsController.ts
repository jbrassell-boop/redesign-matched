import type { AlertType } from '../../hooks/useAlerts';

interface AlertInput { type: AlertType; msg: string }

function fmtMoney(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Evaluate a repair record and return contextual alerts.
 * Mirrors smart-alerts.js evaluateRepair().
 */
export function evaluateRepair(data: {
  amountApproved?: number | null;
  maxCharge?: number | null;
  hasContract?: boolean;
  isUrgent?: boolean;
  daysIn?: number;
}): AlertInput[] {
  const alerts: AlertInput[] = [];

  // Max charge exceeded
  const max = data.maxCharge ?? 0;
  const cost = data.amountApproved ?? 0;
  if (max > 0 && cost > max) {
    alerts.push({
      type: 'warning',
      msg: `Max Charge Exceeded — repair cost ${fmtMoney(cost)} exceeds ${fmtMoney(max)} cap`,
    });
  }

  // Contract coverage
  if (data.hasContract) {
    alerts.push({
      type: 'info',
      msg: 'Contract Coverage — this department is under an active service agreement',
    });
  } else {
    alerts.push({
      type: 'opportunity',
      msg: 'No Contract — this client has no active service agreement',
    });
  }

  // Hot list / urgent
  if (data.isUrgent) {
    alerts.push({
      type: 'warning',
      msg: 'Hot List — this repair is flagged as priority',
    });
  }

  // Long TAT warning
  if (data.daysIn != null && data.daysIn > 14) {
    alerts.push({
      type: 'warning',
      msg: `Extended TAT — this repair has been in-house for ${data.daysIn} days`,
    });
  }

  return alerts;
}

/**
 * Evaluate a client record and return contextual alerts.
 */
export function evaluateClient(data: {
  hasContract?: boolean;
  openRepairs?: number;
}): AlertInput[] {
  const alerts: AlertInput[] = [];

  if (!data.hasContract) {
    alerts.push({
      type: 'opportunity',
      msg: 'Growth Opportunity — client has no active service agreement',
    });
  }

  return alerts;
}
