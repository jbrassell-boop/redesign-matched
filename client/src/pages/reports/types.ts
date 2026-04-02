export interface ReportDef {
  id: string;
  cat: string;
  name: string;
  desc: string;
  lastRun: number | null;
  extractOnly?: boolean;
}
