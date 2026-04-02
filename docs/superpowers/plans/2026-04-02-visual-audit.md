# Visual Audit & Component Library — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract 10 shared components from the tsi-redesign reference, then audit and fix all 22 screens to visually match the reference — spirit match fidelity.

**Architecture:** Bottom-up approach. Build a shared component library (`client/src/components/shared/`) with one CSS file per component using CSS variables from `tokens.css`. Then systematically replace inline styles in all 22 page files with these shared components. No CSS-in-JS — plain CSS + CSS variables.

**Tech Stack:** React 19, TypeScript, Ant Design 5 (used sparingly), CSS custom properties, Vite

**Reference:** Visual spec at `C:/Projects/tsi-redesign/` — HTML pages are the design source of truth. CSS values extracted from `C:/Projects/tsi-redesign/styles.css`.

---

## Phase 1: Shared Component Library

### Task 1: Create shared component directory + StatusBadge

The simplest component — used everywhere, no dependencies.

**Files:**
- Create: `client/src/components/shared/StatusBadge.tsx`
- Create: `client/src/components/shared/StatusBadge.css`
- Create: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create StatusBadge.css**

```css
/* client/src/components/shared/StatusBadge.css */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

/* Blue: received, new, open, info, standard */
.status-badge--blue {
  background: #E8F0FE;
  color: #2E75B6;
  border: 1px solid #BFDBFE;
}

/* Green: approved, complete, active, yes, sent */
.status-badge--green {
  background: #F0FDF4;
  color: #166534;
  border: 1px solid #BBF7D0;
}

/* Amber: pending, expiring, in-progress, warning */
.status-badge--amber {
  background: #FEF3C7;
  color: #92400E;
  border: 1px solid #FDE68A;
}

/* Red: overdue, expired, hold, locked, delete, no */
.status-badge--red {
  background: #FEE2E2;
  color: #991B1B;
  border: 1px solid #FECACA;
}

/* Gray: closed, neutral, draft */
.status-badge--gray {
  background: var(--neutral-100);
  color: var(--neutral-500);
  border: 1px solid var(--neutral-200);
}

/* Purple: admin, shipped */
.status-badge--purple {
  background: #EDE9FE;
  color: #7C3AED;
  border: 1px solid #C4B5FD;
}

/* Cyan: tech, flexible, client */
.status-badge--cyan {
  background: #E0F2FE;
  color: #0369A1;
  border: 1px solid #7DD3FC;
}

/* Teal: accounting */
.status-badge--teal {
  background: #ECFDF5;
  color: #065F46;
  border: 1px solid #A7F3D0;
}

/* Orange: repair, scope */
.status-badge--orange {
  background: #FFF3E0;
  color: #E65100;
  border: 1px solid #FFCC80;
}
```

- [ ] **Step 2: Create StatusBadge.tsx**

```tsx
/* client/src/components/shared/StatusBadge.tsx */
import './StatusBadge.css';

type BadgeVariant = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'purple' | 'cyan' | 'teal' | 'orange';

const STATUS_MAP: Record<string, BadgeVariant> = {
  // Blue
  'received': 'blue', 'new': 'blue', 'open': 'blue', 'info': 'blue', 'standard': 'blue',
  // Green
  'approved': 'green', 'complete': 'green', 'completed': 'green', 'active': 'green',
  'yes': 'green', 'sent': 'green', 'shipped': 'purple',
  // Amber
  'pending': 'amber', 'pending qc': 'amber', 'pending ship': 'amber',
  'expiring': 'amber', 'in-progress': 'amber', 'in progress': 'amber', 'warning': 'amber',
  // Red
  'overdue': 'red', 'expired': 'red', 'hold': 'red', 'on hold': 'red',
  'locked': 'red', 'cancelled': 'red', 'urgent': 'red', 'no': 'red',
  // Gray
  'closed': 'gray', 'neutral': 'gray', 'draft': 'gray', 'inactive': 'gray',
  // Purple
  'admin': 'purple',
  // Cyan
  'tech': 'cyan', 'flexible': 'cyan', 'client': 'cyan',
  // Teal
  'accounting': 'teal',
  // Orange
  'repair': 'orange', 'scope': 'orange',
};

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  className?: string;
}

export const StatusBadge = ({ status, variant, className }: StatusBadgeProps) => {
  const resolved = variant ?? STATUS_MAP[status.toLowerCase()] ?? 'gray';
  return (
    <span className={`status-badge status-badge--${resolved}${className ? ` ${className}` : ''}`}>
      {status}
    </span>
  );
};
```

- [ ] **Step 3: Create barrel export**

```tsx
/* client/src/components/shared/index.ts */
export { StatusBadge } from './StatusBadge';
```

- [ ] **Step 4: Verify build compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add client/src/components/shared/
git commit -m "feat: add StatusBadge shared component"
```

---

### Task 2: Field + FormGrid components

The most repeated pattern across all detail panes — currently defined inline in every DetailPane file.

**Files:**
- Create: `client/src/components/shared/Field.tsx`
- Create: `client/src/components/shared/Field.css`
- Create: `client/src/components/shared/FormGrid.tsx`
- Create: `client/src/components/shared/FormGrid.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create Field.css**

```css
/* client/src/components/shared/Field.css */
.field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 0;
}

.field__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.3;
}

.field__value {
  font-size: 13px;
  color: var(--text);
  padding: 4px 8px;
  background: var(--neutral-50);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-sm);
  min-height: 28px;
  display: flex;
  align-items: center;
}

.field__value--empty {
  color: var(--muted);
}

.field__value--multiline {
  white-space: pre-wrap;
  padding: 6px 10px;
  align-items: flex-start;
  min-height: 48px;
}
```

- [ ] **Step 2: Create Field.tsx**

```tsx
/* client/src/components/shared/Field.tsx */
import './Field.css';

interface FieldProps {
  label: string;
  value: string | number | null | undefined;
  multiline?: boolean;
  className?: string;
}

export const Field = ({ label, value, multiline, className }: FieldProps) => (
  <div className={`field${className ? ` ${className}` : ''}`}>
    <div className="field__label">{label}</div>
    <div className={`field__value${value == null || value === '' ? ' field__value--empty' : ''}${multiline ? ' field__value--multiline' : ''}`}>
      {value ?? '\u2014'}
    </div>
  </div>
);
```

- [ ] **Step 3: Create FormGrid.css**

```css
/* client/src/components/shared/FormGrid.css */
.form-grid {
  display: grid;
  gap: 8px 12px;
}

.form-grid--2 { grid-template-columns: 1fr 1fr; }
.form-grid--3 { grid-template-columns: 1fr 1fr 1fr; }
.form-grid--4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

.form-grid .span-2 { grid-column: span 2; }
.form-grid .span-3 { grid-column: span 3; }
```

- [ ] **Step 4: Create FormGrid.tsx**

```tsx
/* client/src/components/shared/FormGrid.tsx */
import './FormGrid.css';

interface FormGridProps {
  cols?: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export const FormGrid = ({ cols = 2, children, className }: FormGridProps) => (
  <div className={`form-grid form-grid--${cols}${className ? ` ${className}` : ''}`}>
    {children}
  </div>
);
```

- [ ] **Step 5: Update barrel export**

```tsx
/* client/src/components/shared/index.ts */
export { StatusBadge } from './StatusBadge';
export { Field } from './Field';
export { FormGrid } from './FormGrid';
```

- [ ] **Step 6: Verify build**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add client/src/components/shared/
git commit -m "feat: add Field and FormGrid shared components"
```

---

### Task 3: SectionCard component

Card with uppercase muted header + white body — used in detail pane tabs.

**Files:**
- Create: `client/src/components/shared/SectionCard.tsx`
- Create: `client/src/components/shared/SectionCard.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create SectionCard.css**

```css
/* client/src/components/shared/SectionCard.css */
.section-card {
  background: var(--card);
  border: 1px solid var(--border-dk);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.section-card__head {
  background: var(--neutral-50);
  color: var(--primary);
  padding: 7px 14px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}

.section-card__body {
  padding: 10px 14px;
  background: #fff;
}
```

- [ ] **Step 2: Create SectionCard.tsx**

```tsx
/* client/src/components/shared/SectionCard.tsx */
import './SectionCard.css';

interface SectionCardProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard = ({ title, actions, children, className }: SectionCardProps) => (
  <div className={`section-card${className ? ` ${className}` : ''}`}>
    <div className="section-card__head">
      <span>{title}</span>
      {actions}
    </div>
    <div className="section-card__body">{children}</div>
  </div>
);
```

- [ ] **Step 3: Update barrel export**

Add to `client/src/components/shared/index.ts`:
```tsx
export { SectionCard } from './SectionCard';
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/shared/
git commit -m "feat: add SectionCard shared component"
```

---

### Task 4: StatChip + StatStrip components

Replaces the dashboard-local `StatStrip.tsx` with a reusable version.

**Files:**
- Create: `client/src/components/shared/StatStrip.tsx`
- Create: `client/src/components/shared/StatStrip.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create StatStrip.css**

```css
/* client/src/components/shared/StatStrip.css */
.stat-strip {
  display: flex;
  align-items: stretch;
  background: var(--card);
  border-bottom: 1px solid var(--neutral-200);
  flex-shrink: 0;
  overflow-x: auto;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-right: 1px solid var(--neutral-200);
  min-width: 0;
  cursor: pointer;
  transition: background 150ms ease;
  flex: 1;
}

.stat-chip:last-child {
  border-right: none;
}

.stat-chip:hover {
  background: var(--neutral-50);
}

.stat-chip--active {
  background: var(--primary-light);
  outline: 2.5px solid var(--navy);
  outline-offset: -2.5px;
}

.stat-chip--active:hover {
  background: var(--primary-light);
}

.stat-chip__icon {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
}

.stat-chip__icon-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.stat-chip__value {
  font-size: 16px;
  font-weight: 800;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-chip__label {
  font-size: 12px;
  color: var(--neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/* Icon background variants */
.stat-chip__icon--navy    { background: #E8F0FE; }
.stat-chip__icon--blue    { background: #EFF6FF; }
.stat-chip__icon--green   { background: #F0FDF4; }
.stat-chip__icon--red     { background: #FEF2F2; }
.stat-chip__icon--amber   { background: #FFFBEB; }
.stat-chip__icon--purple  { background: #F5F3FF; }
.stat-chip__icon--muted   { background: var(--neutral-100); }

/* Icon dot + value color variants */
.stat-chip__dot--navy     { background: var(--primary); }
.stat-chip__dot--blue     { background: var(--primary); }
.stat-chip__dot--green    { background: var(--success); }
.stat-chip__dot--red      { background: var(--danger); }
.stat-chip__dot--amber    { background: var(--amber); }
.stat-chip__dot--purple   { background: #7C3AED; }
.stat-chip__dot--muted    { background: var(--neutral-500); }

.stat-chip__val--navy     { color: var(--primary); }
.stat-chip__val--blue     { color: var(--primary); }
.stat-chip__val--green    { color: var(--success); }
.stat-chip__val--red      { color: var(--danger); }
.stat-chip__val--amber    { color: var(--amber); }
.stat-chip__val--purple   { color: #7C3AED; }
.stat-chip__val--muted    { color: var(--neutral-500); }
```

- [ ] **Step 2: Create StatStrip.tsx**

```tsx
/* client/src/components/shared/StatStrip.tsx */
import { Skeleton } from 'antd';
import './StatStrip.css';

export type ChipColor = 'navy' | 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'muted';

export interface StatChipDef {
  id: string;
  label: string;
  value: number | null;
  color: ChipColor;
}

interface StatStripProps {
  chips: StatChipDef[];
  loading?: boolean;
  activeChip?: string;
  onChipClick?: (id: string) => void;
}

export const StatStrip = ({ chips, loading, activeChip, onChipClick }: StatStripProps) => (
  <div className="stat-strip">
    {chips.map(chip => {
      const isActive = chip.id === activeChip;
      return (
        <div
          key={chip.id}
          className={`stat-chip${isActive ? ' stat-chip--active' : ''}`}
          onClick={() => onChipClick?.(isActive ? 'all' : chip.id)}
        >
          <div className={`stat-chip__icon stat-chip__icon--${chip.color}`}>
            <div className={`stat-chip__icon-dot stat-chip__dot--${chip.color}`} />
          </div>
          <div>
            {loading ? (
              <Skeleton.Input size="small" active style={{ width: 40, height: 16 }} />
            ) : (
              <div className={`stat-chip__value stat-chip__val--${chip.color}`}>
                {chip.value != null ? chip.value.toLocaleString() : '\u2014'}
              </div>
            )}
            <div className="stat-chip__label">{chip.label}</div>
          </div>
        </div>
      );
    })}
  </div>
);
```

- [ ] **Step 3: Update barrel export**

Add to `client/src/components/shared/index.ts`:
```tsx
export { StatStrip } from './StatStrip';
export type { StatChipDef, ChipColor } from './StatStrip';
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/shared/
git commit -m "feat: add StatStrip shared component"
```

---

### Task 5: TabBar component

Custom tab bar matching the reference — replaces Ant Design Tabs throughout.

**Files:**
- Create: `client/src/components/shared/TabBar.tsx`
- Create: `client/src/components/shared/TabBar.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create TabBar.css**

```css
/* client/src/components/shared/TabBar.css */
.tab-bar {
  display: flex;
  padding: 0 14px;
  background: var(--card);
  border-bottom: 1px solid var(--neutral-200);
  flex-shrink: 0;
  overflow-x: auto;
}

.tab-bar__item {
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 500;
  color: var(--neutral-500);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 150ms ease;
  user-select: none;
  white-space: nowrap;
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
  font-family: inherit;
}

.tab-bar__item:hover {
  color: var(--primary);
}

.tab-bar__item--active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  font-weight: 600;
}
```

- [ ] **Step 2: Create TabBar.tsx**

```tsx
/* client/src/components/shared/TabBar.tsx */
import './TabBar.css';

export interface TabDef {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: TabDef[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export const TabBar = ({ tabs, activeKey, onChange, className }: TabBarProps) => (
  <div className={`tab-bar${className ? ` ${className}` : ''}`}>
    {tabs.map(tab => (
      <button
        key={tab.key}
        className={`tab-bar__item${tab.key === activeKey ? ' tab-bar__item--active' : ''}`}
        onClick={() => onChange(tab.key)}
        type="button"
      >
        {tab.label}
      </button>
    ))}
  </div>
);
```

- [ ] **Step 3: Update barrel export**

Add to `client/src/components/shared/index.ts`:
```tsx
export { TabBar } from './TabBar';
export type { TabDef } from './TabBar';
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/shared/
git commit -m "feat: add TabBar shared component"
```

---

### Task 6: DetailHeader component

Title + subtitle + status badge + action buttons — top of every detail pane.

**Files:**
- Create: `client/src/components/shared/DetailHeader.tsx`
- Create: `client/src/components/shared/DetailHeader.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create DetailHeader.css**

```css
/* client/src/components/shared/DetailHeader.css */
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--neutral-200);
  background: var(--card);
  flex-shrink: 0;
}

.detail-header__title {
  font-size: 16px;
  font-weight: 800;
  color: var(--primary-dark);
}

.detail-header__subtitle {
  font-size: 13px;
  color: var(--muted);
}

.detail-header__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-header__meta {
  font-size: 12px;
  color: var(--muted);
}
```

- [ ] **Step 2: Create DetailHeader.tsx**

```tsx
/* client/src/components/shared/DetailHeader.tsx */
import './DetailHeader.css';

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

export const DetailHeader = ({ title, subtitle, badges, actions, meta }: DetailHeaderProps) => (
  <div className="detail-header">
    <span className="detail-header__title">{title}</span>
    {subtitle && <span className="detail-header__subtitle">{subtitle}</span>}
    {badges}
    {meta && <span className="detail-header__meta">{meta}</span>}
    {actions && <div className="detail-header__actions">{actions}</div>}
  </div>
);
```

- [ ] **Step 3: Update barrel export**

Add to `client/src/components/shared/index.ts`:
```tsx
export { DetailHeader } from './DetailHeader';
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/shared/
git commit -m "feat: add DetailHeader shared component"
```

---

### Task 7: SplitLayout component

Left list panel (280px, collapsible) + right detail pane. Used by 16 screens.

**Files:**
- Create: `client/src/components/shared/SplitLayout.tsx`
- Create: `client/src/components/shared/SplitLayout.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create SplitLayout.css**

```css
/* client/src/components/shared/SplitLayout.css */
.split-layout {
  display: flex;
  height: calc(100vh - 64px);
  overflow: hidden;
}

.split-layout__left {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--neutral-200);
  background: var(--card);
  overflow: hidden;
  transition: width 200ms ease;
}

.split-layout__left--collapsed {
  width: 0;
  border-right: none;
}

.split-layout__right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  min-width: 0;
}

.split-layout__collapse-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 48px;
  background: var(--primary-dark);
  color: #fff;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  z-index: 10;
  transition: background 150ms ease;
}

.split-layout__collapse-btn:hover {
  background: var(--primary);
}
```

- [ ] **Step 2: Create SplitLayout.tsx**

```tsx
/* client/src/components/shared/SplitLayout.tsx */
import { useState } from 'react';
import './SplitLayout.css';

interface SplitLayoutProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: number;
}

export const SplitLayout = ({ left, right, leftWidth = 280 }: SplitLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="split-layout">
      <div
        className={`split-layout__left${collapsed ? ' split-layout__left--collapsed' : ''}`}
        style={!collapsed ? { width: leftWidth } : undefined}
      >
        {left}
      </div>
      <div className="split-layout__right" style={{ position: 'relative' }}>
        {collapsed && (
          <button
            className="split-layout__collapse-btn"
            onClick={() => setCollapsed(false)}
            title="Expand panel"
          >
            ▶
          </button>
        )}
        {right}
      </div>
    </div>
  );
};
```

Note: Individual pages currently manage their own collapse state. This component provides a base — pages can pass `collapsed`/`onCollapse` as props if they need external control. For now this keeps it simple with internal state.

- [ ] **Step 3: Update barrel export**

Add to `client/src/components/shared/index.ts`:
```tsx
export { SplitLayout } from './SplitLayout';
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/shared/
git commit -m "feat: add SplitLayout shared component"
```

---

### Task 8: DataTable wrapper component

Ant Table wrapper with reference-matching header styles.

**Files:**
- Create: `client/src/components/shared/DataTable.tsx`
- Create: `client/src/components/shared/DataTable.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create DataTable.css**

```css
/* client/src/components/shared/DataTable.css */
.data-table-wrap {
  background: var(--card);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
}

.data-table-wrap .ant-table-thead > tr > th {
  background: var(--neutral-50) !important;
  color: var(--neutral-500) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 10px 12px !important;
  border-bottom: 1px solid var(--neutral-200) !important;
}

.data-table-wrap .ant-table-tbody > tr > td {
  padding: 10px 12px !important;
  font-size: 13px !important;
  border-bottom: 1px solid var(--neutral-200) !important;
  color: var(--neutral-900);
}

.data-table-wrap .ant-table-tbody > tr:nth-child(even) > td {
  background: var(--neutral-50);
}

.data-table-wrap .ant-table-tbody > tr:hover > td {
  background: var(--primary-light) !important;
  cursor: pointer;
}

.data-table-wrap .ant-table-cell-fix-left,
.data-table-wrap .ant-table-cell-fix-right {
  z-index: 3;
}
```

- [ ] **Step 2: Create DataTable.tsx**

```tsx
/* client/src/components/shared/DataTable.tsx */
import { Table } from 'antd';
import type { TableProps } from 'antd';
import './DataTable.css';

interface DataTableProps<T> extends TableProps<T> {
  className?: string;
}

export function DataTable<T extends object>(props: DataTableProps<T>) {
  const { className, ...rest } = props;
  return (
    <div className={`data-table-wrap${className ? ` ${className}` : ''}`}>
      <Table<T> size="small" pagination={false} {...rest} />
    </div>
  );
}
```

- [ ] **Step 3: Update barrel export**

Add to `client/src/components/shared/index.ts`:
```tsx
export { DataTable } from './DataTable';
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/shared/
git commit -m "feat: add DataTable shared component"
```

---

### Task 9: ModalShell component

Ant Modal/Drawer wrapper matching the reference header/body/footer pattern.

**Files:**
- Create: `client/src/components/shared/ModalShell.tsx`
- Create: `client/src/components/shared/ModalShell.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create ModalShell.css**

```css
/* client/src/components/shared/ModalShell.css */
.modal-shell .ant-modal-content {
  padding: 0;
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.modal-shell .ant-modal-header {
  background: var(--primary);
  padding: 14px 20px;
  margin: 0;
  border-radius: 0;
}

.modal-shell .ant-modal-title {
  color: #fff !important;
  font-size: 15px;
  font-weight: 600;
}

.modal-shell .ant-modal-close {
  color: rgba(255, 255, 255, 0.8);
  top: 14px;
  right: 16px;
}

.modal-shell .ant-modal-close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

.modal-shell .ant-modal-body {
  padding: 16px 20px;
}

.modal-shell .ant-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--neutral-200);
}

/* Danger variant */
.modal-shell--danger .ant-modal-header {
  background: var(--danger);
}
```

- [ ] **Step 2: Create ModalShell.tsx**

```tsx
/* client/src/components/shared/ModalShell.tsx */
import { Modal } from 'antd';
import type { ModalProps } from 'antd';
import './ModalShell.css';

interface ModalShellProps extends ModalProps {
  variant?: 'primary' | 'danger';
}

export const ModalShell = ({ variant = 'primary', className, ...rest }: ModalShellProps) => (
  <Modal
    className={`modal-shell${variant === 'danger' ? ' modal-shell--danger' : ''}${className ? ` ${className}` : ''}`}
    centered
    {...rest}
  />
);
```

- [ ] **Step 3: Update barrel export**

Add to `client/src/components/shared/index.ts`:
```tsx
export { ModalShell } from './ModalShell';
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/shared/
git commit -m "feat: add ModalShell shared component"
```

---

### Task 10: Phase 1 verification — build check + final barrel export

**Files:**
- Verify: `client/src/components/shared/index.ts` has all 10 exports

- [ ] **Step 1: Verify final barrel export**

`client/src/components/shared/index.ts` should contain:
```tsx
export { StatusBadge } from './StatusBadge';
export { Field } from './Field';
export { FormGrid } from './FormGrid';
export { SectionCard } from './SectionCard';
export { StatStrip } from './StatStrip';
export type { StatChipDef, ChipColor } from './StatStrip';
export { TabBar } from './TabBar';
export type { TabDef } from './TabBar';
export { DetailHeader } from './DetailHeader';
export { SplitLayout } from './SplitLayout';
export { DataTable } from './DataTable';
export { ModalShell } from './ModalShell';
```

- [ ] **Step 2: Full build check**

Run: `cd client && npx tsc --noEmit && npx vite build`
Expected: No errors. All components compile and tree-shake correctly.

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add client/src/components/shared/
git commit -m "feat: complete shared component library — 10 components"
```

---

## Phase 2: Screen-by-Screen Audit

### Task 11: Audit — Repairs (pilot screen)

The most complex screen. Validates all component patterns. Replace inline styles with shared components.

**Files:**
- Modify: `client/src/pages/repairs/RepairDetailPane.tsx`
- Modify: `client/src/pages/repairs/RepairsPage.tsx`
- Reference: `C:/Projects/tsi-redesign/repairs.html`

- [ ] **Step 1: Read reference and current files**

Read these files to understand gaps:
- `C:/Projects/tsi-redesign/repairs.html` — the visual target
- `client/src/pages/repairs/RepairDetailPane.tsx` — current implementation
- `client/src/pages/repairs/RepairsPage.tsx` — current container

- [ ] **Step 2: Refactor RepairDetailPane.tsx**

Replace the inline `Field` component with the shared one. Replace inline status badge styles with `StatusBadge`. Replace the inline grid with `FormGrid`. Replace Ant `Tabs` with `TabBar`. Add `DetailHeader` for the WO number + status row.

Key changes:
- Remove local `Field` definition — import from `../../components/shared`
- Remove `STATUS_COLORS` object — use `<StatusBadge status={detail.status} />`
- Replace `display: 'grid', gridTemplateColumns: '1fr 1fr'` with `<FormGrid cols={2}>`
- Replace Ant `<Tabs>` with `<TabBar>` + conditional content rendering
- Replace the header row div with `<DetailHeader>`
- Remove all inline `style={{}}` that match component CSS

- [ ] **Step 3: Verify repairs page renders correctly**

Run dev server: `cd client && npm run dev`
Navigate to `/repairs`, select a repair, verify:
- Fields display with correct label styling (12px, uppercase, muted, 600 weight)
- Status badges show correct colors
- Tab bar has 2px bottom border on active tab
- Grid layout is 2-column with 12px gap
- No visual regressions from the inline-style version

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/repairs/
git commit -m "refactor: repairs screen — swap inline styles for shared components"
```

---

### Task 12: Audit — Dashboard (pilot screen)

Validates StatStrip + DataTable + TabBar.

**Files:**
- Modify: `client/src/pages/dashboard/DashboardPage.tsx`
- Modify: `client/src/pages/dashboard/StatStrip.tsx` (or delete and use shared)
- Modify: `client/src/pages/dashboard/RepairTable.tsx`
- Reference: `C:/Projects/tsi-redesign/dashboard.html`

- [ ] **Step 1: Read reference and current files**

Read:
- `C:/Projects/tsi-redesign/dashboard.html`
- `client/src/pages/dashboard/DashboardPage.tsx`
- `client/src/pages/dashboard/StatStrip.tsx`
- `client/src/pages/dashboard/RepairTable.tsx`

- [ ] **Step 2: Replace local StatStrip with shared component**

In `DashboardPage.tsx`:
- Import `StatStrip` and `StatChipDef` from `../../components/shared`
- Remove import of local `./StatStrip`
- Convert the stats data into `StatChipDef[]` format
- Pass chips array to shared `<StatStrip>`

The local `StatStrip.tsx` can be deleted once the shared one is wired in.

- [ ] **Step 3: Replace Ant Tabs with shared TabBar**

In `DashboardPage.tsx`:
- Import `TabBar` from `../../components/shared`
- Replace the Ant `<Tabs>` block with `<TabBar tabs={TAB_ITEMS} activeKey={activeTab} onChange={setActiveTab} />`
- Keep the `renderTabContent()` switch — it renders below the tab bar

- [ ] **Step 4: Wrap RepairTable with DataTable if applicable**

If `RepairTable.tsx` uses Ant Table directly, wrap it with the shared `DataTable` component for consistent header styling.

- [ ] **Step 5: Remove inline styles from DashboardPage**

Replace inline `style={{}}` on the tab container div and content area with CSS classes or minimal inline styles.

- [ ] **Step 6: Verify dashboard renders correctly**

Navigate to `/dashboard`, verify:
- Stat strip chips show correct icon colors, values, labels
- Click-to-filter works (active chip highlights with navy outline)
- Tab bar shows correct active state (blue text, 2px bottom border)
- Repair table headers are 12px, uppercase, muted, sticky
- Alternating row colors work

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/dashboard/
git commit -m "refactor: dashboard — swap inline styles for shared components"
```

---

### Task 13: Audit — Clients (pilot screen)

Validates split-layout + Field + FormGrid for a simpler screen.

**Files:**
- Modify: `client/src/pages/clients/ClientDetailPane.tsx`
- Modify: `client/src/pages/clients/ClientsPage.tsx`
- Reference: `C:/Projects/tsi-redesign/clients.html`

- [ ] **Step 1: Read reference and current files**

Read:
- `C:/Projects/tsi-redesign/clients.html`
- `client/src/pages/clients/ClientDetailPane.tsx`
- `client/src/pages/clients/ClientsPage.tsx`

- [ ] **Step 2: Refactor ClientDetailPane.tsx**

Same pattern as Repairs:
- Import `Field`, `FormGrid`, `StatusBadge`, `DetailHeader`, `TabBar`, `SectionCard` from shared
- Remove local Field definition
- Replace inline styles with shared components
- Replace Ant Tabs with TabBar

- [ ] **Step 3: Verify clients page renders correctly**

Navigate to `/clients`, select a client, verify visual match.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/clients/
git commit -m "refactor: clients screen — swap inline styles for shared components"
```

---

### Task 14: Audit — Departments

**Files:**
- Modify: `client/src/pages/departments/DepartmentDetailPane.tsx`
- Modify: `client/src/pages/departments/DepartmentsPage.tsx`
- Reference: `C:/Projects/tsi-redesign/departments.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor DepartmentDetailPane.tsx** — same shared component swap pattern as Clients
- [ ] **Step 3: Verify departments page renders correctly**
- [ ] **Step 4: Commit**

```bash
git add client/src/pages/departments/
git commit -m "refactor: departments screen — swap inline styles for shared components"
```

---

### Task 15: Audit — Contracts

**Files:**
- Modify: `client/src/pages/contracts/ContractDetailPane.tsx`
- Modify: `client/src/pages/contracts/ContractsPage.tsx`
- Reference: `C:/Projects/tsi-redesign/contracts.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor ContractDetailPane.tsx** — shared component swap
- [ ] **Step 3: Verify contracts page renders correctly**
- [ ] **Step 4: Commit**

```bash
git add client/src/pages/contracts/
git commit -m "refactor: contracts screen — swap inline styles for shared components"
```

---

### Task 16: Audit — Inventory

**Files:**
- Modify: `client/src/pages/inventory/InventoryDetailPane.tsx`
- Modify: `client/src/pages/inventory/InventoryPage.tsx`
- Reference: `C:/Projects/tsi-redesign/inventory.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor InventoryDetailPane.tsx** — shared component swap
- [ ] **Step 3: Verify inventory page renders correctly**
- [ ] **Step 4: Commit**

```bash
git add client/src/pages/inventory/
git commit -m "refactor: inventory screen — swap inline styles for shared components"
```

---

### Task 17: Audit — Financial

**Files:**
- Modify: `client/src/pages/financial/FinancialPage.tsx`
- Modify: `client/src/pages/financial/FinancialDetailPane.tsx`
- Reference: `C:/Projects/tsi-redesign/financial.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — shared component swap
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/financial/
git commit -m "refactor: financial screen — swap inline styles for shared components"
```

---

### Task 18: Audit — Suppliers

**Files:**
- Modify: `client/src/pages/suppliers/SupplierDetailPane.tsx`
- Modify: `client/src/pages/suppliers/SuppliersPage.tsx`
- Reference: `C:/Projects/tsi-redesign/suppliers.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — shared component swap
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/suppliers/
git commit -m "refactor: suppliers screen — swap inline styles for shared components"
```

---

### Task 19: Audit — Scope Models

**Files:**
- Modify: `client/src/pages/scope-model/ScopeModelPage.tsx`
- Reference: `C:/Projects/tsi-redesign/scope-models.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — shared component swap
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/scope-model/
git commit -m "refactor: scope models screen — swap inline styles for shared components"
```

---

### Task 20: Audit — Loaners

**Files:**
- Modify: `client/src/pages/loaners/LoanersPage.tsx`
- Reference: `C:/Projects/tsi-redesign/loaners.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — shared component swap
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/loaners/
git commit -m "refactor: loaners screen — swap inline styles for shared components"
```

---

### Task 21: Audit — Instruments

**Files:**
- Modify: `client/src/pages/instruments/InstrumentsPage.tsx`
- Modify: `client/src/pages/instruments/InstrumentsDetailPane.tsx`
- Reference: `C:/Projects/tsi-redesign/instruments.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — shared component swap
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/instruments/
git commit -m "refactor: instruments screen — swap inline styles for shared components"
```

---

### Task 22: Audit — Onsite Services

**Files:**
- Modify: `client/src/pages/onsite-services/OnsiteServicesPage.tsx`
- Reference: `C:/Projects/tsi-redesign/onsite-services.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — shared component swap
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/onsite-services/
git commit -m "refactor: onsite services screen — swap inline styles for shared components"
```

---

### Task 23: Audit — Acquisitions

**Files:**
- Modify: `client/src/pages/acquisitions/AcquisitionsPage.tsx`
- Reference: `C:/Projects/tsi-redesign/acquisitions.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — shared component swap
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/acquisitions/
git commit -m "refactor: acquisitions screen — swap inline styles for shared components"
```

---

### Task 24: Audit — Product Sales

**Files:**
- Modify: `client/src/pages/product-sale/ProductSalePage.tsx`
- Modify: `client/src/pages/product-sale/ProductSaleDetailPane.tsx`
- Reference: `C:/Projects/tsi-redesign/product-sales.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — shared component swap
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/product-sale/
git commit -m "refactor: product sales screen — swap inline styles for shared components"
```

---

### Task 25: Audit — Outsource Validation

**Files:**
- Modify: `client/src/pages/outsource-validation/OutsourceValidationPage.tsx`
- Reference: `C:/Projects/tsi-redesign/outsource-validation.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — shared component swap
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/outsource-validation/
git commit -m "refactor: outsource validation screen — swap inline styles for shared components"
```

---

### Task 26: Audit — Workspace

**Files:**
- Modify: `client/src/pages/workspace/WorkspacePage.tsx`
- Reference: `C:/Projects/tsi-redesign/workspace.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — shared component swap
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/workspace/
git commit -m "refactor: workspace screen — swap inline styles for shared components"
```

---

### Task 27: Audit — EndoCarts

**Files:**
- Modify: `client/src/pages/endocarts/EndoCartsPage.tsx`
- Reference: `C:/Projects/tsi-redesign/endocarts.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — shared component swap
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/endocarts/
git commit -m "refactor: endocarts screen — swap inline styles for shared components"
```

---

### Task 28: Audit — Quality (full-width)

**Files:**
- Modify: `client/src/pages/quality/QualityPage.tsx`
- Reference: `C:/Projects/tsi-redesign/quality.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — use StatStrip, DataTable, TabBar as applicable
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/quality/
git commit -m "refactor: quality screen — swap inline styles for shared components"
```

---

### Task 29: Audit — Reports (full-width)

**Files:**
- Modify: `client/src/pages/reports/ReportsPage.tsx`
- Reference: `C:/Projects/tsi-redesign/reports.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — use shared components where applicable
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/reports/
git commit -m "refactor: reports screen — swap inline styles for shared components"
```

---

### Task 30: Audit — Administration (full-width)

**Files:**
- Modify: `client/src/pages/administration/AdministrationPage.tsx`
- Reference: `C:/Projects/tsi-redesign/administration.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — use shared components where applicable
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/administration/
git commit -m "refactor: administration screen — swap inline styles for shared components"
```

---

### Task 31: Audit — Development List (full-width)

**Files:**
- Modify: `client/src/pages/development-list/DevelopmentListPage.tsx`
- Reference: `C:/Projects/tsi-redesign/development-list.html`

- [ ] **Step 1: Read reference and current files**
- [ ] **Step 2: Refactor** — use shared components where applicable
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/development-list/
git commit -m "refactor: development list screen — swap inline styles for shared components"
```

---

### Task 32: Audit — Login (special)

**Files:**
- Modify: `client/src/pages/login/LoginPage.tsx`
- Reference: `C:/Projects/tsi-redesign/login.html`

- [ ] **Step 1: Read reference and current login page**
- [ ] **Step 2: Fix any visual gaps** — colors, fonts, layout alignment
- [ ] **Step 3: Verify and commit**

```bash
git add client/src/pages/login/
git commit -m "refactor: login screen — visual alignment with reference"
```

---

## Phase 3: Polish Pass

### Task 33: Remove unused inline styles and dead code

- [ ] **Step 1: Search for remaining hardcoded hex colors in .tsx files**

Run: `grep -rn '#[0-9A-Fa-f]\{3,6\}' client/src/pages/ --include='*.tsx'`

Fix any hardcoded colors — replace with CSS variables.

- [ ] **Step 2: Search for local Field definitions that weren't removed**

Run: `grep -rn "const Field" client/src/pages/ --include='*.tsx'`

Remove any remaining local `Field` components that should now use the shared one.

- [ ] **Step 3: Delete the old local StatStrip if still present**

If `client/src/pages/dashboard/StatStrip.tsx` still exists and is no longer imported, delete it.

- [ ] **Step 4: Verify full build**

Run: `cd client && npx tsc --noEmit && npx vite build`
Expected: No errors, no unused imports.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead code and hardcoded colors from polish pass"
```

---

### Task 34: Typography and spacing consistency check

- [ ] **Step 1: Audit font sizes in page files**

Run: `grep -rn "fontSize:" client/src/pages/ --include='*.tsx' | sort | uniq -c | sort -rn`

Verify all font sizes align with the token scale: 10-11px (card headers), 12px (labels), 13px (body), 16px (values), 18px+ (titles).

- [ ] **Step 2: Audit spacing values**

Run: `grep -rn "padding:" client/src/pages/ --include='*.tsx' | head -30`

Verify padding/margin values are on the 4px grid (4, 8, 12, 16, 20, 24, 32).

- [ ] **Step 3: Fix any off-grid values found**

- [ ] **Step 4: Verify and commit**

```bash
git add -A
git commit -m "fix: normalize typography and spacing to design system grid"
```

---

### Task 35: Final build + visual smoke test

- [ ] **Step 1: Full TypeScript + Vite build**

Run: `cd client && npx tsc --noEmit && npx vite build`
Expected: Clean build, no errors, no warnings about unused imports.

- [ ] **Step 2: Visual smoke test — navigate each screen**

Start dev server and check each route loads without errors:
`/dashboard`, `/repairs`, `/clients`, `/departments`, `/contracts`, `/inventory`, `/quality`, `/loaners`, `/financial`, `/suppliers`, `/scope-models`, `/instruments`, `/onsite-services`, `/acquisitions`, `/product-sales`, `/outsource-validation`, `/reports`, `/administration`, `/workspace`, `/endocarts`, `/development-list`, `/login`

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: visual audit complete — all 22 screens using shared component library"
```
