# New Order Wizard — Full Feature Parity with HTML Version

**Date:** 2026-04-06
**Status:** Approved

## Summary

Expand the React `NewOrderWizard` from a 3-step skeleton (Client → Department → Confirm) to a full 4-step wizard matching the HTML version (Client → Department → Scope → Intake), with proper WO number generation, department defaults inheritance, and complete intake capture.

## WO Number Format

**Prefix:** `{location}{type}` + `YYMMDDHHMM` timestamp

| Order Type | Code | North (PA, svcKey=1) | South (Nashville, svcKey=2) |
|------------|------|----------------------|-----------------------------|
| Repair | R | NR | SR |
| Instrument Repair | R | NR | SR |
| Product Sale | I | NI | SI |
| EndoCart | K | NK | SK |

Example: `NR2604061430` = North Repair, 2026-04-06 at 14:30

## Wizard Steps

### Step 1: Client (existing — no changes)
Search and pick a client from the grid.

### Step 2: Department (existing — minor change)
Pick a department. On selection, load department defaults for later use:
- `lSalesRepKey`, `lPricingCategoryKey`, `lPaymentTermsKey`
- `lDeliveryMethodKey`, `lContractKey`, `lServiceLocationKey`

### Step 3: Scope (NEW)
- Load existing scopes for the selected department via `GET /api/orders/wizard/scopes?deptKey=X`
- Display scope cards: serial number, model, manufacturer, type (Flexible/Rigid)
- Search/filter by serial, model, or manufacturer
- Click a scope to select → auto-advance to Step 4

**Add New Scope (inline):**
- Cascading dropdowns: Instrument Type → Model (searchable)
- Instrument types from `GET /api/orders/wizard/instrument-types`
- Models from `GET /api/orders/wizard/scope-types?instrumentType=X`
- Serial number text input
- "Add Scope" button creates scope via API, auto-selects it, advances to Step 4

### Step 4: Intake Details (NEW)
- **Customer Complaint** — textarea (required)
- **PO Number** — text input
- **Rack Position** — text input with auto-assign (lowest available)
- **Packaging** — dropdown (Box, Carrying Case, FedEx Box, TSI Hard Case, Other)
- **Accessories** — checkboxes with defaults based on scope type:
  - Flexible: ETO Cap, Water Res. Cap checked by default
  - Rigid/Camera: Carrying Case checked by default
- Summary showing Client / Department / Scope
- "Create Order" button

## Backend Changes

### New Endpoints

**`GET /api/orders/wizard/scopes?deptKey=X`**
```sql
SELECT s.lScopeKey, s.sSerialNumber,
       ISNULL(st.sScopeTypeDesc, '') AS model,
       ISNULL(m.sManufacturer, '') AS manufacturer,
       ISNULL(st.sRigidOrFlexible, '') AS type
FROM tblScope s
LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
WHERE s.lDepartmentKey = @deptKey
ORDER BY s.sSerialNumber
```

**`GET /api/orders/wizard/instrument-types`**
```sql
SELECT DISTINCT sRigidOrFlexible AS type
FROM tblScopeType
WHERE (bActive = 1 OR bActive IS NULL) AND sRigidOrFlexible IS NOT NULL
```
Returns mapped labels: F→Flexible, R→Rigid, C→Camera, I→Instrument

**`GET /api/orders/wizard/scope-types?instrumentType=X`**
```sql
SELECT lScopeTypeKey, sScopeTypeDesc,
       ISNULL(m.sManufacturer, '') AS manufacturer
FROM tblScopeType st
LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
WHERE (st.bActive = 1 OR st.bActive IS NULL) AND st.sRigidOrFlexible = @type
ORDER BY st.sScopeTypeDesc
```

### Expanded `POST /api/orders`

**Request expands to:**
```csharp
public record CreateOrderRequest(
    int DepartmentKey,
    string OrderType,
    int? ScopeKey,                // existing scope
    string? SerialNumber,         // for new scope creation
    int? ScopeTypeKey,            // for new scope creation
    string? Complaint,
    string? PurchaseOrder,
    string? RackPosition,
    string? Packaging,
    string? IncludesCase,         // Y/N
    string? IncludesCap,          // Y/N
    string? IncludesWaterResCap   // Y/N
);
```

**Server-side logic:**
1. Look up department to get `lServiceLocationKey`, `lSalesRepKey`, `lPricingCategoryKey`, `lPaymentTermsKey`, `lDeliveryMethodKey`, `lContractKey`
2. If no `ScopeKey` but `SerialNumber` + `ScopeTypeKey` provided, INSERT into tblScope first
3. Generate WO number: `{N|S}{R|I|K}` + `YYMMDDHHMM`
4. INSERT into tblRepair with all fields including inherited defaults
5. Return `{ repairKey, workOrderNumber }`

### Expanded INSERT
```sql
INSERT INTO tblRepair (
    lDepartmentKey, lScopeKey, lRepairStatusID, sWorkOrderNumber,
    dtDateIn, lServiceLocationKey, sComplaintDesc, sPurchaseOrder,
    sRackPosition, sPackaging, sIncludesCaseYN, sIncludesCapYN,
    sIncludesWaterResCapYN, lSalesRepKey, lPricingCategoryKey,
    lPaymentTermsKey, lDeliveryMethodKey, lContractKey
)
VALUES (...)
```

## Files to Change

| File | Change |
|------|--------|
| `client/src/components/shell/NewOrderWizard.tsx` | Add Steps 3 & 4 |
| `client/src/api/orders.ts` | Add scope/type lookups, expand request type |
| `server/TSI.Api/Controllers/OrdersController.cs` | Add 3 wizard endpoints, expand CreateOrder |
| `server/TSI.Api/Models/Order.cs` | Add scope/type models, expand request record |

## Out of Scope
- Open repair duplicate warning (minor, can add later)
- Rack position visual picker (auto-assign is sufficient for now)
