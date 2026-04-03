# Clients Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Clients screen as a full configuration hub — inline editing, KPI strip, primary contact designation, flags management, save state tracking, and repair history.

**Architecture:** Split-pane layout (existing) enhanced with a toolbar row (client name, ID badge, save indicator), KPI strip (7 chips), and richer tab content. Inline editing replaces read-only fields. New backend endpoints for CRUD operations on clients, contacts, and flags. Save flow uses dirty state tracking with Ctrl+S support.

**Tech Stack:** React 19, TypeScript, Ant Design 5 (minimal), CSS modules, ASP.NET Core 8, raw SqlClient

**Spec:** `docs/superpowers/specs/2026-04-02-clients-config-design.md`

**DB Schema Reference:** `C:/Projects/tsi-redesign/tasks/db-schema-dump.json`

---

## File Structure

### Backend
- Modify: `server/TSI.Api/Models/Client.cs` — add ClientFull, ClientKpis records
- Modify: `server/TSI.Api/Controllers/ClientsController.cs` — add /full, /kpis, PUT, POST, DELETE endpoints, contact CRUD, flag CRUD

### Frontend Types
- Modify: `client/src/pages/clients/types.ts` — add ClientFull, ClientKpis, SaveState types

### Frontend API
- Modify: `client/src/api/clients.ts` — add CRUD functions

### Frontend Components
- Create: `client/src/pages/clients/ClientToolbar.tsx` + `.css` — name, ID badge, save indicator, actions
- Create: `client/src/pages/clients/ClientKpiStrip.tsx` — 7-chip stat strip
- Rewrite: `client/src/pages/clients/ClientDetailPane.tsx` — orchestrator with inline editing
- Create: `client/src/pages/clients/tabs/InfoTab.tsx` — editable client fields
- Rewrite: `client/src/pages/clients/tabs/ContactsTab.tsx` — inline editing + primary designation
- Rewrite: `client/src/pages/clients/tabs/FlagsTab.tsx` — inline add/edit
- Create: `client/src/pages/clients/tabs/RepairHistoryTab.tsx` — repair table + KPIs

---

## Task 1: Backend — Client CRUD Models + Endpoints

**Files:**
- Modify: `server/TSI.Api/Models/Client.cs`
- Modify: `server/TSI.Api/Controllers/ClientsController.cs`

- [ ] **Step 1: Add new models to Client.cs**

```csharp
public record ClientFull(
    int ClientKey, string Name, bool IsActive,
    string? Address1, string? Address2, string? City, string? State, string? Zip,
    string? Phone, string? Fax, string? Email, string? ContactName,
    string? BillingEmail, string? PricingCategory, int? PricingCategoryKey,
    string? PaymentTerms, int? PaymentTermsKey,
    string? SalesRep, int? SalesRepKey,
    string? ContractNumber, string? Distributor, int? DistributorKey,
    bool? IsGPO, bool? IsNewCustomer, string? CustomerSince
);

public record ClientKpis(
    int TotalRepairs, int OpenRepairs, decimal AvgTat, decimal TotalRevenue
);

public record ClientUpdate(
    string? Name, string? Address1, string? Address2,
    string? City, string? State, string? Zip,
    string? Phone, string? Fax, string? BillingEmail,
    int? PricingCategoryKey, int? PaymentTermsKey, int? SalesRepKey,
    string? ContractNumber, int? DistributorKey, bool? IsGPO
);

public record ContactCreate(
    string FirstName, string LastName, string? Phone, string? Fax, string? Email
);

public record FlagCreate(
    string FlagType, string Flag, bool VisibleOnDI, bool VisibleOnBlank
);
```

- [ ] **Step 2: Add endpoints**

Add to ClientsController:
- `GET /clients/{id}/full` — joins tblClient with pricing, terms, rep, distributor lookups
- `GET /clients/{id}/kpis` — aggregate query: count repairs, count open, avg TAT, sum revenue from tblRepair
- `PUT /clients/{id}` — update client fields from `ClientUpdate` body
- `POST /clients` — create new client, return created record
- `PUT /clients/{id}/deactivate` — set bActive = 0
- `DELETE /clients/{id}` — hard delete (check no linked repairs first, return 409 if linked)
- `POST /clients/{id}/contacts` — insert into contact table (check schema for table name — may be a sub-table or fields on tblClient)
- `PUT /clients/{id}/contacts/{key}` — update contact
- `PUT /clients/{id}/contacts/{key}/primary` — set IsPrimary flag (unset previous primary)
- `DELETE /clients/{id}/contacts/{key}` — delete contact
- `POST /clients/{id}/flags` — insert flag
- `PUT /clients/{id}/flags/{key}` — update flag
- `DELETE /clients/{id}/flags/{key}` — delete flag
- `GET /clients/{id}/repairs` — paginated repair history (reuse existing repair list query filtered by client)

**Important:** Check `db-schema-dump.json` for exact table/column names before writing SQL. The contacts and flags may use separate tables or may be embedded in tblClient — verify.

- [ ] **Step 3: Verify build and commit**

```bash
cd server/TSI.Api && dotnet build
git add server/TSI.Api/Models/Client.cs server/TSI.Api/Controllers/ClientsController.cs
git commit -m "feat: add client CRUD endpoints for config screen"
```

---

## Task 2: Frontend — Client Types + API Functions

**Files:**
- Modify: `client/src/pages/clients/types.ts`
- Modify: `client/src/api/clients.ts`

- [ ] **Step 1: Add types**

```typescript
export interface ClientFull {
  clientKey: number; name: string; isActive: boolean;
  address1?: string; address2?: string; city?: string; state?: string; zip?: string;
  phone?: string; fax?: string; email?: string; contactName?: string;
  billingEmail?: string; pricingCategory?: string; pricingCategoryKey?: number;
  paymentTerms?: string; paymentTermsKey?: number;
  salesRep?: string; salesRepKey?: number;
  contractNumber?: string; distributor?: string; distributorKey?: number;
  isGPO?: boolean; isNewCustomer?: boolean; customerSince?: string;
}

export interface ClientKpis {
  totalRepairs: number; openRepairs: number; avgTat: number; totalRevenue: number;
}

export type SaveState = 'ready' | 'unsaved' | 'saving' | 'saved';
```

- [ ] **Step 2: Add API functions**

```typescript
export const getClientFull = (id: number) => apiClient.get(`/clients/${id}/full`);
export const getClientKpis = (id: number) => apiClient.get(`/clients/${id}/kpis`);
export const updateClient = (id: number, data: Partial<ClientFull>) => apiClient.put(`/clients/${id}`, data);
export const createClient = (data: Partial<ClientFull>) => apiClient.post('/clients', data);
export const deactivateClient = (id: number) => apiClient.put(`/clients/${id}/deactivate`);
export const deleteClient = (id: number) => apiClient.delete(`/clients/${id}`);
export const addClientContact = (id: number, contact: any) => apiClient.post(`/clients/${id}/contacts`, contact);
export const updateClientContact = (id: number, contactKey: number, data: any) =>
  apiClient.put(`/clients/${id}/contacts/${contactKey}`, data);
export const setClientPrimaryContact = (id: number, contactKey: number) =>
  apiClient.put(`/clients/${id}/contacts/${contactKey}/primary`);
export const deleteClientContact = (id: number, contactKey: number) =>
  apiClient.delete(`/clients/${id}/contacts/${contactKey}`);
export const addClientFlag = (id: number, flag: any) => apiClient.post(`/clients/${id}/flags`, flag);
export const updateClientFlag = (id: number, flagKey: number, data: any) =>
  apiClient.put(`/clients/${id}/flags/${flagKey}`, data);
export const deleteClientFlag = (id: number, flagKey: number) =>
  apiClient.delete(`/clients/${id}/flags/${flagKey}`);
export const getClientRepairs = (id: number, params?: any) =>
  apiClient.get(`/clients/${id}/repairs`, { params });
```

- [ ] **Step 3: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/clients/types.ts client/src/api/clients.ts
git commit -m "feat: add client config types and API functions"
```

---

## Task 3: Frontend — ClientToolbar + ClientKpiStrip

**Files:**
- Create: `client/src/pages/clients/ClientToolbar.tsx` + `.css`
- Create: `client/src/pages/clients/ClientKpiStrip.tsx`

- [ ] **Step 1: Build ClientToolbar**

Toolbar row with: client name (large bold), ID badge (#3502), active/inactive toggle, save indicator (Ready/Unsaved/Saving/Saved with colored dots), Save button (enabled when unsaved), overflow menu (Deactivate, Delete with confirmation modals).

Props: `client: ClientFull`, `saveState: SaveState`, `onSave`, `onToggleActive`, `onDelete`

CSS: flex row, `padding: 8px 16px`, `border-bottom: 1px solid var(--neutral-200)`, `background: var(--card)`.

Save indicator states:
- Ready: green dot + "Ready" text
- Unsaved: amber dot + "Unsaved" text
- Saving: spinner + "Saving..." text
- Saved: green checkmark + "Saved" text (fades to Ready after 2s)

- [ ] **Step 2: Build ClientKpiStrip**

Use the shared `StatStrip` component with 7 chips:

```typescript
const chips: StatChipDef[] = [
  { id: 'status', label: 'STATUS', value: null, color: client.isActive ? 'green' : 'red' },
  // For status, override the value display to show "Active"/"Inactive" text
  // May need a custom chip or just use the value number as 1/0
  { id: 'rep', label: 'REP', value: null, color: 'navy' },
  { id: 'pricing', label: 'PRICING', value: null, color: 'blue' },
  { id: 'terms', label: 'TERMS', value: null, color: 'blue' },
  { id: 'revenue', label: 'REVENUE YTD', value: kpis.totalRevenue, color: 'green' },
  { id: 'openRepairs', label: 'OPEN REPAIRS', value: kpis.openRepairs, color: 'amber' },
  { id: 'scopes', label: 'SCOPES', value: scopeCount, color: 'navy' },
];
```

Note: Some chips show text labels (rep name, pricing tier) not numbers. If the shared `StatStrip` only supports `value: number`, create a local `ClientKpiStrip` component that renders a similar strip but with text values. Follow the same CSS classes from `StatStrip.css`.

- [ ] **Step 3: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/clients/ClientToolbar.* client/src/pages/clients/ClientKpiStrip.*
git commit -m "feat: add ClientToolbar and ClientKpiStrip components"
```

---

## Task 4: Frontend — InfoTab with Inline Editing

**Files:**
- Create: `client/src/pages/clients/tabs/InfoTab.tsx`

- [ ] **Step 1: Build InfoTab**

Two-column layout with `SectionCard` and `FormGrid`:

**Left: Company Information** — Name, Address1, Address2, City, State, Zip, Phone, Fax (all editable via `<input>` fields styled like the shared `Field` but with edit mode)

**Left: Billing Information** — Billing Email, Payment Terms (dropdown), Pricing Category (dropdown), Sales Rep (dropdown)

**Right: Account Settings** — Customer Since (read-only), Contract Number (editable), Distributor (dropdown), GPO toggle, New Customer toggle

Each field: clicking switches from display mode (looks like `Field` component) to edit mode (styled input). Use a simple `EditableField` pattern — `contentEditable` or controlled input that looks like the readonly field until focused.

Props: `client: ClientFull`, `onChange: (field, value) => void`

- [ ] **Step 2: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/clients/tabs/InfoTab.tsx
git commit -m "feat: add InfoTab with inline editing"
```

---

## Task 5: Frontend — ContactsTab + FlagsTab + RepairHistoryTab

**Files:**
- Rewrite: `client/src/pages/clients/tabs/ContactsTab.tsx`
- Rewrite: `client/src/pages/clients/tabs/FlagsTab.tsx`
- Create: `client/src/pages/clients/tabs/RepairHistoryTab.tsx`

- [ ] **Step 1: Rewrite ContactsTab**

Table with columns: Name, Title, Phone, Fax, Email, Primary (star icon), Active (toggle).

- "Add Contact" button above table
- Row click → inline edit mode
- Star icon click → sets primary contact (API call)
- Delete via row action

Uses: Ant `Table` (or shared `DataTable`), API functions from Task 2.

- [ ] **Step 2: Rewrite FlagsTab**

Table with columns: Flag Type, Flag, Visible on D&I (toggle), Visible on Blank (toggle), Active (toggle).

- "Add Flag" button opens a new row in edit mode
- Inline editing for all fields
- Delete via row action

- [ ] **Step 3: Build RepairHistoryTab**

KPI strip at top (Total Repairs, Open, Avg TAT, Revenue — from `/clients/{id}/kpis`).

Table below: WO# (clickable → navigate to cockpit), Date In, Status (StatusBadge), Department, Scope Type, Serial, TAT, Amount.

Pagination support.

- [ ] **Step 4: Verify and commit**

```bash
cd client && npx tsc --noEmit
git add client/src/pages/clients/tabs/
git commit -m "feat: rewrite ContactsTab, FlagsTab + add RepairHistoryTab"
```

---

## Task 6: Frontend — ClientDetailPane Orchestrator Rewrite

**Files:**
- Rewrite: `client/src/pages/clients/ClientDetailPane.tsx`

- [ ] **Step 1: Rewrite as config orchestrator**

Layout:
```
ClientToolbar (name, ID, save indicator, actions)
ClientKpiStrip (7 chips)
TabBar (Info, Contacts, Departments, Flags, Repair History)
Tab Content
```

State management:
- `clientFull` — fetched via `getClientFull`
- `kpis` — fetched via `getClientKpis`
- `saveState` — tracks dirty fields
- `dirtyFields` — object of changed field values

Save flow:
- Any field change → `saveState = 'unsaved'`, field value stored in `dirtyFields`
- Save button click (or Ctrl+S) → `saveState = 'saving'`, call `updateClient`, on success → `saveState = 'saved'`, after 2s → `saveState = 'ready'`

Keyboard shortcut: `useEffect` listener for Ctrl+S → trigger save.

- [ ] **Step 2: Verify full build**

```bash
cd client && npx tsc --noEmit && npx vite build
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/clients/
git commit -m "feat: clients config screen — full rewrite with inline editing and save flow"
```
