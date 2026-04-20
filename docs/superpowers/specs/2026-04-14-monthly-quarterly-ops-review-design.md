# TSI Monthly & Quarterly Ops Review — Design Spec
**Date:** 2026-04-14  
**Author:** Joe Brassell  
**Status:** Draft

---

## 1. Overview

A repeatable operational review system for TSI built entirely on WinScopeNet production data. Covers repair throughput, quality, tech accountability, financials, field service, and supply chain.

**Monthly** — Joe's internal ops scorecard. Full detail tables, all 16 sections. Run at month-end.  
**Quarterly** — Leadership summary. Same data, rolled up. Tech sections show one row per tech. Financial sections show trends.

---

## 2. Architecture

### Delivery
- One master SQL script parameterized by `@StartDate date` and `@EndDate date`
- Set dates, run script, get 16 result sets in order
- Paste each result set into the corresponding Word template section
- Save as `YYYY-MM TSI Monthly Ops Review.docx`
- Quarterly version: same script over 3-month window, paste into quarterly template

### Templates
| Template | Audience | Detail Level |
|---|---|---|
| `TSI Monthly Ops Review.docx` | Joe | Full detail tables, all sections |
| `TSI Quarterly Leadership Review.docx` | Leadership | Sections 1–2 full, Sections 6–11 one row per tech, rest summarized |

### Data Source
- **Server:** `10.0.0.15\Goldmine` (WinScopeNet)
- **Auth:** SQL auth — `BrightLogixUser` / `12345`
- **Connection method:** PowerShell SqlClient (newer sqlcmd rejects TLS 1.0)

### Global Filters (apply to ALL sections)
- `ISNULL(c.bSkipTracking, 0) = 0` — exclude flagged clients/departments
- Join path to client: `tblRepair → tblDepartment → tblClient` or `tblInvoice → tblClient`
- Exclude placeholder tech "000": `t.lTechnicianKey <> 96`
- Active techs only where applicable: `t.bIsActive = 1 AND t.lJobTypeKey = 2`

### Period Filter Date Field (by section)
- **Completion-based** (Sections 1, 2, 3, 4, 6, 8, 9, 10, 14, 16): filter on `CONVERT(date, r.dtDateOut)` — counts work shipped in the period
- **Intake-based** (Section 7 D&I, Section 16 D&I conversion): filter on `CONVERT(date, r.dtDateIn)` — counts work received in the period
- **Van service** (Section 13): filter on `dtOnsiteDate` — counts visits that occurred in the period
- **Inventory/ordering** (Section 15): filter on order/receive date — to be confirmed during SQL writing

---

## 3. Section Definitions

### Section 1 — Throughput & TAT

**Purpose:** Core production efficiency. How many repairs are we completing and how fast?

**Metrics:**
- WO count completed by month, by scope type (`sRigidOrFlexible`) and repair level (`lRepairLevelKey`)
- Avg TAT = `fn_DateDiffWeekDays(dtAprRecvd, dtDateOut)` (approval → ship, business days)
- Avg Lead Time = `fn_DateDiffWeekDays(dtDateIn, dtDateOut)` (received → ship, business days)
- In-house vs outsourced split (`ISNULL(r.lVendorKey, 0) = 0`)

**Instrument categories:**
- Flex-Large: `sRigidOrFlexible='F' AND ISNULL(sc.bLargeDiameter,0)=1`
- Flex-Small: `sRigidOrFlexible='F' AND ISNULL(sc.bLargeDiameter,0)=0`
- Rigid: `sRigidOrFlexible='R'`
- Camera: `sRigidOrFlexible='C'`
- Instrument: `sRigidOrFlexible='I'`

**Key tables:** `tblRepair`, `tblDepartment`, `tblClient`, `tblScope`, `tblScopeType`, `tblScopeTypeCategories`, `tblRepairItemTran`, `tblRepairLevels`

**Completion filter:** `ISDATE(r.dtDateOut)=1 AND r.dtDateOut IS NOT NULL`

**Quarterly roll-up:** 3-month totals + avg TAT trend by instrument type

---

### Section 2 — 40-Day Returns & Warranty

**Purpose:** Quality signal. Are scopes coming back too soon, and is it our fault?

**Metrics:**
- 40-day return count by scope type
- 40-day return rate = 40-day returns / total WOs for that scope type that month
- Warranty count = 40-day returns where any warranty failure code = 'X'
- Warranty rate = warranty count / total WOs for that scope type that month (NOT just 40-day WOs as denominator)
- Fill rate gap = 40-day returns with NO failure code filled in (process compliance flag)

**Warranty failure codes** (from `fnWithin40Days` output):
- `Failure_ImproperTechnique = 'X'`
- `Failure_PreviousInspection = 'X'`
- `Failure_PreviousRepairs = 'X'`

**Note:** `sFixType='B'` is NOT used for warranty classification. 40-day failure codes are the authoritative source.

**Join pattern:** `fnWithin40Days(@StartDate, @EndDate, 'A', 0)` output does not contain `lRepairKey` — join back to `tblRepair` via `sWorkOrderNumber` to get scope type and client.

**Key tables/functions:** `fnWithin40Days`, `tblRepair`, `tblScope`, `tblScopeType`, `tblScopeTypeCategories`, `tblClient`, `tblDepartment`

**Quarterly roll-up:** 3-month combined rate + warranty rate trend

---

### Section 3 — Contract vs FFS Volume

**Purpose:** Business mix visibility. What proportion of work is contracted vs fee-for-service?

**Metrics:**
- WO count by month: Contract vs FFS
- Scope type breakdown within each category
- Contract client count active in period

**Contract flag:** `dbo.fn_scopeIsCoveredByContract(r.lScopeKey, r.dtDateIn) <> 0`

**Quarterly roll-up:** 3-month totals, % mix trend

---

### Section 4 — Contract P&L

**Purpose:** Are our contracts profitable after repair costs?

**Metrics:**
- Revenue: `tblInvoice.dblTranAmount` for contract WOs
- Cost of revenue: inventory cost (from lot tables) + `tblRepair.dblOutSourceCost`
- Gross margin per contract client
- Overall contract margin %

**Note:** Labor cost inclusion to be verified during SQL writing — depends on how labor is tracked in WinScopeNet.

**Key tables:** `tblInvoice`, `tblRepair`, `tblClient`, inventory/lot tables (verify during implementation)

**Quarterly roll-up:** Contract margin summary + trend

---

### Section 5 — Loaner Fulfillment Rate

**Purpose:** Service level metric. When clients send in a scope, can we cover them with a loaner?

**Metrics:**
- Loaner requests by instrument type
- Loaners fulfilled vs unfulfilled
- Fulfillment rate = fulfilled / requested, by instrument type
- **Biggest misses:** instrument types with highest unfulfilled count

**Instrument type categories:** consistent with Section 1 (Flex-Large, Flex-Small, Rigid, Camera, Instrument)

**Note:** Loaner request/fulfillment table to be verified during SQL writing.

**Quarterly roll-up:** Fulfillment rate by instrument type + biggest miss trend

---

### Section 6 — Tech Repair Scorecard

**Purpose:** Tech productivity. How many repairs is each tech completing, at what level, on what instruments?

**Metrics:**
- WO count per tech at highest non-D&I repair level
- Breakdown by instrument type (Flex-Large, Flex-Small, Rigid, Camera, Instrument)
- Avg TAT per tech
- D&I items excluded from WO count (repair items 29, 246, 636)
- WO level = highest `lRepairLevelKey` on that WO for that tech's lines

**Repair level hierarchy:** Minor(1) → Mid-Level(2) → Major(3) → VSI(4)

**Counting rule:** If a tech has 4 Mid-Level items and 1 Major on a WO, it counts as 1 Major WO.

**CTE pattern:**
```sql
WITH TechRepairWO AS (
    SELECT t.sTechName, r.lRepairKey,
        CASE WHEN st.sRigidOrFlexible='F' AND ISNULL(sc.bLargeDiameter,0)=1 THEN 'Flex-Large'
             WHEN st.sRigidOrFlexible='F' THEN 'Flex-Small'
             WHEN st.sRigidOrFlexible='R' THEN 'Rigid'
             WHEN st.sRigidOrFlexible='C' THEN 'Camera'
             ELSE st.sRigidOrFlexible END AS InstrCategory,
        MAX(rl.lRepairLevelKey) AS MaxLevel,
        CAST(dbo.fn_DateDiffWeekDays(r.dtAprRecvd, r.dtDateOut) AS decimal(10,2)) AS TAT
    FROM tblRepair r
    JOIN tblRepairItemTran rit ON r.lRepairKey=rit.lRepairKey
    JOIN tblTechnicians t ON rit.lTechnicianKey=t.lTechnicianKey
    JOIN tblRepairItem ri ON rit.lRepairItemKey=ri.lRepairItemKey
    JOIN tblRepairLevels rl ON ri.sMajorRepair=rl.lRepairLevelKey
    JOIN tblScope s ON r.lScopeKey=s.lScopeKey
    JOIN tblScopeType st ON s.lScopeTypeKey=st.lScopeTypeKey
    LEFT JOIN tblScopeTypeCategories sc ON st.lScopeTypeCatKey=sc.lScopeTypeCategoryKey
    JOIN tblDepartment d ON r.lDepartmentKey=d.lDepartmentKey
    JOIN tblClient c ON d.lClientKey=c.lClientKey
    WHERE CONVERT(date, r.dtDateIn) >= @StartDate
        AND CONVERT(date, r.dtDateIn) <= @EndDate
        AND ISDATE(r.dtDateOut)=1 AND r.dtDateOut IS NOT NULL
        AND ISNULL(r.lVendorKey,0)=0
        AND ISNULL(c.bSkipTracking,0)=0
        AND t.bIsActive=1 AND t.lJobTypeKey=2 AND t.lTechnicianKey<>96
        AND rit.lRepairItemKey NOT IN (29,246,636)
    GROUP BY t.sTechName, r.lRepairKey, st.sRigidOrFlexible,
             sc.bLargeDiameter, r.dtAprRecvd, r.dtDateOut
)
```

**Quarterly roll-up:** One row per tech — total WOs, level breakdown (Minor/Mid/Major/VSI counts)

---

### Section 7 — Tech D&I Finds

**Purpose:** Thoroughness metric. How many repair items does each tech identify during diagnostic inspection?

**Metrics:**
- D&I count per tech (WOs where tech performed repair item 29, 246, or 636)
- Avg non-D&I repair items found per D&I WO, by tech (measures inspection thoroughness)
- By instrument type

**Logic:** For each WO where tech X performed D&I item, count the total non-D&I repair items on that same WO.

**Key tables:** `tblRepairItemTran`, `tblRepairItem`, `tblTechnicians`, `tblRepair`, `tblScopeType`

**Quarterly roll-up:** One row per tech — D&I count + avg finds

---

### Section 8 — Tech Defect %

**Purpose:** Quality accountability. What % of a tech's work results in a defect being logged?

**Metrics:**
- Defect count attributed to tech
- WOs worked by tech (from Section 6 base)
- Defect % = defects / WOs worked

**Note:** Defect tracking table/columns to be verified during SQL writing (likely `tblDefectTracking` with responsible tech key).

**Quarterly roll-up:** One row per tech — defect count + %

---

### Section 9 — Tech Inventory Usage

**Purpose:** Parts efficiency. How much inventory is each tech consuming?

**Metrics:**
- Inventory cost by tech (parts consumed on repairs attributed to that tech)
- Total cost per tech per period
- Top parts consumed by tech

**Source:** Join `tblRepairItemTran` (tech) → `tblRepair` → inventory/lot tables → lot cost  
**Note:** Exact inventory/lot table names to be verified during SQL writing.

**Quarterly roll-up:** One row per tech — total inventory cost

---

### Section 10 — Tech Amendments & Misquotes

**Purpose:** Rework cost accountability. What are our mistakes costing us, and who owns them?

**Tech sub-metrics (from `tblAmendRepairComments`):**
- Amendment count by tech
- TAT reset count by tech (`bApprovalDateReset = 1`)
- Total amendment cost by tech (repair items + inventory added during amendment)
- Missed D&I cost by tech (amendments where root cause = missed inspection finding)
- Repeat repair damage cost by tech (amendments caused by damage from previous repair)

**Ops sub-metrics:**
- Misquote count by ops staff member (specific amendment reason code(s) for misquotes)
- Misquote cost impact (corrected amount vs original quote delta)
- Misquote rate = misquotes / total quotes issued

**Note:** Specific `lAmendReasonKey` values for "missed D&I", "repeat repair damage", and "misquote" to be verified against `tblAmendRepairComments` reason table during SQL writing.

**Quarterly roll-up:** One row per tech (amendment count + total cost) + one row per ops staff (misquote count + cost)

---

### Section 11 — Update Slips

**Purpose:** Communication accountability. Who is generating update slips and why?

**Metrics:**
- Update slip count by tech
- Top reason codes by tech (`lMainRepairUpdateSlipReasonKey`)
- Count by reason across all techs

**Key tables:** `tblRepairUpdateSlips`, `tblTechnicians`, update slip reason table (verify name during implementation)

**Quarterly roll-up:** One row per tech — total slips + top reason

---

### Section 12 — Avoidable Damage

**Purpose:** Root cause quality. What damage categories are we seeing, and which are avoidable?

**Metrics:**
- Top 10 failure reasons from avoidable category (monthly)
- Count by reason, by instrument type
- Avoidable vs Normal Wear & Tear split

**Key tables:** `tblRepairFailureCodes`, `tblRepairReasons`, `tblRepairReasonCategories`

**Quarterly roll-up:** Top 5 avoidable reasons + trend

---

### Section 13 — Van Service (NV Work Orders)

**Purpose:** Field service performance. How well is van service covering clients in the field?

**Visit-level metrics:**
- Total completed visits (`dtDateSubmitted IS NOT NULL`)
- Unique customers and departments served
- Visits by tech (`bOnsiteServiceTech = 1`)
- Visits by location (`lServiceLocationKey`)
- Visits by truck (`sTruckNumber`)

**Volume per visit (from `tblSiteServices`):**
- Total trays serviced (`lTrayCount`)
- Total instruments inspected (`lTotalInstruments`)
- Repairs completed on-site (`lRepairCount`)
- Instruments sent to TSI shop (`lSendToTSICount`)
- Beyond economical repair (`lBeyondEconomicalRepair`)

**Rates:**
- Repair rate = `lRepairCount / lTotalInstruments`
- Send-in rate = `lSendToTSICount / lTotalInstruments`
- BER rate = `lBeyondEconomicalRepair / lTotalInstruments`

**Biggest misses:** Send-in rate by instrument type (from `tblSiteServiceTrayDetails` + `tblVanServiceRepairItems`) — what we couldn't fix in the field

**Financial:**
- Invoice amount (`nInvoiceAmount`) vs pre-cap cost (`nTotalCostPreCap`)
- Capitated cost (`nCapitatedCost`) vs actual — over/under cap by client (`lVanServicePricingListKey`)

**Key tables:** `tblSiteServices`, `tblSiteServiceTrays`, `tblSiteServiceTrayDetails`, `tblVanServiceRepairItems`, `tblTechnicians`, `tblClient`, `tblDepartment`

**Quarterly roll-up:** One row per customer + totals row; capitated vs actual trend

---

### Section 14 — Vendor / Outsourced Repairs

**Purpose:** Outsource management. What are we sending out, to whom, and is it profitable?

**Metrics:**
- Outsourced WO count by vendor (`tblSupplier.sSupplierName1`)
- Revenue (`tblInvoice.dblTranAmount`) vs outsource cost (`tblRepair.dblOutSourceCost`) by vendor
- Gross margin per vendor
- % of total repairs outsourced, by instrument type
- **Contract outsource %** = contract WOs where `ISNULL(r.lVendorKey,0) > 0` / total contract WOs (margin squeeze indicator)
- FFS outsource % for comparison

**Outsource flag:** `ISNULL(r.lVendorKey, 0) > 0`  
**Key tables:** `tblRepair`, `tblSupplier`, `tblInvoice`, `tblClient`, `tblDepartment`

**Quarterly roll-up:** Vendor summary table + contract outsource % trend

---

### Section 15 — Inventory Ordering

**Purpose:** Supply chain visibility. What are we ordering, from whom, and does it match consumption?

**Metrics:**
- Orders placed by period (count + total cost)
- Top parts by order frequency
- Top parts by total cost
- Spend by supplier/vendor
- Inventory usage (from repairs) vs inventory ordered — consumption vs purchasing alignment
- Parts spend by instrument type
- High-cost single lot purchases (outlier flagging)

**Note:** Ordering/receiving table names to be verified during SQL writing (data confirmed in WinScopeNet).

**Quarterly roll-up:** Total spend + top 5 parts by cost + supplier summary

---

### Section 16 — Scope Outcomes

**Purpose:** Scope disposition tracking. What happens to scopes at end of evaluation — do they convert to repair, and how often are they not repairable?

**D&I Conversion Rate:**
- D&I WOs where repair was subsequently approved / total D&I WOs
- By instrument type (Flex-Large, Flex-Small, Rigid, Camera, Instrument)
- Month-over-month trend

**Not Repairable Rate:**
- WOs containing repair item "Not Repairable" / total WOs, by instrument type
- Scope types appearing most frequently as Not Repairable
- By client — accounts sending end-of-life equipment repeatedly

**Filter:** `tblRepairItem.sRepairItem = 'Not Repairable'` (exact description to be verified during SQL writing)  
**Instrument types:** Flex-Large, Flex-Small, Rigid, Camera, Instrument — consistent with all other sections

**Key tables:** `tblRepairItemTran`, `tblRepairItem`, `tblRepair`, `tblScope`, `tblScopeType`, `tblScopeTypeCategories`

**Quarterly roll-up:** Conversion rate + Not Repairable rate by instrument type, trend

---

## 4. Word Template Structure

### Monthly Template Sections
1. Cover page: Period, run date, North/South combined note
2. Section 1–16 as labeled tables (one per section)
3. Each section header includes: section name, date range, filter notes

### Quarterly Template Sections
1. Executive summary (manually written by Joe — 3–4 sentences)
2. Sections 1–2: Full detail (same as monthly)
3. Section 3–4: Financial summary tables
4. Sections 5: Loaner fulfillment summary
5. Sections 6–11: One row per tech, all metrics combined
6. Sections 12–16: Summarized tables, top-N lists

---

## 5. SQL Script Structure

```sql
-- ============================================================
-- TSI MONTHLY OPS REVIEW — MASTER SCRIPT
-- Parameters: @StartDate date, @EndDate date
-- Run via PowerShell SqlClient against 10.0.0.15\Goldmine
-- SELECT ONLY — no write operations
-- ============================================================

DECLARE @StartDate date = '2026-03-01'
DECLARE @EndDate   date = '2026-03-31'

-- SECTION 1: Throughput & TAT
-- ...

-- SECTION 2: 40-Day Returns & Warranty
-- ...

-- [continue through Section 16]
```

Each section is clearly delimited with a comment header. The script produces exactly 16 result sets in order.

---

## 6. Open Items (resolve during SQL writing)

| # | Item | Notes |
|---|---|---|
| 1 | Loaner request/fulfillment table | Verify table name and columns |
| 2 | Defect tracking table | Likely `tblDefectTracking` — verify responsible tech column |
| 3 | Inventory/lot tables | Verify table names for tech inventory usage + ordering sections |
| 4 | Contract P&L labor cost | Determine if labor cost is trackable in WinScopeNet |
| 5 | Amendment reason key values | Verify `lAmendReasonKey` for missed D&I, repeat damage, misquote |
| 6 | Update slip reason table | Verify table name |
| 7 | "Not Repairable" repair item | Verify exact `sRepairItem` value in `tblRepairItem` |
| 8 | Inventory ordering tables | Verify ordering/receiving table names |

---

## 7. Key Business Rules

- **TAT** = `fn_DateDiffWeekDays(dtAprRecvd, dtDateOut)` — approval to ship, business days only
- **Lead Time** = `fn_DateDiffWeekDays(dtDateIn, dtDateOut)` — received to ship
- **Warranty** = 40-day return AND (`Failure_ImproperTechnique='X'` OR `Failure_PreviousInspection='X'` OR `Failure_PreviousRepairs='X'`)
- **Warranty rate denominator** = ALL WOs for that scope type that month, NOT just 40-day returns
- **D&I items** = `lRepairItemKey IN (29, 246, 636)` — excluded from tech repair scorecard, tracked separately
- **WO repair level** = highest `lRepairLevelKey` across all non-D&I items on that WO for that tech
- **Placeholder tech "000"** = `lTechnicianKey = 96` — excluded from all tech metrics
- **bSkipTracking** = clients/depts flagged to exclude from ALL reporting
- **Contract flag** = `dbo.fn_scopeIsCoveredByContract(r.lScopeKey, r.dtDateIn) <> 0`
- **Outsourced repair** = `ISNULL(r.lVendorKey, 0) > 0`
- **Completed repair** = `ISDATE(r.dtDateOut) = 1 AND r.dtDateOut IS NOT NULL`
- **Van service completed** = `dtDateSubmitted IS NOT NULL`
