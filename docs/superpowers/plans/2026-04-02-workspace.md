# Workspace — Personal Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a customizable personal dashboard with a widget grid, role-based presets, morning briefing widget, edit mode with widget picker, and localStorage persistence.

**Architecture:** WorkspacePage renders a toolbar (greeting, preset selector, edit button) + a 3-column CSS grid of widget components. Each widget is a self-contained component that fetches its own data. Layout state (which widgets, their order and span) stored in localStorage. Edit mode toggles visual chrome (remove buttons, widget picker drawer). Role presets provide default layouts.

**Tech Stack:** React 19, TypeScript, CSS custom properties, ASP.NET Core 8 (one new endpoint)

**Spec:** `docs/superpowers/specs/2026-04-02-workspace-design.md`

---

## File Structure

### Backend
- Modify: `server/TSI.Api/Controllers/DashboardController.cs` — add briefing endpoint (if not already added by dashboard plan)

### Frontend Types
- Create: `client/src/pages/workspace/widgetRegistry.ts` — widget definitions and preset layouts

### Frontend Components
- Create: `client/src/pages/workspace/WorkspaceToolbar.tsx` + `.css`
- Create: `client/src/pages/workspace/WidgetGrid.tsx` + `.css`
- Create: `client/src/pages/workspace/WidgetPicker.tsx` + `.css`
- Create: `client/src/pages/workspace/widgets/MorningBriefing.tsx` + `.css`
- Create: `client/src/pages/workspace/widgets/MyTasks.tsx`
- Create: `client/src/pages/workspace/widgets/MyRepairQueue.tsx`
- Create: `client/src/pages/workspace/widgets/OverdueAtRisk.tsx`
- Create: `client/src/pages/workspace/widgets/OutstandingInvoices.tsx`
- Create: `client/src/pages/workspace/widgets/ContractsExpiring.tsx`
- Create: `client/src/pages/workspace/widgets/AnalyticsWidget.tsx`
- Create: `client/src/pages/workspace/widgets/QuickLinks.tsx`
- Rewrite: `client/src/pages/workspace/WorkspacePage.tsx`

---

## Task 1: Widget Registry + Types

**Files:**
- Create: `client/src/pages/workspace/widgetRegistry.ts`

- [ ] **Step 1: Create widget registry**

```typescript
import type { ComponentType } from 'react';

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

// Lazy imports — components registered in Task 3+
// For now, define the registry structure. Components will be added as they're built.

export const WIDGET_REGISTRY: Record<string, Omit<WidgetConfig, 'component'>> = {
  briefing:       { id: 'briefing',       title: 'Morning Briefing',       description: "Yesterday's stats at a glance",        defaultSpan: 2 },
  tasks:          { id: 'tasks',          title: 'My Tasks',               description: 'Your prioritized task list',            defaultSpan: 1 },
  repairQueue:    { id: 'repairQueue',    title: 'My Repair Queue',        description: 'Repairs assigned to you',               defaultSpan: 2 },
  overdue:        { id: 'overdue',        title: 'Overdue / At Risk',      description: 'Repairs past their TAT target',         defaultSpan: 1 },
  invoices:       { id: 'invoices',       title: 'Outstanding Invoices',   description: 'Invoicing status and aging',            defaultSpan: 1 },
  contracts:      { id: 'contracts',      title: 'Contracts Expiring',     description: 'Contracts expiring within 60 days',     defaultSpan: 1 },
  analytics:      { id: 'analytics',      title: 'Analytics',              description: 'This month performance metrics',        defaultSpan: 2 },
  quickLinks:     { id: 'quickLinks',     title: 'Quick Links',            description: 'Fast navigation to common screens',     defaultSpan: 1 },
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
  } catch { /* ignore */ }
  return { preset: 'processor', widgets: PRESETS.processor };
}

export function saveLayout(layout: WorkspaceLayout): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}
```

- [ ] **Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/workspace/widgetRegistry.ts
git commit -m "feat: add workspace widget registry with presets and localStorage persistence"
```

---

## Task 2: WorkspaceToolbar + WidgetGrid + WidgetPicker

**Files:**
- Create: `client/src/pages/workspace/WorkspaceToolbar.tsx` + `.css`
- Create: `client/src/pages/workspace/WidgetGrid.tsx` + `.css`
- Create: `client/src/pages/workspace/WidgetPicker.tsx` + `.css`

- [ ] **Step 1: Build WorkspaceToolbar**

Toolbar row:
- Left: "My Workspace" (16px, 800 weight, primary-dark) + greeting ("Good morning, {name}" — muted, derived from time of day)
- Right: preset selector (dropdown: Processor/Manager/Billing/Custom) + "Edit Layout" / "Done Editing" toggle button

Props:

```typescript
interface WorkspaceToolbarProps {
  preset: string;
  editing: boolean;
  onPresetChange: (preset: string) => void;
  onToggleEdit: () => void;
}
```

CSS: flex row, `padding: 12px 16px`, `align-items: center`, `justify-content: space-between`.

Greeting logic: hour < 12 → "Good morning", hour < 17 → "Good afternoon", else → "Good evening".

- [ ] **Step 2: Build WidgetGrid**

3-column CSS grid that renders widget components based on the layout.

Props:

```typescript
interface WidgetGridProps {
  widgets: WidgetInstance[];
  editing: boolean;
  onRemoveWidget: (id: string) => void;
  widgetComponents: Record<string, ComponentType>;
}
```

Each widget renders inside a wrapper div:
- Normal mode: just the component
- Edit mode: dashed border, remove button (X) top-right, slight opacity change on hover

CSS:

```css
.widget-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  padding: 12px 16px;
  overflow-y: auto;
  flex: 1;
}

.widget-slot { min-height: 120px; }
.widget-slot--span-1 { grid-column: span 1; }
.widget-slot--span-2 { grid-column: span 2; }
.widget-slot--span-3 { grid-column: span 3; }

.widget-slot--editing {
  outline: 2px dashed var(--neutral-200);
  outline-offset: -2px;
  border-radius: var(--radius-md);
  position: relative;
}

.widget-slot__remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--danger);
  color: #fff;
  border: none;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}
```

- [ ] **Step 3: Build WidgetPicker**

Slide-in drawer from right (300px) shown only in edit mode.

Lists all widgets from `WIDGET_REGISTRY` that are NOT currently in the layout. Each shows: title + description + "Add" button.

Props:

```typescript
interface WidgetPickerProps {
  open: boolean;
  currentWidgetIds: string[];
  onAddWidget: (id: string) => void;
  onClose: () => void;
}
```

CSS: `position: fixed`, `right: 0`, `top: 64px`, `bottom: 0`, `width: 300px`, `background: var(--card)`, `border-left: 1px solid var(--neutral-200)`, `box-shadow: var(--shadow-dropdown)`, `transform: translateX(100%)` (closed) / `translateX(0)` (open), `transition: transform 0.25s ease`, `z-index: var(--z-drawer)`, `overflow-y: auto`.

- [ ] **Step 4: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/workspace/WorkspaceToolbar.* client/src/pages/workspace/WidgetGrid.* client/src/pages/workspace/WidgetPicker.*
git commit -m "feat: add WorkspaceToolbar, WidgetGrid, and WidgetPicker"
```

---

## Task 3: Widgets — MorningBriefing + AnalyticsWidget

**Files:**
- Create: `client/src/pages/workspace/widgets/MorningBriefing.tsx` + `.css`
- Create: `client/src/pages/workspace/widgets/AnalyticsWidget.tsx`

- [ ] **Step 1: Build MorningBriefing**

Dark navy header (#1B3A5C, white text): "Morning Briefing — Yesterday" + formatted date.

Body: 6 stat boxes in flex row. Each: large number (20px, 800 weight) + uppercase label (9px, muted).

| Stat | Color | Source field |
|------|-------|-------------|
| Received | navy | briefing.received |
| Shipped | green | briefing.shipped |
| Approved | blue | briefing.approved |
| Revenue | green | briefing.revenue (format as $XX.XK) |
| Avg TAT | amber | briefing.avgTat (format as X.Xd) |
| Overdue | red | briefing.overdue |

Fetches from `GET /dashboard/briefing`. Shows Skeleton while loading.

CSS: card with navy header, white body, flex row of stat boxes.

- [ ] **Step 2: Build AnalyticsWidget**

Header: muted, "Analytics — This Month".

Body: 4 large stat boxes in flex row:
- Total Repairs (navy)
- Revenue (green, currency)
- Avg TAT (blue, days)
- Avg Margin (green, percentage)

Fetches from `GET /dashboard/analytics` (existing endpoint).

- [ ] **Step 3: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/workspace/widgets/
git commit -m "feat: add MorningBriefing and AnalyticsWidget"
```

---

## Task 4: Widgets — MyTasks + MyRepairQueue + OverdueAtRisk

**Files:**
- Create: `client/src/pages/workspace/widgets/MyTasks.tsx`
- Create: `client/src/pages/workspace/widgets/MyRepairQueue.tsx`
- Create: `client/src/pages/workspace/widgets/OverdueAtRisk.tsx`

- [ ] **Step 1: Build MyTasks**

Header: muted with badge count.

Body: Task list. Each row: priority dot (6px circle — red for high, amber for medium, blue for normal, gray for low) + task description text.

Fetches from `GET /dashboard/tasks` (existing endpoint). Limit to first 8 items.

- [ ] **Step 2: Build MyRepairQueue**

Header: muted with badge counts ("X needs attention" amber, "X assigned" blue).

Body: Compact table using shared DataTable or a simple `<table>`:
- WO# (clickable → `/repairs/:key`, blue, bold)
- Client
- Scope (model)
- TAT (color-coded)
- Status (StatusBadge)
- Next Action (text, derived from status — see spec for mapping)

Urgent rows get red left border.

Fetches from `GET /dashboard/repairs` (existing). Limit to first 10 items. Future: filter by `assignedTo=me` when user model exists.

Next Action mapping:
```typescript
const NEXT_ACTION: Record<string, string> = {
  'Received': 'Print D&I',
  'D&I': 'Build estimate',
  'Pending QC': 'Build estimate',
  'Pending Approval': 'Follow up',
  'Approved': 'Assign tech',
  'In Repair': 'Awaiting completion',
  'QC Complete': 'Ship',
  'Pending Ship': 'Ship',
  'Shipped': 'Invoice',
};
```

- [ ] **Step 3: Build OverdueAtRisk**

Header: red background (#FEE2E2), red text (#991B1B), warning icon.

Body: Mini list. Each row: WO# (clickable, blue) + TAT days (red if >14, amber if >10).

Fetches from `GET /dashboard/repairs?statusFilter=all` then filters client-side to `daysIn > 10`. Shows top 5 sorted by daysIn descending.

- [ ] **Step 4: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/workspace/widgets/
git commit -m "feat: add MyTasks, MyRepairQueue, OverdueAtRisk widgets"
```

---

## Task 5: Widgets — OutstandingInvoices + ContractsExpiring + QuickLinks

**Files:**
- Create: `client/src/pages/workspace/widgets/OutstandingInvoices.tsx`
- Create: `client/src/pages/workspace/widgets/ContractsExpiring.tsx`
- Create: `client/src/pages/workspace/widgets/QuickLinks.tsx`

- [ ] **Step 1: Build OutstandingInvoices**

Header: muted.

Body: 4 stat rows, each a flex row with label (left) + value (right, bold):
- Total Outstanding (navy, currency)
- Past Due 30+ (red, currency)
- Past Due 60+ (red, bold, currency)
- Invoiced This Month (green, currency)

Fetches from `GET /dashboard/invoices?segment=summary` (existing). If endpoint returns individual invoices, aggregate client-side.

- [ ] **Step 2: Build ContractsExpiring**

Header: muted.

Body: Mini table rows: Client name + Expires date + Days badge.

Days badge colors: red if <30, amber if <60, muted otherwise.

Fetches from existing contracts endpoint or creates mock data for v1. Check if `GET /contracts/expiring` exists — if not, use `GET /dashboard/contracts` or similar.

- [ ] **Step 3: Build QuickLinks**

Header: muted.

Body: 2x2 CSS grid of colored buttons:
- New Repair (blue: bg #E8F0FE, border #BFDBFE, text #2E75B6) → triggers new repair flow
- Inventory (green: bg #F0FDF4, border #BBF7D0, text #166534) → navigate `/inventory`
- Reports (purple: bg #F5F3FF, border #C4B5FD, text #7C3AED) → navigate `/reports`
- Clients (amber: bg #FEF3C7, border #FDE68A, text #92400E) → navigate `/clients`

Uses `useNavigate()` for routing.

- [ ] **Step 4: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/workspace/widgets/
git commit -m "feat: add OutstandingInvoices, ContractsExpiring, QuickLinks widgets"
```

---

## Task 6: WorkspacePage Rewrite — Orchestrator

**Files:**
- Rewrite: `client/src/pages/workspace/WorkspacePage.tsx`
- Modify: `client/src/pages/workspace/widgetRegistry.ts` — add component references

- [ ] **Step 1: Register widget components in registry**

Update `widgetRegistry.ts` to export a map of widget ID → React component:

```typescript
import { MorningBriefing } from './widgets/MorningBriefing';
import { MyTasks } from './widgets/MyTasks';
import { MyRepairQueue } from './widgets/MyRepairQueue';
import { OverdueAtRisk } from './widgets/OverdueAtRisk';
import { OutstandingInvoices } from './widgets/OutstandingInvoices';
import { ContractsExpiring } from './widgets/ContractsExpiring';
import { AnalyticsWidget } from './widgets/AnalyticsWidget';
import { QuickLinks } from './widgets/QuickLinks';

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
```

- [ ] **Step 2: Rewrite WorkspacePage**

```typescript
const WorkspacePage = () => {
  const [layout, setLayout] = useState<WorkspaceLayout>(loadLayout);
  const [editing, setEditing] = useState(false);

  const handlePresetChange = (preset: string) => {
    const widgets = PRESETS[preset] ?? layout.widgets;
    const newLayout = { preset, widgets };
    setLayout(newLayout);
    saveLayout(newLayout);
  };

  const handleRemoveWidget = (id: string) => {
    const newLayout = {
      preset: 'custom' as const,
      widgets: layout.widgets.filter(w => w.id !== id),
    };
    setLayout(newLayout);
    saveLayout(newLayout);
  };

  const handleAddWidget = (id: string) => {
    const def = WIDGET_REGISTRY[id];
    if (!def) return;
    const newLayout = {
      preset: 'custom' as const,
      widgets: [...layout.widgets, { id, span: def.defaultSpan }],
    };
    setLayout(newLayout);
    saveLayout(newLayout);
  };

  const handleToggleEdit = () => setEditing(e => !e);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <WorkspaceToolbar
        preset={layout.preset}
        editing={editing}
        onPresetChange={handlePresetChange}
        onToggleEdit={handleToggleEdit}
      />
      <WidgetGrid
        widgets={layout.widgets}
        editing={editing}
        onRemoveWidget={handleRemoveWidget}
        widgetComponents={WIDGET_COMPONENTS}
      />
      <WidgetPicker
        open={editing}
        currentWidgetIds={layout.widgets.map(w => w.id)}
        onAddWidget={handleAddWidget}
        onClose={() => setEditing(false)}
      />
    </div>
  );
};
```

- [ ] **Step 3: Delete old workspace types if no longer needed**

Check `client/src/pages/workspace/types.ts` — if it only had old mock types, clean it up or remove it.

- [ ] **Step 4: Verify full build**

```bash
cd client && npx tsc --noEmit && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/workspace/
git commit -m "feat: workspace personal dashboard — widget grid with presets and edit mode"
```
