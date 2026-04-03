# Departments Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Departments screen as a configuration hub — address management, scope detail drawer, contacts with primary designation, sub-groups management, repair history with KPIs, and save state tracking.

**Architecture:** Split-pane layout (existing) enhanced with toolbar (dept name, client link, save indicator), KPI strip, and richer tab content. Inline editing for address and contact fields. Scope detail drawer slides out from right. New backend endpoints for CRUD operations and KPIs.

**Tech Stack:** React 19, TypeScript, Ant Design 5 (minimal), CSS modules, ASP.NET Core 8, raw SqlClient

**Spec:** `docs/superpowers/specs/2026-04-02-departments-config-design.md`

**DB Schema Reference:** `C:/Projects/tsi-redesign/tasks/db-schema-dump.json`

---

## File Structure

### Backend
- Modify: `server/TSI.Api/Models/Department.cs` — add DepartmentFull, DeptKpis, DeptContact, ScopeDetail records
- Modify: `server/TSI.Api/Controllers/DepartmentsController.cs` — add /full, /kpis, PUT, contact CRUD, sub-groups bulk update, scope detail, repair history

### Frontend Types
- Modify: `client/src/pages/departments/types.ts` — add DepartmentFull, DeptKpis, DeptContact, ScopeDetail types

### Frontend API
- Modify: `client/src/api/departments.ts` — add CRUD functions

### Frontend Components
- Create: `client/src/pages/departments/DeptToolbar.tsx` + `.css`
- Create: `client/src/pages/departments/DeptKpiStrip.tsx`
- Create: `client/src/pages/departments/ScopeDrawer.tsx` + `.css`
- Rewrite: `client/src/pages/departments/DepartmentDetailPane.tsx`
- Create: `client/src/pages/departments/tabs/InfoTab.tsx` — address management
- Create: `client/src/pages/departments/tabs/ContactsTab.tsx` — contacts with primary
- Rewrite: `client/src/pages/departments/tabs/ScopesTab.tsx` — scope table + drawer
- Rewrite: `client/src/pages/departments/tabs/SubGroupsTab.tsx` — shuttle or table
- Create: `client/src/pages/departments/tabs/RepairsTab.tsx` — repair history + KPIs

---

## Task 1: Backend — Department CRUD Models + Endpoints

**Files:**
- Modify: `server/TSI.Api/Models/Department.cs`
- Modify: `server/TSI.Api/Controllers/DepartmentsController.cs`

- [ ] **Step 1: Add new models**

```csharp
public record DepartmentFull(
    int DeptKey, string Name, string ClientName, int ClientKey, bool IsActive,
    // Billing address
    string? Address1, string? City, string? State, string? Zip, string? Phone,
    // Contact
    string? ContactFirst, string? ContactLast, string? ContactPhone, string? ContactEmail,
    // Service location (if separate fields exist — check schema)
    string? ServiceLocation,
    // Counts
    int ScopeCount, int OpenRepairs
);

public record DeptKpis(
    int TotalRepairs, int OpenRepairs, decimal AvgTat, decimal TotalRevenue
);

public record DeptContact(
    int ContactKey, string? FirstName, string? LastName,
    string? Phone, string? Email, bool IsPrimary, bool IsActive
);

public record ScopeDetail(
    int ScopeKey, string? SerialNumber, string? Model, string? Manufacturer,
    string? Type, string? Category, bool IsActive,
    string? LastRepairDate, int RepairCount
);

public record DepartmentUpdate(
    string? Name, string? Address1, string? City, string? State, string? Zip,
    string? Phone, string? ContactFirst, string? ContactLast,
    string? ContactPhone, string? ContactEmail, string? ServiceLocation
);
```

- [ ] **Step 2: Add endpoints**

Add to DepartmentsController:
- `GET /departments/{id}/full` — all department data with counts
- `GET /departments/{id}/kpis` — aggregate repair stats
- `PUT /departments/{id}` — update fields from `DepartmentUpdate`
- `GET /departments/{id}/contacts` — (already exists, enhance with primary flag)
- `POST /departments/{id}/contacts` — add contact
- `PUT /departments/{id}/contacts/{key}` — update contact
- `PUT /departments/{id}/contacts/{key}/primary` — set primary
- `DELETE /departments/{id}/contacts/{key}` — delete contact
- `GET /departments/{id}/scopes/{scopeKey}` — scope detail with repair count + last repair date
- `PUT /departments/{id}/sub-groups` — bulk update (accept array of sub-group keys)
- `GET /departments/{id}/repairs` — paginated repair history

**Important:** Check `db-schema-dump.json` for exact tblDepartment columns. The department contact fields are sContactFirst, sContactLast, sContactPhoneVoice, sContactEMail (note: EMail not Email). Service location may be a separate lookup.

- [ ] **Step 3: Verify build and commit**

```bash
cd server/TSI.Api && dotnet build
git add server/TSI.Api/Models/Department.cs server/TSI.Api/Controllers/DepartmentsController.cs
git commit -m "feat: add department CRUD endpoints for config screen"
```

---

## Task 2: Frontend — Department Types + API Functions

**Files:**
- Modify: `client/src/pages/departments/types.ts`
- Modify: `client/src/api/departments.ts`

- [ ] **Step 1: Add types**

```typescript
export interface DepartmentFull {
  deptKey: number; name: string; clientName: string; clientKey: number; isActive: boolean;
  address1?: string; city?: string; state?: string; zip?: string; phone?: string;
  contactFirst?: string; contactLast?: string; contactPhone?: string; contactEmail?: string;
  serviceLocation?: string;
  scopeCount: number; openRepairs: number;
}

export interface DeptKpis {
  totalRepairs: number; openRepairs: number; avgTat: number; totalRevenue: number;
}

export interface DeptContact {
  contactKey: number; firstName?: string; lastName?: string;
  phone?: string; email?: string; isPrimary: boolean; isActive: boolean;
}

export interface ScopeDetail {
  scopeKey: number; serialNumber?: string; model?: string; manufacturer?: string;
  type?: string; category?: string; isActive: boolean;
  lastRepairDate?: string; repairCount: number;
}

export type SaveState = 'ready' | 'unsaved' | 'saving' | 'saved';
```

- [ ] **Step 2: Add API functions**

```typescript
export const getDepartmentFull = (id: number) => apiClient.get(`/departments/${id}/full`);
export const getDepartmentKpis = (id: number) => apiClient.get(`/departments/${id}/kpis`);
export const updateDepartment = (id: number, data: Partial<DepartmentFull>) =>
  apiClient.put(`/departments/${id}`, data);
export const getDepartmentContacts = (id: number) => apiClient.get(`/departments/${id}/contacts`);
export const addDepartmentContact = (id: number, contact: any) =>
  apiClient.post(`/departments/${id}/contacts`, contact);
export const updateDepartmentContact = (id: number, key: number, data: any) =>
  apiClient.put(`/departments/${id}/contacts/${key}`, data);
export const setDepartmentPrimaryContact = (id: number, key: number) =>
  apiClient.put(`/departments/${id}/contacts/${key}/primary`);
export const deleteDepartmentContact = (id: number, key: number) =>
  apiClient.delete(`/departments/${id}/contacts/${key}`);
export const getScopeDetail = (deptId: number, scopeKey: number) =>
  apiClient.get(`/departments/${deptId}/scopes/${scopeKey}`);
export const updateDepartmentSubGroups = (id: number, subGroupKeys: number[]) =>
  apiClient.put(`/departments/${id}/sub-groups`, subGroupKeys);
export const getDepartmentRepairs = (id: number, params?: any) =>
  apiClient.get(`/departments/${id}/repairs`, { params });
```

- [ ] **Step 3: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/departments/types.ts client/src/api/departments.ts
git commit -m "feat: add department config types and API functions"
```

---

## Task 3: Frontend — DeptToolbar + DeptKpiStrip

**Files:**
- Create: `client/src/pages/departments/DeptToolbar.tsx` + `.css`
- Create: `client/src/pages/departments/DeptKpiStrip.tsx`

- [ ] **Step 1: Build DeptToolbar**

Same pattern as ClientToolbar: dept name (large bold), client name (subtitle, clickable → navigates to `/clients/:clientKey`), dept ID badge, active/inactive toggle, save indicator + save button.

Props: `dept: DepartmentFull`, `saveState: SaveState`, `onSave`, `onToggleActive`

- [ ] **Step 2: Build DeptKpiStrip**

5-chip strip using shared `StatStrip` or local variant:
- Status (green/red), Client (navy, text), Scopes (navy, count), Open Repairs (amber, count), Avg TAT (blue, days)

- [ ] **Step 3: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/departments/DeptToolbar.* client/src/pages/departments/DeptKpiStrip.*
git commit -m "feat: add DeptToolbar and DeptKpiStrip"
```

---

## Task 4: Frontend — ScopeDrawer

**Files:**
- Create: `client/src/pages/departments/ScopeDrawer.tsx` + `.css`

- [ ] **Step 1: Build ScopeDrawer**

600px slide-out drawer from right. Shows scope detail when a scope row is clicked in the Scopes tab.

Header: primary-dark background, scope serial + model as title.

Body sections using `SectionCard` + `Field` + `FormGrid`:
- **Instrument Info**: Serial, Model, Manufacturer, Type (badge), Category, Active toggle
- **Repair History**: mini table of repairs on this scope — WO# (clickable → cockpit), Date, Status, TAT

Props: `scopeKey: number`, `deptKey: number`, `open: boolean`, `onClose`

Fetches `ScopeDetail` via `getScopeDetail`. Also fetches scope repair history.

CSS: Position fixed right, `width: 600px`, `top: 64px`, `bottom: 0`, `transform: translateX(100%)` (closed), `translateX(0)` (open), `transition: transform 0.25s ease`, `z-index: var(--z-drawer)`, `border-left: 1.5px solid var(--border-dk)`, `box-shadow: var(--shadow-dropdown)`.

- [ ] **Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/departments/ScopeDrawer.*
git commit -m "feat: add ScopeDrawer component"
```

---

## Task 5: Frontend — Tab Rewrites (Info, Contacts, Scopes, SubGroups, Repairs)

**Files:**
- Create: `client/src/pages/departments/tabs/InfoTab.tsx`
- Create: `client/src/pages/departments/tabs/ContactsTab.tsx`
- Rewrite: `client/src/pages/departments/tabs/ScopesTab.tsx`
- Rewrite: `client/src/pages/departments/tabs/SubGroupsTab.tsx`
- Create: `client/src/pages/departments/tabs/RepairsTab.tsx`

- [ ] **Step 1: Build InfoTab**

Two-column address layout:

**Left: Billing Address** (SectionCard) — Address1, City, State, Zip, Phone, Contact Name, Contact Email. All inline editable.

**Right: Service Location** (SectionCard) — Location Name, Address fields if they exist in schema.

Props: `dept: DepartmentFull`, `onChange: (field, value) => void`

- [ ] **Step 2: Build ContactsTab**

Table: Name, Phone, Email, Primary (star), Active (toggle).

- "Add Contact" button
- Row click → inline edit
- Star click → set primary via API
- Delete action

Uses API functions from Task 2.

- [ ] **Step 3: Rewrite ScopesTab**

Table with search: Serial #, Model, Manufacturer, Type (StatusBadge), Category, Active, Last Repair.

Row click opens `ScopeDrawer` (pass scopeKey).

Search bar filters the table client-side.

- [ ] **Step 4: Rewrite SubGroupsTab**

Simple table approach (v1, not shuttle):
- Table of assigned sub-groups with name column
- "Add Sub-Group" button opens a dropdown/autocomplete of available sub-groups
- Delete action per row
- Save via bulk update API

- [ ] **Step 5: Build RepairsTab**

KPI strip at top (4 metrics from `/departments/{id}/kpis`).

Table: WO# (clickable → cockpit), Date In, Status (StatusBadge), Scope Type, Serial, TAT, Amount.

Pagination.

- [ ] **Step 6: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/departments/tabs/
git commit -m "feat: rewrite all department tabs for config screen"
```

---

## Task 6: Frontend — DepartmentDetailPane Orchestrator Rewrite

**Files:**
- Rewrite: `client/src/pages/departments/DepartmentDetailPane.tsx`

- [ ] **Step 1: Rewrite as config orchestrator**

Layout:
```
DeptToolbar (name, client link, save indicator)
DeptKpiStrip (5 chips)
TabBar (Info, Contacts, Scopes, Sub-Groups, Repairs)
Tab Content
```

State management (same pattern as Clients):
- `deptFull` — fetched via `getDepartmentFull`
- `kpis` — fetched via `getDepartmentKpis`
- `saveState` — dirty field tracking
- `dirtyFields` — changed field values
- `scopeDrawerKey` — which scope drawer is open (null = closed)

Save flow: same as Clients (Ctrl+S, save indicator states).

Scope drawer: rendered at this level, controlled by `scopeDrawerKey` state. ScopesTab calls `onScopeClick(scopeKey)` → sets state → drawer opens.

- [ ] **Step 2: Verify full build**

```bash
cd client && npx tsc --noEmit && npx vite build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/departments/
git commit -m "feat: departments config screen — full rewrite with drawer and save flow"
```
