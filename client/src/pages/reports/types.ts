export type ParamType =
  | 'default'
  | 'instant'
  | 'repair-list'
  | 'client-dept'
  | 'client-date'
  | 'repair-counts'
  | 'billable'
  | 'vendor'
  | 'quality-std'
  | 'po-receipts'
  | 'activity-tracking'
  | 'client-report-card'
  | 'at-risk'
  | 'trending'
  | 'leaderboard'
  | 'salesrep-month'
  | 'salesrep'
  | 'salesrep-detail'
  | 'sales';

export interface ReportDef {
  id: string;
  cat: string;
  name: string;
  desc: string;
  lastRun: number | null;
  extractOnly?: boolean;
  params?: ParamType;
}
