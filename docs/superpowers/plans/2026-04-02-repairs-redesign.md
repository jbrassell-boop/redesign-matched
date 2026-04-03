# Repairs Screen Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current tabbed cockpit layout with a 4-tab persistent design (Scope In / Details / Outgoing / Expense) that puts repair items front and center, surfacing complaint and flags above the table every time.

**Architecture:** The cockpit mode of `RepairDetailPane` is fully rewritten around 4 new tab components. A persistent `CommandStrip` (dark header) and `ScopeGlance` (scope identity bar) stay visible across all tabs. The new `RepairItemsTable` component is the centerpiece of Tab 2 and is designed to be reusable. The legacy split-pane mode (non-cockpit) in `RepairDetailPane` is left untouched.

**Tech Stack:** React 19 + TypeScript, Ant Design 5, inline CSS with CSS variable tokens, ASP.NET Core 8 Web API, raw SqlClient (no EF Core), Azure SQL.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| EXTEND | `client/src/pages/repairs/types.ts` | Add missing fields to `RepairFull`; extend `LineItemUpdate` with cause, tech2, primary |
| EXTEND | `server/TSI.Api/Controllers/RepairsController.cs` | Add missing columns to `GetRepairFull` SQL; add `PATCH /repairs/{key}/header`; fix line item cause column |
| EXTEND | `server/TSI.Api/Models/RepairModels.cs` | Add new properties to `RepairFull` C# record (or inline record in controller — match existing pattern) |
| CREATE | `client/src/pages/repairs/components/CommandStrip.tsx` | Dark navy persistent header: Client, Dept, WO, PO, Rack, Level, TAT, Date In |
| CREATE | `client/src/pages/repairs/components/ScopeGlance.tsx` | Light blue scope identity bar: Manufacturer, Category, Model, SN#, Cap/FFS, Days Last In, Within 40 Day, flags |
| CREATE | `client/src/pages/repairs/components/RepairItemsTable.tsx` | Full items table with inline add row, cause/fix badges, totals footer |
| CREATE | `client/src/pages/repairs/tabs/ScopeInTab.tsx` | Tab 1: inbound shipping, approval, addresses, invoice options |
| REWRITE | `client/src/pages/repairs/tabs/DetailsTab.tsx` | Tab 2: action bar + left sidebar (complaint form, angulation, outsource, comments) + right (complaint banner, flags, items table) |
| CREATE | `client/src/pages/repairs/tabs/OutgoingTab.tsx` | Tab 3: outbound shipping, delivery dates, ship address, invoice card |
| REWRITE | `client/src/pages/repairs/tabs/ExpenseTab.tsx` | Tab 4: expense breakdown, revenue, margin display (replaces FinancialsTab content) |
| REWRITE | `client/src/pages/repairs/RepairDetailPane.tsx` | Cockpit mode only: replace old CockpitHeader/ReferenceStrip/FlagsBar/tabs with new 4-tab layout. Legacy split-pane mode untouched. |
| EXTEND | `client/src/api/repairs.ts` | Add `patchRepairHeader()` call; extend `LineItemUpdate` import |

---

## Task 1 — Extend `types.ts`

**Files:**
- Modify: `client/src/pages/repairs/types.ts`

- [ ] **Step 1: Add missing fields to `RepairFull`**

Open `client/src/pages/repairs/types.ts`. Replace the `RepairFull` interface with this extended version (new fields marked with `// NEW`):

```typescript
export interface RepairFull {
  repairKey: number; wo: string; status: string; statusId: number; isUrgent: boolean;
  client: string; clientKey: number; dept: string; deptKey: number;
  scopeType: string; serial: string; scopeModel?: string; manufacturer?: string;
  dateIn: string; dateApproved?: string; estDelivery?: string; shipDate?: string; dateOut?: string;
  daysIn: number;
  // Command strip fields
  rackLocation?: string;        // NEW — sRackLocation
  repairLevel?: string;         // NEW — joined from tblRepairLevels
  leadTime?: string;            // NEW — sLeadTime
  turnAroundTime?: string;      // NEW — sTurnAroundTime
  purchaseOrder?: string;       // already exists as purchaseOrder
  // Scope glance computed
  withinFortyDay?: boolean;     // NEW — computed in SQL: daysIn <= 40 from prev repair
  daysLastIn?: number | null;   // NEW — days since prior repair on same scope
  capFfs?: string;              // NEW — from client/dept contract type
  // Techs
  tech?: string; techKey?: number; tech2?: string; inspector?: string;
  // Order
  approvalName?: string; salesRep?: string; reportingGroup?: string; // reportingGroup NEW
  approvalSentDate?: string;    // NEW — dtAprSent
  requisition?: string;         // NEW — sRequisitionNumber
  discountPct?: number | null;  // NEW — dblDiscount
  // Financial
  amountApproved?: number; invoiceNumber?: string;
  pricingCategory?: string; paymentTerms?: string; contractNumber?: string;
  // Complaint
  complaint?: string; notes?: string; repairReason?: string;
  psLevel?: string;             // NEW — sPS_Level or sPSLevel (verify col name)
  customerRef?: string;
  // Invoice options
  displayComplaintOnInvoice?: boolean;   // NEW — bDisplayComplaint
  displayItemizedDesc?: boolean;         // NEW — bDisplayItemizedDesc
  displayItemizedAmounts?: boolean;      // NEW — bDisplayItemizedAmounts
  billToCustomer?: string;               // NEW — sBillToCustomer
  // Inbound
  inboundServiceLevel?: string;  // NEW — sInboundServiceLevel
  shippingCostIn?: number | null; // NEW — dblShipCostIn
  distributor?: string;           // NEW — sDistributor
  trackingNumberIn?: string;
  // Addresses
  billName?: string; billAddr1?: string; billAddr2?: string;
  billCity?: string; billState?: string; billZip?: string; billEmail?: string;
  shipName?: string; shipAddr1?: string; shipAddr2?: string;
  shipCity?: string; shipState?: string; shipZip?: string;
  // Outbound
  trackingNumber?: string; trackingNumberFedEx?: string;
  shipWeight?: string; deliveryServiceLevel?: string;
  packageType?: string;          // NEW — sPackageType
  trackingRequired?: boolean;    // NEW — bTrackingRequired
  gtdDeliveryDate?: string;      // NEW — dtGTDDate
  winscopeGtdDate?: string;      // NEW — dtWinscopeGTD
  actualDeliveryDate?: string;   // NEW — dtActualDelivery
  // Outsource
  outsourced: boolean; outsourceVendor?: string; // NEW
  outsourceCost?: number | null; // NEW
  outsourceTracking?: string;    // NEW
  // Accessories / loaner
  loanerRequested: boolean; loanerProvided?: boolean; loanerRepair?: string;
  includesBox: boolean; includesCase: boolean; includesETOCap: boolean; includesCO2Cap: boolean;
  includesCamera: boolean; includesHood: boolean; includesLightPostAdapter: boolean;
  includesSuctionValve: boolean; includesWaterProofCap: boolean; includesAirWaterValve: boolean;
  firstRepair: boolean; reworkRequired?: string; source?: string;
}
```

- [ ] **Step 2: Extend `LineItemUpdate` with cause, tech2, primary**

In the same file, replace:
```typescript
export interface LineItemUpdate {
  approved?: string; itemCode?: string; description?: string;
  fixType?: string; amount?: number; comments?: string;
}
```
with:
```typescript
export interface LineItemUpdate {
  approved?: string;
  itemCode?: string;      // lRepairItemKey (FK to tblRepairItem)
  cause?: string;         // sProblemID on tblRepairItemTran — UA / NW / etc.
  description?: string;
  fixType?: string;       // W / NC / C / A
  amount?: number;
  techKey?: number | null;
  tech2Key?: number | null;
  isPrimary?: boolean;
  comments?: string;
}
```

- [ ] **Step 3: Verify the build compiles**

```bash
cd C:/Projects/redesign-matched/client
npm run build 2>&1 | tail -20
```
Expected: Any errors are from files not yet updated (e.g., old callers of `LineItemUpdate`). No new errors from `types.ts` itself.

- [ ] **Step 4: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/types.ts
git commit -m "feat(repairs): extend RepairFull and LineItemUpdate types for 4-tab redesign"
```

---

## Task 2 — Backend: Extend `GetRepairFull` SQL

**Files:**
- Modify: `server/TSI.Api/Controllers/RepairsController.cs` (around line 187)
- Modify: The `RepairFull` C# record (find with `grep -n "record RepairFull" server/TSI.Api/Controllers/RepairsController.cs` — it may be inline or in a Models file)

- [ ] **Step 1: Find the RepairFull C# record**

```bash
grep -rn "record RepairFull" C:/Projects/redesign-matched/server/TSI.Api/
```

Note the file path and line number. The record must be extended to match new TypeScript fields.

- [ ] **Step 2: Verify which new columns exist in tblRepair**

Cross-reference against `C:/Projects/tsi-redesign/tasks/db-schema-dump.json` or run:
```bash
grep -i "rack\|leadtime\|turnaround\|psLevel\|distributor\|requisition\|package\|gtd\|outsource\|inbound\|discount" "C:/Projects/tsi-redesign/tasks/db-schema-dump.json" | head -40
```

For each column below, note the actual column name before adding to SQL:
- Rack location → likely `sRackLocation`
- Lead time → likely `sLeadTime`
- Turn around time → likely `sTurnAroundTime`
- Repair level → join `tblRepairLevels` on `lRepairLevelKey`
- PS Level → likely `sPSLevel` or `sPS_Level`
- Approval sent date → likely `dtAprSent`
- Requisition → likely `sRequisitionNumber`
- Discount % → likely `dblDiscount`
- Inbound service level → likely `sInboundServiceLevel`
- Shipping cost in → likely `dblShipCostIn`
- Distributor → likely `sDistributor`
- Package type → likely `sPackageType`
- GTD delivery → likely `dtGTDDate`
- Winscope GTD → likely `dtWinscopeGTD`
- Actual delivery → likely `dtActualDelivery`
- Outsource vendor → likely `sOutsourceVendor`
- Outsource cost → likely `dblOutsourceCost`
- Outsource tracking → likely `sOutsourceTracking`
- Invoice display options → likely `bDisplayComplaint`, `bDisplayItemizedDesc`, `bDisplayItemizedAmounts`
- Bill to customer → likely `sBillToCustomer`

**For any column that does NOT exist in the schema: skip it (leave the field null in the response). Do NOT create new DB columns.**

- [ ] **Step 3: Extend the SQL in `GetRepairFull`**

Add verified columns to the existing SELECT statement in `GetRepairFull` (around line 194). Add each verified column after the existing columns before the `FROM` clause. Example additions:

```sql
-- Add these lines to the SELECT (only include columns verified to exist):
r.sRackLocation,
r.sLeadTime,
r.sTurnAroundTime,
r.sPSLevel,
r.dtAprSent,
r.sRequisitionNumber,
r.dblDiscount,
r.sInboundServiceLevel,
r.dblShipCostIn,
r.sDistributor,
r.sPackageType,
r.bTrackingRequired,
r.dtGTDDate,
r.dtWinscopeGTD,
r.dtActualDelivery,
r.sOutsourceVendor,
r.dblOutsourceCost,
r.sOutsourceTracking,
r.bDisplayComplaint,
r.bDisplayItemizedDesc,
r.bDisplayItemizedAmounts,
r.sBillToCustomer,
-- Computed: within 40 day (days since last repair on same scope <= 40)
(SELECT TOP 1 DATEDIFF(day, r2.dtDateIn, r.dtDateIn)
 FROM tblRepair r2
 WHERE r2.lScopeKey = r.lScopeKey
   AND r2.lRepairKey < r.lRepairKey
   AND r2.dtDateIn IS NOT NULL
 ORDER BY r2.lRepairKey DESC) AS DaysLastIn,
-- Join repair level
ISNULL(rl.sRepairLevel, '') AS sRepairLevel,
ISNULL(sr2.sSalesRepGroup, '') AS sSalesRepGroup,
```

And add these JOINs to the FROM clause:
```sql
LEFT JOIN tblRepairLevels rl ON rl.lRepairLevelKey = r.lRepairLevelKey
LEFT JOIN tblSalesRep sr2 ON sr2.lSalesRepKey = r.lSalesRepKey  -- already joined as sr, reuse alias
```

**Note:** `sr` is already joined for the sales rep name. `sSalesRepGroup` may be on the same table — verify the column name. If it's not on tblSalesRep, skip `reportingGroup`.

- [ ] **Step 4: Extend the C# `RepairFull` record and `Ok(new RepairFull(...))` mapping**

Add corresponding properties and reader mappings for each column you added. Follow the existing pattern exactly:

```csharp
// In the record definition, add:
string? RackLocation,
string? LeadTime,
string? TurnAroundTime,
string? RepairLevel,
string? PsLevel,
string? ApprovalSentDate,
string? Requisition,
decimal? DiscountPct,
string? InboundServiceLevel,
decimal? ShippingCostIn,
string? Distributor,
string? PackageType,
bool? TrackingRequired,
string? GtdDeliveryDate,
string? WinscopeGtdDate,
string? ActualDeliveryDate,
string? OutsourceVendor,
decimal? OutsourceCost,
string? OutsourceTracking,
bool? DisplayComplaintOnInvoice,
bool? DisplayItemizedDesc,
bool? DisplayItemizedAmounts,
string? BillToCustomer,
int? DaysLastIn,
string? ReportingGroup,

// In the Ok(new RepairFull(...)) mapping, add:
RackLocation: ReadStr("sRackLocation"),
LeadTime: ReadStr("sLeadTime"),
TurnAroundTime: ReadStr("sTurnAroundTime"),
RepairLevel: ReadStr("sRepairLevel"),
PsLevel: ReadStr("sPSLevel"),
ApprovalSentDate: ReadDate("dtAprSent")?.ToString("MM/dd/yyyy"),
Requisition: ReadStr("sRequisitionNumber"),
DiscountPct: reader["dblDiscount"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblDiscount"]),
InboundServiceLevel: ReadStr("sInboundServiceLevel"),
ShippingCostIn: reader["dblShipCostIn"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblShipCostIn"]),
Distributor: ReadStr("sDistributor"),
PackageType: ReadStr("sPackageType"),
TrackingRequired: reader["bTrackingRequired"] == DBNull.Value ? null : Convert.ToBoolean(reader["bTrackingRequired"]),
GtdDeliveryDate: ReadDate("dtGTDDate")?.ToString("MM/dd/yyyy"),
WinscopeGtdDate: ReadDate("dtWinscopeGTD")?.ToString("MM/dd/yyyy"),
ActualDeliveryDate: ReadDate("dtActualDelivery")?.ToString("MM/dd/yyyy"),
OutsourceVendor: ReadStr("sOutsourceVendor"),
OutsourceCost: reader["dblOutsourceCost"] == DBNull.Value ? null : Convert.ToDecimal(reader["dblOutsourceCost"]),
OutsourceTracking: ReadStr("sOutsourceTracking"),
DisplayComplaintOnInvoice: reader["bDisplayComplaint"] == DBNull.Value ? null : Convert.ToBoolean(reader["bDisplayComplaint"]),
DisplayItemizedDesc: reader["bDisplayItemizedDesc"] == DBNull.Value ? null : Convert.ToBoolean(reader["bDisplayItemizedDesc"]),
DisplayItemizedAmounts: reader["bDisplayItemizedAmounts"] == DBNull.Value ? null : Convert.ToBoolean(reader["bDisplayItemizedAmounts"]),
BillToCustomer: ReadStr("sBillToCustomer"),
DaysLastIn: reader["DaysLastIn"] == DBNull.Value ? null : Convert.ToInt32(reader["DaysLastIn"]),
ReportingGroup: ReadStr("sSalesRepGroup"),
```

- [ ] **Step 5: Verify backend builds**

```bash
cd C:/Projects/redesign-matched/server/TSI.Api
dotnet build 2>&1 | tail -20
```
Expected: `Build succeeded. 0 Error(s)`

If SQL column name is wrong (e.g., column doesn't exist), the API will return a SqlException at runtime — that's OK for now. The TypeScript field will just be undefined.

- [ ] **Step 6: Commit**

```bash
cd C:/Projects/redesign-matched
git add server/TSI.Api/Controllers/RepairsController.cs server/TSI.Api/Models/
git commit -m "feat(repairs): extend GetRepairFull with 4-tab fields (rack, level, angulation, outsource, invoice options)"
```

---

## Task 3 — Backend: `PATCH /repairs/{key}/header`

Saves editable command strip + complaint + other tab-1 fields in a single call.

**Files:**
- Modify: `server/TSI.Api/Controllers/RepairsController.cs`

- [ ] **Step 1: Add the request record**

Find where other request records are defined in the controller (e.g., `UpdateRepairNotesRequest`). Add:

```csharp
public record PatchRepairHeaderRequest(
    string? PurchaseOrder,
    string? RackLocation,
    string? Complaint,
    string? RepairReason,
    string? Requisition,
    string? InboundServiceLevel,
    string? InboundTracking,
    string? Distributor,
    decimal? ShippingCostIn,
    bool? DisplayComplaintOnInvoice,
    bool? DisplayItemizedDesc,
    bool? DisplayItemizedAmounts,
    string? BillToCustomer
);
```

- [ ] **Step 2: Add the PATCH endpoint**

After the existing `UpdatePO` endpoint (around line 342), add:

```csharp
[HttpPatch("{repairKey:int}/header")]
public async Task<IActionResult> PatchRepairHeader(int repairKey, [FromBody] PatchRepairHeaderRequest body)
{
    await using var conn = CreateConnection();
    await conn.OpenAsync();
    await using var cmd = new SqlCommand("""
        UPDATE tblRepair SET
            sPurchaseOrder            = COALESCE(@po, sPurchaseOrder),
            sRackLocation             = COALESCE(@rack, sRackLocation),
            sComplaintDesc            = COALESCE(@complaint, sComplaintDesc),
            lRepairReasonKey          = COALESCE(
                (SELECT TOP 1 lRepairReasonKey FROM tblRepairReasons WHERE sRepairReason = @reason),
                lRepairReasonKey),
            sRequisitionNumber        = COALESCE(@requisition, sRequisitionNumber),
            sInboundServiceLevel      = COALESCE(@inboundSvc, sInboundServiceLevel),
            sShipTrackingNumberIn     = COALESCE(@inboundTracking, sShipTrackingNumberIn),
            sDistributor              = COALESCE(@distributor, sDistributor),
            dblShipCostIn             = COALESCE(@shipCostIn, dblShipCostIn),
            bDisplayComplaint         = COALESCE(@displayComplaint, bDisplayComplaint),
            bDisplayItemizedDesc      = COALESCE(@displayItemDesc, bDisplayItemizedDesc),
            bDisplayItemizedAmounts   = COALESCE(@displayItemAmts, bDisplayItemizedAmounts),
            sBillToCustomer           = COALESCE(@billTo, sBillToCustomer)
        WHERE lRepairKey = @id
        """, conn);
    cmd.Parameters.AddWithValue("@id", repairKey);
    cmd.Parameters.AddWithValue("@po", (object?)body.PurchaseOrder ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@rack", (object?)body.RackLocation ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@complaint", (object?)body.Complaint ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@reason", (object?)body.RepairReason ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@requisition", (object?)body.Requisition ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@inboundSvc", (object?)body.InboundServiceLevel ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@inboundTracking", (object?)body.InboundTracking ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@distributor", (object?)body.Distributor ?? DBNull.Value);
    cmd.Parameters.AddWithValue("@shipCostIn", body.ShippingCostIn.HasValue ? (object)body.ShippingCostIn.Value : DBNull.Value);
    cmd.Parameters.AddWithValue("@displayComplaint", body.DisplayComplaintOnInvoice.HasValue ? (object)body.DisplayComplaintOnInvoice.Value : DBNull.Value);
    cmd.Parameters.AddWithValue("@displayItemDesc", body.DisplayItemizedDesc.HasValue ? (object)body.DisplayItemizedDesc.Value : DBNull.Value);
    cmd.Parameters.AddWithValue("@displayItemAmts", body.DisplayItemizedAmounts.HasValue ? (object)body.DisplayItemizedAmounts.Value : DBNull.Value);
    cmd.Parameters.AddWithValue("@billTo", (object?)body.BillToCustomer ?? DBNull.Value);
    await cmd.ExecuteNonQueryAsync();
    return NoContent();
}
```

**Note:** If any of these column names don't exist in tblRepair (from Step 2 of Task 2), remove those `SET` lines. The SQL will fail if a column name is wrong.

- [ ] **Step 3: Fix the cause column in line items**

The current `AddLineItem` endpoint (around line 669) does not include the `cause` column. Find the INSERT SQL and update it to include `sProblemID` (the cause field on the transaction row) and `lRepairItemKey` separately from the cause.

The current `GetLineItems` SQL has a confusing alias: `ri.sProblemID AS ItemCode` (from reference table) and `rit.sProblemID AS Cause` (from transaction). This means `rit.sProblemID` stores the UA/NW cause. Confirm this is correct by checking the AddLineItem INSERT statement.

Find the INSERT in `AddLineItem` and ensure it sets `rit.sProblemID` (cause) separately from the reference item link (`lRepairItemKey`). If the current INSERT already uses `@itemCode` to set `rit.sProblemID`, that's storing the cause — update it to store the actual cause value. The corrected INSERT should be:

```sql
INSERT INTO tblRepairItemTran
    (lRepairKey, lRepairItemKey, sProblemID, sApproved, sFixType, dblRepairPrice, sComments, lTechnicianKey)
VALUES
    (@repairKey, @repairItemKey, @cause, @approved, @fixType, @amount, @comments, @techKey)
```

And update the parameter mapping:
```csharp
cmd.Parameters.AddWithValue("@repairItemKey", body.ItemCode != null && int.TryParse(body.ItemCode, out var ik) ? ik : DBNull.Value);
cmd.Parameters.AddWithValue("@cause", (object?)(body.Cause) ?? DBNull.Value);
cmd.Parameters.AddWithValue("@approved", (object?)body.Approved ?? DBNull.Value);
cmd.Parameters.AddWithValue("@fixType", (object?)body.FixType ?? DBNull.Value);
cmd.Parameters.AddWithValue("@amount", body.Amount.HasValue ? (object)body.Amount.Value : 0m);
cmd.Parameters.AddWithValue("@comments", (object?)body.Comments ?? DBNull.Value);
cmd.Parameters.AddWithValue("@techKey", body.TechKey.HasValue ? (object)body.TechKey.Value : DBNull.Value);
```

Do the same for `UpdateLineItem`.

- [ ] **Step 4: Build and verify**

```bash
cd C:/Projects/redesign-matched/server/TSI.Api
dotnet build 2>&1 | tail -10
```
Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 5: Commit**

```bash
cd C:/Projects/redesign-matched
git add server/TSI.Api/Controllers/RepairsController.cs
git commit -m "feat(repairs): add PATCH header endpoint; fix line item cause/techKey columns"
```

---

## Task 4 — Frontend API: `patchRepairHeader`

**Files:**
- Modify: `client/src/api/repairs.ts`

- [ ] **Step 1: Add the request type and function**

Add at the end of `client/src/api/repairs.ts`:

```typescript
export interface RepairHeaderPatch {
  purchaseOrder?: string;
  rackLocation?: string;
  complaint?: string;
  repairReason?: string;
  requisition?: string;
  inboundServiceLevel?: string;
  inboundTracking?: string;
  distributor?: string;
  shippingCostIn?: number;
  displayComplaintOnInvoice?: boolean;
  displayItemizedDesc?: boolean;
  displayItemizedAmounts?: boolean;
  billToCustomer?: string;
}

export const patchRepairHeader = async (repairKey: number, patch: RepairHeaderPatch): Promise<void> => {
  await apiClient.patch(`/repairs/${repairKey}/header`, patch);
};
```

- [ ] **Step 2: Build check**

```bash
cd C:/Projects/redesign-matched/client && npm run build 2>&1 | grep -E "error|Error" | head -10
```
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/api/repairs.ts
git commit -m "feat(repairs): add patchRepairHeader API function"
```

---

## Task 5 — `CommandStrip` component

The dark navy bar that sits at the very top of every repair. Shows the core header fields. Read-only display — no inline editing in this pass.

**Files:**
- Create: `client/src/pages/repairs/components/CommandStrip.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/pages/repairs/components/CommandStrip.tsx
import type { RepairFull } from '../types';

interface CommandStripProps {
  repair: RepairFull;
}

export const CommandStrip = ({ repair }: CommandStripProps) => {
  const fields: { label: string; value: string | null | undefined }[] = [
    { label: 'Client',      value: repair.client },
    { label: 'Department',  value: repair.dept },
    { label: 'Work Order',  value: repair.wo },
    { label: 'Purchase Order', value: repair.purchaseOrder },
    { label: 'Rack',        value: repair.rackLocation },
    { label: 'Repair Level', value: repair.repairLevel },
    { label: 'Lead Time',   value: repair.leadTime },
    { label: 'Turn Around', value: repair.turnAroundTime },
    { label: 'Date In',     value: repair.dateIn },
  ];

  return (
    <div style={{
      background: 'var(--navy)',
      padding: '6px 14px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px 16px',
      alignItems: 'center',
      flexShrink: 0,
    }}>
      {fields.map(({ label, value }, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{
            fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.5)',
            textTransform: 'uppercase', letterSpacing: '.05em',
          }}>
            {label}
          </div>
          <div style={{
            height: 24,
            background: 'rgba(255,255,255,.1)',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 3,
            padding: '0 7px',
            fontSize: 11,
            color: value ? '#fff' : 'rgba(255,255,255,.3)',
            fontStyle: value ? 'normal' : 'italic',
            display: 'flex',
            alignItems: 'center',
            minWidth: 70,
            whiteSpace: 'nowrap',
          }}>
            {value || '—'}
          </div>
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Build check**

```bash
cd C:/Projects/redesign-matched/client && npm run build 2>&1 | grep -E "error TS" | head -10
```
Expected: No errors from the new file.

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/components/CommandStrip.tsx
git commit -m "feat(repairs): add CommandStrip persistent header component"
```

---

## Task 6 — `ScopeGlance` component

The light blue bar below the command strip showing scope identity + flags.

**Files:**
- Create: `client/src/pages/repairs/components/ScopeGlance.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/pages/repairs/components/ScopeGlance.tsx
import type { RepairFull } from '../types';
import type { ClientFlag } from '../../clients/types';

interface ScopeGlanceProps {
  repair: RepairFull;
  flags: ClientFlag[];
}

export const ScopeGlance = ({ repair, flags }: ScopeGlanceProps) => {
  const within40 = repair.withinFortyDay ??
    (repair.daysLastIn != null && repair.daysLastIn <= 40);

  return (
    <div style={{
      background: '#f0f6ff',
      borderBottom: '2px solid var(--border)',
      padding: '5px 14px',
      display: 'flex',
      gap: 14,
      alignItems: 'center',
      flexWrap: 'wrap',
      flexShrink: 0,
    }}>
      {/* Scope identity chips */}
      {[
        { label: 'Manufacturer', value: repair.manufacturer },
        { label: 'Category',     value: repair.scopeType },
        { label: 'Model',        value: repair.scopeModel },
        { label: 'SN#',          value: repair.serial },
        { label: 'Cap / FFS',    value: repair.capFfs },
      ].map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            {label}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>
            {value || '—'}
          </div>
        </div>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Days last in */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Days Last In</div>
          <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)' }}>
            {repair.daysLastIn != null ? `${repair.daysLastIn}d` : '—'}
          </div>
        </div>

        {/* Within 40 day badge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Within 40 Day</div>
          <div style={{
            fontSize: 11, fontWeight: 700,
            color: within40 ? 'var(--danger)' : 'var(--success)',
          }}>
            {within40 ? 'YES' : 'No'}
          </div>
        </div>

        {/* Flag pills */}
        {repair.isUrgent && (
          <span style={{
            background: 'var(--danger)', color: '#fff',
            padding: '2px 9px', borderRadius: 10,
            fontSize: 10, fontWeight: 700,
          }}>⚑ Rush</span>
        )}
        {flags.map(f => (
          <span key={f.flagKey ?? f.flag} style={{
            background: '#FEF3C7', color: '#92400E',
            border: '1px solid #FDE68A',
            padding: '2px 9px', borderRadius: 10,
            fontSize: 10, fontWeight: 700,
          }}>⚑ {f.flag}</span>
        ))}
      </div>
    </div>
  );
};
```

**Note:** `ClientFlag` has `flag` and `flagKey` — check `client/src/pages/clients/types.ts` for exact property names and adjust if needed.

- [ ] **Step 2: Build check**

```bash
cd C:/Projects/redesign-matched/client && npm run build 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/components/ScopeGlance.tsx
git commit -m "feat(repairs): add ScopeGlance scope identity + flags bar"
```

---

## Task 7 — `RepairItemsTable` component

The centerpiece. Table with cause/fix badges, inline add row, totals footer.

**Files:**
- Create: `client/src/pages/repairs/components/RepairItemsTable.tsx`

- [ ] **Step 1: Create the component**

```tsx
// client/src/pages/repairs/components/RepairItemsTable.tsx
import { useState } from 'react';
import { message } from 'antd';
import type { RepairLineItem, LineItemUpdate } from '../types';
import { addRepairLineItem, updateRepairLineItem, deleteRepairLineItem } from '../../../api/repairs';

interface RepairItemsTableProps {
  repairKey: number;
  items: RepairLineItem[];
  onItemsChanged: () => void;
}

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

const EMPTY_ADD: LineItemUpdate = { cause: '', fixType: '', amount: 0, comments: '' };

export const RepairItemsTable = ({ repairKey, items, onItemsChanged }: RepairItemsTableProps) => {
  const [addRow, setAddRow] = useState<LineItemUpdate>(EMPTY_ADD);
  const [saving, setSaving] = useState(false);

  const warrantyTotal = items
    .filter(i => i.fixType?.toUpperCase() === 'W')
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const customerTotal = items
    .filter(i => i.fixType?.toUpperCase() !== 'W')
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);
  const grandTotal = warrantyTotal + customerTotal;

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleAdd = async () => {
    if (!addRow.cause && !addRow.fixType && !addRow.amount) return;
    setSaving(true);
    try {
      await addRepairLineItem(repairKey, addRow);
      setAddRow(EMPTY_ADD);
      onItemsChanged();
      message.success('Item added');
    } catch {
      message.error('Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tranKey: number) => {
    try {
      await deleteRepairLineItem(repairKey, tranKey);
      onItemsChanged();
      message.success('Item removed');
    } catch {
      message.error('Failed to remove item');
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
  const addTdStyle: React.CSSProperties = {
    ...tdStyle, background: '#eff6ff',
  };
  const addInput: React.CSSProperties = {
    width: '100%', height: 24,
    border: '1px solid #93c5fd', borderRadius: 3,
    fontSize: 10, padding: '0 4px', background: '#fff',
  };

  return (
    <div style={{ border: '2px solid var(--primary)', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'var(--primary)', color: '#fff',
        padding: '8px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>Repair Items</span>
        <span style={{ fontSize: 11, opacity: .75 }}>
          {items.length} item{items.length !== 1 ? 's' : ''} ·{' '}
          <span style={{ color: '#4ade80' }}>{fmt(warrantyTotal)} warranty</span> ·{' '}
          <span style={{ color: '#fbbf24' }}>{fmt(customerTotal)} customer</span>
        </span>
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
              <tr key={item.tranKey} style={{ cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f6ff')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{approvalDot(item.approved)}</td>
                <td style={tdStyle}>{item.itemCode}</td>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{item.description}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{causeBadge(item.cause)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{fixBadge(item.fixType)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  {item.approved === 'Y'
                    ? <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 11 }}>✓ Approved</span>
                    : <span style={{ color: 'var(--warn)', fontSize: 11 }}>Pending</span>}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: 13 }}>
                  {fmt(item.amount ?? 0)}
                </td>
                <td style={tdStyle}>{item.tech || '—'}</td>
                <td style={{ ...tdStyle, color: item.comments ? '#374151' : 'var(--muted)', fontSize: 11 }}>
                  {item.comments || '—'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button
                    onClick={() => handleDelete(item.tranKey)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: 0 }}
                    title="Remove item"
                  >×</button>
                </td>
              </tr>
            ))}

            {/* Inline add row */}
            <tr style={{ borderTop: '2px dashed #93c5fd' }}>
              <td style={addTdStyle}></td>
              <td style={addTdStyle}>
                <input style={addInput} placeholder="Code…"
                  value={addRow.itemCode ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, itemCode: e.target.value }))} />
              </td>
              <td style={addTdStyle}>
                <input style={addInput} placeholder="Search or type repair item…"
                  value={addRow.description ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, description: e.target.value }))} />
              </td>
              <td style={{ ...addTdStyle, textAlign: 'center' }}>
                <select style={{ ...addInput, width: 52 }}
                  value={addRow.cause ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, cause: e.target.value }))}>
                  <option value="">—</option>
                  <option value="UA">UA</option>
                  <option value="NW">NW</option>
                </select>
              </td>
              <td style={{ ...addTdStyle, textAlign: 'center' }}>
                <select style={{ ...addInput, width: 44 }}
                  value={addRow.fixType ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, fixType: e.target.value }))}>
                  <option value="">—</option>
                  <option value="W">W</option>
                  <option value="NC">NC</option>
                  <option value="C">C</option>
                  <option value="A">A</option>
                </select>
              </td>
              <td style={addTdStyle}></td>
              <td style={addTdStyle}>
                <input style={{ ...addInput, textAlign: 'right' }}
                  placeholder="$0.00" type="number" min="0" step="0.01"
                  value={addRow.amount ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, amount: parseFloat(e.target.value) || 0 }))} />
              </td>
              <td style={addTdStyle}>
                <input style={addInput} placeholder="Tech…"
                  value={addRow.comments ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, comments: e.target.value }))} />
              </td>
              <td style={addTdStyle}>
                <input style={addInput} placeholder="Comment…"
                  value={addRow.comments ?? ''}
                  onChange={e => setAddRow(r => ({ ...r, comments: e.target.value }))} />
              </td>
              <td style={addTdStyle}>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  style={{
                    background: 'var(--primary)', color: '#fff', border: 'none',
                    borderRadius: 3, padding: '3px 8px', fontSize: 10,
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
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
```

- [ ] **Step 2: Build check**

```bash
cd C:/Projects/redesign-matched/client && npm run build 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/components/RepairItemsTable.tsx
git commit -m "feat(repairs): add RepairItemsTable with cause/fix badges, inline add, totals footer"
```

---

## Task 8 — Tab 2: `DetailsTab` rewrite

The most important tab. Left sidebar (complaint form, angulation, outsource, comments) + right panel (complaint banner, flags banner, items table).

**Files:**
- Rewrite: `client/src/pages/repairs/tabs/DetailsTab.tsx`

- [ ] **Step 1: Rewrite DetailsTab**

```tsx
// client/src/pages/repairs/tabs/DetailsTab.tsx
import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import type { RepairFull, RepairLineItem } from '../types';
import type { ClientFlag } from '../../clients/types';
import { getRepairLineItems } from '../../../api/repairs';
import { RepairItemsTable } from '../components/RepairItemsTable';

interface DetailsTabProps {
  repair: RepairFull;
  flags: ClientFlag[];
}

const fieldStyle: React.CSSProperties = {
  height: 26, border: '1px solid #d1d5db', borderRadius: 3,
  background: '#fff', padding: '0 7px', fontSize: 11, color: '#374151',
  display: 'flex', alignItems: 'center',
};
const lblStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2,
};
const sectionHd: React.CSSProperties = {
  background: 'var(--neutral-50, #f9fafb)',
  padding: '5px 10px', fontSize: 9.5, fontWeight: 700, color: 'var(--navy)',
  textTransform: 'uppercase', letterSpacing: '.05em',
  borderBottom: '1px solid var(--border)',
  borderTop: '1px solid var(--border)',
};

export const DetailsTab = ({ repair, flags }: DetailsTabProps) => {
  const [items, setItems] = useState<RepairLineItem[]>([]);

  const loadItems = useCallback(() => {
    getRepairLineItems(repair.repairKey)
      .then(setItems)
      .catch(() => message.error('Failed to load repair items'));
  }, [repair.repairKey]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const actionButtons = [
    { label: 'Consumption',    style: { background: 'var(--primary)', color: '#fff' } },
    { label: 'Unapproved',     style: { background: '#fff', color: 'var(--primary)', border: '1px solid var(--primary)' } },
    { label: 'Approved',       style: { background: 'var(--success)', color: '#fff' } },
    { label: 'Update Slips',   style: { background: '#fff', color: 'var(--primary)', border: '1px solid var(--primary)' } },
    { label: 'Amend Repair',   style: { background: 'var(--amber)', color: '#1a1a1a' } },
    { label: 'Defect Tracking',style: { background: '#fff', color: 'var(--primary)', border: '1px solid var(--primary)' } },
    { label: 'Update Techs',   style: { background: 'var(--neutral-50, #f9fafb)', color: 'var(--navy)', border: '1px solid var(--border)' } },
    { label: 'Inventory',      style: { background: 'var(--neutral-50, #f9fafb)', color: 'var(--navy)', border: '1px solid var(--border)' } },
  ];

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>

      {/* Action bar */}
      <div style={{
        background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
        padding: '7px 10px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginRight: 4 }}>
          Actions
        </span>
        {actionButtons.map(btn => (
          <button
            key={btn.label}
            onClick={() => message.info(`${btn.label} — coming soon`)}
            style={{
              height: 28, padding: '0 10px', borderRadius: 4,
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', border: 'none',
              ...btn.style,
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Main 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 10, alignItems: 'start' }}>

        {/* LEFT sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Complaint form */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={sectionHd}>Customer Complaint</div>
            <div style={{ padding: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', marginBottom: 8 }}>
                <div>
                  <div style={lblStyle}>Repair Reason</div>
                  <div style={fieldStyle}>{repair.repairReason || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}</div>
                </div>
                <div>
                  <div style={lblStyle}>PS Level</div>
                  <div style={fieldStyle}>{repair.psLevel || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}</div>
                </div>
              </div>
              <div style={{
                minHeight: 64, border: '1px solid #d1d5db', borderRadius: 3,
                background: '#fff', padding: '6px 7px', fontSize: 11, color: '#374151', lineHeight: 1.4,
              }}>
                {repair.complaint || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No complaint recorded</span>}
              </div>
            </div>
          </div>

          {/* Angulation IN */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ ...sectionHd, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Angulation IN</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {['Reset', 'Override'].map(lbl => (
                  <button key={lbl}
                    onClick={() => message.info(`${lbl} — coming soon`)}
                    style={{
                      height: 20, padding: '0 7px', fontSize: 9, fontWeight: 600,
                      background: '#fff', color: 'var(--navy)', border: '1px solid var(--border)',
                      borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 6 }}>
                {(['UP', 'DOWN', 'RIGHT', 'LEFT', 'Epoxy', 'Size'] as const).map(lbl => (
                  <div key={lbl}>
                    <div style={lblStyle}>{lbl}</div>
                    <div style={fieldStyle}>
                      <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 10 }}>—</span>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={lblStyle}>Max Charge</div>
                <div style={fieldStyle}><span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 10 }}>—</span></div>
              </div>
            </div>
          </div>

          {/* Outsource */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={sectionHd}>Outsource</div>
            <div style={{ padding: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
                {[
                  { label: 'Vendor',   value: repair.outsourceVendor },
                  { label: 'Cost',     value: repair.outsourceCost != null ? `$${repair.outsourceCost}` : null },
                  { label: 'Tracking', value: repair.outsourceTracking, full: true },
                ].map(({ label, value, full }) => (
                  <div key={label} style={full ? { gridColumn: '1 / -1' } : {}}>
                    <div style={lblStyle}>{label}</div>
                    <div style={fieldStyle}>{value || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>—</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={sectionHd}>Comments</div>
            <div style={{ padding: 10 }}>
              <div style={{
                minHeight: 44, border: '1px solid #d1d5db', borderRadius: 3,
                background: '#fff', padding: '6px 7px', fontSize: 10,
                color: '#9ca3af', fontStyle: 'italic', marginBottom: 8,
              }}>
                Add a comment…
              </div>
              {repair.notes && (
                <div style={{
                  background: '#f8faff', border: '1px solid #dce8f8',
                  borderRadius: 4, padding: '5px 7px',
                }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--navy)', marginBottom: 1 }}>
                    Notes
                  </div>
                  <div style={{ fontSize: 10, color: '#374151' }}>{repair.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: complaint banner + flags + items table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Complaint banner */}
          <div style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderLeft: '4px solid var(--primary)',
            borderRadius: '0 6px 6px 0',
            padding: '8px 12px',
          }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
                  Customer Complaint
                </div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                  {repair.complaint || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No complaint recorded</span>}
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Reason</div>
                <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{repair.repairReason || '—'}</div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>PS Level</div>
                <div style={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>{repair.psLevel || '—'}</div>
              </div>
            </div>
          </div>

          {/* Flags banner — only if flags exist or repair is urgent */}
          {(repair.isUrgent || flags.length > 0) && (
            <div style={{
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderLeft: '4px solid var(--amber)',
              borderRadius: '0 6px 6px 0',
              padding: '7px 12px',
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '.05em', flexShrink: 0 }}>
                Flags
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {repair.isUrgent && (
                  <span style={{ background: 'var(--danger)', color: '#fff', padding: '2px 9px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                    ⚑ Rush
                  </span>
                )}
                {flags.map((f, i) => (
                  <span key={i} style={{ background: '#92400E', color: '#fff', padding: '2px 9px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
                    ⚑ {f.flag}
                  </span>
                ))}
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 10, color: '#92400E', fontStyle: 'italic' }}>
                Review before proceeding
              </div>
            </div>
          )}

          {/* Repair items table */}
          <RepairItemsTable
            repairKey={repair.repairKey}
            items={items}
            onItemsChanged={loadItems}
          />
        </div>
      </div>
    </div>
  );
};
```

**Note:** The angulation fields (UP/DOWN/RIGHT/LEFT) show `—` placeholders for now. Wiring the actual inspections data can be done in a follow-up pass — the InspectionsTab already has this logic and can be referenced.

- [ ] **Step 2: Build check**

```bash
cd C:/Projects/redesign-matched/client && npm run build 2>&1 | grep -E "error TS" | head -20
```
Fix any type errors. Common ones: `ClientFlag` property name mismatch (check `client/src/pages/clients/types.ts`), `repair.outsourceCost` nullable check.

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/tabs/DetailsTab.tsx
git commit -m "feat(repairs): rewrite DetailsTab — complaint banner, flags banner, RepairItemsTable"
```

---

## Task 9 — Tab 1: `ScopeInTab`

**Files:**
- Create: `client/src/pages/repairs/tabs/ScopeInTab.tsx`

- [ ] **Step 1: Create ScopeInTab**

```tsx
// client/src/pages/repairs/tabs/ScopeInTab.tsx
import type { RepairFull } from '../types';

interface ScopeInTabProps {
  repair: RepairFull;
}

const F = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 }}>
      {label}
    </div>
    <div style={{
      height: 26, border: '1px solid #d1d5db', borderRadius: 3,
      background: '#fff', padding: '0 7px', fontSize: 11,
      color: value != null && value !== '' ? '#374151' : '#9ca3af',
      fontStyle: value != null && value !== '' ? 'normal' : 'italic',
      display: 'flex', alignItems: 'center',
    }}>
      {value != null && value !== '' ? String(value) : '—'}
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
    <div style={{
      background: 'var(--neutral-50, #f9fafb)', padding: '6px 10px',
      fontSize: 9.5, fontWeight: 700, color: 'var(--navy)',
      textTransform: 'uppercase', letterSpacing: '.05em',
      borderBottom: '1px solid var(--border)',
    }}>
      {title}
    </div>
    <div style={{ padding: 10 }}>{children}</div>
  </div>
);

export const ScopeInTab = ({ repair }: ScopeInTabProps) => (
  <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
    {/* LEFT */}
    <div>
      <Section title="Inbound Shipping">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
          <F label="Inbound Service Level" value={repair.inboundServiceLevel} />
          <F label="Inbound Tracking" value={repair.trackingNumberIn} />
          <F label="Shipping Cost In" value={repair.shippingCostIn != null ? `$${repair.shippingCostIn}` : null} />
          <F label="Distributor" value={repair.distributor} />
        </div>
      </Section>

      <Section title="Approval & Requisition">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', marginBottom: 8 }}>
          <F label="Sent Date" value={repair.approvalSentDate} />
          <F label="Received Approval" value={repair.dateApproved} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <F label="Name on Approval via Portal" value={repair.approvalName} />
        </div>
        <F label="Requisition #" value={repair.requisition} />
      </Section>

      <Section title="Sales & Reporting">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
          <F label="Sales Rep" value={repair.salesRep} />
          <F label="Reporting Group" value={repair.reportingGroup} />
          <F label="Pricing Category" value={repair.pricingCategory} />
          <F label="Discount %" value={repair.discountPct != null ? `${repair.discountPct}%` : null} />
        </div>
      </Section>
    </div>

    {/* RIGHT */}
    <div>
      <Section title="Shipping Address">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <F label="Ship to Name" value={repair.shipName} />
          <F label="Address" value={repair.shipAddr1} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', gap: '0 6px' }}>
            <F label="City" value={repair.shipCity} />
            <F label="ST" value={repair.shipState} />
            <F label="ZIP" value={repair.shipZip} />
          </div>
        </div>
      </Section>

      <Section title="Billing Address">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <F label="Bill to Name" value={repair.billName} />
          <F label="Address" value={repair.billAddr1} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', gap: '0 6px' }}>
            <F label="City" value={repair.billCity} />
            <F label="ST" value={repair.billState} />
            <F label="ZIP" value={repair.billZip} />
          </div>
        </div>
      </Section>

      <Section title="Invoice Options">
        {[
          { key: 'displayComplaintOnInvoice', label: 'Display customer complaint on invoice' },
          { key: 'displayItemizedDesc',       label: 'Display itemized description' },
          { key: 'displayItemizedAmounts',    label: 'Display itemized amounts' },
        ].map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151', padding: '3px 0' }}>
            <input type="checkbox" readOnly
              checked={!!(repair as Record<string, unknown>)[key]}
            />
            {label}
          </div>
        ))}
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
          <F label="Bill to Customer / Distro" value={repair.billToCustomer} />
          <F label="Payment Terms" value={repair.paymentTerms} />
        </div>
      </Section>
    </div>
  </div>
);
```

- [ ] **Step 2: Build check**

```bash
cd C:/Projects/redesign-matched/client && npm run build 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/tabs/ScopeInTab.tsx
git commit -m "feat(repairs): add ScopeInTab — inbound shipping, approval, addresses, invoice options"
```

---

## Task 10 — Tab 3: `OutgoingTab`

**Files:**
- Create: `client/src/pages/repairs/tabs/OutgoingTab.tsx`

- [ ] **Step 1: Create OutgoingTab**

```tsx
// client/src/pages/repairs/tabs/OutgoingTab.tsx
import { message } from 'antd';
import type { RepairFull, RepairLineItem } from '../types';

interface OutgoingTabProps {
  repair: RepairFull;
  items: RepairLineItem[];
}

const F = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 2 }}>{label}</div>
    <div style={{
      height: 26, border: '1px solid #d1d5db', borderRadius: 3,
      background: '#fff', padding: '0 7px', fontSize: 11,
      color: value ? '#374151' : '#9ca3af', fontStyle: value ? 'normal' : 'italic',
      display: 'flex', alignItems: 'center',
    }}>
      {value || '—'}
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
    <div style={{
      background: 'var(--neutral-50, #f9fafb)', padding: '6px 10px',
      fontSize: 9.5, fontWeight: 700, color: 'var(--navy)',
      textTransform: 'uppercase', letterSpacing: '.05em',
      borderBottom: '1px solid var(--border)',
    }}>
      {title}
    </div>
    <div style={{ padding: 10 }}>{children}</div>
  </div>
);

const causeBadgeStyle = (cause: string): React.CSSProperties => {
  if (cause?.toUpperCase() === 'UA') return { background: '#FEF2F2', color: 'var(--danger)', border: '1px solid #FECACA' };
  if (cause?.toUpperCase() === 'NW') return { background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' };
  return { background: 'var(--neutral-50)', color: 'var(--muted)', border: '1px solid var(--border)' };
};

const fixBadgeStyle = (fix: string): React.CSSProperties => {
  const map: Record<string, React.CSSProperties> = {
    W:  { background: '#F0FDF4', color: 'var(--success)', border: '1px solid #BBF7D0' },
    NC: { background: '#FEF2F2', color: 'var(--danger)',  border: '1px solid #FECACA' },
    C:  { background: '#EFF6FF', color: 'var(--primary)', border: '1px solid #BFDBFE' },
    A:  { background: '#F5F3FF', color: '#7C3AED',        border: '1px solid #DDD6FE' },
  };
  return map[fix?.toUpperCase()] ?? { background: 'var(--neutral-50)', color: 'var(--muted)', border: '1px solid var(--border)' };
};

const Badge = ({ label, style }: { label: string; style: React.CSSProperties }) => (
  <span style={{
    display: 'inline-block', padding: '1px 6px', borderRadius: 10,
    fontSize: 10, fontWeight: 700, ...style,
  }}>{label}</span>
);

export const OutgoingTab = ({ repair, items }: OutgoingTabProps) => {
  const warrantyTotal = items.filter(i => i.fixType?.toUpperCase() === 'W').reduce((s, i) => s + (i.amount ?? 0), 0);
  const customerTotal = items.filter(i => i.fixType?.toUpperCase() !== 'W').reduce((s, i) => s + (i.amount ?? 0), 0);
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {/* LEFT */}
      <div>
        <Section title="Outbound Shipping">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
            <F label="Outbound Service Level" value={repair.deliveryServiceLevel} />
            <F label="Ship Date" value={repair.shipDate} />
            <F label="Outbound Tracking" value={repair.trackingNumber} />
            <F label="Package Type" value={repair.packageType} />
            <F label="Package Weight" value={repair.shipWeight} />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Tracking Required
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {(['Yes', 'No'] as const).map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <input type="radio" name="trackingReq" readOnly
                    checked={opt === 'Yes' ? !!repair.trackingRequired : !repair.trackingRequired}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Delivery Dates">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
            <F label="GTD Delivery Date & Time" value={repair.gtdDeliveryDate} />
            <F label="Winscope GTD Delivery" value={repair.winscopeGtdDate} />
            <F label="Actual Delivery Date & Time" value={repair.actualDeliveryDate} />
          </div>
        </Section>

        <Section title="Ship To Address">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            <F label="Ship to Name" value={repair.shipName} />
            <F label="Address" value={repair.shipAddr1} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', gap: '0 6px' }}>
              <F label="City" value={repair.shipCity} />
              <F label="ST" value={repair.shipState} />
              <F label="ZIP" value={repair.shipZip} />
            </div>
          </div>
          <button
            onClick={() => message.info('Create Label — coming soon')}
            style={{
              height: 28, padding: '0 12px', fontSize: 11, fontWeight: 600,
              background: 'var(--neutral-50, #f9fafb)', color: 'var(--navy)',
              border: '1px solid var(--border)', borderRadius: 4,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Create Label
          </button>
        </Section>
      </div>

      {/* RIGHT — Invoice */}
      <div>
        <Section title="Invoice">
          {/* Invoice card */}
          <div style={{
            background: 'var(--primary)', color: '#fff',
            borderRadius: 6, padding: 14, marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, opacity: .6, textTransform: 'uppercase', fontWeight: 700 }}>Invoice Number</div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{repair.invoiceNumber || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 9, opacity: .6, textTransform: 'uppercase', fontWeight: 700 }}>Invoice Date</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{repair.shipDate || '—'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: 'Draft Invoice', onClick: () => message.info('Draft Invoice — coming soon') },
                { label: 'Email Invoice', onClick: () => message.info('Email Invoice — coming soon') },
                { label: 'Void Invoice',  onClick: () => message.info('Void Invoice — coming soon'), danger: true },
              ].map(btn => (
                <button key={btn.label}
                  onClick={btn.onClick}
                  style={{
                    padding: '4px 10px', fontSize: 10, fontWeight: 700,
                    background: btn.danger ? 'rgba(183,18,52,.7)' : 'rgba(255,255,255,.15)',
                    color: '#fff', border: '1px solid rgba(255,255,255,.3)',
                    borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line items summary */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--navy)', color: '#fff' }}>
                  <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 600, fontSize: 10 }}>Description</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 600, fontSize: 10 }}>Cause</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', fontWeight: 600, fontSize: 10 }}>Fix</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, fontSize: 10 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.tranKey}>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)' }}>{item.description}</td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                      <Badge label={item.cause} style={causeBadgeStyle(item.cause)} />
                    </td>
                    <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                      <Badge label={item.fixType} style={fixBadgeStyle(item.fixType)} />
                    </td>
                    <td style={{
                      padding: '5px 8px', borderBottom: '1px solid var(--border)',
                      textAlign: 'right', fontWeight: 700,
                      color: item.fixType?.toUpperCase() === 'W' ? 'var(--success)' : undefined,
                    }}>
                      {fmt(item.amount ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{
              background: 'var(--navy)', color: '#fff', padding: '7px 10px',
              display: 'flex', justifyContent: 'flex-end', gap: 20, alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, opacity: .7 }}>Warranty: <span style={{ color: '#4ade80', fontWeight: 700 }}>{fmt(warrantyTotal)}</span></span>
              <span style={{ fontSize: 11, opacity: .7 }}>Non-Warranty: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{fmt(customerTotal)}</span></span>
              <span style={{ fontSize: 13, fontWeight: 900 }}>Total: {fmt(warrantyTotal + customerTotal)}</span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Build check**

```bash
cd C:/Projects/redesign-matched/client && npm run build 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 3: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/tabs/OutgoingTab.tsx
git commit -m "feat(repairs): add OutgoingTab — outbound shipping, delivery dates, invoice card"
```

---

## Task 11 — Tab 4: `ExpenseTab` rewrite

**Files:**
- Rewrite: `client/src/pages/repairs/tabs/ExpenseTab.tsx` (currently `FinancialsTab.tsx` — rename or create new)

- [ ] **Step 1: Check if ExpenseTab or FinancialsTab exists**

```bash
ls C:/Projects/redesign-matched/client/src/pages/repairs/tabs/
```

If only `FinancialsTab.tsx` exists, create a new `ExpenseTab.tsx`. Do not delete `FinancialsTab.tsx` yet.

- [ ] **Step 2: Create ExpenseTab**

```tsx
// client/src/pages/repairs/tabs/ExpenseTab.tsx
import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import type { RepairFinancials } from '../types';
import { getRepairFinancials } from '../../../api/repairs';

interface ExpenseTabProps {
  repairKey: number;
}

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ExpenseTab = ({ repairKey }: ExpenseTabProps) => {
  const [fin, setFin] = useState<RepairFinancials | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRepairFinancials(repairKey)
      .then(setFin)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [repairKey]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin /></div>;
  if (!fin) return <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>Financial data unavailable</div>;

  const expenseRows: { label: string; value: number }[] = [
    { label: 'Labor',            value: fin.labor },
    { label: 'Inventory / Parts', value: fin.inventory },
    { label: 'Shipping',         value: fin.shipping },
    { label: 'Outsource',        value: fin.outsource },
    { label: 'Commission',       value: fin.commission },
    { label: 'GPO',              value: fin.gpo },
  ];

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between',
    padding: '5px 0', borderBottom: '1px solid var(--border)',
    fontSize: 11,
  };

  return (
    <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

      {/* Expenses */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          background: 'var(--neutral-50, #f9fafb)', padding: '6px 10px',
          fontSize: 9.5, fontWeight: 700, color: 'var(--navy)',
          textTransform: 'uppercase', letterSpacing: '.05em',
          borderBottom: '1px solid var(--border)',
        }}>
          Expenses
        </div>
        <div style={{ padding: 10 }}>
          {expenseRows.map(({ label, value }) => (
            <div key={label} style={rowStyle}>
              <span style={{ color: 'var(--navy)', fontWeight: 500 }}>{label}</span>
              <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmt(value)}</span>
            </div>
          ))}
          <div style={{ ...rowStyle, borderBottom: '2px solid var(--navy)', paddingTop: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>Total Expense</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{fmt(fin.totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Revenue */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          background: 'var(--neutral-50, #f9fafb)', padding: '6px 10px',
          fontSize: 9.5, fontWeight: 700, color: 'var(--navy)',
          textTransform: 'uppercase', letterSpacing: '.05em',
          borderBottom: '1px solid var(--border)',
        }}>
          Revenue
        </div>
        <div style={{ padding: 10 }}>
          <div style={rowStyle}>
            <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Customer Charges</span>
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmt(fin.saleAmount)}</span>
          </div>
          <div style={rowStyle}>
            <span style={{ color: 'var(--navy)', fontWeight: 500 }}>Tax</span>
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{fmt(fin.tax)}</span>
          </div>
          <div style={{ ...rowStyle, borderBottom: '2px solid var(--navy)', paddingTop: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--navy)' }}>Total Revenue</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{fmt(fin.invoiceTotal)}</span>
          </div>

          <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Repair Margin
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              <div style={{
                fontSize: 28, fontWeight: 900,
                color: fin.marginPct >= 0 ? 'var(--success)' : 'var(--danger)',
              }}>
                {fin.marginPct.toFixed(1)}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>
                ({fmt(fin.invoiceTotal - fin.totalExpenses)})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual margin card */}
      <div style={{
        background: 'var(--navy)', color: '#fff',
        borderRadius: 6, padding: 16,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        gap: 4, minHeight: 200,
      }}>
        <div style={{ fontSize: 9, opacity: .6, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.05em' }}>
          Repair Margin
        </div>
        <div style={{
          fontSize: 42, fontWeight: 900, lineHeight: 1,
          color: fin.marginPct >= 0 ? '#4ade80' : '#f87171',
        }}>
          {fin.marginPct.toFixed(1)}%
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
          <div style={{ fontSize: 11, opacity: .7 }}>Revenue: {fmt(fin.invoiceTotal)}</div>
          <div style={{ fontSize: 11, opacity: .7 }}>Expense: {fmt(fin.totalExpenses)}</div>
          <div style={{ fontSize: 11, opacity: .7 }}>
            Profit: <span style={{ color: fin.invoiceTotal - fin.totalExpenses >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
              {fmt(fin.invoiceTotal - fin.totalExpenses)}
            </span>
          </div>
        </div>
        <div style={{
          marginTop: 10, padding: '5px 10px',
          background: 'rgba(255,255,255,.08)', borderRadius: 4,
          fontSize: 10, opacity: .7, textAlign: 'center',
        }}>
          (Revenue − Expense) ÷ Revenue
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Build check**

```bash
cd C:/Projects/redesign-matched/client && npm run build 2>&1 | grep -E "error TS" | head -10
```

- [ ] **Step 4: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/tabs/ExpenseTab.tsx
git commit -m "feat(repairs): add ExpenseTab — expense breakdown, revenue, margin display"
```

---

## Task 12 — `RepairDetailPane` cockpit mode rewrite

Wire all components together. Replace everything inside the `if (isCockpit)` block. The legacy split-pane block below it is **untouched**.

**Files:**
- Modify: `client/src/pages/repairs/RepairDetailPane.tsx`

- [ ] **Step 1: Update imports**

At the top of `RepairDetailPane.tsx`, replace the component imports (keep all the hook/API imports):

```tsx
// Remove these imports:
// import { CockpitHeader } from './CockpitHeader';
// import { ReferenceStrip } from './ReferenceStrip';
// import { FlagsBar } from './FlagsBar';
// import { ContextSidebar } from './ContextSidebar';
// import { DetailsTab } from './tabs/DetailsTab';
// import { WorkflowTab } from './tabs/WorkflowTab';
// import { InspectionsTab } from './tabs/InspectionsTab';
// import { FinancialsTab } from './tabs/FinancialsTab';
// import { ScopeHistoryTab } from './tabs/ScopeHistoryTab';
// import { StatusHistoryTab } from './tabs/StatusHistoryTab';

// Add these imports:
import { CommandStrip } from './components/CommandStrip';
import { ScopeGlance } from './components/ScopeGlance';
import { DetailsTab } from './tabs/DetailsTab';
import { ScopeInTab } from './tabs/ScopeInTab';
import { OutgoingTab } from './tabs/OutgoingTab';
import { ExpenseTab } from './tabs/ExpenseTab';
```

Keep all hooks, state, and `useEffect` logic — only the JSX returned in the cockpit block changes.

- [ ] **Step 2: Replace the cockpit-mode JSX**

Find the `if (isCockpit)` block (around line 230). Replace the `return (...)` inside it with:

```tsx
return (
  <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
    <CommandStrip repair={fullRepair} />
    <ScopeGlance repair={fullRepair} flags={flags} />

    {/* Tab bar */}
    <div style={{
      background: '#fff', borderBottom: '2px solid var(--border)',
      display: 'flex', padding: '0 14px', flexShrink: 0,
    }}>
      {([
        { key: 'scope-in', label: '1 — Scope In' },
        { key: 'details',  label: '2 — Details' },
        { key: 'outgoing', label: '3 — Outgoing' },
        { key: 'expense',  label: '4 — Expense' },
      ] as const).map(t => (
        <div
          key={t.key}
          onClick={() => setActiveTab(t.key)}
          style={{
            padding: '9px 18px',
            fontSize: 12, fontWeight: 600,
            color: activeTab === t.key ? 'var(--primary)' : 'var(--muted)',
            borderBottom: activeTab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -2,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t.label}
        </div>
      ))}
    </div>

    {/* Tab content */}
    <div style={{ flex: 1, overflow: 'auto' }}>
      {activeTab === 'scope-in' && <ScopeInTab repair={fullRepair} />}
      {activeTab === 'details'  && <DetailsTab repair={fullRepair} flags={flags} />}
      {activeTab === 'outgoing' && <OutgoingTab repair={fullRepair} items={[]} />}
      {activeTab === 'expense'  && <ExpenseTab repairKey={fullRepair.repairKey} />}
    </div>
  </div>
);
```

**Note on `OutgoingTab items`:** The `OutgoingTab` needs the repair line items to render the invoice summary. Add a `lineItems` state alongside the other cockpit state:

```tsx
const [lineItems, setLineItems] = useState<RepairLineItem[]>([]);
```

And in the `Promise.all` block, add:
```tsx
getRepairLineItems(resolvedKey).then(setLineItems).catch(() => {}),
```

Then pass `items={lineItems}` to `OutgoingTab`.

- [ ] **Step 3: Update the default active tab**

The cockpit previously defaulted to `'workflow'`. Change the initial state:

```tsx
const [activeTab, setActiveTab] = useState<'scope-in' | 'details' | 'outgoing' | 'expense'>('details');
```

- [ ] **Step 4: Remove unused state that no longer applies to cockpit mode**

After the rewrite, `statusMenuOpen`, `statusMenuRef`, `handleAdvance`, `handleSetStatus`, `nextStatusName`, `hasNext` are only used in the legacy split-pane block — they can stay to keep the legacy mode working. Do not remove them.

Remove any import that becomes unused after this change (TypeScript will flag them). Common removals:
- `TabBar` from shared components (no longer used in cockpit)
- `CockpitHeader`, `ReferenceStrip`, `FlagsBar`, `ContextSidebar`
- `WorkflowTab`, `InspectionsTab`, `FinancialsTab`, `ScopeHistoryTab`, `StatusHistoryTab`
- `useTabBadges` if no longer used in cockpit (still used in legacy block — keep)

- [ ] **Step 5: Build**

```bash
cd C:/Projects/redesign-matched/client && npm run build 2>&1 | grep -E "error TS" | head -30
```

Fix all TypeScript errors. Most will be unused import warnings (TS6133). Remove each flagged import.

- [ ] **Step 6: Verify in dev server**

```bash
cd C:/Projects/redesign-matched/client && npm run dev
```

Navigate to a repair: `http://localhost:5173/repairs/[any-repair-key]`

Check:
- Command strip renders with dark navy background
- Scope glance renders below it
- 4 tabs visible
- Details tab (default) shows complaint banner, items table, left sidebar
- Scope In tab renders addresses and inbound fields
- Outgoing tab renders shipping + invoice card
- Expense tab renders 3-column financial breakdown
- Adding/removing items in Details tab works (calls API, refreshes list)

- [ ] **Step 7: Commit**

```bash
cd C:/Projects/redesign-matched
git add client/src/pages/repairs/RepairDetailPane.tsx
git commit -m "feat(repairs): rewrite cockpit mode with 4-tab layout (Scope In/Details/Outgoing/Expense)"
```

---

## Task 13 — Push and verify deploy

- [ ] **Step 1: Push to main**

```bash
cd C:/Projects/redesign-matched
git push origin main
```

- [ ] **Step 2: Monitor CI**

```bash
gh run list --limit 4
```

Wait for both workflows (`deploy-client` and `deploy-server`) to complete.

```bash
gh run watch
```

- [ ] **Step 3: Smoke test production**

Open `https://happy-plant-03638db0f.6.azurestaticapps.net/repairs`

Navigate to any repair. Verify:
1. Command strip visible with correct data
2. Scope glance visible
3. Tab 2 (Details) — repair items table loads, shows Cause + Fix Type badges
4. Tab 4 (Expense) — financial breakdown renders
5. No console errors

---

## Notes for Agent

- **Column names:** Before writing any SQL, verify column names against `C:/Projects/tsi-redesign/tasks/db-schema-dump.json`. If a column doesn't exist, skip it and leave the TypeScript field as `undefined`. Never add new DB columns.
- **CSS variables:** Never use hardcoded hex colors in `.tsx` files. Use `var(--primary)`, `var(--navy)`, `var(--border)`, etc. For `rgba()` use the `--primary-rgb` pattern: `rgba(var(--primary-rgb), 0.15)`.
- **No unused imports:** TypeScript strict mode (`TS6133`) will fail the Azure build. Remove every unused import.
- **Keep legacy split-pane untouched:** The `if (!isCockpit)` block in `RepairDetailPane.tsx` powers the list-view side pane. Do not modify it.
- **This is the pilot design:** The patterns established here (CommandStrip, ScopeGlance, 4-tab layout, RepairItemsTable) will be referenced when redesigning Clients and Departments. Keep components cleanly bounded with clear prop interfaces.
