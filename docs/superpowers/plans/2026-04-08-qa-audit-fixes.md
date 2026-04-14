# QA Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all verified frontend issues from the April 8, 2026 QA audit report.

**Architecture:** Pure frontend fixes in the React/TS client app. No backend changes needed for most issues. The "browser freeze" pattern is likely caused by 30s API timeouts, not infinite loops — the fix is to add proper loading states, abort controllers, and timeout UX rather than hunting for nonexistent loops.

**Tech Stack:** React 18, TypeScript, Ant Design, React Router 6, Axios

---

## Task 1: Add 404 catch-all route with production error page

**Files:**
- Create: `client/src/pages/not-found/NotFoundPage.tsx`
- Modify: `client/src/router.tsx`

- [ ] **Step 1: Create NotFoundPage component**

```tsx
// client/src/pages/not-found/NotFoundPage.tsx
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)', gap: 16, color: 'var(--muted)' }}>
      <div style={{ fontSize: 64, fontWeight: 800, color: 'var(--navy)', opacity: 0.15 }}>404</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)' }}>Page Not Found</div>
      <div style={{ fontSize: 13 }}>The page you requested does not exist or has been moved.</div>
      <button
        onClick={() => navigate('/dashboard')}
        style={{ marginTop: 8, height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600, background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Back to Dashboard
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Add catch-all route to router.tsx**

Add lazy import at line ~32:
```tsx
const NotFoundPage = lazy(() => import('./pages/not-found/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
```

Add catch-all route as the LAST child inside the AppShell children array (after line 79):
```tsx
{ path: '*', element: <SuspenseWrapper><NotFoundPage /></SuspenseWrapper> },
```

- [ ] **Step 3: Add React Router errorElement to prevent raw dev error pages**

Update the root RouteGuard element (line 50) to include an errorElement:
```tsx
{
  element: <RouteGuard />,
  errorElement: <SuspenseWrapper><NotFoundPage /></SuspenseWrapper>,
  children: [ ... ]
}
```

- [ ] **Step 4: Commit**

---

## Task 2: Fix Contracts chip click — navigate to /contracts

**Files:**
- Modify: `client/src/pages/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Find the contracts chip definition and click handler**

The contracts chip is defined conditionally (when expiringContracts > 0) in the stat chips array. The `handleChipClick` function maps chip keys to status filters, but contracts needs navigation instead.

- [ ] **Step 2: Update handleChipClick to handle contracts navigation**

In `handleChipClick`, add a special case: if the chip key is `'contracts'`, navigate to `/contracts` instead of filtering.

- [ ] **Step 3: Commit**

---

## Task 3: Fix Briefing tab content not scrollable

**Files:**
- Modify: `client/src/pages/dashboard/OpsBriefing.tsx` (or the briefing container)

- [ ] **Step 1: Find the briefing container and add overflow-y: auto**

The briefing content clips at the bottom. Add `overflowY: 'auto'` and proper height constraint to the briefing container.

- [ ] **Step 2: Commit**

---

## Task 4: Add empty state message to Tasks tab

**Files:**
- Modify: `client/src/pages/dashboard/DashboardPage.tsx` (or the tasks rendering section)

- [ ] **Step 1: Find where tasks are rendered**

Tasks use the UnifiedTable component. If the data is empty and not loading, show an empty state.

- [ ] **Step 2: Add empty state wrapper**

Wrap the tasks table with a conditional: if `!loading && data.length === 0`, show:
```tsx
<div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
  <div style={{ fontSize: 13, fontWeight: 500 }}>No tasks</div>
</div>
```

- [ ] **Step 3: Commit**

---

## Task 5: Hide Dev Inspector in production

**Files:**
- Modify: `client/src/components/shell/Topbar.tsx`

- [ ] **Step 1: Wrap Inspect button in production check**

Add condition around the Inspect button (lines 165-191):
```tsx
{import.meta.env.DEV && (
  <button onClick={toggleInspector} ...>Inspect</button>
)}
```

- [ ] **Step 2: Also hide DevInspectorPanel in AppShell**

In AppShell.tsx, wrap `<DevInspectorPanel />` in the same check:
```tsx
{import.meta.env.DEV && <DevInspectorPanel />}
```

- [ ] **Step 3: Commit**

---

## Task 6: Improve ErrorBoundary for production

**Files:**
- Modify: `client/src/components/common/ErrorBoundary.tsx`

- [ ] **Step 1: Enhance error UI to be production-appropriate**

Replace the current minimal error display with a more polished version that doesn't expose error details in production:
```tsx
render() {
  if (!this.state.hasError) return this.props.children;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, gap: 12 }}>
      <div style={{ fontSize: 40, opacity: 0.15 }}>!</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)' }}>Something went wrong</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 400, textAlign: 'center' }}>
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </div>
      {import.meta.env.DEV && this.state.error && (
        <pre style={{ fontSize: 11, color: 'var(--danger)', background: 'var(--neutral-50)', padding: 12, borderRadius: 6, maxWidth: 600, overflow: 'auto' }}>
          {this.state.error.message}
        </pre>
      )}
      <button onClick={() => this.setState({ hasError: false, error: null })}
        style={{ marginTop: 8, height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600, background: 'var(--primary)', color: 'var(--card)', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
        Try Again
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

---

## Task 7: Fix API timeout UX — add abort controllers and loading feedback

**Files:**
- Modify: `client/src/pages/repairs/RepairDetailPane.tsx`
- Modify: `client/src/pages/repairs/components/NewRepairModal.tsx`
- Modify: `client/src/pages/clients/NewClientModal.tsx`

- [ ] **Step 1: Add AbortController to RepairDetailPane cockpit data load**

In the useEffect at line 166, create an AbortController and pass the signal to API calls. On cleanup, abort.

- [ ] **Step 2: Add AbortController to NewRepairModal**

In the useEffect at line 102, add cleanup that prevents setState after modal closes.

- [ ] **Step 3: Add AbortController to NewClientModal**

Same pattern for the NewClientModal's data loading effect.

- [ ] **Step 4: Commit**

---

## Task 8: Fix empty state consistency across all tabs

**Files:**
- Modify: Multiple dashboard tab rendering sections

- [ ] **Step 1: Create shared EmptyState component**

```tsx
// Add to client/src/components/shared/EmptyState.tsx
export const EmptyState = ({ message = 'No data' }: { message?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', color: 'var(--muted)', gap: 8 }}>
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ opacity: 0.25 }}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
    <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
  </div>
);
```

- [ ] **Step 2: Use EmptyState in Tasks tab, Shipping tab, and other empty areas**

- [ ] **Step 3: Export from shared index**

- [ ] **Step 4: Commit**

---

## Task 9: Add Warranty Mix card layout fix

**Files:**
- Modify: Dashboard KPI section (likely in DashboardPage or a KPI component)

- [ ] **Step 1: Find the WARRANTY MIX card and adjust grid**

Make the KPI grid accommodate 6 cards evenly or place Warranty Mix inline with the others.

- [ ] **Step 2: Commit**

---

## Task 10: Fix Quality First-Pass Yield color coding

**Files:**
- Modify: `client/src/pages/quality/QualityPage.tsx`

- [ ] **Step 1: Add conditional color for First-Pass Yield**

If yield < 50%, use danger color. If < 80%, use warning. Otherwise success.

- [ ] **Step 2: Commit**

---

## Task 11: Fix Financial DSO and Revenue MTD server calculations

**Files:**
- Modify: `server/TSI.Api/Controllers/FinancialController.cs`

- [ ] **Step 1: Fix DSO calculation**

The current SQL calculates avg days from due date to TODAY for ALL unpaid invoices including very old ones. This produces 4742d (13 years). Fix by limiting to invoices from last 12 months or using a standard DSO formula (A/R / Revenue * Days).

- [ ] **Step 2: Fix Revenue MTD**

The current SQL sums tblInvoicePayments.nInvoicePayment for current month. If no payments recorded this month, it returns 0. Verify the payment data exists and the date filter is correct.

- [ ] **Step 3: Commit**

---

## Task 12: Fix Suppliers KPI counts (Parts/Repair/Acquisition/Carts)

**Files:**
- Modify: `server/TSI.Api/Controllers/SuppliersController.cs`

- [ ] **Step 1: Verify the supplier roles SQL**

The query joins tblSupplierRoles → tblSupplierRolesRef. If tblSupplierRolesRef has different role names (e.g., "Part" vs "Parts"), the GetValueOrDefault would return 0. Check the actual role names in the database.

- [ ] **Step 2: Fix role name matching if needed**

- [ ] **Step 3: Commit**
