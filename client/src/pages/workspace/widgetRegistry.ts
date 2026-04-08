import type { ComponentType } from 'react';
import { MorningBriefing } from './widgets/MorningBriefing';
import { MyTasks } from './widgets/MyTasks';
import { MyRepairQueue } from './widgets/MyRepairQueue';
import { OverdueAtRisk } from './widgets/OverdueAtRisk';
import { OutstandingInvoices } from './widgets/OutstandingInvoices';
import { ContractsExpiring } from './widgets/ContractsExpiring';
import { AnalyticsWidget } from './widgets/AnalyticsWidget';
import { QuickLinks } from './widgets/QuickLinks';

export interface WidgetConfig {
  id: string;
  title: string;
  description: string;
  defaultSpan: 1 | 2 | 3;
  component: ComponentType;
}

export interface WidgetInstance {
  id: string;
  span: 1 | 2 | 3;
}

export interface WorkspaceLayout {
  preset: 'processor' | 'manager' | 'billing' | 'custom';
  widgets: WidgetInstance[];
}

export const WIDGET_COMPONENTS: Record<string, ComponentType> = {
  briefing: MorningBriefing,
  tasks: MyTasks,
  repairQueue: MyRepairQueue,
  overdue: OverdueAtRisk,
  invoices: OutstandingInvoices,
  contracts: ContractsExpiring,
  analytics: AnalyticsWidget,
  quickLinks: QuickLinks,
};

export const WIDGET_REGISTRY: Record<string, Omit<WidgetConfig, 'component'>> = {
  briefing:    { id: 'briefing',    title: 'Morning Briefing',     description: "Yesterday's stats at a glance",      defaultSpan: 2 },
  tasks:       { id: 'tasks',       title: 'My Tasks',             description: 'Your prioritized task list',          defaultSpan: 1 },
  repairQueue: { id: 'repairQueue', title: 'My Repair Queue',      description: 'Repairs assigned to you',             defaultSpan: 2 },
  overdue:     { id: 'overdue',     title: 'Overdue / At Risk',    description: 'Repairs past their TAT target',       defaultSpan: 1 },
  invoices:    { id: 'invoices',    title: 'Outstanding Invoices', description: 'Invoicing status and aging',          defaultSpan: 1 },
  contracts:   { id: 'contracts',   title: 'Contracts Expiring',   description: 'Contracts expiring within 60 days',   defaultSpan: 1 },
  analytics:   { id: 'analytics',   title: 'Analytics',            description: 'This month performance metrics',      defaultSpan: 2 },
  quickLinks:  { id: 'quickLinks',  title: 'Quick Links',          description: 'Fast navigation to common screens',   defaultSpan: 1 },
};

export const PRESETS: Record<string, WidgetInstance[]> = {
  processor: [
    { id: 'briefing', span: 2 }, { id: 'tasks', span: 1 },
    { id: 'repairQueue', span: 2 }, { id: 'overdue', span: 1 },
    { id: 'analytics', span: 2 }, { id: 'quickLinks', span: 1 },
  ],
  manager: [
    { id: 'briefing', span: 2 }, { id: 'overdue', span: 1 },
    { id: 'analytics', span: 2 }, { id: 'invoices', span: 1 },
    { id: 'contracts', span: 1 }, { id: 'quickLinks', span: 1 },
  ],
  billing: [
    { id: 'briefing', span: 2 }, { id: 'invoices', span: 1 },
    { id: 'analytics', span: 2 }, { id: 'contracts', span: 1 },
    { id: 'quickLinks', span: 1 },
  ],
};

const STORAGE_KEY = 'tsi_workspace_layout';

export function loadLayout(): WorkspaceLayout {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) { console.error('[widgetRegistry] loadLayout failed', err); }
  return { preset: 'processor', widgets: PRESETS.processor };
}

export function saveLayout(layout: WorkspaceLayout): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}
