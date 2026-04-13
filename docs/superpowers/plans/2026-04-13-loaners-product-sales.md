# Loaners + Product Sales Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Loaners and Product Sales screens with lifecycle management, inline actions, evaluation tracking, agreement workflows, partial fulfillment, van service linking, and category-based recall indicators.

**Architecture:** Both screens use the established full-width table + stat strip + 600px drawer pattern. Four new shared components (PipelineBar, InlineExpandRow, CategoryPicker, EvalChecklist) are built first. Backend controllers are extended with new endpoints. Frontend pages are rewritten to use the new components and workflows.

**Tech Stack:** React 19, TypeScript, Ant Design 5, CSS variables, ASP.NET Core 8, raw SqlClient, Azure SQL

**Spec:** `docs/superpowers/specs/2026-04-13-loaners-product-sales-design.md`

**Execution:** Phase 1 (shared components) runs first. Phase 2 (Loaners) and Phase 3 (Product Sales) run in parallel via separate agents.

---

## Phase 1: Shared Components (run first, ~4 tasks)

### Task 1: PipelineBar Component

**Files:**
- Create: `client/src/components/shared/PipelineBar.tsx`
- Create: `client/src/components/shared/PipelineBar.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create PipelineBar.tsx**

```tsx
import './PipelineBar.css';

export interface PipelineStep {
  key: string;
  label: string;
}

interface PipelineBarProps {
  steps: PipelineStep[];
  currentStep: string;
  completedSteps: string[];
}

export const PipelineBar = ({ steps, currentStep, completedSteps }: PipelineBarProps) => (
  <div className="pipeline-bar">
    {steps.map((step, i) => {
      const isCompleted = completedSteps.includes(step.key);
      const isCurrent = step.key === currentStep;
      let cls = 'pipeline-step';
      if (isCompleted) cls += ' pipeline-step--completed';
      else if (isCurrent) cls += ' pipeline-step--current';
      else cls += ' pipeline-step--future';
      if (i === 0) cls += ' pipeline-step--first';
      if (i === steps.length - 1) cls += ' pipeline-step--last';
      return (
        <div key={step.key} className={cls}>
          {isCompleted ? '✓ ' : isCurrent ? '● ' : ''}{step.label}
        </div>
      );
    })}
  </div>
);
```

- [ ] **Step 2: Create PipelineBar.css**

```css
.pipeline-bar {
  display: flex;
  align-items: center;
  gap: 0;
}

.pipeline-step {
  padding: 4px 14px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.pipeline-step--first { border-radius: 4px 0 0 4px; }
.pipeline-step--last { border-radius: 0 4px 4px 0; }

.pipeline-step--completed {
  background: var(--success);
  color: #fff;
}

.pipeline-step--current {
  background: var(--primary);
  color: #fff;
}

.pipeline-step--future {
  background: var(--border);
  color: var(--muted);
}
```

- [ ] **Step 3: Export from index.ts**

Add to `client/src/components/shared/index.ts`:
```ts
export { PipelineBar } from './PipelineBar';
export type { PipelineStep } from './PipelineBar';
```

- [ ] **Step 4: Verify no TS errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to PipelineBar

- [ ] **Step 5: Commit**

```bash
git add client/src/components/shared/PipelineBar.tsx client/src/components/shared/PipelineBar.css client/src/components/shared/index.ts
git commit -m "feat: add PipelineBar shared component"
```

---

### Task 2: InlineExpandRow Component

**Files:**
- Create: `client/src/components/shared/InlineExpandRow.tsx`
- Create: `client/src/components/shared/InlineExpandRow.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create InlineExpandRow.tsx**

```tsx
import { type ReactNode } from 'react';
import './InlineExpandRow.css';

interface InlineExpandRowProps {
  colSpan: number;
  children: ReactNode;
  onCancel: () => void;
}

export const InlineExpandRow = ({ colSpan, children, onCancel }: InlineExpandRowProps) => (
  <tr className="inline-expand-row">
    <td colSpan={colSpan}>
      <div className="inline-expand-row__body">
        {children}
        <button className="inline-expand-row__cancel" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </td>
  </tr>
);
```

- [ ] **Step 2: Create InlineExpandRow.css**

```css
.inline-expand-row td {
  padding: 0 !important;
  border-left: 3px solid var(--primary);
}

.inline-expand-row__body {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: rgba(var(--amber-rgb), 0.06);
}

.inline-expand-row__cancel {
  padding: 5px 12px;
  background: var(--card);
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
```

- [ ] **Step 3: Export from index.ts**

Add to `client/src/components/shared/index.ts`:
```ts
export { InlineExpandRow } from './InlineExpandRow';
```

- [ ] **Step 4: Verify no TS errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add client/src/components/shared/InlineExpandRow.tsx client/src/components/shared/InlineExpandRow.css client/src/components/shared/index.ts
git commit -m "feat: add InlineExpandRow shared component"
```

---

### Task 3: CategoryPicker Component

**Files:**
- Create: `client/src/components/shared/CategoryPicker.tsx`
- Create: `client/src/components/shared/CategoryPicker.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create CategoryPicker.tsx**

```tsx
import { useState } from 'react';
import './CategoryPicker.css';

export interface CategoryItem {
  key: number;
  name: string;
}

export interface SizeItem {
  key: number;
  description: string;
  description2: string;
  description3: string;
  status: string;
  unitCost: number | null;
}

interface CategoryPickerProps {
  categories: CategoryItem[];
  sizes: SizeItem[];
  loadingSizes: boolean;
  onSelectCategory: (key: number) => void;
  onAddItem: (sizeKey: number, quantity: number) => void;
  selectedCategoryName: string | null;
  onBack: () => void;
}

export const CategoryPicker = ({
  categories,
  sizes,
  loadingSizes,
  onSelectCategory,
  onAddItem,
  selectedCategoryName,
  onBack,
}: CategoryPickerProps) => {
  const [catSearch, setCatSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const filteredCats = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const setQty = (key: number, val: number) =>
    setQuantities((prev) => ({ ...prev, [key]: Math.max(1, val) }));

  if (selectedCategoryName) {
    return (
      <div className="category-picker">
        <div className="category-picker__header">
          <button className="category-picker__back" onClick={onBack} type="button">
            ← {selectedCategoryName}
          </button>
          <span className="category-picker__step">Step 2: Pick a size → add</span>
        </div>
        {loadingSizes ? (
          <div className="category-picker__loading">Loading sizes...</div>
        ) : (
          <table className="category-picker__table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Desc 2</th>
                <th style={{ width: 60 }}>Status</th>
                <th style={{ width: 50 }}>Qty</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((s) => (
                <tr key={s.key}>
                  <td>{s.description}</td>
                  <td className="category-picker__muted">{s.description2}</td>
                  <td><span className={`category-picker__status category-picker__status--${s.status.toLowerCase()}`}>{s.status}</span></td>
                  <td>
                    <input
                      type="number"
                      className="category-picker__qty"
                      value={quantities[s.key] ?? 1}
                      onChange={(e) => setQty(s.key, parseInt(e.target.value) || 1)}
                      min={1}
                    />
                  </td>
                  <td>
                    <button
                      className="category-picker__add"
                      onClick={() => onAddItem(s.key, quantities[s.key] ?? 1)}
                      type="button"
                    >+</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <div className="category-picker">
      <div className="category-picker__header">
        <span className="category-picker__title">Add Items</span>
        <span className="category-picker__step">Step 1: Pick a category</span>
      </div>
      <div className="category-picker__search">
        <input
          placeholder="Search categories..."
          value={catSearch}
          onChange={(e) => setCatSearch(e.target.value)}
        />
      </div>
      <div className="category-picker__list">
        {filteredCats.map((c) => (
          <div
            key={c.key}
            className="category-picker__item"
            onClick={() => onSelectCategory(c.key)}
          >
            {c.name}
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create CategoryPicker.css**

```css
.category-picker {
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 16px;
}

.category-picker__header {
  padding: 8px 12px;
  background: rgba(var(--amber-rgb), 0.06);
  font-size: 11px;
  font-weight: 600;
  color: var(--navy);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-picker__step {
  color: var(--muted);
  font-weight: 400;
}

.category-picker__back {
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--navy);
  cursor: pointer;
  padding: 0;
}

.category-picker__search input {
  width: 100%;
  padding: 6px 12px;
  border: none;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  outline: none;
}

.category-picker__list {
  max-height: 160px;
  overflow-y: auto;
}

.category-picker__item {
  padding: 6px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--neutral-50);
  font-size: 12px;
}

.category-picker__item:hover {
  background: rgba(var(--amber-rgb), 0.06);
  font-weight: 600;
}

.category-picker__loading {
  padding: 20px;
  text-align: center;
  color: var(--muted);
  font-size: 12px;
}

.category-picker__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.category-picker__table th {
  padding: 4px 8px;
  text-align: left;
  background: var(--neutral-50);
  font-size: 10px;
  font-weight: 600;
}

.category-picker__table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--neutral-50);
}

.category-picker__muted {
  color: var(--muted);
}

.category-picker__status {
  font-size: 10px;
  font-weight: 600;
}

.category-picker__status--active {
  color: var(--success);
}

.category-picker__qty {
  width: 36px;
  text-align: center;
  border: 1px solid var(--border);
  border-radius: 2px;
  font-size: 11px;
  padding: 2px;
}

.category-picker__add {
  padding: 1px 8px;
  font-size: 11px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.category-picker__title {
  font-weight: 600;
}
```

- [ ] **Step 3: Export from index.ts**

Add to `client/src/components/shared/index.ts`:
```ts
export { CategoryPicker } from './CategoryPicker';
export type { CategoryItem, SizeItem } from './CategoryPicker';
```

- [ ] **Step 4: Verify no TS errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add client/src/components/shared/CategoryPicker.tsx client/src/components/shared/CategoryPicker.css client/src/components/shared/index.ts
git commit -m "feat: add CategoryPicker two-step drill-down component"
```

---

### Task 4: EvalChecklist Component

**Files:**
- Create: `client/src/components/shared/EvalChecklist.tsx`
- Create: `client/src/components/shared/EvalChecklist.css`
- Modify: `client/src/components/shared/index.ts`

- [ ] **Step 1: Create EvalChecklist.tsx**

```tsx
import { useState } from 'react';
import './EvalChecklist.css';

export interface EvalItem {
  key: string;
  label: string;
  result: 'pass' | 'fail' | null;
  notes: string;
}

interface EvalChecklistProps {
  items: EvalItem[];
  onChange: (items: EvalItem[]) => void;
  onSubmit: (items: EvalItem[]) => void;
  readOnly?: boolean;
  submittedBy?: string;
  submittedAt?: string;
}

export const EvalChecklist = ({
  items,
  onChange,
  onSubmit,
  readOnly = false,
  submittedBy,
  submittedAt,
}: EvalChecklistProps) => {
  const [localItems, setLocalItems] = useState<EvalItem[]>(items);

  const update = (idx: number, patch: Partial<EvalItem>) => {
    const next = localItems.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setLocalItems(next);
    onChange(next);
  };

  const allDone = localItems.every((it) => it.result !== null);
  const anyFail = localItems.some((it) => it.result === 'fail');

  return (
    <div className="eval-checklist">
      {readOnly && submittedBy && (
        <div className="eval-checklist__stamp">
          Submitted by <strong>{submittedBy}</strong> on {submittedAt}
        </div>
      )}
      <table className="eval-checklist__table">
        <thead>
          <tr>
            <th>Check</th>
            <th style={{ width: 60 }}>Pass</th>
            <th style={{ width: 60 }}>Fail</th>
            <th style={{ width: 180 }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {localItems.map((item, i) => (
            <tr key={item.key} className={item.result === 'fail' ? 'eval-checklist__row--fail' : ''}>
              <td>{item.label}</td>
              <td className="eval-checklist__center">
                <input
                  type="radio"
                  name={`eval-${item.key}`}
                  checked={item.result === 'pass'}
                  onChange={() => update(i, { result: 'pass' })}
                  disabled={readOnly}
                />
              </td>
              <td className="eval-checklist__center">
                <input
                  type="radio"
                  name={`eval-${item.key}`}
                  checked={item.result === 'fail'}
                  onChange={() => update(i, { result: 'fail' })}
                  disabled={readOnly}
                />
              </td>
              <td>
                <input
                  className="eval-checklist__notes"
                  value={item.notes}
                  onChange={(e) => update(i, { notes: e.target.value })}
                  placeholder="Notes..."
                  disabled={readOnly}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <div className="eval-checklist__footer">
          {anyFail && (
            <span className="eval-checklist__warning">
              Failed items detected — scope will be sent to Repair
            </span>
          )}
          <button
            className="eval-checklist__submit"
            disabled={!allDone}
            onClick={() => onSubmit(localItems)}
            type="button"
          >
            Submit Evaluation
          </button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Create EvalChecklist.css**

```css
.eval-checklist__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.eval-checklist__table th {
  padding: 6px 8px;
  text-align: left;
  background: var(--neutral-50);
  font-size: 11px;
  font-weight: 600;
  color: var(--navy);
}

.eval-checklist__table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--neutral-50);
}

.eval-checklist__center {
  text-align: center;
}

.eval-checklist__row--fail {
  background: rgba(var(--danger-rgb), 0.04);
}

.eval-checklist__notes {
  width: 100%;
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 11px;
}

.eval-checklist__notes:disabled {
  background: var(--neutral-50);
  border-color: transparent;
}

.eval-checklist__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 10px 0;
}

.eval-checklist__warning {
  font-size: 11px;
  color: var(--danger);
  font-weight: 600;
}

.eval-checklist__submit {
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 600;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.eval-checklist__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.eval-checklist__stamp {
  padding: 8px 12px;
  background: var(--neutral-50);
  border-radius: 4px;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 8px;
}
```

- [ ] **Step 3: Export from index.ts**

Add to `client/src/components/shared/index.ts`:
```ts
export { EvalChecklist } from './EvalChecklist';
export type { EvalItem } from './EvalChecklist';
```

- [ ] **Step 4: Verify no TS errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add client/src/components/shared/EvalChecklist.tsx client/src/components/shared/EvalChecklist.css client/src/components/shared/index.ts
git commit -m "feat: add EvalChecklist shared component"
```

---

## Phase 2: Loaners Cockpit (parallel with Phase 3, ~6 tasks)

### Task 5: Loaners Backend — Extended Endpoints

**Files:**
- Modify: `server/TSI.Api/Controllers/LoanersController.cs`
- Create: `server/TSI.Api/Models/LoanerModels.cs`

**Important:** Before writing any SQL, verify column names against `C:/Projects/tsi-redesign/tasks/db-schema-dump.json`. Key tables: tblLoanerTran, tblScope, tblScopeType, tblScopeTypeCategories, tblDepartment, tblClient, tblSalesRep, tblDeliveryMethod, tblRepair.

- [ ] **Step 1: Create LoanerModels.cs**

```csharp
namespace TSI.Api.Models;

public record LoanerListItemDto(
    int LoanerTranKey,
    int? ScopeKey,
    string ScopeType,
    string Serial,
    string Status,        // Available, EvalOut, Out, Overdue, EvalIn, Repair
    string Client,
    string Dept,
    string Rep,
    int DaysOut,
    string Agreement,     // NotSent, Sent, Received
    string TrackingNumber,
    string PurchaseOrder,
    string Category,      // tblScopeTypeCategories.sScopeTypeCategory
    bool RecallNeeded     // true if category has 0 available + pending request
);

public record LoanerStatsDto(
    int Available,
    int Evaluating,
    int Out,
    int Overdue,
    int Repair,
    int AgreementsPending
);

public record LoanerDetailDto(
    int LoanerTranKey,
    int? ScopeKey,
    string ScopeType,
    string Serial,
    string Status,
    string Client,
    string Dept,
    string Rep,
    string DeliveryMethod,
    string PurchaseOrder,
    string TrackingNumber,
    string RackPosition,
    string DateOut,
    string DateIn,
    string CreatedBy,
    string CreatedDate,
    string Category,
    bool OnSiteLoaner
);

public record LoanerHistoryItemDto(
    int LoanerTranKey,
    string DateOut,
    string DateIn,
    string Client,
    string Dept,
    int DaysOut,
    string Agreement
);

public record CategoryAvailabilityDto(
    string Category,
    int Available,
    int Out,
    int Needed  // repairs with bLoanerRequested=1 for this category
);

public record CheckOutRequest(
    int ScopeKey,
    int DepartmentKey,
    int DeliveryMethodKey,
    int SalesRepKey,
    string? PurchaseOrder,
    bool OnSiteLoaner
);

public record CheckInRequest(
    int LoanerTranKey,
    string? RackPosition,
    string? TrackingNumber
);

public record EvalSubmitRequest(
    int ScopeKey,
    string Direction,  // "out" or "in"
    EvalItemResult[] Items
);

public record EvalItemResult(
    string CheckKey,
    string Result,  // "pass" or "fail"
    string? Notes
);
```

- [ ] **Step 2: Rewrite LoanersController.cs — replace the existing controller entirely**

The controller needs these endpoints:
- `GET /api/loaners` — list with extended columns (status lifecycle, rep, agreement, category, recall flag)
- `GET /api/loaners/stats` — stat strip counts (available, evaluating, out, overdue, repair, agreements pending)
- `GET /api/loaners/{scopeKey}` — full detail for drawer
- `GET /api/loaners/{scopeKey}/history` — all past transactions for a scope
- `GET /api/loaners/category-availability` — available by category vs demand
- `POST /api/loaners/check-out` — create tblLoanerTran with sDateOut
- `POST /api/loaners/check-in` — set sDateIn on transaction
- `POST /api/loaners/{scopeKey}/evaluate` — submit eval checklist (placeholder — no eval table exists yet, store as JSON in notes or add new table)

**CRITICAL SQL NOTES:**
- Status is derived: if sDateIn IS NOT NULL → 'Returned'; if sDateOut IS NOT NULL AND DATEDIFF > 21 → 'Overdue'; if sDateOut IS NOT NULL → 'Out'; else 'Available'
- EvalOut/EvalIn statuses need a new tracking mechanism — the legacy DB has no eval table. Options: (a) add a status column to tblLoanerTran, (b) create a tblLoanerEval table. **For now, derive from existing data only. Eval statuses are a future enhancement that requires a DB migration Steve must deploy.** Use Available/Out/Overdue/Repair for now.
- Agreement tracking also needs new columns or table — **same constraint, future enhancement.** For now, omit agreement column from backend; frontend shows placeholder.
- Category comes from: `tblScope.lScopeTypeKey → tblScopeType.lScopeTypeCategoryKey → tblScopeTypeCategories.sScopeTypeCategory`
- Recall: JOIN active repairs WHERE bLoanerRequested = 1, group by category, compare against available loaners by category
- Sales rep: `tblLoanerTran.lSalesRepKey → tblSalesRep`
- `sDateOut` and `sDateIn` are `nvarchar(14)` — stored as strings, need TRY_CAST for date math

**Write the full controller.** This is too large to include inline — the agent should read the existing controller, the spec, and the models above, then rewrite it. Key query patterns:

For the list endpoint, the core query joins:
```sql
FROM tblLoanerTran lt
LEFT JOIN tblScope s ON s.lScopeKey = lt.lScopeKey
LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCategoryKey
LEFT JOIN tblDepartment d ON d.lDepartmentKey = lt.lDepartmentKey
LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = lt.lSalesRepKey
LEFT JOIN tblRepair r ON r.lRepairKey = lt.lRepairKey
```

Status derivation:
```sql
CASE
  WHEN lt.lRepairKey IS NOT NULL AND r.sWorkOrderNumber IS NOT NULL THEN 'Repair'
  WHEN lt.sDateIn IS NOT NULL THEN 'Returned'
  WHEN lt.sDateOut IS NOT NULL AND DATEDIFF(day, TRY_CAST(lt.sDateOut AS datetime), GETDATE()) > 21 THEN 'Overdue'
  WHEN lt.sDateOut IS NOT NULL THEN 'Out'
  ELSE 'Available'
END AS Status
```

- [ ] **Step 3: Verify build**

Run: `cd server/TSI.Api && dotnet build 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 4: Commit**

```bash
git add server/TSI.Api/Controllers/LoanersController.cs server/TSI.Api/Models/LoanerModels.cs
git commit -m "feat: extend loaners backend — lifecycle statuses, category availability, recall indicator"
```

---

### Task 6: Loaners Frontend — Types + API Client

**Files:**
- Modify: `client/src/pages/loaners/types.ts`
- Modify: `client/src/api/loaners.ts`

- [ ] **Step 1: Rewrite types.ts to match new backend DTOs**

```typescript
export interface LoanerListItem {
  loanerTranKey: number;
  scopeKey: number | null;
  scopeType: string;
  serial: string;
  status: string;       // Available, Out, Overdue, Repair
  client: string;
  dept: string;
  rep: string;
  daysOut: number;
  agreement: string;    // NotSent, Sent, Received (placeholder for now)
  trackingNumber: string;
  purchaseOrder: string;
  category: string;
  recallNeeded: boolean;
}

export interface LoanerStats {
  available: number;
  evaluating: number;
  out: number;
  overdue: number;
  repair: number;
  agreementsPending: number;
}

export interface LoanerDetail {
  loanerTranKey: number;
  scopeKey: number | null;
  scopeType: string;
  serial: string;
  status: string;
  client: string;
  dept: string;
  rep: string;
  deliveryMethod: string;
  purchaseOrder: string;
  trackingNumber: string;
  rackPosition: string;
  dateOut: string;
  dateIn: string;
  createdBy: string;
  createdDate: string;
  category: string;
  onSiteLoaner: boolean;
}

export interface LoanerHistoryItem {
  loanerTranKey: number;
  dateOut: string;
  dateIn: string;
  client: string;
  dept: string;
  daysOut: number;
  agreement: string;
}

export interface CategoryAvailability {
  category: string;
  available: number;
  out: number;
  needed: number;
}

export interface CheckOutPayload {
  scopeKey: number;
  departmentKey: number;
  deliveryMethodKey: number;
  salesRepKey: number;
  purchaseOrder?: string;
  onSiteLoaner: boolean;
}

export interface CheckInPayload {
  loanerTranKey: number;
  rackPosition?: string;
  trackingNumber?: string;
}

export interface LoanerListResponse {
  items: LoanerListItem[];
  totalCount: number;
}
```

- [ ] **Step 2: Rewrite loaners.ts API client**

```typescript
import apiClient from './client';
import type {
  LoanerListResponse,
  LoanerDetail,
  LoanerStats,
  LoanerHistoryItem,
  CategoryAvailability,
  CheckOutPayload,
  CheckInPayload,
} from '../pages/loaners/types';

export const getLoaners = (params: {
  search?: string;
  statusFilter?: string;
  salesRepKey?: number;
  page?: number;
  pageSize?: number;
}) =>
  apiClient.get<LoanerListResponse>('/loaners', { params }).then((r) => r.data);

export const getLoanerStats = () =>
  apiClient.get<LoanerStats>('/loaners/stats').then((r) => r.data);

export const getLoanerDetail = (scopeKey: number) =>
  apiClient.get<LoanerDetail>(`/loaners/${scopeKey}`).then((r) => r.data);

export const getLoanerHistory = (scopeKey: number) =>
  apiClient.get<LoanerHistoryItem[]>(`/loaners/${scopeKey}/history`).then((r) => r.data);

export const getCategoryAvailability = () =>
  apiClient.get<CategoryAvailability[]>('/loaners/category-availability').then((r) => r.data);

export const checkOutLoaner = (payload: CheckOutPayload) =>
  apiClient.post('/loaners/check-out', payload);

export const checkInLoaner = (payload: CheckInPayload) =>
  apiClient.post('/loaners/check-in', payload);
```

- [ ] **Step 3: Verify no TS errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Note: LoanersPage.tsx will have errors since it references old types. That's expected — it gets rewritten in the next task.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/loaners/types.ts client/src/api/loaners.ts
git commit -m "feat: update loaners types + API client for redesign"
```

---

### Task 7: Loaners Frontend — Page Rewrite

**Files:**
- Rewrite: `client/src/pages/loaners/LoanersPage.tsx`
- Rewrite: `client/src/pages/loaners/LoanersPage.css`
- Create: `client/src/pages/loaners/LoanerDrawer.tsx`
- Create: `client/src/pages/loaners/LoanerDrawer.css`

This is the largest frontend task. The agent should:

- [ ] **Step 1: Read the existing LoanersPage.tsx fully to understand current structure**

Read `client/src/pages/loaners/LoanersPage.tsx` — note the current tab system, column defs, data fetching patterns.

- [ ] **Step 2: Read the design spec for reference**

Read `docs/superpowers/specs/2026-04-13-loaners-product-sales-design.md` — Part 1: Loaners Cockpit section.

- [ ] **Step 3: Rewrite LoanersPage.tsx**

Key structure:
```
LoanersPage
├── StatStrip (clickable chips: Available, Evaluating, Out, Overdue, Repair, Agreements Pending)
├── Controls row (Sales Rep filter dropdown, Search input)
├── Full-width table (columns: Scope Type, Serial, Status, Client/Dept, Rep, Days, Agreement, Action)
│   ├── Row styling by status (overdue = red border, out = amber tint, etc.)
│   ├── Inline action buttons (Check Out, Check In, Pass/Fail)
│   ├── RecallNeeded badge on rows where category has 0 available + demand
│   └── InlineExpandRow for check-out/check-in forms
└── LoanerDrawer (600px, 5 tabs)
```

Use the shared components: StatStrip, StatusBadge, InlineExpandRow, DataTable pattern.
Fetch data: getLoaners, getLoanerStats, getCategoryAvailability.
State: search, statusFilter, salesRepKey, selectedScopeKey, expandedRow (for inline forms).

The agent should write the full component. It's ~300-400 lines. Follow the Clients/Departments page pattern for structure.

- [ ] **Step 4: Create LoanerDrawer.tsx**

Drawer with 5 tabs: Details, History, Evaluation, Agreement, Shipping.
- Details: FormGrid with current transaction fields
- History: Timeline list from getLoanerHistory
- Evaluation: EvalChecklist component (read-only for now — no eval backend yet, show placeholder)
- Agreement: Placeholder with "Generate Agreement" and "Track Status" buttons (no backend yet)
- Shipping: Ship-to address fields from tblShippingUPS_Loaners (placeholder if no data)

- [ ] **Step 5: Rewrite LoanersPage.css**

Follow the pattern from ClientsPage.css / DepartmentsPage.css. Key classes:
- `.loaners-page` — container
- `.loaners-controls` — search + rep filter row
- `.loaners-table` — full-width table
- `.loaners-row--overdue` — red left border + tint
- `.loaners-row--out` — amber tint
- `.loaners-recall-badge` — recall indicator badge
- `.loaners-days-badge` / `--green` / `--amber` / `--red` — days out chip

- [ ] **Step 6: Create LoanerDrawer.css**

Standard drawer styles following DetailPane patterns.

- [ ] **Step 7: Verify no TS errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Remove ALL unused imports.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/loaners/
git commit -m "feat: rewrite loaners page — stat strip, inline actions, drawer with 5 tabs"
```

---

### Task 8: Loaners — Smoke Test + Push

- [ ] **Step 1: Run full TypeScript check**

Run: `cd client && npx tsc --noEmit 2>&1 | head -30`
Fix any errors.

- [ ] **Step 2: Run backend build**

Run: `cd server/TSI.Api && dotnet build 2>&1 | tail -5`
Fix any errors.

- [ ] **Step 3: Push to trigger deploy**

```bash
git push
```

- [ ] **Step 4: Wait for pipelines, then smoke test**

Backend: `curl "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/loaners?page=1&pageSize=5"`
Frontend: Load `https://happy-plant-03638db0f.6.azurestaticapps.net/loaners` — verify stat strip renders, table loads, click a row to open drawer.

---

## Phase 3: Product Sales (parallel with Phase 2, ~6 tasks)

### Task 9: Product Sales Backend — Extended Endpoints

**Files:**
- Modify: `server/TSI.Api/Controllers/ProductSalesController.cs`
- Create: `server/TSI.Api/Models/ProductSaleModels.cs`

**Important:** Verify all column names against `C:/Projects/tsi-redesign/tasks/db-schema-dump.json`. Key tables: tblProductSales, tblProductSalesInventory, tblInventory, tblInventorySize, tblInventoryPricingLists, tblInventoryPricingListDetails, tblProductSaleQuote, tblProductSaleQuoteDetail.

- [ ] **Step 1: Create ProductSaleModels.cs**

```csharp
namespace TSI.Api.Models;

public record ProductSaleListItemDto(
    int ProductSaleKey,
    string InvoiceNumber,
    string Client,
    string Department,
    string Status,       // Draft, Quoted, Approved, Partial, Invoiced, Denied, Cancelled
    string? Source,      // null or "Van: NV26100045"
    string SalesRep,
    string? OrderDate,
    decimal Total,
    int ItemCount,
    int BackorderedCount
);

public record ProductSaleStatsDto(
    int Total,
    int Draft,
    int Quoted,
    int Approved,
    int Invoiced,
    int Cancelled,
    decimal Revenue
);

public record ProductSaleDetailDto(
    int ProductSaleKey,
    string InvoiceNumber,
    int? ClientKey,
    int? DepartmentKey,
    int? SalesRepKey,
    string Client,
    string Department,
    string SalesRep,
    string Status,
    string? Source,
    string? OrderDate,
    string? QuoteDate,
    string? ApprovalDate,
    string? DenialDate,
    string? InvoiceDate,
    string? PurchaseOrder,
    string? TrackingNumber,
    decimal ShippingAmount,
    decimal TaxAmount,
    decimal SubTotal,
    decimal TotalAmount,
    string? ContactName,
    string? ContactEmail,
    string? ContactPhone,
    string? Note,
    int? PricingListKey,
    string? PricingListName,
    string? EstShipFrom,
    string? EstShipTo,
    string? ShipName1,
    string? ShipName2,
    string? ShipAddress1,
    string? ShipAddress2,
    string? ShipCity,
    string? ShipState,
    string? ShipZip,
    string? ShipCountry,
    string? BillName1,
    string? BillName2,
    string? BillAddress1,
    string? BillAddress2,
    string? BillCity,
    string? BillState,
    string? BillZip,
    string? BillCountry,
    string? BillEmail,
    ProductSaleLineItemDto[] LineItems
);

public record ProductSaleLineItemDto(
    int ProductSaleInventoryKey,
    int InventorySizeKey,
    string ItemDescription,
    string SizeDescription,
    string? SizeDescription2,
    string? LotNumber,
    int Quantity,
    decimal UnitCost,
    decimal TotalCost,
    string ItemStatus  // Pending, Shipped, Backordered
);

public record AddLineItemRequest(int InventorySizeKey, int Quantity);

public record UpdateLineItemRequest(int? Quantity, string? ItemStatus, string? LotNumber);

public record InventoryCategoryDto(int InventoryKey, string ItemDescription);

public record InventorySizeDto(
    int InventorySizeKey,
    string SizeDescription,
    string? SizeDescription2,
    string? SizeDescription3,
    string Status,
    decimal? UnitCost  // from pricing list if specified
);
```

- [ ] **Step 2: Extend ProductSalesController.cs**

Endpoints needed (extend existing controller, don't delete working endpoints):
- `GET /api/product-sales` — list with extended status derivation + source column
- `GET /api/product-sales/stats` — stat strip counts + revenue
- `GET /api/product-sales/{key}` — full detail with line items, addresses, pricing list
- `POST /api/product-sales` — create new order (existing, may need extension)
- `PATCH /api/product-sales/{key}` — update order details
- `POST /api/product-sales/{key}/items` — add line item from inventory picker
- `DELETE /api/product-sales/{key}/items/{itemKey}` — remove line item
- `PATCH /api/product-sales/{key}/items/{itemKey}` — update qty, status, lot#
- `POST /api/product-sales/{key}/quote` — set dtQuoteDate
- `POST /api/product-sales/{key}/approve` — set dtApprovalDate
- `POST /api/product-sales/{key}/invoice` — set dtInvoiceDate
- `POST /api/product-sales/{key}/void` — set dtCanceledDate
- `GET /api/inventory` — list inventory items (categories)
- `GET /api/inventory/{key}/sizes?pricingListKey=` — sizes with pricing

Status derivation:
```sql
CASE
  WHEN ps.dtCanceledDate IS NOT NULL THEN 'Cancelled'
  WHEN ps.dtDeniedDate IS NOT NULL THEN 'Denied'
  WHEN ps.dtInvoiceDate IS NOT NULL THEN 'Invoiced'
  -- Partial: has invoice date but some items still Pending/Backordered (future)
  WHEN ps.dtApprovalDate IS NOT NULL THEN 'Approved'
  WHEN ps.dtQuoteDate IS NOT NULL THEN 'Quoted'
  ELSE 'Draft'
END AS Status
```

**Note:** Partial fulfillment requires a line-item status column that doesn't exist in tblProductSalesInventory yet. For now, derive order status from dates only. Line item status = 'Pending' for all items (placeholder until DB migration adds the column).

- [ ] **Step 3: Verify build**

Run: `cd server/TSI.Api && dotnet build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add server/TSI.Api/Controllers/ProductSalesController.cs server/TSI.Api/Models/ProductSaleModels.cs
git commit -m "feat: extend product sales backend — lifecycle, inventory picker, line item CRUD"
```

---

### Task 10: Product Sales Frontend — Types + API Client

**Files:**
- Modify: `client/src/pages/product-sale/types.ts`
- Modify: `client/src/api/product-sales.ts`

- [ ] **Step 1: Rewrite types.ts**

```typescript
export interface ProductSaleListItem {
  productSaleKey: number;
  invoiceNumber: string;
  client: string;
  department: string;
  status: string;
  source: string | null;    // "Van: NV26100045" or null
  salesRep: string;
  orderDate: string | null;
  total: number;
  itemCount: number;
  backorderedCount: number;
}

export interface ProductSaleStats {
  total: number;
  draft: number;
  quoted: number;
  approved: number;
  invoiced: number;
  cancelled: number;
  revenue: number;
}

export interface ProductSaleDetail {
  productSaleKey: number;
  invoiceNumber: string;
  clientKey: number | null;
  departmentKey: number | null;
  salesRepKey: number | null;
  client: string;
  department: string;
  salesRep: string;
  status: string;
  source: string | null;
  orderDate: string | null;
  quoteDate: string | null;
  approvalDate: string | null;
  denialDate: string | null;
  invoiceDate: string | null;
  purchaseOrder: string | null;
  trackingNumber: string | null;
  shippingAmount: number;
  taxAmount: number;
  subTotal: number;
  totalAmount: number;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  note: string | null;
  pricingListKey: number | null;
  pricingListName: string | null;
  estShipFrom: string | null;
  estShipTo: string | null;
  shipName1: string | null;
  shipName2: string | null;
  shipAddress1: string | null;
  shipAddress2: string | null;
  shipCity: string | null;
  shipState: string | null;
  shipZip: string | null;
  shipCountry: string | null;
  billName1: string | null;
  billName2: string | null;
  billAddress1: string | null;
  billAddress2: string | null;
  billCity: string | null;
  billState: string | null;
  billZip: string | null;
  billCountry: string | null;
  billEmail: string | null;
  lineItems: ProductSaleLineItem[];
}

export interface ProductSaleLineItem {
  productSaleInventoryKey: number;
  inventorySizeKey: number;
  itemDescription: string;
  sizeDescription: string;
  sizeDescription2: string | null;
  lotNumber: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  itemStatus: string;  // Pending, Shipped, Backordered
}

export interface InventoryCategory {
  inventoryKey: number;
  itemDescription: string;
}

export interface InventorySize {
  inventorySizeKey: number;
  sizeDescription: string;
  sizeDescription2: string | null;
  sizeDescription3: string | null;
  status: string;
  unitCost: number | null;
}

export interface ProductSaleListResponse {
  items: ProductSaleListItem[];
  totalCount: number;
}
```

- [ ] **Step 2: Rewrite product-sales.ts API client**

```typescript
import apiClient from './client';
import type {
  ProductSaleListResponse,
  ProductSaleDetail,
  ProductSaleStats,
  InventoryCategory,
  InventorySize,
} from '../pages/product-sale/types';

export const getProductSales = (params: {
  search?: string;
  statusFilter?: string;
  page?: number;
  pageSize?: number;
}) =>
  apiClient.get<ProductSaleListResponse>('/product-sales', { params }).then((r) => r.data);

export const getProductSaleDetail = (key: number) =>
  apiClient.get<ProductSaleDetail>(`/product-sales/${key}`).then((r) => r.data);

export const getProductSaleStats = () =>
  apiClient.get<ProductSaleStats>('/product-sales/stats').then((r) => r.data);

export const createProductSale = (body: {
  clientKey: number;
  departmentKey: number;
  salesRepKey?: number;
  purchaseOrder?: string;
  note?: string;
}) =>
  apiClient.post<{ productSaleKey: number }>('/product-sales', body).then((r) => r.data);

export const updateProductSale = (key: number, body: Record<string, unknown>) =>
  apiClient.patch(`/product-sales/${key}`, body);

export const addLineItem = (key: number, inventorySizeKey: number, quantity: number) =>
  apiClient.post(`/product-sales/${key}/items`, { inventorySizeKey, quantity });

export const removeLineItem = (key: number, itemKey: number) =>
  apiClient.delete(`/product-sales/${key}/items/${itemKey}`);

export const updateLineItem = (key: number, itemKey: number, body: { quantity?: number; itemStatus?: string; lotNumber?: string }) =>
  apiClient.patch(`/product-sales/${key}/items/${itemKey}`, body);

export const generateQuote = (key: number) =>
  apiClient.post(`/product-sales/${key}/quote`);

export const approveOrder = (key: number) =>
  apiClient.post(`/product-sales/${key}/approve`);

export const invoiceOrder = (key: number) =>
  apiClient.post(`/product-sales/${key}/invoice`);

export const voidOrder = (key: number) =>
  apiClient.post(`/product-sales/${key}/void`);

export const getInventoryCategories = () =>
  apiClient.get<InventoryCategory[]>('/inventory').then((r) => r.data);

export const getInventorySizes = (inventoryKey: number, pricingListKey?: number) =>
  apiClient.get<InventorySize[]>(`/inventory/${inventoryKey}/sizes`, {
    params: pricingListKey ? { pricingListKey } : undefined,
  }).then((r) => r.data);
```

- [ ] **Step 3: Verify no TS errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/product-sale/types.ts client/src/api/product-sales.ts
git commit -m "feat: update product sales types + API client for redesign"
```

---

### Task 11: Product Sales Frontend — Page Rewrite

**Files:**
- Rewrite: `client/src/pages/product-sale/ProductSalePage.tsx`
- Rewrite: `client/src/pages/product-sale/ProductSalePage.css`
- Rewrite: `client/src/pages/product-sale/ProductSaleDetailPane.tsx`
- Create: `client/src/pages/product-sale/ProductSaleDrawer.tsx`
- Create: `client/src/pages/product-sale/ProductSaleDrawer.css`

The agent should:

- [ ] **Step 1: Read existing files to understand current structure**

Read ProductSalePage.tsx, ProductSaleDetailPane.tsx, and the spec.

- [ ] **Step 2: Rewrite ProductSalePage.tsx**

Key structure:
```
ProductSalePage
├── StatStrip (Total, Draft, Quoted, Approved, Invoiced, Cancelled, Revenue)
├── Controls row (+ New Order button, Search input)
├── Full-width table (Invoice#, Client, Dept, Status, Source, Rep, Date, Total, Items)
└── ProductSaleDrawer (600px)
```

Follow the Clients page pattern. Use StatStrip, StatusBadge, DataTable shared components.

- [ ] **Step 3: Create ProductSaleDrawer.tsx**

Drawer structure:
```
ProductSaleDrawer
├── PipelineBar (Draft → Quoted → Approved → Invoiced)
├── Context line (client/dept left, rep/date right)
├── TabBar (Items, Details, Addresses, Documents)
├── Items tab
│   ├── Line items table (desc, qty, unit, total, status, remove)
│   ├── Totals row (subtotal, shipping, tax, total)
│   ├── CategoryPicker (two-step inventory picker)
│   └── Action buttons (Print Quote, Advance →)
├── Details tab (FormGrid with rep, price list, PO, tracking, shipping, tax, dates, contact, note, source)
├── Addresses tab (ship-to + bill-to FormGrids)
└── Documents tab (placeholder)
```

Use PipelineBar, CategoryPicker, FormGrid, Field, TabBar shared components.

Pipeline steps:
```typescript
const PIPELINE_STEPS: PipelineStep[] = [
  { key: 'Draft', label: 'Draft' },
  { key: 'Quoted', label: 'Quoted' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Invoiced', label: 'Invoiced' },
];
```

Completed steps: derive from detail dates (if quoteDate set → Draft is completed, etc.)

- [ ] **Step 4: Rewrite CSS files**

Follow existing patterns. Key classes:
- `.ps-page` — container
- `.ps-drawer` — drawer wrapper
- `.ps-pipeline` — pipeline bar section
- `.ps-line-items` — line items table
- `.ps-totals` — totals row
- `.ps-source-badge` — van service badge

- [ ] **Step 5: Delete ProductSaleDetailPane.tsx** (replaced by ProductSaleDrawer.tsx)

- [ ] **Step 6: Verify no TS errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Remove ALL unused imports.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/product-sale/
git commit -m "feat: rewrite product sales — pipeline bar, tabbed drawer, category picker"
```

---

### Task 12: Product Sales — Smoke Test + Push

- [ ] **Step 1: Run full TypeScript check**

Run: `cd client && npx tsc --noEmit 2>&1 | head -30`
Fix any errors.

- [ ] **Step 2: Run backend build**

Run: `cd server/TSI.Api && dotnet build 2>&1 | tail -5`
Fix any errors.

- [ ] **Step 3: Push to trigger deploy**

```bash
git push
```

- [ ] **Step 4: Wait for pipelines, then smoke test**

Backend: `curl "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/product-sales?page=1&pageSize=5"`
Frontend: Load `https://happy-plant-03638db0f.6.azurestaticapps.net/product-sales` — verify stat strip renders, table loads, click a row to open drawer with pipeline bar.

---

## Execution Notes

- **Phase 1** (Tasks 1-4): Shared components. Must complete before Phase 2/3.
- **Phase 2** (Tasks 5-8): Loaners. Can run in parallel with Phase 3.
- **Phase 3** (Tasks 9-12): Product Sales. Can run in parallel with Phase 2.
- **DB migrations needed** (future, out of scope for this plan): tblLoanerEval table, agreement tracking columns, line-item status column on tblProductSalesInventory. These require Steve to deploy.
- **SQL verification**: Every query must be checked against `C:/Projects/tsi-redesign/tasks/db-schema-dump.json` before writing.
- **TS unused imports**: TS6133/TS6196 fail the Azure deploy pipeline. Always check with `npx tsc --noEmit` before committing.
