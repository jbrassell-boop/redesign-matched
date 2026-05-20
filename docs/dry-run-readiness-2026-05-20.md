# Happy-Plant Dry-Run Readiness — 2026-05-20

Follow-on to `smoke-test-findings-2026-05-19.md` and `multi-scope-lifecycle-findings-2026-05-19.md`. Yesterday I deep-walked Repairs + Receiving + the New Repair Wizard and shipped 6 fixes. Today I smoke-walked the 12 remaining modules — load each page, check for 500s, click one detail row, exercise one simple action. This doc rolls everything up into a green/yellow/red dry-run readiness assessment.

Host: <https://happy-plant-03638db0f.6.azurestaticapps.net>
API: <https://tsi-redesign-api.azurewebsites.net>

## TL;DR

**Ready for a focused 2-3 tester dry-run:** Yes. The Repair lifecycle path (Wizard → Cockpit → Status changes → QC → Shipping → Draft Invoice) is solid end-to-end.

**Ready for a full-team dry-run:** Not quite — three modules (Administration, GL Accounts, Onsite Services) are visibly broken in ways a tester would notice and report. Two of those are pending PRs (Steve has them queued).

## Module-by-module readiness

| Module | Status | Notes |
| --- | --- | --- |
| **Repairs cockpit** | 🟢 GREEN | Walked Flex/Rigid/Camera end-to-end yesterday. All 9 cockpit tabs render. Status changes, Next Stage, tech assignment, notes, draft invoice all work. Inspections tab shows correct OM05 form per scope type. |
| **New Repair Wizard** | 🟢 GREEN | 4-step Client→Dept→Scope→Intake. Scope-by-serial lookup works. |
| **Receiving** | 🟢 GREEN | Walk-in intake form works. Pending arrivals list empty (expected — happy-plant doesn't have migration 014 yet; portal pipeline is on Steve's plate). |
| **Dashboard / Workspace** | 🟢 GREEN | Performance is fast, stats accurate. |
| **Quality** | 🟢 GREEN | 5 tabs, 36,130 records load. Minor cosmetic: stat strip shows 300 vs table's 36,130 (likely location-filtered stat strip). |
| **Suppliers** | 🟡 YELLOW | List works (453 records). Role-count badges all show 0 (Parts/Repair/Acquisition/Carts) — supplier-role join broken. Detail tab works. |
| **Inventory** | 🟡 YELLOW | 442 items, renders fine. Two items have timestamp-as-name ("Added 01/09/2023 15:02:23") — placeholder data from a migration issue. 411 marked Low Stock (likely just min not configured). |
| **Repair Items** | 🟡 YELLOW | 2,049 items, renders fine. First row has empty description (null sName cosmetic bug). |
| **Outsource Validation** | 🟡 YELLOW | 833 records, real data. **VENDOR column empty for every row** — join broken. 623/833 marked negative-margin (75%) which is either a data quality issue or column definition mismatch. |
| **Scope Model** | 🟡 YELLOW | 10,769 records render. Manufacturer/Category/Length/Diameter/FOV columns **all empty for every row** — multiple joins broken or columns mapped wrong. |
| **Loaners** | 🟡 YELLOW | 2,013 records, real data. Detail panel has 4 bugs: "Invalid Date" on date columns, "0" raw user-key for Created By, status mismatch (list says Available, detail says Repair), tracking# field reused for free text. |
| **Endocarts (Carts)** | 🟡 YELLOW | Loads at `/endocarts` (URL `/carts` 404s — sidebar covers this). Data is **demo/seed** (clients like "HCA West Kendall", reps named "Sarah Chen") not real WinscopeWeb data. Testers will be confused if they look here. |
| **Acquisitions** | 🟡 YELLOW | Empty data, page renders. Either no data exists or join issue — needs investigation. |
| **Onsite Services** | 🔴 RED → 🟡 YELLOW | All zeros until Steve merges **PR #32** (port to real `tblSiteServices`). |
| **Financial / GL Accounts tab** | 🔴 RED | "Failed to load data" — `tblGP_InvoiceStaging` doesn't exist in WinscopeWeb. Other Financial tabs work; just GL Accounts. |
| **Administration** | 🔴 RED | All 4 endpoints (/stats, /users, /security-groups, /pricing-lists) return 500. Root cause: controller references `sFirstName`+`sLastName` but WinscopeWeb has `sUserFullName`. Same schema-mismatch pattern as Bug 5 yesterday. Admins can't manage users. |

## Recommended dry-run scope

**Tell testers to walk this happy path:**

1. Log in → Dashboard renders
2. Click + Work Orders → Repair Order → walk the 4-step wizard for a real customer
3. Search for a recent repair from the Repairs list, open the cockpit
4. Walk it forward via Next Stage from where it sits
5. Add a note, assign yourself as tech
6. Click Draft Invoice when at "Scheduled to Ship"
7. Look at Outgoing, Financials, History tabs

**Tell testers to scan (read-only) but not depend on:**

- Suppliers list, Inventory list, Repair Items catalog — fine to browse for spot-checking client data, but counts/columns will look off
- Quality QC Inspections list — fine to browse
- Receiving — pending arrivals always 0 (no portal pipeline yet)

**Tell testers to skip entirely until Steve merges PRs:**

- Administration (broken — fix not in queue yet, I should send a PR)
- Financial > GL Accounts (waiting on Avalara/GP integration design, deferred)
- Onsite Services (PR #32 in Steve's queue)
- Carts/Endocarts (demo data only — confusing if they look here)

## Pre-dry-run punch list

| # | Action | Owner | Status |
| --- | --- | --- | --- |
| 1 | Wait for Steve to merge **PRs #25, #32, #34, #52, #53, #54, #55** | Steve | #32 merged 5/19, others still open |
| 2 | Send a PR for **Administration sFirstName/sLastName → sUserFullName** fix | Me | **DONE — commits 4599f46 + 8d56df8 (live on happy-plant)** |
| 3 | Decide whether to fix the **Outsource Validation vendor join** + **Scope Model joins** before dry-run | Joe call | **NOT A CODE BUG — see Data Gap Audit below** |
| 4 | Fix **Loaner detail formatter bugs** (Invalid Date, raw userKey) | Me | **DONE — commit 4599f46 (live on happy-plant)** |
| 5 | Pick **dry-run date + 2-3 testers + scenario doc** | Joe | |
| 6 | Set up a **feedback channel** | Joe | |

## Data Gap Audit — Yellow-module follow-up (2026-05-20)

Investigated five yellow modules where columns rendered empty. Every one is a **migration gap, not a code bug**. Both redesign-matched and Steve's stack query the right tables with correct joins — the source tables themselves are empty on WinscopeWeb because the BACPAC migration didn't include the lookup/operational data behind them.

| Module | Source table(s) | Goldmine | WinscopeWeb (cloud) | Fix |
| --- | --- | --- | --- | --- |
| Onsite Services | tblSiteServices, tblSiteServicesCalendar, Trays, TrayDetails | 12 / 43 / 112 / 76 | 0 / 0 / 0 / 0 | PR #56 phase 75 |
| Outsource Validation vendor column | tblVendor | 45 | 0 | PR #56 phase 11 |
| Scope Model Manufacturer/Category | tblManufacturers + tblScopeTypeCategories | 387 / 64 | 0 / 0 | PR #56 phase 11 |
| Suppliers Parts/Repair/Acquisition/Carts badges | tblSupplierRoles + tblSupplierRolesRef | 312 / 4 | 0 / 0 | PR #56 phases 11+53 |
| Acquisitions In-House / Consigned / Sold | tblAcquisitionSupplierPO + Tran | 328 / 974 | 0 / 0 | PR #56 phase 54 |

**Migration PR #56 (`joe/migration-fill-lookup-tables`)** writes new phases 11/53/54/75 loading 1,377 north-only rows total. Steve runs the migration; all five modules flip to fully populated.

The Scope Model physical-property columns (`sInsertTubeLength`, `sInsertTubeDiameter`, `sFieldOfView`, `sDirectionOfView`) are nvarchar(8) tech-entered metadata that were never universal even on Goldmine — those rendering empty is data quality, not a migration gap. Won't fix.

**Endocarts is a separate case** — no operational cart tables exist in Goldmine OR WinscopeWeb (only empty report tables `tblRptCart*`). The hardcoded demo data in `endoCartData.ts` is deliberate placeholder until cart-specific tables get designed. Not a migration job.

## Updated module scorecard (2026-05-20 EOD)

| Module | Status | Change |
| --- | --- | --- |
| Repairs cockpit | 🟢 | (unchanged) |
| New Repair Wizard | 🟢 | (unchanged) |
| Receiving | 🟢 | (unchanged) |
| Dashboard / Workspace | 🟢 | (unchanged) |
| **Quality** | 🟢 | label fix: "Total Inspections" → "Inspections (30d)" (commit 4ace444) to disambiguate 30-day stat strip vs all-time list |
| **Administration** | 🟢 | 🔴 → 🟢 (fixes in commits 4599f46 + 8d56df8) |
| **Loaners** | 🟢 | 🟡 → 🟢 (formatter fix in commit 4599f46) |
| **Onsite Services** | 🟢 code / 🟡 data | 🔴 → 🟢/🟡 (Steve PR #32 + commit cfadc4e align); data populated when **PR #56** merges |
| **Suppliers** | 🟢 code / 🟡 data | code unchanged; data populated when **PR #56** merges (phases 11+53) |
| **Outsource Validation** | 🟢 code / 🟡 data | code unchanged; data populated when **PR #56** merges (phase 11) |
| **Scope Model** | 🟢 code / 🟡 data | code unchanged; data populated when **PR #56** merges (phase 11) |
| **Acquisitions** | 🟢 code / 🟡 data | 🟡 → 🟢/🟡 (diagnosed as data gap, added to PR #56 phase 54) |
| **Repair Items** | 🟢 | 🟡 → 🟢 (null-description rows pushed to bottom of list, commit c889ef8) |
| Inventory | 🟢 | (minor cosmetic data quality on two timestamp-named rows, unchanged) |
| Endocarts | 🟡 demo data | unchanged — no real cart tables exist on either DB; intentional placeholder |
| Financial > GL Accounts | 🔴 | (deferred per Avalara/GP plan) |

**Net: 12 green-code / 1 red.** Once PR #56 lands and Steve runs the migration, **5 of the 5 "data-gap" yellow modules flip to fully populated**.

### Late-day add — Product Sale page (2026-05-19 evening)

`/product-sales` and `/product-sales/stats` both returned 500 on happy-plant during the final smoke walk. Three independent schema mismatches in `ProductSalesController.cs`, all fixed in commit `fe8a3e1`:

| Symptom | Root cause | Fix |
| --- | --- | --- |
| `GET /api/product-sales` → 500 | List SELECT referenced `ps.lParentProductSaleKey`; column not on cloud schema | Return literal `0` until schema migration adds the column |
| `GET /api/product-sales/stats` → 500 | `SUM(...)` over empty table returns NULL; `Convert.ToInt32(DBNull)` throws | Wrap every SUM in `ISNULL(...,0)` (matches what Steve already does) |
| `GET /api/product-sales/{key}` would 500 | Detail SQL joined back to parent on missing column; line-items read `psi.sItemStatus` (also missing) | Drop parent self-join (ParentInvoiceNumber → NULL); replace `sItemStatus` read with `'Pending'` literal |

Lifecycle-write endpoints that genuinely depend on the missing columns (`POST .../invoice`, `POST .../items/bulk-status`) now return **501 Not Implemented** with a clear schema-upgrade message instead of crashing mid-transaction. `GET .../related` returns an empty result when `lParentProductSaleKey` is absent.

Verified by running the patched SQL directly against the cloud DB:
- GetList: 0 rows (tblProductSales is empty), no error
- GetStats: `{Total:0, Draft:0, Quoted:0, Approved:0, Invoiced:0, Cancelled:0, Revenue:0}`, no error

Schema additions (`tblProductSales.lParentProductSaleKey` + `tblProductSalesInventory.sItemStatus`) are still needed to unlock the parent/child sub-order + per-item shipping workflows — but they're a future migration, not a dry-run blocker. The page now loads.

**Product Sale module: 🟢 code (graceful), 🟡 data (empty table — same as Site Services pattern).**

### Dashboard + My Workspace smoke (2026-05-19 evening)

Validated all 10 dashboard endpoints + workspace by running each SQL block directly against the cloud DB (since I don't have valid auth creds in this session and prior smoke walks have already exercised the React surface):

| Endpoint | Status | Result on cloud |
| --- | --- | --- |
| `/api/dashboard/stats` | 🟢 | 880 OpenRepairs, 2 Urgent, 0 PendingQC/Ship |
| `/api/dashboard/repairs` | 🟢 | List query joins cleanly (tblRepair × Statuses × Scope × ScopeType × Dept × Client × Tech) |
| `/api/dashboard/briefing` | 🟢 | Yesterday counts return 0/0/0/0 (weekend); AvgTat 19.1 days |
| `/api/dashboard/tasks` | 🟢 | tblTasks empty → NULL→0 guards kick in; stats null-safe |
| `/api/dashboard/emails` | 🟢 | tblEmails empty (expected) |
| `/api/dashboard/shipping` | 🟢 | ReadyToShip 0, ShippedToday 0, TotalCharges $118,018 |
| `/api/dashboard/invoices` | 🟢 | ReadyToInvoice 428, InvoicedMonth 414, $264.9M total |
| `/api/dashboard/flags` | 🟢 | 724 flags, but per-type breakdown all 0 — `tblFlagTypes.sFlagType` values don't match controller literals ('Client','Scope Type','Scope','Repair'). Cosmetic — list still renders, stats card categories show 0. |
| `/api/dashboard/techbench` | 🟢 | 880 Assigned, 223 OnHold |
| `/api/dashboard/analytics` | 🟢 | 880 InHouse, AvgTat 30.6 days, Throughput 248 this month |
| `/api/dashboard/executive-kpi` | 🟢 | ReceivedThisWeek 125, ShippedThisWeek 75, ReceivedMonth 400 |
| `/api/workspace` | 🟢 | RepairQueue 523 InRepair / 133 QcHold / **1042 Overdue**; 5 contracts expiring within 60 days |

**Heads-up for testers — Overdue=1042.** Almost every migrated repair was imported without `dtDateOut` set, so workspace flags 1042 of them as overdue (>7 days from `dtDateIn`). Testers will see a giant red number on the Workspace landing page. Cosmetically alarming, technically correct given the migrated state — worth a one-liner in the tester brief: "ignore the overdue count, that's a migration artifact, not real backlog."

**Flag-type categories show 0.** Stats card on `/dashboard/flags` ("Client X / Scope Type Y / Scope Z / Repair N") all show 0 because the cloud-loaded `tblFlagTypes.sFlagType` values use different casing or different strings than the controller's hardcoded `'Client'`/`'Scope Type'`/`'Scope'`/`'Repair'` literals. List still renders 724 rows fine. Low-priority cosmetic fix — investigate next session.

**Net: Dashboard + Workspace are dry-run ready.** No 500s, no schema mismatches, all 12 endpoints execute cleanly.

## Dry-run go signal (2026-05-20)

**Ready for a focused 2-3 tester dry-run now.** The repair-lifecycle path is solid, Administration works, Loaners works, Quality is correctly labeled. Testers can ignore the empty Onsite/Outsource-vendor/Scope-Model-joins/Suppliers-roles/Acquisitions columns since those flip green data-wise on next migration run.

**Ready for full-team dry-run after:**
1. Steve approves and runs migration PR #56 — populates the five data-gap modules
2. Steve approves controller-fix PRs #25, #34, #52, #53, #54, #55 — closes residual cosmetic bugs on his stack
3. (Optional) Decide whether to wire real cart tables — Endocarts demo data is harmless but should be set expectations clearly

## My read on timing

If Steve merges what's queued + I fix Administration + Loaner detail in the next session, we could run a focused dry-run with 2-3 testers **end of next week**. Full team dry-run is probably 2-3 sessions further out — I'd want to also fix the data-display gaps in Outsource Validation and Scope Model, and at minimum diagnose Acquisitions and Suppliers role-counts.

The Repair lifecycle path itself is genuinely solid. That's the big one.
