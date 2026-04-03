# Dashboard Unified Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 11-tab Dashboard with a unified cockpit — one powerful table with a view selector toolbar, type/group filters, row expansion, and batch actions.

**Architecture:** Rewrite DashboardPage to remove Ant Tabs and lazy-loaded tab components. Replace with a single unified table powered by a view selector (Repairs/Shipping/Invoices/Flags/Emails/Tasks/Tech Bench). Each view changes the table columns and data source. Toolbar provides type filter, group-by dropdown, search, and batch actions. Stat strip stays as-is (shared component). Existing backend endpoints are reused — most views already have API endpoints.

**Tech Stack:** React 19, TypeScript, Ant Design 5 (Table only), CSS custom properties, ASP.NET Core 8, raw SqlClient

**Spec:** `docs/superpowers/specs/2026-04-02-dashboard-unified-design.md`

---

## File Structure

### Backend
- Modify: `server/TSI.Api/Controllers/DashboardController.cs` — add type/groupBy params to repairs endpoint, add briefing endpoint

### Frontend Types
- Modify: `client/src/pages/dashboard/types.ts` — add view types, toolbar state, column definitions per view

### Frontend Components (new)
- Create: `client/src/pages/dashboard/DashboardToolbar.tsx` + `.css` — view selector + filters + search + actions
- Create: `client/src/pages/dashboard/UnifiedTable.tsx` — single table that adapts columns per view
- Create: `client/src/pages/dashboard/columnDefs.ts` — column definitions for each view

### Frontend (modified)
- Rewrite: `client/src/pages/dashboard/DashboardPage.tsx` — remove tabs, wire toolbar + unified table
- Modify: `client/src/pages/dashboard/RepairTable.tsx` — extract reusable parts or replace with UnifiedTable
- Modify: `client/src/api/dashboard.ts` — add type/groupBy params

### Frontend (delete after rewrite)
- Delete: `client/src/pages/dashboard/tabs/TasksTab.tsx`
- Delete: `client/src/pages/dashboard/tabs/EmailsTab.tsx`
- Delete: `client/src/pages/dashboard/tabs/ShippingTab.tsx`
- Delete: `client/src/pages/dashboard/tabs/InventoryTab.tsx`
- Delete: `client/src/pages/dashboard/tabs/PurchaseOrdersTab.tsx`
- Delete: `client/src/pages/dashboard/tabs/InvoicesTab.tsx`
- Delete: `client/src/pages/dashboard/tabs/FlagsTab.tsx`
- Delete: `client/src/pages/dashboard/tabs/AnalyticsTab.tsx`
- Delete: `client/src/pages/dashboard/tabs/TechBenchTab.tsx`
- Delete: `client/src/pages/dashboard/tabs/BriefingTab.tsx`

---

## Task 1: Backend — Add type/groupBy params + briefing endpoint

**Files:**
- Modify: `server/TSI.Api/Controllers/DashboardController.cs`
- Modify: `server/TSI.Api/Models/Dashboard.cs`

- [ ] **Step 1: Add BriefingStats model**

Add to `server/TSI.Api/Models/Dashboard.cs`:

```csharp
public record BriefingStats(
    int Received, int Shipped, int Approved,
    decimal Revenue, decimal AvgTat, int Overdue
);
```

- [ ] **Step 2: Add type and groupBy params to GetRepairs**

In the existing `GetRepairs` method in `DashboardController.cs`, add two optional query params:

```csharp
[HttpGet("repairs")]
public async Task<ActionResult<DashboardRepairsResponse>> GetRepairs(
    [FromQuery] string search = "",
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 50,
    [FromQuery] string statusFilter = "all",
    [FromQuery] string type = "all",      // NEW: all, Flexible, Rigid
    [FromQuery] string groupBy = "none"   // NEW: none, Client, Status, Tech, ScopeType
)
```

Add to the WHERE clause:
```sql
-- type filter
AND (@type = 'all' OR st.sScopeTypeCategory = @type)
```

Add to the ORDER BY when groupBy != "none":
```sql
-- groupBy: prepend group column to ORDER BY
-- Client: ORDER BY c.sClientName1, ...
-- Status: ORDER BY rs.sRepairStatus, ...
-- Tech: ORDER BY t.sTechName, ...
-- ScopeType: ORDER BY st.sScopeTypeDesc, ...
```

- [ ] **Step 3: Add GET /dashboard/briefing endpoint**

```csharp
[HttpGet("briefing")]
public async Task<ActionResult<BriefingStats>> GetBriefing()
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();
    var yesterday = DateTime.Today.AddDays(-1);
    await using var cmd = new SqlCommand(@"
        SELECT
            (SELECT COUNT(*) FROM tblRepair WHERE CAST(dtDateIn AS DATE) = @yesterday) AS Received,
            (SELECT COUNT(*) FROM tblRepair WHERE CAST(dtDateOut AS DATE) = @yesterday) AS Shipped,
            (SELECT COUNT(*) FROM tblRepair WHERE CAST(dtAprRecvd AS DATE) = @yesterday) AS Approved,
            (SELECT ISNULL(SUM(dblAmtRepair), 0) FROM tblRepair WHERE CAST(dtDateOut AS DATE) = @yesterday) AS Revenue,
            (SELECT ISNULL(AVG(CAST(DATEDIFF(DAY, dtDateIn, ISNULL(dtDateOut, GETDATE())) AS DECIMAL(10,1))), 0)
             FROM tblRepair r JOIN tblRepairStatuses rs ON r.lRepairStatusID = rs.lRepairStatusID
             WHERE rs.sRepairStatus NOT IN ('Cancelled','Closed')) AS AvgTat,
            (SELECT COUNT(*) FROM tblRepair r JOIN tblRepairStatuses rs ON r.lRepairStatusID = rs.lRepairStatusID
             WHERE rs.sRepairStatus NOT IN ('Shipped','Cancelled','Closed','Invoiced')
             AND DATEDIFF(DAY, dtDateIn, GETDATE()) > 14) AS Overdue
    ", conn);
    cmd.Parameters.AddWithValue("@yesterday", yesterday);
    await using var rdr = await cmd.ExecuteReaderAsync();
    await rdr.ReadAsync();
    return new BriefingStats(
        rdr.GetInt32(0), rdr.GetInt32(1), rdr.GetInt32(2),
        rdr.GetDecimal(3), rdr.GetDecimal(4), rdr.GetInt32(5)
    );
}
```

Verify column names against `C:/Projects/tsi-redesign/tasks/db-schema-dump.json`. The scope type category column may be `sScopeTypeCategory` or similar — check tblScopeType schema.

- [ ] **Step 4: Verify build and commit**

```bash
cd server/TSI.Api && dotnet build
git add server/TSI.Api/Controllers/DashboardController.cs server/TSI.Api/Models/Dashboard.cs
git commit -m "feat: add type/groupBy params and briefing endpoint to dashboard"
```

---

## Task 2: Frontend — Types + API Updates

**Files:**
- Modify: `client/src/pages/dashboard/types.ts`
- Modify: `client/src/api/dashboard.ts`

- [ ] **Step 1: Add types**

Add to `client/src/pages/dashboard/types.ts`:

```typescript
export type DashboardView = 'repairs' | 'shipping' | 'invoices' | 'flags' | 'emails' | 'tasks' | 'techbench';

export type ScopeTypeFilter = 'all' | 'Flexible' | 'Rigid';

export type GroupBy = 'none' | 'Client' | 'Status' | 'Tech' | 'ScopeType';

export interface DashboardToolbarState {
  view: DashboardView;
  type: ScopeTypeFilter;
  groupBy: GroupBy;
  search: string;
  page: number;
  pageSize: number;
  statusFilter: string;
}

export interface BriefingStats {
  received: number;
  shipped: number;
  approved: number;
  revenue: number;
  avgTat: number;
  overdue: number;
}
```

- [ ] **Step 2: Add API function**

Add to `client/src/api/dashboard.ts`:

```typescript
export const getDashboardBriefing = () => apiClient.get('/dashboard/briefing');
```

Update the existing `getDashboardRepairs` call to pass `type` and `groupBy` params if present in the filters object.

- [ ] **Step 3: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/dashboard/types.ts client/src/api/dashboard.ts
git commit -m "feat: add unified dashboard types and briefing API"
```

---

## Task 3: Frontend — Column Definitions

**Files:**
- Create: `client/src/pages/dashboard/columnDefs.ts`

- [ ] **Step 1: Create column definitions for all 7 views**

Each view returns an array of Ant Design `ColumnsType` definitions:

```typescript
import type { ColumnsType } from 'antd/es/table';
import { StatusBadge } from '../../components/shared';

// Repairs columns: expand, Date In, Client, Dept, WO#, Scope Type, Serial, TAT, Status, Amount, Tech
// Shipping columns: WO#, Client, Status, Ship Date, Tracking#, Weight, Delivery
// Invoices columns: Invoice#, WO#, Client, Status, Amount, Date
// Flags columns: WO#, Client, Flag Type, Flag, Visible on D&I
// Emails columns: Date, Type, WO#, Client, To, Status
// Tasks columns: Priority, Task, WO#, Assigned, Due, Status
// Tech Bench columns: WO#, Client, Scope, Tech, Status, TAT, Urgency
```

Export a function `getColumnsForView(view: DashboardView, onRowClick: (key: number) => void): ColumnsType<any>` that returns the appropriate column set.

Each column definition must include:
- `title`: uppercase label
- `dataIndex`: field name matching API response
- `key`: unique key
- `width`: pixel width
- `render`: custom render for StatusBadge, color-coded TAT, clickable WO#, etc.

For Repairs view specifically:
- WO# column: `render: (text, record) => <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => onRowClick(record.repairKey)}>{text}</span>`
- TAT column: color-coded (green <7, amber 7-14, red >14)
- Status column: `render: (text) => <StatusBadge status={text} />`

- [ ] **Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/dashboard/columnDefs.ts
git commit -m "feat: add column definitions for all 7 dashboard views"
```

---

## Task 4: Frontend — DashboardToolbar Component

**Files:**
- Create: `client/src/pages/dashboard/DashboardToolbar.tsx`
- Create: `client/src/pages/dashboard/DashboardToolbar.css`

- [ ] **Step 1: Build DashboardToolbar**

Single-row toolbar with:

**Left section:**
- View selector: 7 segmented buttons (Repairs, Shipping, Invoices, Flags, Emails, Tasks, Tech Bench). Active button gets `background: var(--primary)`, `color: #fff`. Others get `background: var(--card)`.

**Separator** (1px vertical line, 20px height)

**Filters section (Repairs view only, hidden for other views):**
- Type filter: 3 segmented buttons (All, Flexible, Rigid)
- Group By: `<select>` dropdown (None, Client, Status, Tech, Scope Type)

**Flex spacer**

**Right section:**
- Search `<input>` (200px, placeholder "Search WO, client, serial...")
- Export button
- Print button

Props:

```typescript
interface DashboardToolbarProps {
  state: DashboardToolbarState;
  onChange: (partial: Partial<DashboardToolbarState>) => void;
  selectedCount: number;  // for batch action buttons
}
```

CSS: flex row, `padding: 8px 14px`, `border-bottom: 1px solid var(--neutral-200)`, `background: var(--neutral-50)`, `flex-wrap: wrap`, `gap: 8px`.

Segmented button group: `border: 1px solid var(--neutral-200)`, `border-radius: var(--radius-sm)`, `overflow: hidden`. Each button: `padding: 4px 10px`, `font-size: 10px`, `border-left: 1px solid var(--neutral-200)`. Active: `background: var(--primary)`, `color: #fff`, `font-weight: 600`.

- [ ] **Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/dashboard/DashboardToolbar.*
git commit -m "feat: add DashboardToolbar with view selector and filters"
```

---

## Task 5: Frontend — UnifiedTable Component

**Files:**
- Create: `client/src/pages/dashboard/UnifiedTable.tsx`

- [ ] **Step 1: Build UnifiedTable**

Wraps Ant Design Table (or shared DataTable). Adapts columns based on the current view using `getColumnsForView()` from `columnDefs.ts`.

Props:

```typescript
interface UnifiedTableProps {
  view: DashboardView;
  data: any[];
  loading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onRowClick: (repairKey: number) => void;
  selectedKeys: number[];
  onSelectionChange: (keys: number[]) => void;
}
```

Features:
- Row selection (checkbox column) for batch actions
- Urgent rows: `rowClassName` returns `'urgent-row'` when `isUrgent` is true → CSS adds 3px red left border
- Row expansion (Repairs view only): expandable row shows complaint/notes text
- Alternating row colors via DataTable CSS
- Footer: "Showing X of Y" + pagination

CSS for urgent row:
```css
.urgent-row { border-left: 3px solid var(--danger); }
```

- [ ] **Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/dashboard/UnifiedTable.tsx
git commit -m "feat: add UnifiedTable with view-adaptive columns"
```

---

## Task 6: Frontend — DashboardPage Rewrite

**Files:**
- Rewrite: `client/src/pages/dashboard/DashboardPage.tsx`
- Delete: all files in `client/src/pages/dashboard/tabs/`
- Delete: `client/src/pages/dashboard/RepairTable.tsx` (replaced by UnifiedTable)

- [ ] **Step 1: Rewrite DashboardPage**

Layout:
```
StatStrip (shared component — already works)
DashboardToolbar (view selector + filters)
UnifiedTable (single table, adapts per view)
```

State:
```typescript
const [toolbarState, setToolbarState] = useState<DashboardToolbarState>({
  view: 'repairs',
  type: 'all',
  groupBy: 'none',
  search: '',
  page: 1,
  pageSize: 50,
  statusFilter: 'all',
});
const [data, setData] = useState<any[]>([]);
const [totalCount, setTotalCount] = useState(0);
const [loading, setLoading] = useState(true);
const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
```

Data fetching:
- `useEffect` watches `toolbarState` changes
- Calls the appropriate API function based on `toolbarState.view`:
  - 'repairs' → `getDashboardRepairs(toolbarState)`
  - 'shipping' → `getDashboardShipping(toolbarState)`
  - 'invoices' → `getDashboardInvoices(toolbarState)`
  - 'flags' → `getDashboardFlags(toolbarState)`
  - 'emails' → `getDashboardEmails(toolbarState)`
  - 'tasks' → `getDashboardTasks(toolbarState)`
  - 'techbench' → `getDashboardTechBench(toolbarState)`
- Debounce search (300ms)

Stat strip chip click:
- Sets `statusFilter` and switches view to 'repairs'

Row click:
- `useNavigate()` → `/repairs/${repairKey}`

- [ ] **Step 2: Delete old tab files**

Delete all files in `client/src/pages/dashboard/tabs/` — their functionality is now in the UnifiedTable column definitions and the existing API endpoints.

Delete `client/src/pages/dashboard/RepairTable.tsx` — replaced by UnifiedTable.

- [ ] **Step 3: Remove unused imports and verify build**

Make sure no files import from deleted tabs. Check `DashboardPage.tsx` has no references to old components.

```bash
cd client && npx tsc --noEmit && npx vite build
```

- [ ] **Step 4: Commit**

```bash
git add -A client/src/pages/dashboard/
git commit -m "feat: rewrite dashboard as unified cockpit — single table with view selector"
```

---

## Task 7: Integration — Stat Strip Click + Navigation

**Files:**
- Verify: `client/src/pages/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Verify stat chip → table filter works**

Clicking a stat chip should:
1. Set `toolbarState.statusFilter` to the appropriate status
2. Set `toolbarState.view` to 'repairs' (auto-switch if on another view)
3. Table reloads with filtered data

- [ ] **Step 2: Verify WO# click → cockpit navigation**

Clicking a WO# in the table should navigate to `/repairs/:repairKey`. This requires the Repairs Cockpit route to exist (from the repairs-cockpit plan). If it doesn't exist yet, the navigation will go to the current RepairsPage which will still work.

- [ ] **Step 3: Final build check**

```bash
cd client && npx tsc --noEmit && npx vite build
```

- [ ] **Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix: wire dashboard stat chips and cockpit navigation"
```
