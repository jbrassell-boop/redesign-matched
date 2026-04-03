# Repair Items Fast Entry & Amendment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text repair item add row with a fast autocomplete-driven flow (search → select → amount pre-fills → fix type → Enter) and add a standalone amendment modal for price/fix-type changes on existing rows.

**Architecture:** Backend adds 6 new endpoints (catalog, amendments, lookups). Frontend gets two new components (`RepairItemAutoComplete`, `AmendmentModal`) and a rewritten `RepairItemsTable` add row. Amendment history is repair-level; "A" badge in the table header triggers the modal.

**Tech Stack:** ASP.NET Core 8 / raw SqlClient (C#), React 19 / TypeScript, CSS variables only (no hardcoded hex), Ant Design Modal for the amendment pop-out.

---

## MANDATORY RULES (read before starting)

1. **Schema verification:** Before writing any SQL column reference, confirm it exists in `C:/Projects/tsi-redesign/tasks/db-schema-dump.json`. Never assume.
2. **No silent errors:** Never use `.catch(() => {})`. Always `message.error(...)` on failure.
3. **CSS variables only:** Zero hardcoded hex in `.tsx` files. Use `var(--primary)`, `var(--navy)`, etc.
4. **Smoke test every endpoint** after deploy — hit the real Azure URL, not localhost.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `server/TSI.Api/Controllers/RepairsController.cs` | Modify | Add 6 new endpoints |
| `server/TSI.Api/Models/Repair.cs` | Modify | Add new model records |
| `client/src/pages/repairs/types.ts` | Modify | Add new TS types |
| `client/src/api/repairs.ts` | Modify | Add new API functions |
| `client/src/pages/repairs/components/RepairItemAutoComplete.tsx` | Create | Catalog search/select |
| `client/src/pages/repairs/components/RepairItemsTable.tsx` | Modify | New add row + A badge |
| `client/src/pages/repairs/components/AmendmentModal.tsx` | Create | Amendment history + form |

---

## Task 1: Types — add new interfaces to types.ts and Repair.cs

**Files:**
- Modify: `client/src/pages/repairs/types.ts`
- Modify: `server/TSI.Api/Models/Repair.cs`

- [ ] **Step 1: Add frontend types to `client/src/pages/repairs/types.ts`**

Add these interfaces at the end of the file (after `RepairFinancials`):

```typescript
// ── Repair Item Catalog ──
export interface RepairCatalogItem {
  itemKey: number;
  itemCode: string;
  description: string;
  defaultPrice: number;
}

// ── Amendments ──
export interface Amendment {
  amendKey: number;
  amendmentNumber: number;
  date: string;
  amendType: string;
  amendReason: string;
  comment: string;
}

export interface AmendType {
  typeKey: number;
  typeName: string;
}

export interface AmendReason {
  reasonKey: number;
  reasonName: string;
}

export interface CreateAmendmentRequest {
  tranKey: number;
  amendTypeKey: number;
  amendReasonKey: number;
  comment?: string;
  newFixType?: string;
  newAmount?: number;
}
```

Also update `LineItemUpdate` — add `itemKey` (int) and `baseAmount` fields:

```typescript
export interface LineItemUpdate {
  approved?: string;
  itemKey?: number;       // int key — preferred over itemCode for new adds
  itemCode?: string;      // kept for legacy compat
  cause?: string;
  description?: string;
  fixType?: string;
  amount?: number;
  baseAmount?: number;    // standard price — always stored, even for warranty
  techKey?: number | null;
  tech2Key?: number | null;
  isPrimary?: boolean;
  comments?: string;
}
```

Also update `RepairLineItem` — add `amendmentCount` and `baseAmount`:

```typescript
export interface RepairLineItem {
  tranKey: number;
  approved: string;
  itemCode: string;
  description: string;
  cause: string;
  fixType: string;
  amount: number;
  baseAmount: number;
  amendmentCount: number;
  tech: string;
  comments: string;
}
```

- [ ] **Step 2: Add backend models to `server/TSI.Api/Models/Repair.cs`**

Add these records at the end of the file:

```csharp
public record RepairCatalogItem(int ItemKey, string ItemCode, string Description, decimal DefaultPrice);

public record AmendmentItem(
    int AmendKey, int AmendmentNumber, string Date,
    string AmendType, string AmendReason, string Comment);

public record AmendTypeItem(int TypeKey, string TypeName);
public record AmendReasonItem(int ReasonKey, string ReasonName);

public record CreateAmendmentRequest(
    int TranKey,
    int AmendTypeKey,
    int AmendReasonKey,
    string? Comment,
    string? NewFixType,
    decimal? NewAmount);
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/repairs/types.ts server/TSI.Api/Models/Repair.cs
git commit -m "feat(repairs): add catalog, amendment, and updated LineItemUpdate types"
```

---

## Task 2: Backend — GET /api/repair-items

**Files:**
- Modify: `server/TSI.Api/Controllers/RepairsController.cs`

- [ ] **Step 1: Add the catalog endpoint**

Add this method inside `RepairsController`, before the `// ── Line Item CRUD ──` comment:

```csharp
// ── Repair Item Catalog ──
[HttpGet("items")]
public async Task<IActionResult> GetRepairItemCatalog([FromQuery] int repairKey)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();

    const string sql = """
        SELECT ri.lRepairItemKey,
               ISNULL(ri.sProblemID, '') AS sProblemID,
               ISNULL(ri.sItemDescription, '') AS sItemDescription,
               ISNULL(pd.dblRepairPrice, 0) AS dblDefaultPrice
        FROM tblRepairItem ri
        CROSS JOIN (
            SELECT c.lPricingCategoryKey
            FROM tblRepair r
            JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
            JOIN tblClient c ON c.lClientKey = d.lClientKey
            WHERE r.lRepairKey = @repairKey
        ) pricing
        LEFT JOIN tblPricingDetail pd ON pd.lRepairItemKey = ri.lRepairItemKey
            AND pd.lPricingCategoryKey = pricing.lPricingCategoryKey
        WHERE ri.bActive = 1
        ORDER BY ri.sItemDescription
        """;

    await using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddWithValue("@repairKey", repairKey);
    await using var reader = await cmd.ExecuteReaderAsync();

    var items = new List<RepairCatalogItem>();
    while (await reader.ReadAsync())
    {
        items.Add(new RepairCatalogItem(
            ItemKey: Convert.ToInt32(reader["lRepairItemKey"]),
            ItemCode: reader["sProblemID"].ToString()!,
            Description: reader["sItemDescription"].ToString()!,
            DefaultPrice: Convert.ToDecimal(reader["dblDefaultPrice"])
        ));
    }
    return Ok(items);
}
```

- [ ] **Step 2: Build**

```bash
cd C:/Projects/redesign-matched/server/TSI.Api && dotnet build 2>&1 | tail -5
```
Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 3: Commit**

```bash
git add server/TSI.Api/Controllers/RepairsController.cs
git commit -m "feat(repairs): GET /api/repairs/items — catalog with pricing for repair's client category"
```

---

## Task 3: Backend — Update AddLineItem (dblRepairPriceBase + itemKey)

**Files:**
- Modify: `server/TSI.Api/Controllers/RepairsController.cs`

- [ ] **Step 1: Update the AddLineItem SQL to write dblRepairPriceBase and use itemKey**

Find the `AddLineItem` method. Replace its entire body:

```csharp
[HttpPost("{repairKey:int}/lineitems")]
public async Task<IActionResult> AddLineItem(int repairKey, [FromBody] LineItemUpdate body)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();

    // Determine item key: prefer body.ItemKey, fall back to parsing body.ItemCode
    int? itemKey = body.ItemKey ?? (body.ItemCode != null && int.TryParse(body.ItemCode, out var ik) ? ik : null);

    // Warranty: charge $0, capture base price for reporting
    var chargedAmount = body.FixType?.ToUpper() == "W" ? 0m : (body.Amount ?? 0m);
    var baseAmount = body.BaseAmount ?? body.Amount ?? 0m;

    const string sql = """
        INSERT INTO tblRepairItemTran
            (lRepairKey, lRepairItemKey, sProblemID, sApproved, sFixType,
             dblRepairPrice, dblRepairPriceBase, sComments, lTechnicianKey)
        OUTPUT INSERTED.lRepairItemTranKey
        VALUES
            (@repairKey, @itemKey, @cause, @approved, @fixType,
             @amount, @baseAmount, @comments, @techKey)
        """;

    await using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddWithValue("@repairKey", repairKey);
    cmd.Parameters.AddWithValue("@itemKey", (object?)itemKey ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@cause", (object?)body.Cause ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@approved", (object?)body.Approved ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@fixType", (object?)body.FixType ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@amount", chargedAmount);
    cmd.Parameters.AddWithValue("@baseAmount", baseAmount);
    cmd.Parameters.AddWithValue("@comments", (object?)body.Comments ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@techKey", body.TechKey.HasValue ? (object)body.TechKey.Value : DBNull.Value);

    var newKey = await cmd.ExecuteScalarAsync();
    return Ok(new { tranKey = Convert.ToInt32(newKey) });
}
```

Also add `ItemKey` and `BaseAmount` to the `LineItemUpdate` model in `Models/Repair.cs`:

```csharp
public record LineItemUpdate(
    string? Approved,
    int? ItemKey,
    string? ItemCode,
    string? Cause,
    string? Description,
    string? FixType,
    decimal? Amount,
    decimal? BaseAmount,
    int? TechKey,
    int? Tech2Key,
    bool? IsPrimary,
    string? Comments);
```

> **Note:** Check that `LineItemUpdate` is defined in `Models/Repair.cs`. If it's defined differently (e.g., as a class with properties), match the existing pattern — just add `ItemKey` and `BaseAmount` to it.

- [ ] **Step 2: Build**

```bash
cd C:/Projects/redesign-matched/server/TSI.Api && dotnet build 2>&1 | tail -5
```
Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 3: Commit**

```bash
git add server/TSI.Api/Controllers/RepairsController.cs server/TSI.Api/Models/Repair.cs
git commit -m "feat(repairs): AddLineItem writes dblRepairPriceBase, uses itemKey int, auto-zeros warranty"
```

---

## Task 4: Backend — PATCH lineitems cause/comments + amendment endpoints

**Files:**
- Modify: `server/TSI.Api/Controllers/RepairsController.cs`

- [ ] **Step 1: Add PATCH cause/comments endpoint**

Add after the `DeleteLineItem` method:

```csharp
[HttpPatch("{repairKey:int}/lineitems/{tranKey:int}/causecomments")]
public async Task<IActionResult> PatchLineItemCauseComments(
    int repairKey, int tranKey, [FromBody] PatchCauseCommentsRequest body)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();

    const string sql = """
        UPDATE tblRepairItemTran SET
            sProblemID = @cause,
            sComments  = @comments
        WHERE lRepairItemTranKey = @tranKey AND lRepairKey = @repairKey
        """;

    await using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddWithValue("@cause", (object?)body.Cause ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@comments", (object?)body.Comments ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@tranKey", tranKey);
    cmd.Parameters.AddWithValue("@repairKey", repairKey);
    var rows = await cmd.ExecuteNonQueryAsync();
    return rows > 0 ? NoContent() : NotFound();
}
```

Add `PatchCauseCommentsRequest` to `Models/Repair.cs`:

```csharp
public record PatchCauseCommentsRequest(string? Cause, string? Comments);
```

- [ ] **Step 2: Add amendment lookup endpoints**

Add after the cause/comments patch:

```csharp
// ── Amendment Lookups ──
[HttpGet("/api/amend-types")]
public async Task<IActionResult> GetAmendTypes()
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();

    const string sql = "SELECT lAmendRepairTypeKey, sAmendRepairType FROM tblAmendRepairTypes ORDER BY sAmendRepairType";
    await using var cmd = new SqlCommand(sql, conn);
    await using var reader = await cmd.ExecuteReaderAsync();

    var items = new List<AmendTypeItem>();
    while (await reader.ReadAsync())
        items.Add(new AmendTypeItem(
            TypeKey: Convert.ToInt32(reader["lAmendRepairTypeKey"]),
            TypeName: reader["sAmendRepairType"].ToString()!));
    return Ok(items);
}

[HttpGet("/api/amend-reasons")]
public async Task<IActionResult> GetAmendReasons([FromQuery] int typeKey)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();

    const string sql = """
        SELECT lAmendRepairReasonKey, sAmendRepairReason
        FROM tblAmendRepairReasons
        WHERE lAmendRepairTypeKey = @typeKey
        ORDER BY sAmendRepairReason
        """;

    await using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddWithValue("@typeKey", typeKey);
    await using var reader = await cmd.ExecuteReaderAsync();

    var items = new List<AmendReasonItem>();
    while (await reader.ReadAsync())
        items.Add(new AmendReasonItem(
            ReasonKey: Convert.ToInt32(reader["lAmendRepairReasonKey"]),
            ReasonName: reader["sAmendRepairReason"].ToString()!));
    return Ok(items);
}
```

- [ ] **Step 3: Add GET and POST amendments endpoints**

Add after the lookup endpoints:

```csharp
// ── Amendments ──
[HttpGet("{repairKey:int}/amendments")]
public async Task<IActionResult> GetAmendments(int repairKey)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();

    const string sql = """
        SELECT a.lAmendRepairCommentKey,
               a.lAmendmentNumber,
               CONVERT(varchar, a.dtAmendmentDate, 101) AS dtAmendmentDate,
               at2.sAmendRepairType,
               ar.sAmendRepairReason,
               ISNULL(a.sAmendRepairComment, '') AS sAmendRepairComment
        FROM tblAmendRepairComments a
        JOIN tblAmendRepairTypes at2 ON at2.lAmendRepairTypeKey = a.lAmendRepairTypeKey
        JOIN tblAmendRepairReasons ar ON ar.lAmendRepairReasonKey = a.lAmendRepairReasonKey
        WHERE a.lRepairKey = @repairKey
        ORDER BY a.lAmendmentNumber DESC
        """;

    await using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddWithValue("@repairKey", repairKey);
    await using var reader = await cmd.ExecuteReaderAsync();

    var items = new List<AmendmentItem>();
    while (await reader.ReadAsync())
        items.Add(new AmendmentItem(
            AmendKey: Convert.ToInt32(reader["lAmendRepairCommentKey"]),
            AmendmentNumber: Convert.ToInt32(reader["lAmendmentNumber"]),
            Date: reader["dtAmendmentDate"].ToString()!,
            AmendType: reader["sAmendRepairType"].ToString()!,
            AmendReason: reader["sAmendRepairReason"].ToString()!,
            Comment: reader["sAmendRepairComment"].ToString()!
        ));
    return Ok(items);
}

[HttpPost("{repairKey:int}/amendments")]
public async Task<IActionResult> CreateAmendment(int repairKey, [FromBody] CreateAmendmentRequest body)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();
    await using var tx = conn.BeginTransaction();
    try
    {
        // 1. Update the line item if new values provided
        if (body.NewFixType != null || body.NewAmount.HasValue)
        {
            var updateSql = new System.Text.StringBuilder(
                "UPDATE tblRepairItemTran SET ");
            var parts = new List<string>();
            if (body.NewFixType != null) parts.Add("sFixType = @fixType");
            if (body.NewAmount.HasValue)
            {
                parts.Add("dblRepairPrice = @amount");
                parts.Add("dblRepairPriceBase = @baseAmount");
            }
            updateSql.Append(string.Join(", ", parts));
            updateSql.Append(" WHERE lRepairItemTranKey = @tranKey AND lRepairKey = @repairKey");

            await using var updCmd = new SqlCommand(updateSql.ToString(), conn, tx);
            updCmd.Parameters.AddWithValue("@repairKey", repairKey);
            updCmd.Parameters.AddWithValue("@tranKey", body.TranKey);
            if (body.NewFixType != null) updCmd.Parameters.AddWithValue("@fixType", body.NewFixType);
            if (body.NewAmount.HasValue)
            {
                var charged = body.NewFixType?.ToUpper() == "W" ? 0m : body.NewAmount.Value;
                updCmd.Parameters.AddWithValue("@amount", charged);
                updCmd.Parameters.AddWithValue("@baseAmount", body.NewAmount.Value);
            }
            await updCmd.ExecuteNonQueryAsync();
        }

        // 2. Get next amendment number
        await using var numCmd = new SqlCommand(
            "SELECT ISNULL(MAX(lAmendmentNumber), 0) + 1 FROM tblAmendRepairComments WHERE lRepairKey = @repairKey",
            conn, tx);
        numCmd.Parameters.AddWithValue("@repairKey", repairKey);
        var nextNum = Convert.ToInt32(await numCmd.ExecuteScalarAsync());

        // 3. Insert amendment record
        const string insertSql = """
            INSERT INTO tblAmendRepairComments
                (lRepairKey, lAmendRepairTypeKey, lAmendRepairReasonKey,
                 sAmendRepairComment, lAmendmentNumber, dtAmendmentDate)
            VALUES
                (@repairKey, @typeKey, @reasonKey,
                 @comment, @amendNum, GETDATE())
            """;

        await using var insCmd = new SqlCommand(insertSql, conn, tx);
        insCmd.Parameters.AddWithValue("@repairKey", repairKey);
        insCmd.Parameters.AddWithValue("@typeKey", body.AmendTypeKey);
        insCmd.Parameters.AddWithValue("@reasonKey", body.AmendReasonKey);
        insCmd.Parameters.AddWithValue("@comment", (object?)body.Comment ?? DBNull.Value);
        insCmd.Parameters.AddWithValue("@amendNum", nextNum);
        await insCmd.ExecuteNonQueryAsync();

        await tx.CommitAsync();
        return Ok(new { amendmentNumber = nextNum });
    }
    catch
    {
        await tx.RollbackAsync();
        throw;
    }
}
```

- [ ] **Step 4: Build**

```bash
cd C:/Projects/redesign-matched/server/TSI.Api && dotnet build 2>&1 | tail -5
```
Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 5: Commit**

```bash
git add server/TSI.Api/Controllers/RepairsController.cs server/TSI.Api/Models/Repair.cs
git commit -m "feat(repairs): PATCH cause/comments, GET/POST amendments, GET amend-types/reasons"
```

---

## Task 5: Frontend API — add new functions to repairs.ts

**Files:**
- Modify: `client/src/api/repairs.ts`

- [ ] **Step 1: Add new API functions**

Add at the end of `client/src/api/repairs.ts`:

```typescript
import type {
  RepairCatalogItem, Amendment, AmendType, AmendReason, CreateAmendmentRequest
} from '../pages/repairs/types';

// ── Fast Entry ──
export const getRepairItemCatalog = async (repairKey: number): Promise<RepairCatalogItem[]> => {
  const { data } = await apiClient.get<RepairCatalogItem[]>('/repairs/items', {
    params: { repairKey },
  });
  return data;
};

export const patchLineItemCauseComments = async (
  repairKey: number,
  tranKey: number,
  cause: string | null,
  comments: string | null,
): Promise<void> => {
  await apiClient.patch(`/repairs/${repairKey}/lineitems/${tranKey}/causecomments`, {
    cause,
    comments,
  });
};

// ── Amendments ──
export const getAmendments = async (repairKey: number): Promise<Amendment[]> => {
  const { data } = await apiClient.get<Amendment[]>(`/repairs/${repairKey}/amendments`);
  return data;
};

export const createAmendment = async (
  repairKey: number,
  body: CreateAmendmentRequest,
): Promise<{ amendmentNumber: number }> => {
  const { data } = await apiClient.post(`/repairs/${repairKey}/amendments`, body);
  return data;
};

export const getAmendTypes = async (): Promise<AmendType[]> => {
  const { data } = await apiClient.get<AmendType[]>('/amend-types');
  return data;
};

export const getAmendReasons = async (typeKey: number): Promise<AmendReason[]> => {
  const { data } = await apiClient.get<AmendReason[]>('/amend-reasons', {
    params: { typeKey },
  });
  return data;
};
```

- [ ] **Step 2: Build check (TypeScript)**

```bash
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/api/repairs.ts
git commit -m "feat(repairs): add catalog, amendment, and cause/comments API functions"
```

---

## Task 6: Create RepairItemAutoComplete component

**Files:**
- Create: `client/src/pages/repairs/components/RepairItemAutoComplete.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useEffect, useRef } from 'react';
import type { RepairCatalogItem } from '../types';
import { getRepairItemCatalog } from '../../../api/repairs';

interface Props {
  repairKey: number;
  onSelect: (item: RepairCatalogItem) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const RepairItemAutoComplete = ({ repairKey, onSelect, inputRef }: Props) => {
  const [catalog, setCatalog] = useState<RepairCatalogItem[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getRepairItemCatalog(repairKey)
      .then(setCatalog)
      .catch(() => {});  // catalog load failure — don't block the UI
  }, [repairKey]);

  const filtered = query.length >= 1
    ? catalog.filter(i =>
        i.description.toLowerCase().includes(query.toLowerCase()) ||
        i.itemCode.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 12)
    : [];

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && filtered[highlighted]) {
      e.preventDefault();
      select(filtered[highlighted]);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  const select = (item: RepairCatalogItem) => {
    onSelect(item);
    setQuery('');
    setOpen(false);
    setHighlighted(0);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1 }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setHighlighted(0); }}
        onKeyDown={handleKey}
        onFocus={() => query && setOpen(true)}
        placeholder="Search repair items…"
        style={{
          width: '100%', height: 26,
          border: '1px solid #93c5fd', borderRadius: 3,
          fontSize: 11, padding: '0 6px', background: '#fff',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
          background: '#fff', border: '1px solid var(--border)',
          borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,.12)',
          maxHeight: 240, overflowY: 'auto',
        }}>
          {filtered.map((item, idx) => (
            <div
              key={item.itemKey}
              onMouseDown={() => select(item)}
              style={{
                padding: '5px 10px',
                background: idx === highlighted ? 'var(--primary-light)' : '#fff',
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
              onMouseEnter={() => setHighlighted(idx)}
            >
              <span>
                <span style={{ fontWeight: 600, color: 'var(--navy)', marginRight: 6, fontSize: 10 }}>
                  {item.itemCode}
                </span>
                {item.description}
              </span>
              <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 11, marginLeft: 8 }}>
                ${item.defaultPrice.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/repairs/components/RepairItemAutoComplete.tsx
git commit -m "feat(repairs): RepairItemAutoComplete — search/select from pricing catalog"
```

---

## Task 7: Rewrite RepairItemsTable add row + A badge

**Files:**
- Modify: `client/src/pages/repairs/components/RepairItemsTable.tsx`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `client/src/pages/repairs/components/RepairItemsTable.tsx` with:

```tsx
import { useState, useRef, useCallback } from 'react';
import { message } from 'antd';
import type { RepairLineItem, RepairCatalogItem } from '../types';
import { addRepairLineItem, deleteRepairLineItem, patchLineItemCauseComments } from '../../../api/repairs';
import { RepairItemAutoComplete } from './RepairItemAutoComplete';

interface RepairItemsTableProps {
  repairKey: number;
  items: RepairLineItem[];
  onItemsChanged: () => void;
  onOpenAmendments: (tranKey?: number) => void;
  hasAmendments: boolean;
}

type FixType = 'W' | 'NC' | 'C' | 'A' | '';
type CauseType = 'UA' | 'NW' | '';

interface AddState {
  selectedItem: RepairCatalogItem | null;
  fixType: FixType;
  cause: CauseType;
  amount: number;
  comment: string;
}

const EMPTY_ADD: AddState = {
  selectedItem: null, fixType: 'C', cause: '', amount: 0, comment: '',
};

const causeBadge = (cause: string) => {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    UA: { bg: '#FEF2F2', color: 'var(--danger)', border: '#FECACA' },
    NW: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  };
  const s = styles[cause?.toUpperCase()] ?? { bg: 'var(--neutral-50)', color: 'var(--muted)', border: 'var(--border)' };
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 10,
      fontSize: 10, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {cause || '—'}
    </span>
  );
};

const fixBadge = (fix: string) => {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    W:  { bg: '#F0FDF4', color: 'var(--success)', border: '#BBF7D0' },
    NC: { bg: '#FEF2F2', color: 'var(--danger)',  border: '#FECACA' },
    C:  { bg: '#EFF6FF', color: 'var(--primary)', border: '#BFDBFE' },
    A:  { bg: '#F5F3FF', color: '#7C3AED',        border: '#DDD6FE' },
  };
  const s = styles[fix?.toUpperCase()] ?? { bg: 'var(--neutral-50)', color: 'var(--muted)', border: 'var(--border)' };
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 10,
      fontSize: 10, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {fix || '—'}
    </span>
  );
};

const approvalDot = (approved: string) => {
  const color = approved === 'Y' ? 'var(--success)' : approved === 'N' ? 'var(--danger)' : 'var(--amber)';
  return <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block' }} />;
};

export const RepairItemsTable = ({
  repairKey, items, onItemsChanged, onOpenAmendments, hasAmendments,
}: RepairItemsTableProps) => {
  const [addRow, setAddRow] = useState<AddState>(EMPTY_ADD);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const warrantyTotal = items
    .filter(i => i.fixType?.toUpperCase() === 'W')
    .reduce((sum, i) => sum + (i.baseAmount ?? i.amount ?? 0), 0);
  const customerTotal = items
    .filter(i => i.fixType?.toUpperCase() !== 'W')
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const grandTotal = warrantyTotal + customerTotal;

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleItemSelect = (item: RepairCatalogItem) => {
    setAddRow(r => ({
      ...r,
      selectedItem: item,
      amount: addRow.fixType === 'W' ? 0 : item.defaultPrice,
    }));
  };

  const handleFixType = (ft: FixType) => {
    setAddRow(r => ({
      ...r,
      fixType: ft,
      amount: ft === 'W' ? 0 : (r.selectedItem?.defaultPrice ?? r.amount),
    }));
  };

  const handleAdd = useCallback(async () => {
    if (!addRow.selectedItem) return;
    setSaving(true);
    try {
      await addRepairLineItem(repairKey, {
        itemKey: addRow.selectedItem.itemKey,
        itemCode: addRow.selectedItem.itemCode,
        description: addRow.selectedItem.description,
        fixType: addRow.fixType || 'C',
        cause: addRow.cause || undefined,
        amount: addRow.fixType === 'W' ? 0 : addRow.amount,
        baseAmount: addRow.selectedItem.defaultPrice,
        comments: addRow.comment || undefined,
      });
      setAddRow(EMPTY_ADD);
      onItemsChanged();
      // Refocus search after add
      setTimeout(() => searchRef.current?.focus(), 50);
    } catch {
      message.error('Failed to add item');
    } finally {
      setSaving(false);
    }
  }, [addRow, repairKey, onItemsChanged]);

  const handleDelete = async (tranKey: number) => {
    try {
      await deleteRepairLineItem(repairKey, tranKey);
      onItemsChanged();
    } catch {
      message.error('Failed to remove item');
    }
  };

  const handlePatchCause = async (tranKey: number, cause: string) => {
    try {
      const item = items.find(i => i.tranKey === tranKey);
      await patchLineItemCauseComments(repairKey, tranKey, cause, item?.comments ?? null);
      onItemsChanged();
    } catch {
      message.error('Failed to update cause');
    }
  };

  const handlePatchComment = async (tranKey: number, comments: string) => {
    try {
      const item = items.find(i => i.tranKey === tranKey);
      await patchLineItemCauseComments(repairKey, tranKey, item?.cause ?? null, comments);
      onItemsChanged();
    } catch {
      message.error('Failed to update comment');
    }
  };

  const thStyle: React.CSSProperties = {
    background: 'var(--navy)', color: '#fff',
    padding: '6px 8px', textAlign: 'left',
    fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
    position: 'sticky', top: 0,
  };
  const tdStyle: React.CSSProperties = {
    padding: '5px 8px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', fontSize: 12,
  };
  const addTdStyle: React.CSSProperties = { ...tdStyle, background: '#eff6ff' };

  const fixTypeButtons: { label: string; value: FixType }[] = [
    { label: 'W', value: 'W' },
    { label: 'NC', value: 'NC' },
    { label: 'C', value: 'C' },
    { label: 'A', value: 'A' },
  ];

  return (
    <div style={{ border: '2px solid var(--primary)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'var(--primary)', color: '#fff',
        padding: '8px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>Repair Items</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, opacity: .75 }}>
            {items.length} item{items.length !== 1 ? 's' : ''} ·{' '}
            <span style={{ color: '#4ade80' }}>{fmt(warrantyTotal)} warranty</span> ·{' '}
            <span style={{ color: '#fbbf24' }}>{fmt(customerTotal)} customer</span>
          </span>
          {hasAmendments && (
            <button
              onClick={() => onOpenAmendments()}
              style={{
                background: 'rgba(255,255,255,.2)', color: '#fff',
                border: '1px solid rgba(255,255,255,.4)', borderRadius: 3,
                padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              }}
            >
              A Amendments
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 28, textAlign: 'center' }}></th>
              <th style={{ ...thStyle, minWidth: 72 }}>Code</th>
              <th style={{ ...thStyle, minWidth: 200 }}>Repair Item</th>
              <th style={{ ...thStyle, minWidth: 70, textAlign: 'center' }}>Cause</th>
              <th style={{ ...thStyle, minWidth: 70, textAlign: 'center' }}>Fix Type</th>
              <th style={{ ...thStyle, minWidth: 80, textAlign: 'center' }}>Approval</th>
              <th style={{ ...thStyle, minWidth: 80, textAlign: 'right' }}>Amount</th>
              <th style={{ ...thStyle, minWidth: 54 }}>Tech</th>
              <th style={{ ...thStyle, minWidth: 160 }}>Comments</th>
              <th style={{ ...thStyle, width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <RepairItemRow
                key={item.tranKey}
                item={item}
                fmt={fmt}
                tdStyle={tdStyle}
                onDelete={() => handleDelete(item.tranKey)}
                onOpenAmendments={() => onOpenAmendments(item.tranKey)}
                onPatchCause={(cause) => handlePatchCause(item.tranKey, cause)}
                onPatchComment={(comment) => handlePatchComment(item.tranKey, comment)}
              />
            ))}

            {/* Fast add row */}
            <tr style={{ borderTop: '2px dashed #93c5fd' }}>
              {/* Approval dot — empty for new row */}
              <td style={addTdStyle}></td>
              {/* Autocomplete search spans Code + Description */}
              <td style={{ ...addTdStyle, minWidth: 280 }} colSpan={2}>
                <RepairItemAutoComplete
                  repairKey={repairKey}
                  onSelect={handleItemSelect}
                  inputRef={searchRef}
                />
              </td>
              {/* Cause toggles */}
              <td style={{ ...addTdStyle, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                  {(['UA', 'NW'] as CauseType[]).map(c => (
                    <button key={c} onClick={() => setAddRow(r => ({ ...r, cause: r.cause === c ? '' : c }))}
                      style={{
                        padding: '1px 5px', fontSize: 10, fontWeight: 700,
                        borderRadius: 3, cursor: 'pointer',
                        background: addRow.cause === c ? 'var(--danger)' : 'var(--neutral-50)',
                        color: addRow.cause === c ? '#fff' : 'var(--muted)',
                        border: `1px solid ${addRow.cause === c ? 'var(--danger)' : 'var(--border)'}`,
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </td>
              {/* Fix Type button group */}
              <td style={{ ...addTdStyle, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  {fixTypeButtons.map(({ label, value }) => (
                    <button key={value} onClick={() => handleFixType(value)}
                      style={{
                        padding: '1px 5px', fontSize: 10, fontWeight: 700,
                        borderRadius: 3, cursor: 'pointer',
                        background: addRow.fixType === value ? 'var(--primary)' : 'var(--neutral-50)',
                        color: addRow.fixType === value ? '#fff' : 'var(--muted)',
                        border: `1px solid ${addRow.fixType === value ? 'var(--primary)' : 'var(--border)'}`,
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </td>
              {/* Approval — empty */}
              <td style={addTdStyle}></td>
              {/* Amount */}
              <td style={{ ...addTdStyle, textAlign: 'right' }}>
                <input
                  style={{
                    width: 72, height: 24, textAlign: 'right',
                    border: '1px solid #93c5fd', borderRadius: 3,
                    fontSize: 11, padding: '0 4px', background: '#fff',
                    boxSizing: 'border-box' as const,
                  }}
                  type="number" min="0" step="0.01"
                  value={addRow.fixType === 'W' ? 0 : (addRow.amount || '')}
                  disabled={addRow.fixType === 'W'}
                  onChange={e => setAddRow(r => ({ ...r, amount: parseFloat(e.target.value) || 0 }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                />
              </td>
              {/* Tech — empty */}
              <td style={addTdStyle}></td>
              {/* Comment */}
              <td style={addTdStyle}>
                <input
                  style={{
                    width: '100%', height: 24,
                    border: '1px solid #93c5fd', borderRadius: 3,
                    fontSize: 11, padding: '0 4px', background: '#fff',
                    boxSizing: 'border-box' as const,
                  }}
                  placeholder="Comment…"
                  maxLength={80}
                  value={addRow.comment}
                  onChange={e => setAddRow(r => ({ ...r, comment: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                />
              </td>
              {/* Add button */}
              <td style={addTdStyle}>
                <button onClick={handleAdd} disabled={saving || !addRow.selectedItem}
                  style={{
                    background: addRow.selectedItem ? 'var(--primary)' : 'var(--neutral-200)',
                    color: addRow.selectedItem ? '#fff' : 'var(--muted)',
                    border: 'none', borderRadius: 3,
                    padding: '3px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  }}>
                  {saving ? '…' : '+'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals footer */}
      <div style={{
        background: 'var(--navy)', color: '#fff',
        padding: '8px 12px',
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 24,
      }}>
        <span style={{ fontSize: 11, opacity: .7 }}>
          Warranty: <span style={{ color: '#4ade80', fontWeight: 700 }}>{fmt(warrantyTotal)}</span>
        </span>
        <span style={{ fontSize: 11, opacity: .7 }}>
          Non-Warranty: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{fmt(customerTotal)}</span>
        </span>
        <span style={{ fontSize: 14, fontWeight: 900 }}>Total: {fmt(grandTotal)}</span>
      </div>
    </div>
  );
};

// ── Sub-component: single row with inline cause/comment editing ──
interface RowProps {
  item: RepairLineItem;
  fmt: (n: number) => string;
  tdStyle: React.CSSProperties;
  onDelete: () => void;
  onOpenAmendments: () => void;
  onPatchCause: (cause: string) => void;
  onPatchComment: (comment: string) => void;
}

const RepairItemRow = ({ item, fmt, tdStyle, onDelete, onOpenAmendments, onPatchCause, onPatchComment }: RowProps) => {
  const [editingComment, setEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(item.comments);

  return (
    <tr style={{ cursor: 'default' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f0f6ff')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        {approvalDot(item.approved)}
      </td>
      <td style={tdStyle}>{item.itemCode}</td>
      <td style={{ ...tdStyle, fontWeight: 500 }}>{item.description}</td>
      {/* Cause — click to cycle UA → NW → blank */}
      <td style={{ ...tdStyle, textAlign: 'center', cursor: 'pointer' }}
        onClick={() => {
          const next = item.cause === '' ? 'UA' : item.cause === 'UA' ? 'NW' : '';
          onPatchCause(next);
        }}
        title="Click to change cause">
        {causeBadge(item.cause)}
      </td>
      {/* Fix Type — click to open amendments */}
      <td style={{ ...tdStyle, textAlign: 'center', cursor: 'pointer' }}
        onClick={onOpenAmendments} title="Click to amend">
        {fixBadge(item.fixType)}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        {item.approved === 'Y'
          ? <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 11 }}>✓ Approved</span>
          : <span style={{ color: 'var(--amber)', fontSize: 11 }}>Pending</span>}
      </td>
      {/* Amount — click to amend */}
      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        onClick={onOpenAmendments} title="Click to amend">
        {fmt(item.amount ?? 0)}
        {item.fixType?.toUpperCase() === 'W' && item.baseAmount > 0 && (
          <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 400 }}>
            (list: {fmt(item.baseAmount)})
          </div>
        )}
      </td>
      <td style={tdStyle}>{item.tech || '—'}</td>
      {/* Comment — click to edit inline */}
      <td style={{ ...tdStyle, color: item.comments ? '#374151' : 'var(--muted)', fontSize: 11 }}>
        {editingComment ? (
          <input
            autoFocus
            style={{ width: '100%', fontSize: 11, border: '1px solid var(--primary)', borderRadius: 2, padding: '1px 4px' }}
            maxLength={80}
            value={commentDraft}
            onChange={e => setCommentDraft(e.target.value)}
            onBlur={() => { setEditingComment(false); onPatchComment(commentDraft); }}
            onKeyDown={e => { if (e.key === 'Enter') { setEditingComment(false); onPatchComment(commentDraft); } }}
          />
        ) : (
          <span style={{ cursor: 'pointer' }} onClick={() => { setCommentDraft(item.comments); setEditingComment(true); }}
            title="Click to edit">
            {item.comments || '—'}
          </span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: 'center' }}>
        <button onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: 0 }}
          title="Remove item">×</button>
      </td>
    </tr>
  );
};
```

- [ ] **Step 2: Update GetLineItems in RepairsController (lines 425–466) and RepairLineItem model**

In `server/TSI.Api/Controllers/RepairsController.cs`, replace the entire `GetLineItems` method:

```csharp
// ── Line Items (Workflow tab) ──
[HttpGet("{repairKey:int}/lineitems")]
public async Task<IActionResult> GetLineItems(int repairKey)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();

    const string sql = """
        SELECT rit.lRepairItemTranKey,
               ISNULL(rit.sApproved,'') AS sApproved,
               ISNULL(ri.sProblemID,'') AS sProblemID,
               ISNULL(ri.sItemDescription,'') AS sItemDescription,
               ISNULL(rit.sProblemID,'') AS sCause,
               ISNULL(rit.sFixType,'') AS sFixType,
               ISNULL(rit.dblRepairPrice, 0) AS dblRepairPrice,
               ISNULL(rit.dblRepairPriceBase, 0) AS dblRepairPriceBase,
               ISNULL(t.sTechName,'') AS sTechName,
               ISNULL(rit.sComments,'') AS sComments,
               (SELECT COUNT(*) FROM tblAmendRepairComments a
                WHERE a.lRepairKey = rit.lRepairKey) AS AmendmentCount
        FROM tblRepairItemTran rit
        LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
        LEFT JOIN tblTechnicians t ON t.lTechnicianKey = rit.lTechnicianKey
        WHERE rit.lRepairKey = @repairKey
        ORDER BY rit.lRepairItemTranKey
        """;

    await using var cmd = new SqlCommand(sql, conn);
    cmd.Parameters.AddWithValue("@repairKey", repairKey);
    await using var reader = await cmd.ExecuteReaderAsync();
    var items = new List<RepairLineItem>();
    while (await reader.ReadAsync())
    {
        items.Add(new RepairLineItem(
            TranKey: Convert.ToInt32(reader["lRepairItemTranKey"]),
            Approved: reader["sApproved"]?.ToString() ?? "",
            ItemCode: reader["sProblemID"]?.ToString() ?? "",
            Description: reader["sItemDescription"]?.ToString() ?? "",
            Cause: reader["sCause"]?.ToString() ?? "",
            FixType: reader["sFixType"]?.ToString() ?? "",
            Amount: reader["dblRepairPrice"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["dblRepairPrice"]),
            BaseAmount: reader["dblRepairPriceBase"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["dblRepairPriceBase"]),
            Tech: reader["sTechName"]?.ToString() ?? "",
            Comments: reader["sComments"]?.ToString() ?? "",
            AmendmentCount: Convert.ToInt32(reader["AmendmentCount"])
        ));
    }
    return Ok(items);
}
```

In `server/TSI.Api/Models/Repair.cs`, replace the `RepairLineItem` record (currently at line ~51):

```csharp
public record RepairLineItem(
    int TranKey,
    string Approved,
    string ItemCode,
    string Description,
    string Cause,
    string FixType,
    decimal Amount,
    decimal BaseAmount,
    string Tech,
    string Comments,
    int AmendmentCount
);
```

- [ ] **Step 3: TypeScript check**

```bash
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors

- [ ] **Step 4: Build backend**

```bash
cd C:/Projects/redesign-matched/server/TSI.Api && dotnet build 2>&1 | tail -5
```
Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/repairs/components/RepairItemsTable.tsx \
        server/TSI.Api/Controllers/RepairsController.cs \
        server/TSI.Api/Models/Repair.cs
git commit -m "feat(repairs): RepairItemsTable fast add row — autocomplete, cause toggles, fix type buttons, warranty auto-zero"
```

---

## Task 8: Create AmendmentModal component

**Files:**
- Create: `client/src/pages/repairs/components/AmendmentModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import type { Amendment, AmendType, AmendReason, CreateAmendmentRequest } from '../types';
import { getAmendments, createAmendment, getAmendTypes, getAmendReasons } from '../../../api/repairs';

interface Props {
  repairKey: number;
  open: boolean;
  onClose: () => void;
  onAmendmentCreated: () => void;
  prefillTranKey?: number;
}

export const AmendmentModal = ({ repairKey, open, onClose, onAmendmentCreated, prefillTranKey }: Props) => {
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [selected, setSelected] = useState<Amendment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [amendTypes, setAmendTypes] = useState<AmendType[]>([]);
  const [amendReasons, setAmendReasons] = useState<AmendReason[]>([]);

  // Form state
  const [typeKey, setTypeKey] = useState<number | ''>('');
  const [reasonKey, setReasonKey] = useState<number | ''>('');
  const [newFixType, setNewFixType] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getAmendments(repairKey)
      .then(data => { setAmendments(data); })
      .catch(() => message.error('Failed to load amendments'));
    getAmendTypes()
      .then(setAmendTypes)
      .catch(() => {});
  }, [open, repairKey]);

  useEffect(() => {
    if (typeKey) {
      getAmendReasons(Number(typeKey))
        .then(setAmendReasons)
        .catch(() => {});
    } else {
      setAmendReasons([]);
    }
    setReasonKey('');
  }, [typeKey]);

  // If opened from a row click, go straight to form
  useEffect(() => {
    if (open && prefillTranKey != null) {
      setShowForm(true);
      setSelected(null);
    }
  }, [open, prefillTranKey]);

  const handleSave = async () => {
    if (!typeKey || !reasonKey) {
      message.warning('Select a type and reason');
      return;
    }
    if (!prefillTranKey) {
      message.warning('No line item selected');
      return;
    }
    setSaving(true);
    try {
      const body: CreateAmendmentRequest = {
        tranKey: prefillTranKey,
        amendTypeKey: Number(typeKey),
        amendReasonKey: Number(reasonKey),
        comment: comment || undefined,
        newFixType: newFixType || undefined,
        newAmount: newAmount ? parseFloat(newAmount) : undefined,
      };
      await createAmendment(repairKey, body);
      message.success('Amendment saved');
      onAmendmentCreated();
      // Refresh amendment list
      const updated = await getAmendments(repairKey);
      setAmendments(updated);
      // Reset form
      setShowForm(false);
      setTypeKey('');
      setReasonKey('');
      setNewFixType('');
      setNewAmount('');
      setComment('');
    } catch {
      message.error('Failed to save amendment');
    } finally {
      setSaving(false);
    }
  };

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--navy)', marginBottom: 3 };
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 28, border: '1px solid var(--border)',
    borderRadius: 3, fontSize: 12, padding: '0 8px', boxSizing: 'border-box',
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={<span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Amendments</span>}
      width={700}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', height: 420 }}>
        {/* Left — history list */}
        <div style={{
          width: 260, borderRight: '1px solid var(--border)',
          overflowY: 'auto', flexShrink: 0,
        }}>
          <div style={{
            padding: '8px 12px', background: 'var(--neutral-50)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
              {amendments.length} amendment{amendments.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => { setShowForm(true); setSelected(null); }}
              style={{
                background: 'var(--primary)', color: '#fff', border: 'none',
                borderRadius: 3, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              }}>
              + New
            </button>
          </div>
          {amendments.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              No amendments yet
            </div>
          )}
          {amendments.map(a => (
            <div key={a.amendKey}
              onClick={() => { setSelected(a); setShowForm(false); }}
              style={{
                padding: '8px 12px', cursor: 'pointer',
                background: selected?.amendKey === a.amendKey ? 'var(--primary-light)' : '#fff',
                borderBottom: '1px solid var(--border)',
                borderLeft: selected?.amendKey === a.amendKey ? '3px solid var(--primary)' : '3px solid transparent',
              }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
                #{a.amendmentNumber} · {a.date}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {a.amendType} — {a.amendReason}
              </div>
            </div>
          ))}
        </div>

        {/* Right — detail or form */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {!showForm && !selected && (
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 40, textAlign: 'center' }}>
              Select an amendment to view, or click + New to create one.
            </div>
          )}

          {/* Past amendment detail (read-only) */}
          {!showForm && selected && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
                Amendment #{selected.amendmentNumber}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 16 }}>
                {[
                  ['Date', selected.date],
                  ['Type', selected.amendType],
                  ['Reason', selected.amendReason],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={labelStyle}>{label}</div>
                    <div style={{ fontSize: 12 }}>{value}</div>
                  </div>
                ))}
              </div>
              {selected.comment && (
                <div>
                  <div style={labelStyle}>Comment</div>
                  <div style={{
                    fontSize: 12, background: 'var(--neutral-50)',
                    border: '1px solid var(--border)', borderRadius: 4,
                    padding: '8px 10px', marginTop: 2,
                  }}>
                    {selected.comment}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* New amendment form */}
          {showForm && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 16 }}>
                New Amendment
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={labelStyle}>Type *</div>
                  <select style={inputStyle} value={typeKey}
                    onChange={e => setTypeKey(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Select type…</option>
                    {amendTypes.map(t => (
                      <option key={t.typeKey} value={t.typeKey}>{t.typeName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>Reason *</div>
                  <select style={inputStyle} value={reasonKey}
                    onChange={e => setReasonKey(e.target.value ? Number(e.target.value) : '')}
                    disabled={!typeKey}>
                    <option value="">Select reason…</option>
                    {amendReasons.map(r => (
                      <option key={r.reasonKey} value={r.reasonKey}>{r.reasonName}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={labelStyle}>New Fix Type (optional)</div>
                    <select style={inputStyle} value={newFixType}
                      onChange={e => setNewFixType(e.target.value)}>
                      <option value="">No change</option>
                      <option value="W">W — Warranty</option>
                      <option value="NC">NC — Non-Covered</option>
                      <option value="C">C — Customer</option>
                      <option value="A">A — Adjustment</option>
                    </select>
                  </div>
                  <div>
                    <div style={labelStyle}>New Amount (optional)</div>
                    <input style={inputStyle} type="number" min="0" step="0.01"
                      placeholder="No change"
                      value={newAmount}
                      onChange={e => setNewAmount(e.target.value)} />
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Comment</div>
                  <input style={inputStyle} maxLength={80} placeholder="Optional…"
                    value={comment}
                    onChange={e => setComment(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button onClick={() => setShowForm(false)}
                    style={{ padding: '5px 14px', borderRadius: 3, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ padding: '5px 14px', borderRadius: 3, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    {saving ? 'Saving…' : 'Save Amendment'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/repairs/components/AmendmentModal.tsx
git commit -m "feat(repairs): AmendmentModal — history list + new amendment form"
```

---

## Task 9: Wire AmendmentModal into DetailsTab

**Files:**
- Modify: `client/src/pages/repairs/tabs/DetailsTab.tsx`

- [ ] **Step 1: Add amendment modal state and wire it up**

In `DetailsTab.tsx`, find where `RepairItemsTable` is rendered. Add state for the amendment modal and wire it:

```tsx
// Add near the top of the component (after existing state declarations):
const [amendOpen, setAmendOpen] = useState(false);
const [amendTranKey, setAmendTranKey] = useState<number | undefined>(undefined);

const hasAmendments = (lineItems ?? []).some(i => i.amendmentCount > 0);

const handleOpenAmendments = (tranKey?: number) => {
  setAmendTranKey(tranKey);
  setAmendOpen(true);
};
```

Update the `RepairItemsTable` usage:

```tsx
<RepairItemsTable
  repairKey={repairKey}
  items={lineItems ?? []}
  onItemsChanged={loadLineItems}
  onOpenAmendments={handleOpenAmendments}
  hasAmendments={hasAmendments}
/>
```

Add the modal after `RepairItemsTable`:

```tsx
<AmendmentModal
  repairKey={repairKey}
  open={amendOpen}
  onClose={() => setAmendOpen(false)}
  onAmendmentCreated={() => { loadLineItems(); setAmendOpen(false); }}
  prefillTranKey={amendTranKey}
/>
```

Add the import at the top of DetailsTab.tsx:

```tsx
import { AmendmentModal } from '../components/AmendmentModal';
```

- [ ] **Step 2: TypeScript check**

```bash
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/repairs/tabs/DetailsTab.tsx
git commit -m "feat(repairs): wire AmendmentModal into DetailsTab"
```

---

## Task 10: Push and deploy

- [ ] **Step 1: Final build checks**

```bash
cd C:/Projects/redesign-matched/server/TSI.Api && dotnet build 2>&1 | tail -5
cd C:/Projects/redesign-matched/client && npx tsc --noEmit 2>&1 | head -20
```
Both expected clean.

- [ ] **Step 2: Push**

```bash
cd C:/Projects/redesign-matched && git push origin main
```

- [ ] **Step 3: Wait for pipelines**

Check GitHub Actions. Both `deploy-client.yml` and `deploy-server.yml` must show green ✓ before smoke testing.

```bash
gh run list --limit 5
```

---

## Task 11: Smoke test — live environment only

> Do NOT mark this task done until all checks pass against the Azure URLs.

**API base:** `https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api`
**App URL:** `https://happy-plant-03638db0f.6.azurestaticapps.net`

- [ ] **Check 1: Item catalog loads**

```bash
curl "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/repairs/items?repairKey=577712"
```
Expected: JSON array with `itemKey`, `itemCode`, `description`, `defaultPrice` fields. At least 5 items returned.

- [ ] **Check 2: Amend types load**

```bash
curl "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/amend-types"
```
Expected: JSON array with `typeKey`, `typeName`.

- [ ] **Check 3: Amendments endpoint**

```bash
curl "https://tsi-redesign-matched-api-hthhd4h3byb8dtdq.centralus-01.azurewebsites.net/api/repairs/577712/amendments"
```
Expected: JSON array (may be empty if no amendments yet — that's fine).

- [ ] **Check 4: Frontend — add an item**

1. Open `https://happy-plant-03638db0f.6.azurestaticapps.net/repairs/577712`
2. On the Details tab, type in the search box — confirm dropdown appears with items and prices
3. Select an item — confirm code/description fills, amount pre-fills
4. Click Fix Type = **C**, hit Enter — confirm item appears in the table
5. Confirm the + button re-focuses the search input

- [ ] **Check 5: Warranty item**

1. Select an item, set Fix Type = **W**
2. Confirm amount field shows $0 and is disabled
3. Hit Enter to save
4. Confirm the row shows $0.00 charged with "(list: $X.XX)" below it

- [ ] **Check 6: Amendment modal**

1. Click the amount on any existing row — confirm AmendmentModal opens
2. Confirm amendment history list loads (left side)
3. Click "+ New", select type + reason, enter a comment, save
4. Confirm amendment appears in the history list
5. Click the amendment — confirm detail panel shows it read-only
6. Confirm "A Amendments" badge now appears in the table header

All 6 checks must pass. Report any failure with the exact error message.
