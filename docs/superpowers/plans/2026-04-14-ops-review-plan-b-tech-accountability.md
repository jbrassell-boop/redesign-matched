# Ops Review — Plan B: Tech Accountability + Quality Sections

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Sections 5–12 to the master ops review SQL script: Loaner Fulfillment, Tech Repair Scorecard, Tech D&I Finds, Tech Defect %, Tech Inventory Usage, Tech Amendments & Misquotes, Update Slips, and Avoidable Damage.

**Architecture:** All sections are appended to the existing `monthly-ops-review.sql`. Replace the current `SELECT 'Sections 5-16 coming in Plans B and C' AS Note;` placeholder with the 8 new result sets. Each section is a separate SELECT statement with a labeled comment header, producing result sets 5–12 in order. Plans A and C produce sets 1–4 and 13–16 respectively.

**Tech Stack:** T-SQL (SQL Server), PowerShell 5+, System.Data.SqlClient

**Server:** `10.0.0.15\Goldmine` | **DB:** `WinScopeNet` | **Auth:** BrightLogixUser/12345

---

## Key Schema Facts (do not re-discover)

Established in `docs/reports/sql/operations/discovery/schema-notes.md`:

| Fact | Value |
|------|-------|
| Tech filter | `t.bIsActive=1 AND t.lJobTypeKey=2 AND t.lTechnicianKey<>96` |
| Global client filter | `ISNULL(c.bSkipTracking,0)=0` |
| D&I item keys | `lRepairItemKey IN (29, 246, 636)` |
| Not Repairable item keys | `sItemDescription LIKE '%Not Rep%'` |
| Missed D&I amendment reason | `lAmendRepairReasonKey = 11` |
| Repeat damage amendment reason | `lAmendRepairReasonKey = 14` |
| Misquote amendment reason | `lAmendRepairReasonKey = 15` |
| Defect tech attribution | `tblRepair.lTechnicianKey_DefectTracking` (direct FK) |
| Loaner requested flag | `tblRepair.bLoanerRequested = 1` |
| Loaner fulfilled flag | `ISNULL(tblRepair.lScopeKey_Loaner, 0) > 0` |
| Amendment cost join | `tblRepairItemTran.lAmendRepairCommentKey` → `tblAmendRepairComments` |
| Inventory cost view | `vwRepairInventoryCosts` (has lRepairItemTranKey for tech join) |
| Update slip date column | `tblRepairUpdateSlips.dtUpdateRequestDate` |
| Update slip tech | `tblRepairUpdateSlips.lResponsibleTech` |
| Update slip reason | `tblRepairUpdateSlips.lMainRepairUpdateSlipReasonKey` → `tblMainRepairUpdateSlipReasons.sMainRepairUpdateSlipReason` |

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `docs/reports/sql/operations/monthly-ops-review.sql` | Replace placeholder with Sections 5–12 |

---

## Instrument Category CASE Expression

Used consistently in every section:

```sql
CASE
    WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 1 THEN 'Flex-Large'
    WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 0 THEN 'Flex-Small'
    WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
    WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
    WHEN st.sRigidOrFlexible = 'I' THEN 'Instrument'
    ELSE 'Other'
END AS InstrCategory
```

Required joins for InstrCategory: `tblScope s`, `tblScopeType st`, `LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey`

---

## Task 1: Section 5 — Loaner Fulfillment Rate

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql` (replace placeholder, add Section 5)

**Business rules:**
- Period filter: `CONVERT(date, r.dtDateIn)` — count WOs received in the period
- Requested = `r.bLoanerRequested = 1`
- Fulfilled = `r.bLoanerRequested = 1 AND ISNULL(r.lScopeKey_Loaner, 0) > 0`
- Fulfillment rate = fulfilled / requested per instrument type
- Output: one row per InstrCategory, plus a totals row (`GROUP BY GROUPING SETS`)
- "Biggest misses" = instrument types with highest unfulfilled count (sort DESC by unfulfilled)

- [ ] **Step 1: Open `monthly-ops-review.sql` and locate the placeholder**

Find and remove this line:
```sql
SELECT 'Sections 5-16 coming in Plans B and C' AS Note;
```

Replace with the Section 5 comment header + query below.

- [ ] **Step 2: Write Section 5 SQL**

```sql
-- ============================================================
-- SECTION 5: Loaner Fulfillment Rate
-- WOs received in period (dtDateIn) where bLoanerRequested=1.
-- Fulfilled = lScopeKey_Loaner > 0 (a loaner scope was assigned).
-- ============================================================

;WITH S5_Base AS (
    SELECT
        r.lRepairKey,
        CASE
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 1 THEN 'Flex-Large'
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 0 THEN 'Flex-Small'
            WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
            WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
            WHEN st.sRigidOrFlexible = 'I' THEN 'Instrument'
            ELSE 'Other'
        END AS InstrCategory,
        CASE WHEN ISNULL(r.lScopeKey_Loaner, 0) > 0 THEN 1 ELSE 0 END AS IsFulfilled
    FROM tblRepair r
        JOIN tblDepartment               d   ON r.lDepartmentKey  = d.lDepartmentKey
        JOIN tblClient                   c   ON d.lClientKey      = c.lClientKey
        JOIN tblScope                    s   ON r.lScopeKey       = s.lScopeKey
        JOIN tblScopeType                st  ON s.lScopeTypeKey   = st.lScopeTypeKey
        LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
    WHERE CONVERT(date, r.dtDateIn) >= @StartDate
        AND   CONVERT(date, r.dtDateIn) <= @EndDate
        AND   r.bLoanerRequested = 1
        AND   ISNULL(c.bSkipTracking, 0) = 0
)
SELECT
    COALESCE(InstrCategory, 'TOTAL')                                          AS InstrCategory,
    COUNT(lRepairKey)                                                          AS LoanerRequested,
    SUM(IsFulfilled)                                                           AS LoanerFulfilled,
    COUNT(lRepairKey) - SUM(IsFulfilled)                                       AS LoanerUnfulfilled,
    CAST(SUM(IsFulfilled) AS decimal(10,4))
        / NULLIF(COUNT(lRepairKey), 0)                                         AS FulfillmentRate
FROM S5_Base
GROUP BY GROUPING SETS ((InstrCategory), ())
ORDER BY GROUPING(InstrCategory), LoanerUnfulfilled DESC;
```

- [ ] **Step 3: Verify Section 5 against production**

Write and run a PowerShell test script:

```powershell
$sql = @"
DECLARE @StartDate date = '2026-03-01'
DECLARE @EndDate   date = '2026-03-31'
-- [paste S5 query here]
"@
# Connect to 10.0.0.15\Goldmine, run, print rows
```

Expected: Rows with LoanerRequested > 0, FulfillmentRate between 0 and 1. TOTAL row at bottom.
If LoanerRequested = 0 for all rows, check `bLoanerRequested` values on tblRepair for the period.

- [ ] **Step 4: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat(ops-review): add Section 5 — Loaner Fulfillment Rate"
```

---

## Task 2: Section 6 — Tech Repair Scorecard

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql`

**Business rules:**
- Period filter: `CONVERT(date, r.dtDateOut)` — work completed in period
- In-house only: `ISNULL(r.lVendorKey, 0) = 0` (outsourced repairs not attributed to techs)
- D&I items excluded: `rit.lRepairItemKey NOT IN (29, 246, 636)`
- WO level = MAX non-D&I repair level per tech per WO (join tblRepairItem → tblRepairLevels via `ri.sMajorRepair = rl.lRepairLevelKey`)
- Pivot output: one row per tech per InstrCategory, with level counts as columns
- TAT = fn_DateDiffWeekDays(dtAprRecvd, dtDateOut), exclude negatives

- [ ] **Step 1: Write Section 6 SQL**

```sql
-- ============================================================
-- SECTION 6: Tech Repair Scorecard
-- In-house WOs completed in period (dtDateOut), per tech.
-- Counted at highest non-D&I repair level per WO per tech.
-- D&I items (29, 246, 636) excluded. Placeholder tech 96 excluded.
-- ============================================================

;WITH S6_Base AS (
    SELECT
        t.sTechName,
        r.lRepairKey,
        CASE
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 1 THEN 'Flex-Large'
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 0 THEN 'Flex-Small'
            WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
            WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
            WHEN st.sRigidOrFlexible = 'I' THEN 'Instrument'
            ELSE 'Other'
        END AS InstrCategory,
        MAX(rl.lRepairLevelKey)                                                AS MaxLevelKey,
        CAST(dbo.fn_DateDiffWeekDays(r.dtAprRecvd, r.dtDateOut) AS decimal(10,2)) AS TAT
    FROM tblRepair r
        JOIN tblDepartment               d   ON r.lDepartmentKey     = d.lDepartmentKey
        JOIN tblClient                   c   ON d.lClientKey         = c.lClientKey
        JOIN tblScope                    s   ON r.lScopeKey          = s.lScopeKey
        JOIN tblScopeType                st  ON s.lScopeTypeKey      = st.lScopeTypeKey
        LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
        JOIN tblRepairItemTran           rit ON r.lRepairKey         = rit.lRepairKey
        JOIN tblRepairItem               ri  ON rit.lRepairItemKey   = ri.lRepairItemKey
        JOIN tblRepairLevels             rl  ON ri.sMajorRepair      = rl.lRepairLevelKey
        JOIN tblTechnicians              t   ON rit.lTechnicianKey   = t.lTechnicianKey
    WHERE CONVERT(date, r.dtDateOut) >= @StartDate
        AND   CONVERT(date, r.dtDateOut) <= @EndDate
        AND   ISDATE(r.dtDateOut) = 1
        AND   r.dtDateOut IS NOT NULL
        AND   ISNULL(r.lVendorKey, 0) = 0
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   t.bIsActive = 1
        AND   t.lJobTypeKey = 2
        AND   t.lTechnicianKey <> 96
        AND   rit.lRepairItemKey NOT IN (29, 246, 636)
    GROUP BY t.sTechName, r.lRepairKey, st.sRigidOrFlexible, sc.bLargeDiameter,
             r.dtAprRecvd, r.dtDateOut
)
SELECT
    b.sTechName,
    b.InstrCategory,
    rl.sRepairLevel                                                            AS RepairLevel,
    rl.lRepairLevelKey                                                         AS SortKey,
    COUNT(b.lRepairKey)                                                        AS WOCount,
    AVG(CASE WHEN b.TAT >= 0 THEN b.TAT END)                                  AS AvgTAT
FROM S6_Base b
    JOIN tblRepairLevels rl ON b.MaxLevelKey = rl.lRepairLevelKey
GROUP BY b.sTechName, b.InstrCategory, b.MaxLevelKey, rl.sRepairLevel, rl.lRepairLevelKey
ORDER BY b.sTechName, b.InstrCategory, rl.lRepairLevelKey;
```

- [ ] **Step 2: Verify against production (March 2026)**

Expected: Multiple rows per tech per instrument type. AvgTAT should be reasonable business days (0–15 typical). WOCount per tech should match expectation (5–50 per tech for a monthly period).

- [ ] **Step 3: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat(ops-review): add Section 6 — Tech Repair Scorecard"
```

---

## Task 3: Section 7 — Tech D&I Finds

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql`

**Business rules:**
- Period filter: `CONVERT(date, r.dtDateIn)` — D&I received in the period
- D&I WO = WO where a tech performed at least one D&I item (29, 246, 636)
- Avg finds = avg count of NON-D&I repair items on the same WO
- Grouped by tech and InstrCategory

- [ ] **Step 1: Write Section 7 SQL**

```sql
-- ============================================================
-- SECTION 7: Tech D&I Finds
-- WOs received in period (dtDateIn) where tech performed a D&I item.
-- AvgFinds = avg non-D&I repair items per WO (thoroughness metric).
-- ============================================================

;WITH S7_DIWOs AS (
    -- All WOs received in period where this tech performed a D&I item
    SELECT DISTINCT
        t.sTechName,
        r.lRepairKey,
        CASE
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 1 THEN 'Flex-Large'
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 0 THEN 'Flex-Small'
            WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
            WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
            WHEN st.sRigidOrFlexible = 'I' THEN 'Instrument'
            ELSE 'Other'
        END AS InstrCategory
    FROM tblRepair r
        JOIN tblDepartment               d   ON r.lDepartmentKey  = d.lDepartmentKey
        JOIN tblClient                   c   ON d.lClientKey      = c.lClientKey
        JOIN tblScope                    s   ON r.lScopeKey       = s.lScopeKey
        JOIN tblScopeType                st  ON s.lScopeTypeKey   = st.lScopeTypeKey
        LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
        JOIN tblRepairItemTran           rit ON r.lRepairKey      = rit.lRepairKey
        JOIN tblTechnicians              t   ON rit.lTechnicianKey = t.lTechnicianKey
    WHERE CONVERT(date, r.dtDateIn) >= @StartDate
        AND   CONVERT(date, r.dtDateIn) <= @EndDate
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   t.bIsActive = 1
        AND   t.lJobTypeKey = 2
        AND   t.lTechnicianKey <> 96
        AND   rit.lRepairItemKey IN (29, 246, 636)
),
S7_NonDICount AS (
    -- Non-D&I item count per WO (finds made during D&I)
    SELECT r.lRepairKey, COUNT(rit.lRepairItemTranKey) AS NonDIItems
    FROM tblRepairItemTran rit
        JOIN tblRepair r ON rit.lRepairKey = r.lRepairKey
    WHERE rit.lRepairItemKey NOT IN (29, 246, 636)
    GROUP BY r.lRepairKey
)
SELECT
    dw.sTechName,
    dw.InstrCategory,
    COUNT(dw.lRepairKey)                                                       AS DIWOCount,
    AVG(CAST(ISNULL(nd.NonDIItems, 0) AS decimal(10,2)))                      AS AvgFindsPerWO
FROM S7_DIWOs dw
    LEFT JOIN S7_NonDICount nd ON dw.lRepairKey = nd.lRepairKey
GROUP BY dw.sTechName, dw.InstrCategory
ORDER BY dw.sTechName, dw.InstrCategory;
```

- [ ] **Step 2: Verify against production (March 2026)**

Expected: One row per tech per instrument type. DIWOCount > 0. AvgFindsPerWO should be > 1 (most D&Is find at least one repair item). If AvgFindsPerWO is 0 across the board, verify the D&I item keys (29, 246, 636) are correct for the period.

- [ ] **Step 3: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat(ops-review): add Section 7 — Tech D&I Finds"
```

---

## Task 4: Section 8 — Tech Defect %

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql`

**Business rules:**
- Period filter: `CONVERT(date, r.dtDateOut)` — repairs completed in period
- Defect = `tblRepair.lTechnicianKey_DefectTracking IS NOT NULL AND lTechnicianKey_DefectTracking <> 0`
- Attribution = `tblRepair.lTechnicianKey_DefectTracking = t.lTechnicianKey`
- Denominator = WOs where tech was `lTechnicianKey` (primary tech) on the repair
- In-house only: `ISNULL(r.lVendorKey, 0) = 0`
- Use `tblRepair.lTechnicianKey` (the repair's primary assigned tech) for the denominator

- [ ] **Step 1: Write Section 8 SQL**

```sql
-- ============================================================
-- SECTION 8: Tech Defect %
-- In-house WOs completed in period (dtDateOut).
-- Defects attributed via tblRepair.lTechnicianKey_DefectTracking.
-- Denominator: WOs where tech is primary tech (tblRepair.lTechnicianKey).
-- ============================================================

;WITH S8_WOsWorked AS (
    -- WOs completed in period where this tech is the primary tech
    SELECT
        t.sTechName,
        t.lTechnicianKey,
        COUNT(r.lRepairKey) AS WOsWorked
    FROM tblRepair r
        JOIN tblDepartment  d ON r.lDepartmentKey = d.lDepartmentKey
        JOIN tblClient      c ON d.lClientKey     = c.lClientKey
        JOIN tblTechnicians t ON r.lTechnicianKey = t.lTechnicianKey
    WHERE CONVERT(date, r.dtDateOut) >= @StartDate
        AND   CONVERT(date, r.dtDateOut) <= @EndDate
        AND   ISDATE(r.dtDateOut) = 1
        AND   r.dtDateOut IS NOT NULL
        AND   ISNULL(r.lVendorKey, 0) = 0
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   t.bIsActive = 1
        AND   t.lJobTypeKey = 2
        AND   t.lTechnicianKey <> 96
    GROUP BY t.sTechName, t.lTechnicianKey
),
S8_Defects AS (
    -- Defects attributed to each tech in the period
    SELECT
        t.sTechName,
        t.lTechnicianKey,
        COUNT(r.lRepairKey) AS DefectCount
    FROM tblRepair r
        JOIN tblDepartment  d ON r.lDepartmentKey = d.lDepartmentKey
        JOIN tblClient      c ON d.lClientKey     = c.lClientKey
        JOIN tblTechnicians t ON r.lTechnicianKey_DefectTracking = t.lTechnicianKey
    WHERE CONVERT(date, r.dtDateOut) >= @StartDate
        AND   CONVERT(date, r.dtDateOut) <= @EndDate
        AND   ISDATE(r.dtDateOut) = 1
        AND   r.dtDateOut IS NOT NULL
        AND   ISNULL(r.lVendorKey, 0) = 0
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   r.lTechnicianKey_DefectTracking IS NOT NULL
        AND   r.lTechnicianKey_DefectTracking <> 0
        AND   t.bIsActive = 1
        AND   t.lJobTypeKey = 2
        AND   t.lTechnicianKey <> 96
    GROUP BY t.sTechName, t.lTechnicianKey
)
SELECT
    w.sTechName,
    w.WOsWorked,
    ISNULL(d.DefectCount, 0)                                                  AS DefectCount,
    CAST(ISNULL(d.DefectCount, 0) AS decimal(10,4))
        / NULLIF(w.WOsWorked, 0)                                              AS DefectPct
FROM S8_WOsWorked w
    LEFT JOIN S8_Defects d ON w.lTechnicianKey = d.lTechnicianKey
ORDER BY DefectPct DESC, w.sTechName;
```

- [ ] **Step 2: Verify against production (March 2026)**

Expected: One row per active tech. DefectCount should be a small subset of WOsWorked (< 10% typical). Cross-check: `SELECT COUNT(*) FROM tblRepair WHERE lTechnicianKey_DefectTracking <> 0 AND CONVERT(date, dtDateOut) BETWEEN '2026-03-01' AND '2026-03-31'` — should match the total DefectCount sum from the section.

- [ ] **Step 3: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat(ops-review): add Section 8 — Tech Defect %"
```

---

## Task 5: Section 9 — Tech Inventory Usage

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql`

**Business rules:**
- Period filter: `CONVERT(date, r.dtDateOut)` — repairs completed in period
- In-house only: `ISNULL(r.lVendorKey, 0) = 0`
- Cost source: `vwRepairInventoryCosts.InventorySizeRepairAmount` — pre-calculated per repair item transaction
- Tech attribution: `vwRepairInventoryCosts.lRepairItemTranKey` → `tblRepairItemTran.lTechnicianKey`
- Output: total inventory cost per tech, top part category by cost

- [ ] **Step 1: Write Section 9 SQL**

```sql
-- ============================================================
-- SECTION 9: Tech Inventory Usage
-- In-house WOs completed in period (dtDateOut).
-- Inventory cost via vwRepairInventoryCosts joined to tech
-- via tblRepairItemTran.lTechnicianKey.
-- ============================================================

;WITH S9_Base AS (
    SELECT
        t.sTechName,
        vic.sItemDescription                                                   AS PartCategory,
        SUM(vic.InventorySizeRepairAmount)                                     AS PartCost
    FROM vwRepairInventoryCosts vic
        JOIN tblRepairItemTran           rit ON vic.lRepairItemTranKey = rit.lRepairItemTranKey
        JOIN tblRepair                   r   ON vic.lRepairKey        = r.lRepairKey
        JOIN tblDepartment               d   ON r.lDepartmentKey      = d.lDepartmentKey
        JOIN tblClient                   c   ON d.lClientKey          = c.lClientKey
        JOIN tblTechnicians              t   ON rit.lTechnicianKey    = t.lTechnicianKey
    WHERE CONVERT(date, r.dtDateOut) >= @StartDate
        AND   CONVERT(date, r.dtDateOut) <= @EndDate
        AND   ISDATE(r.dtDateOut) = 1
        AND   r.dtDateOut IS NOT NULL
        AND   ISNULL(r.lVendorKey, 0) = 0
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   t.bIsActive = 1
        AND   t.lJobTypeKey = 2
        AND   t.lTechnicianKey <> 96
    GROUP BY t.sTechName, vic.sItemDescription
)
SELECT
    sTechName,
    PartCategory,
    CAST(PartCost AS decimal(10,2))                                            AS PartCost
FROM S9_Base
ORDER BY sTechName, PartCost DESC;
```

- [ ] **Step 2: Verify against production (March 2026)**

Expected: Rows for each tech × part category combo. PartCost should be positive dollar amounts (cents to hundreds). Verify total PartCost per tech is plausible given WO volume from Section 6. If zero rows, check `vwRepairInventoryCosts` has rows for the period: `SELECT COUNT(*) FROM vwRepairInventoryCosts vic JOIN tblRepair r ON vic.lRepairKey=r.lRepairKey WHERE CONVERT(date,r.dtDateOut)='2026-03-15'`

- [ ] **Step 3: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat(ops-review): add Section 9 — Tech Inventory Usage"
```

---

## Task 6: Section 10 — Tech Amendments & Misquotes

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql`

**Business rules:**
- Period filter: `arc.dtAmendmentDate` (amendment date, not repair date)
- Amendment cost = sum of `rit.dblRepairPrice` on `tblRepairItemTran` rows with `lAmendRepairCommentKey` matching
- Missed D&I = `lAmendRepairReasonKey = 11`
- Repeat damage = `lAmendRepairReasonKey = 14`
- Misquote = `lAmendRepairReasonKey = 15`
- TAT reset = `arc.bApprovalDateReset = 1`
- Misquotes: attributed to ops user via `arc.lUserKey` (not tech) — join to a user table. Check if `tblUsers` or `tblTechnicians` covers ops users. Use `arc.lUserKey` → `tblTechnicians.lUserKey` if available, else just count by lUserKey.
- Output: two result sets in one — tech section (rows 1..N sorted by tech) then ops/misquote section

**Note on misquote attribution:** `tblAmendRepairComments.lUserKey` is who created the amendment record. For misquotes, this is the ops person who entered it. Join via `tblTechnicians.lUserKey` to get name (lUserKey is a FK on tblTechnicians referencing the application user). If no match, fall back to showing lUserKey.

- [ ] **Step 1: Write Section 10 SQL — Tech Amendments**

```sql
-- ============================================================
-- SECTION 10A: Tech Amendments
-- Amendments created in period (dtAmendmentDate).
-- Cost = sum of repair item prices added during amendment.
-- Missed D&I = reason 11; Repeat damage = reason 14.
-- ============================================================

;WITH S10_AmendCost AS (
    SELECT
        t.sTechName,
        arc.lAmendRepairReasonKey,
        arc.bApprovalDateReset,
        SUM(ISNULL(rit.dblRepairPrice, 0))                                     AS AmendCost
    FROM tblAmendRepairComments arc
        JOIN tblRepair          r   ON arc.lRepairKey             = r.lRepairKey
        JOIN tblDepartment      d   ON r.lDepartmentKey           = d.lDepartmentKey
        JOIN tblClient          c   ON d.lClientKey               = c.lClientKey
        JOIN tblRepairItemTran  rit ON rit.lAmendRepairCommentKey = arc.lAmendRepairCommentKey
        JOIN tblTechnicians     t   ON rit.lTechnicianKey         = t.lTechnicianKey
    WHERE CONVERT(date, arc.dtAmendmentDate) >= @StartDate
        AND   CONVERT(date, arc.dtAmendmentDate) <= @EndDate
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   t.bIsActive = 1
        AND   t.lJobTypeKey = 2
        AND   t.lTechnicianKey <> 96
        AND   arc.lAmendRepairReasonKey IN (11, 14)
    GROUP BY t.sTechName, arc.lAmendRepairCommentKey, arc.lAmendRepairReasonKey, arc.bApprovalDateReset
)
SELECT
    sTechName,
    COUNT(CASE WHEN lAmendRepairReasonKey = 11 THEN 1 END)                    AS MissedDICount,
    SUM(CASE WHEN lAmendRepairReasonKey = 11 THEN AmendCost ELSE 0 END)       AS MissedDICost,
    COUNT(CASE WHEN lAmendRepairReasonKey = 14 THEN 1 END)                    AS RepeatDamageCount,
    SUM(CASE WHEN lAmendRepairReasonKey = 14 THEN AmendCost ELSE 0 END)       AS RepeatDamageCost,
    COUNT(CASE WHEN ISNULL(bApprovalDateReset, 0) = 1 THEN 1 END)            AS TATResetCount,
    SUM(AmendCost)                                                             AS TotalAmendCost
FROM S10_AmendCost
GROUP BY sTechName
ORDER BY TotalAmendCost DESC;
```

- [ ] **Step 2: Write Section 10B — Ops Misquotes**

```sql
-- ============================================================
-- SECTION 10B: Ops Misquotes
-- Amendments with reason 15 (Misquote by operations).
-- Attributed by arc.lUserKey → tblTechnicians.lUserKey for name.
-- ============================================================

;WITH S10B_Misquotes AS (
    SELECT
        ISNULL(t.sTechName, 'User ' + CAST(arc.lUserKey AS nvarchar)) AS OpsUser,
        arc.lAmendRepairCommentKey,
        SUM(ISNULL(rit.dblRepairPrice, 0))                            AS MisquoteCost
    FROM tblAmendRepairComments arc
        JOIN tblRepair          r   ON arc.lRepairKey             = r.lRepairKey
        JOIN tblDepartment      d   ON r.lDepartmentKey           = d.lDepartmentKey
        JOIN tblClient          c   ON d.lClientKey               = c.lClientKey
        JOIN tblRepairItemTran  rit ON rit.lAmendRepairCommentKey = arc.lAmendRepairCommentKey
        LEFT JOIN tblTechnicians t  ON arc.lUserKey               = t.lUserKey
    WHERE CONVERT(date, arc.dtAmendmentDate) >= @StartDate
        AND   CONVERT(date, arc.dtAmendmentDate) <= @EndDate
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   arc.lAmendRepairReasonKey = 15
    GROUP BY ISNULL(t.sTechName, 'User ' + CAST(arc.lUserKey AS nvarchar)),
             arc.lAmendRepairCommentKey
)
SELECT
    OpsUser,
    COUNT(lAmendRepairCommentKey)                                              AS MisquoteCount,
    SUM(MisquoteCost)                                                          AS TotalMisquoteCost
FROM S10B_Misquotes
GROUP BY OpsUser
ORDER BY MisquoteCount DESC;
```

- [ ] **Step 3: Verify Sections 10A and 10B against production (March 2026)**

Cross-checks:
```sql
-- Verify total amendment counts match raw data
SELECT COUNT(*) FROM tblAmendRepairComments 
WHERE dtAmendmentDate >= '2026-03-01' AND dtAmendmentDate < '2026-04-01'
  AND lAmendRepairReasonKey IN (11, 14)
-- Expected: matches sum of MissedDICount + RepeatDamageCount across all techs

SELECT COUNT(*) FROM tblAmendRepairComments 
WHERE dtAmendmentDate >= '2026-03-01' AND dtAmendmentDate < '2026-04-01'
  AND lAmendRepairReasonKey = 15
-- Expected: matches sum of MisquoteCount across all ops users
```

- [ ] **Step 4: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat(ops-review): add Sections 10A/10B — Tech Amendments & Misquotes"
```

---

## Task 7: Section 11 — Update Slips

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql`

**Business rules:**
- Period filter: `CONVERT(date, rus.dtUpdateRequestDate)` — when slip was created
- Tech attribution: `rus.lResponsibleTech` → `tblTechnicians.lTechnicianKey`
- Reason: `rus.lMainRepairUpdateSlipReasonKey` → `tblMainRepairUpdateSlipReasons.sMainRepairUpdateSlipReason`
- Join to tblRepair → tblDepartment → tblClient for bSkipTracking filter
- Output: count by tech + top reason per tech

- [ ] **Step 1: Write Section 11 SQL**

```sql
-- ============================================================
-- SECTION 11: Update Slips
-- Update slips created in period (dtUpdateRequestDate).
-- By responsible tech and top reason.
-- ============================================================

;WITH S11_Base AS (
    SELECT
        t.sTechName,
        r.sMainRepairUpdateSlipReason                                          AS SlipReason,
        COUNT(rus.lRepairUpdateSlipKey)                                        AS SlipCount
    FROM tblRepairUpdateSlips               rus
        JOIN tblRepair                      rep ON rus.lRepairKey                        = rep.lRepairKey
        JOIN tblDepartment                  d   ON rep.lDepartmentKey                    = d.lDepartmentKey
        JOIN tblClient                      c   ON d.lClientKey                          = c.lClientKey
        JOIN tblTechnicians                 t   ON rus.lResponsibleTech                  = t.lTechnicianKey
        JOIN tblMainRepairUpdateSlipReasons r   ON rus.lMainRepairUpdateSlipReasonKey    = r.lMainRepairUpdateSlipReasonKey
    WHERE CONVERT(date, rus.dtUpdateRequestDate) >= @StartDate
        AND   CONVERT(date, rus.dtUpdateRequestDate) <= @EndDate
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   t.bIsActive = 1
        AND   t.lJobTypeKey = 2
        AND   t.lTechnicianKey <> 96
    GROUP BY t.sTechName, r.sMainRepairUpdateSlipReason
)
SELECT
    sTechName,
    SlipReason,
    SlipCount
FROM S11_Base
ORDER BY sTechName, SlipCount DESC;
```

- [ ] **Step 2: Verify against production (March 2026)**

Expected: Multiple rows per tech (one per reason code). Most common reasons should be fluid-related based on reason table. Cross-check total slip count: `SELECT COUNT(*) FROM tblRepairUpdateSlips WHERE CONVERT(date, dtUpdateRequestDate) BETWEEN '2026-03-01' AND '2026-03-31'` — should be close to the section total (may differ slightly if some slips have no matching active tech).

- [ ] **Step 3: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat(ops-review): add Section 11 — Update Slips"
```

---

## Task 8: Section 12 — Avoidable Damage

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql`

**Business rules:**
- Period filter: `CONVERT(date, r.dtDateOut)` — repairs completed in period
- Source: `tblRepairReasons` joined via `tblRepair.lRepairReasonKey`
- Category: `tblRepairReasonCategories` — look for "Avoidable" vs other categories
- Top 10 avoidable reasons by count + instrument type breakdown
- Need to verify `tblRepairReasonCategories` structure and "Avoidable" category key during step 1

- [ ] **Step 1: Discover tblRepairReasons and tblRepairReasonCategories structure**

Run these discovery queries in PowerShell before writing SQL:

```powershell
$sql = @"
-- Columns
SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME IN ('tblRepairReasons', 'tblRepairReasonCategories') ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- All categories
SELECT * FROM tblRepairReasonCategories ORDER BY 1;

-- Top 10 reasons with category
SELECT TOP 10 rr.lRepairReasonKey, rr.sRepairReason, rr.lRepairReasonCategoryKey,
       rrc.sRepairReasonCategory
FROM tblRepairReasons rr
JOIN tblRepairReasonCategories rrc ON rr.lRepairReasonCategoryKey = rrc.lRepairReasonCategoryKey
ORDER BY 1;

-- How many repairs have lRepairReasonKey filled in (March 2026)
SELECT COUNT(*) AS RepairsWithReason
FROM tblRepair WHERE lRepairReasonKey IS NOT NULL AND lRepairReasonKey <> 0
  AND CONVERT(date, dtDateOut) BETWEEN '2026-03-01' AND '2026-03-31';
"@
```

Record findings here before writing Section 12 SQL:
- Avoidable category key: `___`
- Column names: `___`
- Coverage (% of repairs with reason filled): `___`

- [ ] **Step 2: Write Section 12 SQL (fill in actual category key from Step 1)**

```sql
-- ============================================================
-- SECTION 12: Avoidable Damage
-- In-house WOs completed in period (dtDateOut).
-- Uses tblRepair.lRepairReasonKey → tblRepairReasons → tblRepairReasonCategories.
-- Top 10 avoidable reasons by count.
-- ============================================================

;WITH S12_Base AS (
    SELECT
        rrc.sRepairReasonCategory                                              AS DamageCategory,
        rr.sRepairReason                                                       AS DamageReason,
        CASE
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 1 THEN 'Flex-Large'
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 0 THEN 'Flex-Small'
            WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
            WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
            WHEN st.sRigidOrFlexible = 'I' THEN 'Instrument'
            ELSE 'Other'
        END AS InstrCategory,
        COUNT(r.lRepairKey)                                                    AS WOCount
    FROM tblRepair r
        JOIN tblDepartment               d   ON r.lDepartmentKey    = d.lDepartmentKey
        JOIN tblClient                   c   ON d.lClientKey        = c.lClientKey
        JOIN tblScope                    s   ON r.lScopeKey         = s.lScopeKey
        JOIN tblScopeType                st  ON s.lScopeTypeKey     = st.lScopeTypeKey
        LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
        JOIN tblRepairReasons            rr  ON r.lRepairReasonKey  = rr.lRepairReasonKey
        JOIN tblRepairReasonCategories   rrc ON rr.lRepairReasonCategoryKey = rrc.lRepairReasonCategoryKey
    WHERE CONVERT(date, r.dtDateOut) >= @StartDate
        AND   CONVERT(date, r.dtDateOut) <= @EndDate
        AND   ISDATE(r.dtDateOut) = 1
        AND   r.dtDateOut IS NOT NULL
        AND   ISNULL(r.lVendorKey, 0) = 0
        AND   ISNULL(c.bSkipTracking, 0) = 0
    GROUP BY rrc.sRepairReasonCategory, rr.sRepairReason,
             st.sRigidOrFlexible, sc.bLargeDiameter
),
S12_Ranked AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY DamageCategory ORDER BY WOCount DESC) AS RankWithinCategory
    FROM S12_Base
)
SELECT
    DamageCategory,
    DamageReason,
    InstrCategory,
    WOCount
FROM S12_Ranked
WHERE RankWithinCategory <= 10
ORDER BY DamageCategory, WOCount DESC, InstrCategory;
```

- [ ] **Step 3: Verify against production (March 2026)**

Expected: Rows grouped by DamageCategory (e.g., "Avoidable", "Normal Wear & Tear", etc.). If zero rows, `lRepairReasonKey` may not be widely filled in — check coverage count from Step 1. If coverage is low (< 20% of WOs), note this in a SQL comment.

- [ ] **Step 4: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat(ops-review): add Section 12 — Avoidable Damage"
```

---

## Task 9: Verify All 12 Sections Together

Run the full script against three periods to confirm no regressions and all 12 result sets return expected data.

- [ ] **Step 1: Run full integration test (3 periods)**

Use the existing `C:/tmp/test-integration-plana.ps1` as a template — update `$sectionLabels` to include Sections 5-12 and set the expected result set count to 13 (12 sections + placeholder for 13-16):

```powershell
$sectionLabels = @(
    "1: Throughput & TAT",
    "2: 40-Day Returns & Warranty",
    "3: Contract vs FFS Volume",
    "4: Contract P&L",
    "5: Loaner Fulfillment Rate",
    "6: Tech Repair Scorecard",
    "7: Tech D&I Finds",
    "8: Tech Defect %",
    "9: Tech Inventory Usage",
    "10A: Tech Amendments",
    "10B: Ops Misquotes",
    "11: Update Slips",
    "12: Avoidable Damage",
    "13-16: Placeholder"
)
```

Run for: March 2026 (monthly), Q1 2026 (quarterly), October 2025 (historical).

- [ ] **Step 2: Confirm result set count and row counts**

Expected: 14 result sets (10A and 10B are separate SELECTs, so Section 10 produces 2 result sets — total 14 through the placeholder).

- [ ] **Step 3: Update placeholder comment for remaining sections**

Replace:
```sql
SELECT 'Sections 5-16 coming in Plans B and C' AS Note;
```
with:
```sql
SELECT 'Sections 13-16 coming in Plan C' AS Note;
```

- [ ] **Step 4: Commit integration test pass**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat(ops-review): Plan B complete — Sections 5-12 all passing integration test"
```
