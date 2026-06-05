# PO Create Flows — Design Spec

**Date:** 2026-06-05
**Author:** Joe Brassell (+ Claude)
**Status:** Approved design → ready for implementation plan
**Builds on:** Steve Black's commit [`b30a805`](https://github.com/BrightLogix/TSI-Winscope-Net---Production/commit/b30a805ac7c84477bbbbba157df74ab2aed1fe1a) — PO-number infrastructure (`IPONumberService` + `dbo.poNumberDailyGet` + `tblPONumbersUsed` seed pipeline).

## Context

Steve shipped the PO-numbering primitive (Scope A: infrastructure only — no controllers, no UX) and explicitly handed the create flows to Joe: *"PO-creation endpoints themselves are NOT in this commit — Joe will collaborate on those."* This spec defines those create flows across all three PO types.

Steve's contract is final and we code to it verbatim — never construct a PO number by hand, never call `dbo.poNumberDailyGet` from a controller:

```
Task<string> IPONumberService.NextAsync(
    POType type, int serviceLocationKey, SqlConnection conn,
    SqlTransaction? tx = null, CancellationToken ct = default)

enum POType { Inventory, Acquisition, Cart }   // seed chars: I / A / C
```

PO# format (10 chars): `[location][P][type][yyMM][###]` — e.g. `NPI2606001`. Counter resets monthly per `(location, type)`. Location char comes from `tblServiceLocations.sTransNumberPrefix` (legacy "Trans" spelling — do not "fix").

## Goals

- Build the three PO-create flows Steve teed up: Inventory, Acquisition, Cart.
- Reuse Steve's numbering contract exactly so controller code is portable to his stack unchanged.
- Ship Inventory + Acquisition as the merge-ready core; carry the Cart schema proposal in the same PR for Steve's sign-off (per Joe's call on 2026-06-05).

## Non-Goals (explicit guardrails)

- **No GP push on create.** New POs are created as **drafts** (`bGenerated = 0`, `bCancelled = 0`). The "generate / finalize" action that sets `bGenerated = 1` and feeds the GP integration (draft = no PO / finalize = PO; GP sync every 30 min) is a **separate action, out of scope** for this slice. Creating a PO must never trigger a GP integration.
- **No bulk auto-reorder** (legacy `WSSupplierPOAutoGen` / `WSSupplierPOAlwaysReorder` / dashboard bulk). Same PO type as single-create; deferred to its own slice.
- **No PO edit/cancel/receive** flows. Create only. (Receiving already exists separately.)

## Verified schema (probed against `localhost\WinscopeWeb`, 2026-06-05)

Schema confirmed live via `INFORMATION_SCHEMA` — not assumed from SELECTs. Key findings that shaped the design:

### Inventory — `tblSupplierPO` (header) + `tblSupplierPOTran` (lines)
Both exist; already read by `SuppliersController` and `InventoryController`.

| `tblSupplierPO` (insert set) | `tblSupplierPOTran` (insert set) |
|---|---|
| `lSupplierPOKey` PK (identity) | `lSupplierPOTranKey` PK (identity) |
| `lSupplierKey` | `lSupplierPOKey` FK |
| `sSupplierPONumber` nvarchar(50) ← from `NextAsync` | `lSupplierSizesKey` (→ inventory catalog) |
| `lSupplierPOTypeKey` (e.g. 1 = Parts) | `nOrderQuantity` int |
| `dtDateOfPO` datetime | `nReceivedQuantity` int = 0 |
| `dblPOTotal` float = Σ line `dblItemCost` | `dblUnitCost` float |
| `lServiceLocationKey` ← active location | `dblItemCost` float = unit × qty |
| `bGenerated` = 0, `bCancelled` = 0 | `bActive` = 1 |
| `Created_UserKey`, `Created_datetime` | `Created_UserKey`, `Created_datetime` |

`tblSupplierPOTran` also has `bIntegratedWithGP` (leave default/0 — GP guardrail) and `dtEstimatedDeliveryDate` (optional).

### Acquisition — `tblAcquisitionSupplierPO` (header) + `tblAcquisitionSupplierPOTran` (lines)
**Materially different from Inventory** — this is scope *acquisition*, not parts ordering.

| `tblAcquisitionSupplierPO` (insert set) | `tblAcquisitionSupplierPOTran` (insert set) |
|---|---|
| `lAcquisitionSupplierPOKey` PK | `lAcquisitionSupplierPOTranKey` PK |
| `lSupplierKey` | `lAcquisitionSupplierPOKey` FK |
| `sSupplierPONumber` ← from `NextAsync` | `lScopeTypeKey` (acquiring a scope type) |
| `dtDateOfPO` date | `sSerialNumber` nvarchar(50) |
| `lPaymentMethodKey` / `sPaymentMethodOther` | `nScopeCost` money |
| `dblPOTotal` money = Σ `nScopeCost` | `dtDateReceived` (null on create) |
| `bGenerated` = 0, `bCancelled` = 0 | `mComment` |
| optional mailing-address override fields | `Created_UserKey`, `Created_datetime` |
| `bHoldGPIntegration` (GP guardrail) | |
| `Created_UserKey`, `Created_datetime` | |

**No `lServiceLocationKey` column** on the acquisition header → the active location is used **only** to derive the PO# prefix; it is not persisted on the row.

### Cart — tables DO NOT EXIST on cloud
Only `tblRptCartPackingSlip` / `tblRptCartQuote` / `tblRptCartQuoteDetail` (report temps) exist. Confirms Steve's "storage TBD." Legacy persisted cart POs via class methods (`carts.vb GetNextPONumber`) into `tblCartVendorPO` / `tblCartVendorPOTran` (carts use **vendor** terminology), which the cloud BACPAC never carried.

### Numbering layer — absent on this DB
`tblPONumbersUsed` not present; `dbo.poNumberDailyGet` not found. Present on Steve's stack per `b30a805`. The shared-foundation migration (below) must create them on the redesign-matched DB so the spec stack can generate numbers.

### Confirmed present
`tblServiceLocations.sTransNumberPrefix` ✓ · `tblSupplierPOTypes` ✓.

## Architecture

Three vertical slices over one shared numbering foundation. Each slice = backend create endpoint (single transaction) + minimal create UI.

### Shared foundation (build once)

1. **`PONumberService` mirror** — `server/TSI.Api/Services/PONumberService.cs` + `IPONumberService.cs`, cloned from the existing `InvoiceNumberService`, exposing Steve's exact signature. `POType` enum maps `Inventory→'I'`, `Acquisition→'A'`, `Cart→'C'`. Singleton DI registration (mirrors `IInvoiceNumberService`'s lifetime).
2. **DB migration** (`server/migrations/`) — create `dbo.tblPONumbersUsed` + `dbo.poNumberDailyGet` (atomic `UPDATE … WITH (UPDLOCK, HOLDLOCK)`, `@psSeed NVARCHAR(7)`), cloned from Steve's deployed objects. Add `tblPONumbersUsed` to the protected-tables list. Optional one-off legacy seed mirrors Steve's `024-seed-ponumbersused`.

### Transaction pattern (all three slices)

```
open conn → begin tx
  poNumber = NextAsync(POType.X, activeLocationKey, conn, tx, ct)
  INSERT header (poNumber, bGenerated=0, bCancelled=0, Created_*)
  INSERT lines (per row), accumulate total
  UPDATE header.dblPOTotal = Σ line totals
commit   // rollback rolls back the counter increment too
```

### Slice 1 — Inventory Supplier PO  *(ship first)*

- **Endpoint:** `POST /api/suppliers/{supplierKey}/purchase-orders`
- **Body:** `{ serviceLocationKey, lSupplierPOTypeKey, dtDateOfPO?, lines: [{ lSupplierSizesKey, nOrderQuantity, dblUnitCost }] }`
- **Writes:** `tblSupplierPO` + `tblSupplierPOTran` per verified schema; `NextAsync(POType.Inventory, …)`.
- **Validation:** 400 on missing/invalid supplier, missing/invalid `serviceLocationKey`, or empty `lines` — explicit, never silent-default (matches `OrdersController`).
- **UI:** "New PO" button on the Suppliers detail page → modal (location, PO type, add inventory lines + qty + unit cost). New PO# appears in the **Recent POs** list that page already renders.

### Slice 2 — Acquisition Supplier PO

- **Endpoint:** `POST /api/acquisitions/purchase-orders`
- **Body:** `{ serviceLocationKey, lSupplierKey, dtDateOfPO?, lPaymentMethodKey?, lines: [{ lScopeTypeKey, sSerialNumber?, nScopeCost }] }`
- **Writes:** `tblAcquisitionSupplierPO` + `tblAcquisitionSupplierPOTran`; `NextAsync(POType.Acquisition, …)`. Location used for PO# only (no location column to persist).
- **Data caveat:** acquisition tables are empty on happy-plant until PR #56 phase 54 — **code lands now, end-to-end data test waits on #56**.
- **UI:** "New Acquisition PO" on the Acquisitions screen.

### Slice 3 — Cart Vendor PO  *(proposed schema, Steve-gated)*

**Proposed new cloud tables** (faithful mirror of legacy, in the PR for Steve to approve/run):

| `tblCartVendorPO` (header) | `tblCartVendorPOTran` (lines) |
|---|---|
| `lCartVendorPOKey` PK | `lCartVendorPOTranKey` PK |
| `lCartVendorKey` FK | `lCartVendorPOKey` FK |
| `sVendorPONumber` ← `NextAsync(POType.Cart)` | `sComponent` |
| `dtDateOfPO`, `dblPOTotal` | `sComponentDescription` |
| `bGenerated`=0, `bCancelled`=0 | `nOrderQuantity`, `dblUnitCost`, `dblItemCost` |
| `lServiceLocationKey` | `bActive`=1 |
| email cols (legacy), `Created_*` | `Created_*` |

- **Endpoint:** `POST /api/endocarts/{cartKey}/vendor-pos`; `NextAsync(POType.Cart, …)`, seed char `C`.
- **⚠️ Accepted risk / dependency:** Cart cannot run end-to-end on cloud yet — `tblCartVendor` (the vendor entity) and the cart parent tables also don't exist (endocart data is hardcoded demo). This slice ships as **proposed schema + endpoint coded to it**; live test is gated on (a) Steve approving the cart tables and (b) the cart-vendor entity landing. Steve said cart numbering "starts fresh," so he may want columns different from the legacy mirror — if so we adjust the **migration**, not the endpoint logic.

## Cross-cutting concerns

- **Location scoping:** `serviceLocationKey` drives both the PO# prefix and (where the column exists) the persisted row location — consistent with the "writes scope to banner" rule.
- **GP-integration guardrail:** create as draft only (`bGenerated=0`); never set the GP-push flags on create. (See Non-Goals.)
- **Numbering integrity:** single `IPONumberService`; counter enrolls in the create transaction; monthly reset per `(location, type)`; rollback rolls back the counter.
- **Audit columns:** populate `Created_UserKey` + `Created_datetime` on every insert; leave `Updated_*` / `Deleted_*` null per migration-cleanup policy.
- **Test-client exclusion:** N/A on the supplier/vendor side of a create; supplier lists already filtered upstream.

## Testing

- **xUnit per endpoint:** happy path; 400 validation paths; **rollback leaves no orphan header** (force a line failure mid-transaction, assert zero rows).
- **Number-service unit tests:** format assembly, monthly reset, rollback-rolls-back-counter, throws on null/blank `sTransNumberPrefix`.
- **Manual happy-plant pass:** create an Inventory PO, assert `NPI2606001`-style PO#, confirm it surfaces in Recent POs + the inventory item's PO history.

## Delivery path

Build in redesign-matched (spec stack) → **Codex review** (per rule) → PR into `BrightLogix/TSI-Winscope-Net---Production` on branch `joe/po-create-flows`. Rebase if `main` moves. Inventory + Acquisition are the merge-ready core; the cart tables + endpoint ride along for Steve's schema sign-off. Application-code changes reach prod only via this PR path — never direct.

## Open items (resolve in plan / with Steve)

1. **Cart vendor entity** — does Steve want `tblCartVendor` mirrored from legacy, or a fresh design? Blocks Cart end-to-end. (Async to Steve.)
2. **`lSupplierPOTypeKey` values** — confirm the `tblSupplierPOTypes` row for "Parts/Inventory" to default the Inventory PO type in the UI.
3. **`lPaymentMethodKey`** — confirm the acquisition payment-method lookup for the UI dropdown (optional on create).
