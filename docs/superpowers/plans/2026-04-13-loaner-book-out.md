# Loaner Book-Out Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Task-driven loaner fulfillment with an outgoing evaluation gate that auto-creates repair WOs on inspection failure.

**Architecture:** Backend adds 4 new endpoints to LoanersController (available scopes, book-out, check-in, eval-fail). Frontend adds a `FulfillLoanerModal` triggered from the dashboard task list that walks through scope picker → inspection → book-out. The existing loaner list removes the "Check Out" button and becomes a status dashboard.

**Tech Stack:** ASP.NET Core 8 (SqlClient), React 19, TypeScript, Ant Design 5, CSS variables

**Spec:** `docs/superpowers/specs/2026-04-13-loaner-book-out-design.md`

---

## Pre-Requisite: Data Migration

tblTasks, tblTaskLoaners, tblTaskTypes, tblTaskPriorities, tblTaskStatuses, and tblTaskStatusHistory must be migrated to Azure SQL before this plan can execute. Run the migration script:

```powershell
.\scripts\migrate-data.ps1 -AzurePassword "TsiDev2026!" -Tables @("tblTaskTypes","tblTaskPriorities","tblTaskStatuses","tblTaskStatusHistory","tblTasks","tblTaskLoaners")
```

## Schema Changes (Steve Deploys)

The following ALTER TABLE statements are required. They must be surfaced as **DevNotice** components in the UI so Steve knows what to run. The backend endpoints should use `ISNULL()` / null-safe patterns so they still work before the columns are added.

```sql
ALTER TABLE tblLoanerTran ADD lTaskKey int NULL;
ALTER TABLE tblLoanerTran ADD sOutgoingInspection nvarchar(max) NULL;
```

**Implementation rule:** Every UI action that depends on these columns (FulfillLoanerModal "Book Out & Ship" button, eval-fail "Report Failure" button) must be wrapped in a `<DevNotice>` explaining the required schema changes until Steve confirms they are deployed.

---

## File Map

### Backend (server/TSI.Api/)

| File | Action | Responsibility |
|------|--------|----------------|
| `Controllers/LoanersController.cs` | Modify | Add 4 new endpoints: GetAvailable, BookOut (replaces CheckOut), CheckIn (update existing), EvalFail |
| `Controllers/DeliveryMethodsController.cs` | Create | GET /api/delivery-methods lookup |
| `Models/LoanerModels.cs` | Modify | Add DTOs: AvailableScopeDto, BookOutRequest, EvalFailRequest |

### Frontend (client/src/)

| File | Action | Responsibility |
|------|--------|----------------|
| `pages/loaners/types.ts` | Modify | Add AvailableScope, BookOutPayload, EvalFailPayload, InspectionResult types |
| `api/loaners.ts` | Modify | Add getAvailableScopes, bookOutLoaner, evalFailLoaner API functions |
| `api/deliveryMethods.ts` | Create | getDeliveryMethods lookup |
| `pages/loaners/FulfillLoanerModal.tsx` | Create | 3-step modal: scope picker → inspection → book-out form |
| `pages/loaners/FulfillLoanerModal.css` | Create | Modal styles |
| `pages/loaners/InspectionChecklist.tsx` | Create | Reusable P/F checklist extracted from FinalInspectionForm categories |
| `pages/loaners/LoanersPage.tsx` | Modify | Remove "Check Out" button on Available rows, update stat strip |
| `pages/dashboard/DashboardPage.tsx` | Modify | Add "Fulfill Loaner" action on task rows that have loaner requests |
| `pages/dashboard/types.ts` | Modify | Add hasLoanerRequest flag to DashboardTask |

---

## Task 1: Delivery Methods Lookup Endpoint

**Files:**
- Create: `server/TSI.Api/Controllers/DeliveryMethodsController.cs`

- [ ] **Step 1: Create the controller**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace TSI.Api.Controllers;

[ApiController]
[Route("api/delivery-methods")]
[Authorize]
public class DeliveryMethodsController(IConfiguration config) : ControllerBase
{
    private SqlConnection CreateConnection() =>
        new(config.GetConnectionString("DefaultConnection")!);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync();

        const string sql = """
            SELECT lDeliveryMethodKey, ISNULL(sDeliveryDesc, '') AS Description
            FROM tblDeliveryMethod
            ORDER BY sDeliveryDesc
            """;

        await using var cmd = new SqlCommand(sql, conn);
        cmd.CommandTimeout = 30;
        await using var reader = await cmd.ExecuteReaderAsync();

        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                key = Convert.ToInt32(reader["lDeliveryMethodKey"]),
                description = reader["Description"]?.ToString() ?? ""
            });
        }

        return Ok(items);
    }
}
```

- [ ] **Step 2: Build and verify**

Run: `cd server && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded, 0 errors

- [ ] **Step 3: Commit**

```bash
git add server/TSI.Api/Controllers/DeliveryMethodsController.cs
git commit -m "feat: add delivery methods lookup endpoint"
```

---

## Task 2: Available Scopes Endpoint

**Files:**
- Modify: `server/TSI.Api/Controllers/LoanersController.cs`

- [ ] **Step 1: Add GetAvailable endpoint after the category-availability endpoint**

Add this method to LoanersController, after the `GetCategoryAvailability` method (around line 419):

```csharp
// ── Available scopes for fulfillment ────────────────────────────────
[HttpGet("available")]
public async Task<IActionResult> GetAvailable([FromQuery] int? scopeTypeKey = null)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();

    // Available = loaner scopes where latest tran has sDateIn set OR no tran exists
    var scopeTypeFilter = scopeTypeKey.HasValue ? "AND s.lScopeTypeKey = @scopeTypeKey" : "";

    var sql = $"""
        ;WITH LatestTran AS (
            SELECT lScopeKey, MAX(lLoanerTranKey) AS MaxTranKey
            FROM tblLoanerTran
            WHERE lScopeKey IS NOT NULL
            GROUP BY lScopeKey
        )
        SELECT s.lScopeKey,
               ISNULL(s.sSerialNumber, '') AS Serial,
               ISNULL(st.sScopeTypeDesc, '') AS ScopeType,
               ISNULL(stc.sScopeTypeCategory, '') AS Category,
               ISNULL(s.sLoanerRackPosition, '') AS RackPosition,
               ISNULL(s.bOnSiteLoaner, 0) AS OnSiteLoaner
        FROM tblScope s
        INNER JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
        LEFT JOIN LatestTran lat ON lat.lScopeKey = s.lScopeKey
        LEFT JOIN tblLoanerTran lt ON lt.lLoanerTranKey = lat.MaxTranKey
        WHERE (lat.MaxTranKey IS NULL OR lt.sDateIn IS NOT NULL OR lt.sDateOut IS NULL)
          AND EXISTS (
              SELECT 1 FROM tblLoanerTran lt2 WHERE lt2.lScopeKey = s.lScopeKey
              UNION ALL
              SELECT 1 WHERE ISNULL(s.bOnSiteLoaner, 0) = 1
          )
          {scopeTypeFilter}
        ORDER BY st.sScopeTypeDesc, s.sSerialNumber
        """;

    await using var cmd = new SqlCommand(sql, conn);
    cmd.CommandTimeout = 30;
    if (scopeTypeKey.HasValue)
        cmd.Parameters.AddWithValue("@scopeTypeKey", scopeTypeKey.Value);

    await using var reader = await cmd.ExecuteReaderAsync();
    var items = new List<object>();
    while (await reader.ReadAsync())
    {
        items.Add(new
        {
            scopeKey = Convert.ToInt32(reader["lScopeKey"]),
            serial = reader["Serial"]?.ToString() ?? "",
            scopeType = reader["ScopeType"]?.ToString() ?? "",
            category = reader["Category"]?.ToString() ?? "",
            rackPosition = reader["RackPosition"]?.ToString() ?? "",
            onSiteLoaner = Convert.ToBoolean(reader["OnSiteLoaner"])
        });
    }

    return Ok(items);
}
```

- [ ] **Step 2: Build and verify**

Run: `cd server && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded, 0 errors

- [ ] **Step 3: Commit**

```bash
git add server/TSI.Api/Controllers/LoanersController.cs
git commit -m "feat: add available scopes endpoint for loaner fulfillment"
```

---

## Task 3: Book-Out Endpoint (replaces check-out)

**Files:**
- Modify: `server/TSI.Api/Controllers/LoanersController.cs`
- Modify: `server/TSI.Api/Models/LoanerModels.cs`

- [ ] **Step 1: Add BookOutRequest to LoanerModels.cs**

Add after the existing `CheckInRequest` record:

```csharp
public record BookOutRequest(
    int ScopeKey,
    int DepartmentKey,
    int DeliveryMethodKey,
    int SalesRepKey,
    int? TaskKey,
    string? PurchaseOrder,
    string? TrackingNumber,
    bool OnSiteLoaner,
    string? OutgoingInspection  // JSON blob of pass/fail results
);
```

- [ ] **Step 2: Add BookOut endpoint to LoanersController**

Add this method after the existing CheckOut endpoint. The existing CheckOut endpoint stays for backward compatibility but the new BookOut is the primary path:

```csharp
// ── Book Out (task-driven fulfillment with inspection) ──────────────
[HttpPost("book-out")]
public async Task<IActionResult> BookOut([FromBody] BookOutRequest body)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();

    var dateOut = DateTime.Now.ToString("yyyyMMddHHmmss");

    var sql = """
        INSERT INTO tblLoanerTran
            (lScopeKey, lDepartmentKey, lDeliveryMethodKey, lSalesRepKey,
             sPurchaseOrder, sTrackingNumber, sDateOut, lTaskKey,
             sOutgoingInspection, dtCreateDate, lCreateUser)
        VALUES
            (@scopeKey, @deptKey, @deliveryKey, @repKey,
             @po, @tracking, @dateOut, @taskKey,
             @inspection, GETDATE(), 1);
        SELECT SCOPE_IDENTITY();
        """;

    await using var cmd = new SqlCommand(sql, conn);
    cmd.CommandTimeout = 30;
    cmd.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
    cmd.Parameters.AddWithValue("@deptKey", body.DepartmentKey);
    cmd.Parameters.AddWithValue("@deliveryKey", body.DeliveryMethodKey);
    cmd.Parameters.AddWithValue("@repKey", body.SalesRepKey);
    cmd.Parameters.AddWithValue("@po", (object?)body.PurchaseOrder ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@tracking", (object?)body.TrackingNumber ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@dateOut", dateOut);
    cmd.Parameters.AddWithValue("@taskKey", (object?)body.TaskKey ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@inspection", (object?)body.OutgoingInspection ?? DBNull.Value);

    var newKey = Convert.ToInt32(await cmd.ExecuteScalarAsync());

    if (body.OnSiteLoaner)
    {
        await using var cmd2 = new SqlCommand(
            "UPDATE tblScope SET bOnSiteLoaner = 1 WHERE lScopeKey = @scopeKey", conn);
        cmd2.CommandTimeout = 30;
        cmd2.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
        await cmd2.ExecuteNonQueryAsync();
    }

    return Ok(new { loanerTranKey = newKey });
}
```

- [ ] **Step 3: Build and verify**

Run: `cd server && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded, 0 errors

- [ ] **Step 4: Commit**

```bash
git add server/TSI.Api/Controllers/LoanersController.cs server/TSI.Api/Models/LoanerModels.cs
git commit -m "feat: add book-out endpoint for task-driven loaner fulfillment"
```

---

## Task 4: Eval-Fail Endpoint (auto-create repair)

**Files:**
- Modify: `server/TSI.Api/Controllers/LoanersController.cs`
- Modify: `server/TSI.Api/Models/LoanerModels.cs`

- [ ] **Step 1: Add EvalFailRequest to LoanerModels.cs**

Add after `BookOutRequest`:

```csharp
public record EvalFailRequest(
    int ScopeKey,
    int? TaskKey,
    string? FailedItems  // JSON: which inspection items failed
);
```

- [ ] **Step 2: Add EvalFail endpoint to LoanersController**

This creates a repair WO under TSI's internal department, creates a loaner tran with the repair link, and returns the new repair key:

```csharp
// ── Eval Fail (auto-create repair for failed inspection) ────────────
[HttpPost("eval-fail")]
public async Task<IActionResult> EvalFail([FromBody] EvalFailRequest body)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();

    // Step 1: Get scope type info for WO generation
    await using var scopeCmd = new SqlCommand(
        "SELECT lScopeTypeKey FROM tblScope WHERE lScopeKey = @scopeKey", conn);
    scopeCmd.CommandTimeout = 30;
    scopeCmd.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
    var scopeTypeKeyObj = await scopeCmd.ExecuteScalarAsync();
    if (scopeTypeKeyObj == null || scopeTypeKeyObj == DBNull.Value)
        return NotFound("Scope not found");

    // Step 2: Generate next WO number
    await using var woCmd = new SqlCommand(
        "SELECT ISNULL(MAX(CAST(sWorkOrderNumber AS INT)), 0) + 1 FROM tblRepair WHERE ISNUMERIC(sWorkOrderNumber) = 1", conn);
    woCmd.CommandTimeout = 30;
    var nextWo = Convert.ToInt32(await woCmd.ExecuteScalarAsync());

    // Step 3: Create repair under TSI internal department (lDepartmentKey = 1 for TSI loaner repairs)
    // NOTE: Verify the correct TSI internal department key before deploying
    var repairSql = """
        SET IDENTITY_INSERT tblRepair OFF;
        DISABLE TRIGGER ALL ON tblRepair;
        INSERT INTO tblRepair
            (lScopeKey, sWorkOrderNumber, bLoanerRequested, dtCreateDate, lCreateUser)
        VALUES
            (@scopeKey, @wo, 0, GETDATE(), 1);
        ENABLE TRIGGER ALL ON tblRepair;
        SELECT SCOPE_IDENTITY();
        """;

    await using var repairCmd = new SqlCommand(repairSql, conn);
    repairCmd.CommandTimeout = 30;
    repairCmd.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
    repairCmd.Parameters.AddWithValue("@wo", nextWo.ToString());

    var repairKey = Convert.ToInt32(await repairCmd.ExecuteScalarAsync());

    // Step 4: Create a loaner tran linked to the repair (scope goes to "Repair" status)
    var tranSql = """
        INSERT INTO tblLoanerTran
            (lScopeKey, lRepairKey, lTaskKey, sOutgoingInspection, dtCreateDate, lCreateUser)
        VALUES
            (@scopeKey, @repairKey, @taskKey, @failedItems, GETDATE(), 1);
        SELECT SCOPE_IDENTITY();
        """;

    await using var tranCmd = new SqlCommand(tranSql, conn);
    tranCmd.CommandTimeout = 30;
    tranCmd.Parameters.AddWithValue("@scopeKey", body.ScopeKey);
    tranCmd.Parameters.AddWithValue("@repairKey", repairKey);
    tranCmd.Parameters.AddWithValue("@taskKey", (object?)body.TaskKey ?? DBNull.Value);
    tranCmd.Parameters.AddWithValue("@failedItems", (object?)body.FailedItems ?? DBNull.Value);

    var tranKey = Convert.ToInt32(await tranCmd.ExecuteScalarAsync());

    return Ok(new { repairKey, loanerTranKey = tranKey, workOrder = nextWo.ToString() });
}
```

- [ ] **Step 3: Build and verify**

Run: `cd server && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded, 0 errors

- [ ] **Step 4: Commit**

```bash
git add server/TSI.Api/Controllers/LoanersController.cs server/TSI.Api/Models/LoanerModels.cs
git commit -m "feat: add eval-fail endpoint — auto-creates repair WO on inspection failure"
```

---

## Task 5: Frontend Types & API Client

**Files:**
- Modify: `client/src/pages/loaners/types.ts`
- Modify: `client/src/api/loaners.ts`
- Create: `client/src/api/deliveryMethods.ts`

- [ ] **Step 1: Add types to `client/src/pages/loaners/types.ts`**

Add after the existing `LoanerScopeNeedItem` interface:

```typescript
export interface AvailableScope {
  scopeKey: number;
  serial: string;
  scopeType: string;
  category: string;
  rackPosition: string;
  onSiteLoaner: boolean;
}

export interface BookOutPayload {
  scopeKey: number;
  departmentKey: number;
  deliveryMethodKey: number;
  salesRepKey: number;
  taskKey?: number;
  purchaseOrder?: string;
  trackingNumber?: string;
  onSiteLoaner: boolean;
  outgoingInspection?: string;  // JSON blob
}

export interface EvalFailPayload {
  scopeKey: number;
  taskKey?: number;
  failedItems?: string;  // JSON blob
}

export interface InspectionItem {
  label: string;
  field: string;
  result: 'P' | 'F' | '';
}

export interface DeliveryMethod {
  key: number;
  description: string;
}
```

- [ ] **Step 2: Add API functions to `client/src/api/loaners.ts`**

Add these imports to the existing import block:

```typescript
import type {
  // ... existing imports ...
  AvailableScope,
  BookOutPayload,
  EvalFailPayload,
} from '../pages/loaners/types';
```

Add these functions at the end of the file:

```typescript
export const getAvailableScopes = (scopeTypeKey?: number) =>
  apiClient.get<AvailableScope[]>('/loaners/available', {
    params: scopeTypeKey ? { scopeTypeKey } : undefined,
  }).then((r) => r.data);

export const bookOutLoaner = (payload: BookOutPayload) =>
  apiClient.post<{ loanerTranKey: number }>('/loaners/book-out', payload).then((r) => r.data);

export const evalFailLoaner = (payload: EvalFailPayload) =>
  apiClient.post<{ repairKey: number; loanerTranKey: number; workOrder: string }>(
    '/loaners/eval-fail', payload
  ).then((r) => r.data);
```

- [ ] **Step 3: Create `client/src/api/deliveryMethods.ts`**

```typescript
import apiClient from './client';
import type { DeliveryMethod } from '../pages/loaners/types';

export const getDeliveryMethods = () =>
  apiClient.get<DeliveryMethod[]>('/delivery-methods').then((r) => r.data);
```

- [ ] **Step 4: Check for TypeScript errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (or only pre-existing ones unrelated to our changes)

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/loaners/types.ts client/src/api/loaners.ts client/src/api/deliveryMethods.ts
git commit -m "feat: add loaner book-out types and API client functions"
```

---

## Task 6: Inspection Checklist Component

**Files:**
- Create: `client/src/pages/loaners/InspectionChecklist.tsx`
- Create: `client/src/pages/loaners/InspectionChecklist.css`

This extracts the P/F checklist pattern from `FinalInspectionForm.tsx` into a reusable interactive component. The FinalInspectionForm is a read-only print form — this component is interactive (click to toggle P/F).

- [ ] **Step 1: Create `InspectionChecklist.tsx`**

```tsx
import { useState } from 'react';
import './InspectionChecklist.css';

interface InspectionCategory {
  name: string;
  items: { label: string; field: string }[];
}

// Same categories as FinalInspectionForm INSPECTION_CATEGORIES
const FLEX_CATEGORIES: InspectionCategory[] = [
  { name: 'LEAK & PRESSURE TESTING', items: [
    { label: 'Leak Test — Immersion', field: 'insLeakPF' },
    { label: 'Hot / Cold Leak Test', field: 'insHotColdLeakPF' },
    { label: 'Air / Water System', field: 'insAirWaterPF' },
    { label: 'Suction Channel', field: 'insSuctionPF' },
    { label: 'Forcep / Biopsy Channel', field: 'insForcepChannelPF' },
    { label: 'Aux Water Channel', field: 'insAuxWaterPF' },
  ]},
  { name: 'IMAGE & OPTICS', items: [
    { label: 'Image Clarity & Focus', field: 'insImagePF' },
    { label: 'Image Centration', field: 'insImageCentrationPF' },
    { label: 'Focal Distance', field: 'insFocalDistancePF' },
    { label: 'Light Transmission', field: 'insFiberLightTransPF' },
    { label: 'Vision / Field of View', field: 'insVisionPF' },
    { label: 'Eye Piece', field: 'insEyePiecePF' },
    { label: 'Light Fibers', field: 'insLightFibersPF' },
  ]},
  { name: 'ANGULATION & MECHANICAL', items: [
    { label: 'Angulation — All 4 Directions', field: 'insAngulationPF' },
    { label: 'Insertion Tube Integrity', field: 'insInsertionTubePF' },
    { label: 'Alcohol Wipe / External', field: 'insAlcoholWipePF' },
    { label: 'Fog Test', field: 'insFogPF' },
  ]},
];

const RIGID_CATEGORIES: InspectionCategory[] = [
  { name: 'FUNCTIONAL TESTS', items: [
    { label: 'Optical Clarity / Image Quality', field: 'rigidImagePF' },
    { label: 'Light Transmission', field: 'rigidLightTransPF' },
    { label: 'Rod Lens Integrity', field: 'rigidRodLensPF' },
    { label: 'Working Channel / Sheath', field: 'rigidChannelPF' },
    { label: 'Ocular / Eyepiece', field: 'rigidOcularPF' },
    { label: 'Light Post / Connector', field: 'rigidLightPostPF' },
    { label: 'Sheath / Tube Straightness', field: 'rigidSheathPF' },
    { label: 'Coupler / Camera Attachment', field: 'rigidCouplerPF' },
    { label: 'Irrigation / Insufflation Ports', field: 'rigidPortsPF' },
    { label: 'Cosmetic / Exterior Condition', field: 'rigidCosmeticPF' },
  ]},
];

const CAMERA_CATEGORIES: InspectionCategory[] = [
  { name: 'CAMERA TESTS', items: [
    { label: 'Camera Cable', field: 'camCablePF' },
    { label: 'Cable Connector', field: 'camConnectorPF' },
    { label: 'Lens Cleaned', field: 'camLensPF' },
    { label: 'Control Buttons', field: 'camButtonsPF' },
    { label: 'Focus', field: 'camFocusPF' },
    { label: 'Video Appearance', field: 'camVideoPF' },
    { label: 'White Balance', field: 'camWhiteBalPF' },
  ]},
];

function getCategoriesForType(category: string): InspectionCategory[] {
  const c = category.toLowerCase();
  if (c.includes('rigid')) return RIGID_CATEGORIES;
  if (c.includes('camera')) return CAMERA_CATEGORIES;
  return FLEX_CATEGORIES; // default to flex
}

interface Props {
  category: string;  // scope type category: 'Flexible', 'Rigid', 'Camera'
  onComplete: (results: Record<string, string>, allPassed: boolean) => void;
}

export const InspectionChecklist = ({ category, onComplete }: Props) => {
  const categories = getCategoriesForType(category);
  const allFields = categories.flatMap(c => c.items.map(i => i.field));
  const [results, setResults] = useState<Record<string, string>>(
    Object.fromEntries(allFields.map(f => [f, '']))
  );

  const toggle = (field: string) => {
    setResults(prev => {
      const current = prev[field];
      const next = current === '' ? 'P' : current === 'P' ? 'F' : '';
      return { ...prev, [field]: next };
    });
  };

  const allMarked = allFields.every(f => results[f] === 'P' || results[f] === 'F');
  const anyFailed = allFields.some(f => results[f] === 'F');
  const allPassed = allMarked && !anyFailed;

  const handleComplete = () => {
    onComplete(results, allPassed);
  };

  return (
    <div className="inspection-checklist">
      {categories.map(cat => (
        <div key={cat.name} className="inspection-checklist__category">
          <div className="inspection-checklist__category-name">{cat.name}</div>
          {cat.items.map(item => {
            const v = results[item.field];
            return (
              <div
                key={item.field}
                className="inspection-checklist__item"
                onClick={() => toggle(item.field)}
              >
                <span className="inspection-checklist__label">{item.label}</span>
                <span className={`inspection-checklist__pf ${
                  v === 'P' ? 'inspection-checklist__pf--pass' :
                  v === 'F' ? 'inspection-checklist__pf--fail' :
                  'inspection-checklist__pf--empty'
                }`}>
                  {v || '—'}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      <div className="inspection-checklist__footer">
        {anyFailed && (
          <div className="inspection-checklist__warning">
            {allFields.filter(f => results[f] === 'F').length} item(s) failed — scope will go to repair
          </div>
        )}
        <button
          className={`inspection-checklist__btn ${anyFailed ? 'inspection-checklist__btn--fail' : 'inspection-checklist__btn--pass'}`}
          disabled={!allMarked}
          onClick={handleComplete}
        >
          {!allMarked ? 'Mark all items' : anyFailed ? 'Report Failure' : 'Inspection Passed'}
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create `InspectionChecklist.css`**

```css
.inspection-checklist { padding: 12px 0; }

.inspection-checklist__category { margin-bottom: 16px; }

.inspection-checklist__category-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

.inspection-checklist__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}
.inspection-checklist__item:hover { background: var(--neutral-50); }

.inspection-checklist__label { font-size: 13px; color: var(--neutral-900); }

.inspection-checklist__pf {
  width: 28px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  user-select: none;
}
.inspection-checklist__pf--empty { background: var(--neutral-50); color: #aaa; border: 1px solid var(--border); }
.inspection-checklist__pf--pass { background: rgba(var(--success-rgb), 0.12); color: var(--success); }
.inspection-checklist__pf--fail { background: rgba(var(--danger-rgb), 0.12); color: var(--danger); }

.inspection-checklist__footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.inspection-checklist__warning {
  font-size: 12px;
  color: var(--danger);
  font-weight: 600;
}

.inspection-checklist__btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-left: auto;
}
.inspection-checklist__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.inspection-checklist__btn--pass { background: var(--success); color: #fff; }
.inspection-checklist__btn--fail { background: var(--danger); color: #fff; }
```

- [ ] **Step 3: Check for TypeScript errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/loaners/InspectionChecklist.tsx client/src/pages/loaners/InspectionChecklist.css
git commit -m "feat: add InspectionChecklist — interactive P/F component for loaner evaluation"
```

---

## Task 7: Fulfill Loaner Modal

**Files:**
- Create: `client/src/pages/loaners/FulfillLoanerModal.tsx`
- Create: `client/src/pages/loaners/FulfillLoanerModal.css`

This is the core UI — a 3-step modal triggered from the task list.

- [ ] **Step 1: Create `FulfillLoanerModal.tsx`**

```tsx
import { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { getAvailableScopes, bookOutLoaner, evalFailLoaner } from '../../api/loaners';
import { getDeliveryMethods } from '../../api/deliveryMethods';
import { InspectionChecklist } from './InspectionChecklist';
import { DevNotice } from '../../components/shared';
import type { AvailableScope, DeliveryMethod } from './types';
import './FulfillLoanerModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
  taskKey: number;
  departmentKey: number;
  salesRepKey: number;
  scopeTypeKey?: number;
  scopeTypeName?: string;
  clientName?: string;
  deptName?: string;
}

type Step = 'pick' | 'inspect' | 'bookout';

export const FulfillLoanerModal = ({
  open, onClose, taskKey, departmentKey, salesRepKey,
  scopeTypeKey, scopeTypeName, clientName, deptName,
}: Props) => {
  const [step, setStep] = useState<Step>('pick');
  const [scopes, setScopes] = useState<AvailableScope[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScope, setSelectedScope] = useState<AvailableScope | null>(null);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [form, setForm] = useState({
    deliveryMethodKey: 0,
    purchaseOrder: '',
    trackingNumber: '',
    onSiteLoaner: false,
  });
  const [saving, setSaving] = useState(false);

  // Load available scopes when modal opens
  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setSelectedScope(null);
    setLoading(true);
    Promise.all([
      getAvailableScopes(scopeTypeKey),
      getDeliveryMethods(),
    ])
      .then(([s, dm]) => { setScopes(s); setDeliveryMethods(dm); })
      .catch(() => message.error('Failed to load available scopes'))
      .finally(() => setLoading(false));
  }, [open, scopeTypeKey]);

  const handleSelectScope = (scope: AvailableScope) => {
    setSelectedScope(scope);
    setStep('inspect');
  };

  const handleInspectionComplete = (results: Record<string, string>, allPassed: boolean) => {
    if (allPassed) {
      // Store results for book-out
      setForm(f => ({ ...f }));
      setStep('bookout');
    } else {
      // Auto-create repair
      setSaving(true);
      evalFailLoaner({
        scopeKey: selectedScope!.scopeKey,
        taskKey,
        failedItems: JSON.stringify(results),
      })
        .then(res => {
          message.success(`Repair WO #${res.workOrder} created — scope sent to repair`);
          // Reset to scope picker so they can pick another
          setSelectedScope(null);
          setStep('pick');
          // Reload available scopes (failed one is no longer available)
          getAvailableScopes(scopeTypeKey).then(setScopes).catch(() => {});
        })
        .catch(() => message.error('Failed to create repair'))
        .finally(() => setSaving(false));
    }
  };

  const handleBookOut = async () => {
    if (!selectedScope) return;
    if (form.deliveryMethodKey === 0) {
      message.warning('Select a delivery method');
      return;
    }
    setSaving(true);
    try {
      await bookOutLoaner({
        scopeKey: selectedScope.scopeKey,
        departmentKey,
        deliveryMethodKey: form.deliveryMethodKey,
        salesRepKey,
        taskKey,
        purchaseOrder: form.purchaseOrder || undefined,
        trackingNumber: form.trackingNumber || undefined,
        onSiteLoaner: form.onSiteLoaner,
        outgoingInspection: JSON.stringify({}), // all passed
      });
      message.success(`${selectedScope.serial} booked out — ready to ship`);
      onClose();
    } catch {
      message.error('Book out failed');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fulfill-modal-overlay" onClick={onClose} />
      <div className="fulfill-modal">
        {/* Header */}
        <div className="fulfill-modal__header">
          <div>
            <div className="fulfill-modal__title">Fulfill Loaner Request</div>
            <div className="fulfill-modal__subtitle">
              {clientName && <span>{clientName}</span>}
              {deptName && <span> — {deptName}</span>}
              {scopeTypeName && <span> · {scopeTypeName}</span>}
            </div>
          </div>
          <button className="fulfill-modal__close" onClick={onClose}>&times;</button>
        </div>

        {/* Step indicator */}
        <div className="fulfill-modal__steps">
          <div className={`fulfill-modal__step ${step === 'pick' ? 'fulfill-modal__step--active' : step !== 'pick' ? 'fulfill-modal__step--done' : ''}`}>
            1. Pick Scope
          </div>
          <div className={`fulfill-modal__step ${step === 'inspect' ? 'fulfill-modal__step--active' : step === 'bookout' ? 'fulfill-modal__step--done' : ''}`}>
            2. Inspect
          </div>
          <div className={`fulfill-modal__step ${step === 'bookout' ? 'fulfill-modal__step--active' : ''}`}>
            3. Book Out
          </div>
        </div>

        {/* Content */}
        <div className="fulfill-modal__content">
          {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}

          {/* Step 1: Pick Scope */}
          {!loading && step === 'pick' && (
            <>
              {scopes.length === 0 ? (
                <div className="fulfill-modal__empty">
                  No available scopes{scopeTypeName ? ` matching "${scopeTypeName}"` : ''}. Request will need to be waitlisted.
                </div>
              ) : (
                <div className="fulfill-modal__scope-list">
                  <div className="fulfill-modal__scope-header">
                    <span>Serial #</span>
                    <span>Scope Type</span>
                    <span>Rack</span>
                    <span>On-Site</span>
                  </div>
                  {scopes.map(s => (
                    <div
                      key={s.scopeKey}
                      className="fulfill-modal__scope-row"
                      onClick={() => handleSelectScope(s)}
                    >
                      <span className="fulfill-modal__scope-serial">{s.serial}</span>
                      <span>{s.scopeType}</span>
                      <span>{s.rackPosition || '—'}</span>
                      <span>{s.onSiteLoaner ? 'Yes' : 'No'}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step 2: Inspection */}
          {!loading && step === 'inspect' && selectedScope && (
            <div>
              <div className="fulfill-modal__scope-info">
                Inspecting: <strong>{selectedScope.serial}</strong> — {selectedScope.scopeType}
              </div>
              {saving ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="Creating repair..." /></div>
              ) : (
                <InspectionChecklist
                  category={selectedScope.category}
                  onComplete={handleInspectionComplete}
                />
              )}
            </div>
          )}

          {/* Step 3: Book Out */}
          {!loading && step === 'bookout' && selectedScope && (
            <div className="fulfill-modal__bookout">
              <div className="fulfill-modal__scope-info" style={{ marginBottom: 16 }}>
                Booking out: <strong>{selectedScope.serial}</strong> — {selectedScope.scopeType}
              </div>
              <div className="fulfill-modal__form">
                <div className="fulfill-modal__field">
                  <label>Delivery Method *</label>
                  <select
                    value={form.deliveryMethodKey}
                    onChange={e => setForm(f => ({ ...f, deliveryMethodKey: Number(e.target.value) }))}
                  >
                    <option value={0}>Select...</option>
                    {deliveryMethods.map(dm => (
                      <option key={dm.key} value={dm.key}>{dm.description}</option>
                    ))}
                  </select>
                </div>
                <div className="fulfill-modal__field">
                  <label>PO #</label>
                  <input
                    type="text"
                    value={form.purchaseOrder}
                    onChange={e => setForm(f => ({ ...f, purchaseOrder: e.target.value }))}
                    placeholder="Purchase order"
                  />
                </div>
                <div className="fulfill-modal__field">
                  <label>Tracking #</label>
                  <input
                    type="text"
                    value={form.trackingNumber}
                    onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))}
                    placeholder="Tracking number"
                  />
                </div>
                <div className="fulfill-modal__field fulfill-modal__field--checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.onSiteLoaner}
                      onChange={e => setForm(f => ({ ...f, onSiteLoaner: e.target.checked }))}
                    />
                    On-Site Loaner
                  </label>
                </div>
              </div>
              <div className="fulfill-modal__actions">
                <button
                  className="fulfill-modal__btn fulfill-modal__btn--secondary"
                  onClick={() => setStep('inspect')}
                >
                  Back
                </button>
                <DevNotice
                  title="Book Out — Schema Changes Required"
                  requirement="Two new columns needed on tblLoanerTran before book-out can persist task link and inspection results."
                  sql={'ALTER TABLE tblLoanerTran ADD lTaskKey int NULL;\nALTER TABLE tblLoanerTran ADD sOutgoingInspection nvarchar(max) NULL;'}
                >
                  <button
                    className="fulfill-modal__btn fulfill-modal__btn--primary"
                    onClick={handleBookOut}
                    disabled={saving}
                  >
                    {saving ? 'Booking out...' : 'Book Out & Ship'}
                  </button>
                </DevNotice>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
```

- [ ] **Step 2: Create `FulfillLoanerModal.css`**

```css
.fulfill-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
}

.fulfill-modal {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 620px;
  max-height: 85vh;
  background: var(--card);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fulfill-modal__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--primary-dark, var(--navy));
  color: #fff;
}
.fulfill-modal__title { font-size: 16px; font-weight: 700; }
.fulfill-modal__subtitle { font-size: 12px; opacity: 0.8; margin-top: 2px; }
.fulfill-modal__close {
  background: none; border: none; color: #fff; font-size: 22px;
  cursor: pointer; line-height: 1; padding: 0 4px;
}

.fulfill-modal__steps {
  display: flex;
  border-bottom: 1px solid var(--border);
  padding: 0 20px;
}
.fulfill-modal__step {
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  border-bottom: 2px solid transparent;
}
.fulfill-modal__step--active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
.fulfill-modal__step--done {
  color: var(--success);
}

.fulfill-modal__content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.fulfill-modal__empty {
  text-align: center;
  padding: 40px;
  color: var(--muted);
  font-size: 13px;
}

.fulfill-modal__scope-list { }
.fulfill-modal__scope-header {
  display: grid;
  grid-template-columns: 140px 1fr 80px 60px;
  gap: 8px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
}
.fulfill-modal__scope-row {
  display: grid;
  grid-template-columns: 140px 1fr 80px 60px;
  gap: 8px;
  padding: 8px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}
.fulfill-modal__scope-row:hover { background: var(--primary-light); }
.fulfill-modal__scope-serial { font-weight: 600; color: var(--primary); }

.fulfill-modal__scope-info {
  font-size: 13px;
  color: var(--neutral-900);
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}

.fulfill-modal__form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.fulfill-modal__field label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 4px;
  text-transform: uppercase;
}
.fulfill-modal__field select,
.fulfill-modal__field input[type="text"] {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
}
.fulfill-modal__field--checkbox {
  grid-column: 1 / -1;
}
.fulfill-modal__field--checkbox label {
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: none;
  font-size: 13px;
  color: var(--neutral-900);
}

.fulfill-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.fulfill-modal__btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.fulfill-modal__btn:disabled { opacity: 0.4; cursor: not-allowed; }
.fulfill-modal__btn--primary { background: var(--primary); color: #fff; }
.fulfill-modal__btn--secondary { background: var(--neutral-50); color: var(--neutral-900); border: 1px solid var(--border); }
```

- [ ] **Step 3: Check for TypeScript errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/loaners/FulfillLoanerModal.tsx client/src/pages/loaners/FulfillLoanerModal.css
git commit -m "feat: add FulfillLoanerModal — 3-step scope picker, inspection, book-out"
```

---

## Task 8: Remove "Check Out" from Loaner List

**Files:**
- Modify: `client/src/pages/loaners/LoanersPage.tsx`

The loaner list should no longer show "Check Out" buttons on Available rows. Fulfillment comes from the task list. Keep the "Check In" button on Out/Overdue rows.

- [ ] **Step 1: Remove the "Check Out" button and checkout expand form**

In `LoanersPage.tsx`, find the action column rendering (around line 277). Replace the `isAvailable` block:

```tsx
// REMOVE this block:
{isAvailable && (
  <button
    className="loaners-action-btn loaners-action-btn--checkout"
    onClick={e => handleActionClick(e, item, 'checkout')}
    aria-label={`Check out ${item.scopeType} ${item.serial}`}
  >
    Check Out
  </button>
)}
```

Replace with an empty fragment or nothing — Available rows just show no action button.

- [ ] **Step 2: Remove the checkout expand form (lines ~302-359)**

Remove the entire `{isExpanded && expandedRow.mode === 'checkout' && (...)}` block. Keep the checkin expand block.

- [ ] **Step 3: Clean up unused imports**

Remove `checkOutLoaner` from the import in line 4 and `CheckOutPayload` from line 5 if they are no longer used. Also remove the checkout-related state if `expandedRow.mode === 'checkout'` is no longer reachable.

- [ ] **Step 4: Check for TypeScript errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (no unused imports)

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/loaners/LoanersPage.tsx
git commit -m "refactor: remove Check Out from loaner list — fulfillment is task-driven"
```

---

## Task 9: Add "Fulfill Loaner" to Dashboard Task List

**Files:**
- Modify: `client/src/pages/dashboard/DashboardPage.tsx`
- Modify: `client/src/pages/dashboard/types.ts`
- Modify: `server/TSI.Api/Controllers/DashboardController.cs`

This wires the fulfillment modal to the task list — tasks with loaner requests get a "Fulfill Loaner" button.

- [ ] **Step 1: Add `hasLoanerRequest` to dashboard task query**

Read `DashboardController.cs` to find the tasks query. Add a subquery to check if the task has entries in tblTaskLoaners:

In the SELECT list for the tasks query, add:

```sql
CASE WHEN EXISTS (
    SELECT 1 FROM tblTaskLoaners tl WHERE tl.lTaskKey = t.lTaskKey
) THEN 1 ELSE 0 END AS HasLoanerRequest,
ISNULL((SELECT TOP 1 tl.lScopeTypeKey FROM tblTaskLoaners tl WHERE tl.lTaskKey = t.lTaskKey), 0) AS LoanerScopeTypeKey
```

And in the C# reader mapping, add:

```csharp
HasLoanerRequest: Convert.ToBoolean(dataReader["HasLoanerRequest"]),
LoanerScopeTypeKey: dataReader["LoanerScopeTypeKey"] == DBNull.Value ? null : Convert.ToInt32(dataReader["LoanerScopeTypeKey"])
```

- [ ] **Step 2: Update `DashboardTask` in `dashboard/types.ts`**

Add to the interface:

```typescript
hasLoanerRequest: boolean;
loanerScopeTypeKey?: number;
```

- [ ] **Step 3: Update the dashboard task model record**

In the server models, find the `DashboardTask` record and add the new fields:

```csharp
bool HasLoanerRequest,
int? LoanerScopeTypeKey
```

- [ ] **Step 4: Add FulfillLoanerModal to DashboardPage**

Import the modal and add state:

```tsx
import { FulfillLoanerModal } from '../loaners/FulfillLoanerModal';

// State
const [fulfillModal, setFulfillModal] = useState<{
  open: boolean;
  taskKey: number;
  departmentKey: number;
  salesRepKey: number;
  scopeTypeKey?: number;
  clientName?: string;
  deptName?: string;
} | null>(null);
```

Add a "Fulfill Loaner" button in the task row rendering for tasks where `hasLoanerRequest` is true. Wrap it in a `<DevNotice>` explaining the tblTaskLoaners migration dependency:

```tsx
<DevNotice
  title="Fulfill Loaner — Data Migration Required"
  requirement="tblTasks and tblTaskLoaners must be migrated to Azure SQL. Run migrate-data.ps1 with these tables."
  sql={'-- Migration (PowerShell):\n.\\scripts\\migrate-data.ps1 -Tables @("tblTaskTypes","tblTaskPriorities","tblTaskStatuses","tblTaskStatusHistory","tblTasks","tblTaskLoaners")'}
>
  <button onClick={e => { e.stopPropagation(); setFulfillModal({...}); }}>
    Fulfill Loaner
  </button>
</DevNotice>
```

When clicked, open the modal with the task's data.

Add the modal at the bottom of the component JSX:

```tsx
{fulfillModal && (
  <FulfillLoanerModal
    open={fulfillModal.open}
    onClose={() => { setFulfillModal(null); loadData(/* re-fetch */); }}
    taskKey={fulfillModal.taskKey}
    departmentKey={fulfillModal.departmentKey}
    salesRepKey={fulfillModal.salesRepKey}
    scopeTypeKey={fulfillModal.scopeTypeKey}
    clientName={fulfillModal.clientName}
    deptName={fulfillModal.deptName}
  />
)}
```

- [ ] **Step 5: Build backend**

Run: `cd server && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded, 0 errors

- [ ] **Step 6: Check for TypeScript errors**

Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add server/TSI.Api/Controllers/DashboardController.cs client/src/pages/dashboard/DashboardPage.tsx client/src/pages/dashboard/types.ts
git commit -m "feat: add Fulfill Loaner action to dashboard task list"
```

---

## Task 10: Update Stat Strip — Add Requests Count

**Files:**
- Modify: `server/TSI.Api/Controllers/LoanersController.cs`
- Modify: `server/TSI.Api/Models/LoanerModels.cs`
- Modify: `client/src/pages/loaners/types.ts`
- Modify: `client/src/pages/loaners/LoanersPage.tsx`

Replace the `AgreementsPending` stat with a `Requests` count that shows unfulfilled task loaner requests.

- [ ] **Step 1: Update the stats SQL query**

In `LoanersController.GetStats`, replace the `AgreementsPending` subquery with:

```sql
(SELECT COUNT(*) FROM tblTaskLoaners tl
 INNER JOIN tblTasks t ON t.lTaskKey = tl.lTaskKey
 WHERE NOT EXISTS (
     SELECT 1 FROM tblLoanerTran lt2
     WHERE lt2.lTaskKey = tl.lTaskKey AND lt2.sDateIn IS NULL
 )) AS Requests
```

- [ ] **Step 2: Update `LoanerStatsDto`**

Change `AgreementsPending` to `Requests`:

```csharp
public record LoanerStatsDto(
    int Available,
    int Evaluating,
    int Out,
    int Overdue,
    int Repair,
    int Requests
);
```

- [ ] **Step 3: Update the reader mapping**

Replace `AgreementsPending:` with `Requests:`:

```csharp
Requests: reader["Requests"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Requests"])
```

- [ ] **Step 4: Update frontend `LoanerStats` type**

In `client/src/pages/loaners/types.ts`, replace `agreementsPending` with `requests`:

```typescript
export interface LoanerStats {
  available: number;
  evaluating: number;
  out: number;
  overdue: number;
  repair: number;
  requests: number;
}
```

- [ ] **Step 5: Update stat strip chips in `LoanersPage.tsx`**

Replace the `Evaluating` chip with `Requests`:

```typescript
const chips: StatChipDef[] = [
  { id: 'Available',  label: 'Available',  value: stats?.available ?? 0,  color: 'green' },
  { id: 'Out',        label: 'Out',        value: stats?.out ?? 0,        color: 'amber' },
  { id: 'Overdue',    label: 'Overdue',    value: stats?.overdue ?? 0,    color: 'red', state: (stats?.overdue ?? 0) > 0 ? 'alert' : 'normal' },
  { id: 'Repair',     label: 'Repair',     value: stats?.repair ?? 0,     color: 'muted' },
  { id: 'Requests',   label: 'Requests',   value: stats?.requests ?? 0,   color: 'purple' },
];
```

- [ ] **Step 6: Build and check**

Run: `cd server && dotnet build --no-restore 2>&1 | tail -5`
Run: `cd client && npx tsc --noEmit 2>&1 | head -20`
Expected: Both pass

- [ ] **Step 7: Commit**

```bash
git add server/TSI.Api/Controllers/LoanersController.cs server/TSI.Api/Models/LoanerModels.cs client/src/pages/loaners/types.ts client/src/pages/loaners/LoanersPage.tsx
git commit -m "feat: replace Evaluating stat with Requests count for unfulfilled loaner needs"
```

---

## Task 11: Push & Smoke Test

- [ ] **Step 1: Run full TypeScript check**

Run: `cd client && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 2: Run backend build**

Run: `cd server && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 3: Push to main**

```bash
git push origin main
```

- [ ] **Step 4: Wait for deploys and smoke test**

Backend: `curl "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/delivery-methods" -H "Authorization: Bearer <token>"`

Backend: `curl "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/loaners/available" -H "Authorization: Bearer <token>"`

Frontend: Load `https://happy-plant-03638db0f.6.azurestaticapps.net`, navigate to loaners, confirm "Check Out" button is gone on Available rows.
