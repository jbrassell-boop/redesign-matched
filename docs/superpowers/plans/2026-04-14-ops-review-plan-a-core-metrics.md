# Ops Review — Plan A: Infrastructure + Core Repair Metrics

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the master SQL script skeleton, PowerShell runner, and Sections 1–4 of the monthly ops review (Throughput & TAT, 40-Day Returns & Warranty, Contract vs FFS Volume, Contract P&L).

**Architecture:** One master SQL script (`monthly-ops-review.sql`) parameterized by `@StartDate`/`@EndDate`, run via PowerShell SqlClient against WinScopeNet. This plan delivers Sections 1–4 as a working, runnable subset. Plans B and C add the remaining sections.

**Tech Stack:** T-SQL (SQL Server), PowerShell 5+, System.Data.SqlClient

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `docs/reports/sql/operations/monthly-ops-review.sql` | Master SQL script — all sections live here |
| Create | `docs/reports/sql/operations/Run-OpsReview.ps1` | PowerShell runner — executes script, prints result sets |
| Create | `docs/reports/sql/operations/discovery/schema-discovery.sql` | One-time schema queries to resolve open items |
| Create | `docs/reports/sql/operations/discovery/schema-notes.md` | Findings from schema discovery — fill in during Task 1 |

---

## Task 1: Schema Discovery

Resolve the 8 open items from the spec before writing SQL that depends on unknown table names. Run each query via PowerShell against production (read-only).

**Files:**
- Create: `docs/reports/sql/operations/discovery/schema-discovery.sql`
- Create: `docs/reports/sql/operations/discovery/schema-notes.md`

- [ ] **Step 1: Create the discovery SQL file**

Create `docs/reports/sql/operations/discovery/schema-discovery.sql` with this content:

```sql
-- DISCOVERY QUERIES — run once, document findings in schema-notes.md
-- Server: 10.0.0.15\Goldmine | DB: WinScopeNet | READ ONLY

-- 1. Loaner tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Loan%' ORDER BY TABLE_NAME;

-- 2. Defect tracking tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Defect%' ORDER BY TABLE_NAME;

-- 3. Inventory and lot tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Inventor%' OR TABLE_NAME LIKE '%Lot%'
ORDER BY TABLE_NAME;

-- 4. Amendment reason tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Amend%' ORDER BY TABLE_NAME;

-- 5. Update slip reason tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%UpdateSlip%' OR TABLE_NAME LIKE '%Update_Slip%'
   OR TABLE_NAME LIKE '%SlipReason%'
ORDER BY TABLE_NAME;

-- 6. Ordering / purchasing / receiving tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%Order%' OR TABLE_NAME LIKE '%Purchas%'
   OR TABLE_NAME LIKE '%Receiv%'
ORDER BY TABLE_NAME;

-- 7. Verify "Not Repairable" repair item key
SELECT lRepairItemKey, sRepairItem FROM tblRepairItem
WHERE sRepairItem LIKE '%Not Rep%' OR sRepairItem LIKE '%Cannot Rep%'
ORDER BY sRepairItem;

-- 8. Sample tblAmendRepairComments columns
SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tblAmendRepairComments'
ORDER BY ORDINAL_POSITION;

-- 9. Amendment reason keys (run after step 8 confirms reason table name)
-- Replace tblAmendRepairReasons with actual table name found above
SELECT * FROM tblAmendRepairReasons ORDER BY lAmendRepairReasonKey;

-- 10. Sample recent amendment comments to understand reason codes
SELECT TOP 20 a.*, r.lRepairKey
FROM tblAmendRepairComments a
JOIN tblRepair r ON a.lRepairKey = r.lRepairKey
ORDER BY a.lAmendRepairCommentKey DESC;

-- 11. Update slip columns
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tblRepairUpdateSlips'
ORDER BY ORDINAL_POSITION;

-- 12. fnWithin40Days output columns — run this to see what it returns
SELECT TOP 1 * FROM dbo.fnWithin40Days('2026-03-01', '2026-03-31', 'A', 0);

-- 13. tblAmendRepairComments — check for responsible tech column
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tblAmendRepairComments'
ORDER BY ORDINAL_POSITION;
```

- [ ] **Step 2: Run discovery queries via PowerShell**

```powershell
$connStr = "Server=10.0.0.15\Goldmine;Database=WinScopeNet;User Id=BrightLogixUser;Password=12345"
$sqlFile = "C:\Projects\redesign-matched\docs\reports\sql\operations\discovery\schema-discovery.sql"
$sql = Get-Content $sqlFile -Raw

# Split on semicolons to run each query separately
$queries = $sql -split ";\s*\n" | Where-Object { $_.Trim() -notmatch "^--" -and $_.Trim() -ne "" }

$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()

foreach ($q in $queries) {
    $q = $q.Trim()
    if ($q -eq "") { continue }
    Write-Host "`n--- Query ---" -ForegroundColor Yellow
    Write-Host $q.Substring(0, [Math]::Min(80, $q.Length))
    try {
        $cmd = New-Object System.Data.SqlClient.SqlCommand($q, $conn)
        $cmd.CommandTimeout = 30
        $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
        $dt = New-Object System.Data.DataTable
        $adapter.Fill($dt) | Out-Null
        $dt | Format-Table -AutoSize
    } catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
}

$conn.Close()
```

Expected output: table names for each category, "Not Repairable" repair item key, amendment reason codes.

- [ ] **Step 3: Document findings in schema-notes.md**

Create `docs/reports/sql/operations/discovery/schema-notes.md` and fill in from the query output:

```markdown
# Schema Discovery Notes — 2026-04-14

## Loaner Table
- Table name: [fill in]
- Columns: [fill in — specifically loaner requested flag and fulfilled flag]

## Defect Tracking Table
- Table name: [fill in — likely tblDefectTracking]
- Responsible tech column: [fill in]

## Inventory / Lot Tables
- Repair inventory table: [fill in]
- Lot/cost table: [fill in]

## Amendment Reason Table
- Table name: [fill in]
- Missed D&I reason key: [fill in]
- Repeat repair damage reason key: [fill in]
- Misquote reason key: [fill in]

## Update Slip Reason Table
- Table name: [fill in]

## Inventory Ordering Table
- Table name: [fill in]

## Not Repairable Repair Item
- lRepairItemKey: [fill in]
- sRepairItem exact value: [fill in]

## fnWithin40Days Columns
- [list all column names returned]
```

- [ ] **Step 4: Commit discovery files**

```bash
git add docs/reports/sql/operations/discovery/
git commit -m "feat: add schema discovery queries and notes for ops review open items"
```

---

## Task 2: PowerShell Runner + Script Skeleton

**Files:**
- Create: `docs/reports/sql/operations/Run-OpsReview.ps1`
- Create: `docs/reports/sql/operations/monthly-ops-review.sql`

- [ ] **Step 1: Create Run-OpsReview.ps1**

Create `docs/reports/sql/operations/Run-OpsReview.ps1`:

```powershell
<#
.SYNOPSIS
    Runs the TSI Monthly Ops Review SQL script against WinScopeNet.
.EXAMPLE
    .\Run-OpsReview.ps1 -StartDate "2026-03-01" -EndDate "2026-03-31"
    .\Run-OpsReview.ps1 -StartDate "2026-01-01" -EndDate "2026-03-31"  # quarterly
#>
param(
    [Parameter(Mandatory)]
    [string]$StartDate,
    [Parameter(Mandatory)]
    [string]$EndDate
)

$connStr  = "Server=10.0.0.15\Goldmine;Database=WinScopeNet;User Id=BrightLogixUser;Password=12345"
$sqlFile  = Join-Path $PSScriptRoot "monthly-ops-review.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Error "SQL file not found: $sqlFile"
    exit 1
}

$sql = Get-Content $sqlFile -Raw
$sql = $sql -replace "(?m)^DECLARE @StartDate date = '[^']*'", "DECLARE @StartDate date = '$StartDate'"
$sql = $sql -replace "(?m)^DECLARE @EndDate   date = '[^']*'", "DECLARE @EndDate   date = '$EndDate'"

$sectionNames = @(
    "1 - Throughput & TAT",
    "2 - 40-Day Returns & Warranty",
    "3 - Contract vs FFS Volume",
    "4 - Contract P&L",
    "5 - Loaner Fulfillment",
    "6 - Tech Repair Scorecard",
    "7 - Tech D&I Finds",
    "8 - Tech Defect %",
    "9 - Tech Inventory Usage",
    "10 - Tech Amendments & Misquotes",
    "11 - Update Slips",
    "12 - Avoidable Damage",
    "13 - Van Service",
    "14 - Vendor/Outsourced Repairs",
    "15 - Inventory Ordering",
    "16 - Scope Outcomes"
)

try {
    $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
    $conn.Open()
    Write-Host "Connected to WinScopeNet" -ForegroundColor Green

    $cmd     = New-Object System.Data.SqlClient.SqlCommand($sql, $conn)
    $cmd.CommandTimeout = 300
    $adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
    $ds      = New-Object System.Data.DataSet
    $adapter.Fill($ds) | Out-Null

    for ($i = 0; $i -lt $ds.Tables.Count; $i++) {
        $label = if ($i -lt $sectionNames.Count) { $sectionNames[$i] } else { "Result Set $($i+1)" }
        Write-Host "`n========================================" -ForegroundColor Cyan
        Write-Host "  SECTION $label" -ForegroundColor Cyan
        Write-Host "  Period: $StartDate to $EndDate" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        $ds.Tables[$i] | Format-Table -AutoSize
        Write-Host "  Rows: $($ds.Tables[$i].Rows.Count)" -ForegroundColor DarkGray
    }

    Write-Host "`nDone. $($ds.Tables.Count) result set(s) returned." -ForegroundColor Green
}
catch {
    Write-Error "Failed: $_"
}
finally {
    if ($conn.State -eq 'Open') { $conn.Close() }
}
```

- [ ] **Step 2: Verify runner works with a trivial query**

Temporarily test the runner with a simple query before the real script exists:

```powershell
cd C:\Projects\redesign-matched\docs\reports\sql\operations

# Quick connection test
$connStr = "Server=10.0.0.15\Goldmine;Database=WinScopeNet;User Id=BrightLogixUser;Password=12345"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
Write-Host "Connected: $($conn.State)"
$conn.Close()
```

Expected output: `Connected: Open`

- [ ] **Step 3: Create monthly-ops-review.sql skeleton**

Create `docs/reports/sql/operations/monthly-ops-review.sql`:

```sql
-- ============================================================
-- TSI MONTHLY OPS REVIEW — MASTER SCRIPT
-- ============================================================
-- Usage: Set @StartDate and @EndDate, then run via Run-OpsReview.ps1
--   Monthly:   @StartDate = first day of month, @EndDate = last day of month
--   Quarterly: @StartDate = first day of quarter, @EndDate = last day of quarter
--
-- Produces 16 result sets in order (one per section).
-- All sections filter: ISNULL(c.bSkipTracking,0) = 0
-- Placeholder tech "000" (lTechnicianKey=96) excluded from all tech sections.
-- Read-only — no write operations.
-- Server: 10.0.0.15\Goldmine | DB: WinScopeNet
-- ============================================================

DECLARE @StartDate date = '2026-03-01'
DECLARE @EndDate   date = '2026-03-31'

-- ============================================================
-- SECTION 1: Throughput & TAT
-- ============================================================

SELECT 'Section 1 placeholder — replace in Task 3' AS Note;

-- ============================================================
-- SECTION 2: 40-Day Returns & Warranty
-- ============================================================

SELECT 'Section 2 placeholder — replace in Task 4' AS Note;

-- ============================================================
-- SECTION 3: Contract vs FFS Volume
-- ============================================================

SELECT 'Section 3 placeholder — replace in Task 5' AS Note;

-- ============================================================
-- SECTION 4: Contract P&L
-- ============================================================

SELECT 'Section 4 placeholder — replace in Task 6' AS Note;
```

- [ ] **Step 4: Run skeleton to confirm 4 result sets return**

```powershell
cd C:\Projects\redesign-matched\docs\reports\sql\operations
.\Run-OpsReview.ps1 -StartDate "2026-03-01" -EndDate "2026-03-31"
```

Expected: 4 result sets, each with one row saying "placeholder".

- [ ] **Step 5: Commit**

```bash
git add docs/reports/sql/operations/Run-OpsReview.ps1
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat: add ops review SQL skeleton and PowerShell runner"
```

---

## Task 3: Section 1 — Throughput & TAT

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql` (replace Section 1 placeholder)

- [ ] **Step 1: Replace Section 1 placeholder with full query**

In `monthly-ops-review.sql`, replace the Section 1 placeholder block with:

```sql
-- ============================================================
-- SECTION 1: Throughput & TAT
-- WOs completed in period (dtDateOut), counted at highest non-D&I
-- repair level per WO. In-house only AND outsourced separately.
-- Excludes D&I repair items (29, 246, 636).
-- ============================================================

;WITH S1_Base AS (
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
        MAX(rl.lRepairLevelKey)                                                    AS MaxLevelKey,
        CAST(dbo.fn_DateDiffWeekDays(r.dtAprRecvd, r.dtDateOut) AS decimal(10,2)) AS TAT,
        CAST(dbo.fn_DateDiffWeekDays(r.dtDateIn,   r.dtDateOut) AS decimal(10,2)) AS LeadTime,
        CASE WHEN ISNULL(r.lVendorKey,0) = 0 THEN 1 ELSE 0 END                   AS IsInHouse
    FROM tblRepair r
        JOIN tblDepartment         d  ON r.lDepartmentKey     = d.lDepartmentKey
        JOIN tblClient             c  ON d.lClientKey         = c.lClientKey
        JOIN tblScope              s  ON r.lScopeKey          = s.lScopeKey
        JOIN tblScopeType          st ON s.lScopeTypeKey      = st.lScopeTypeKey
        LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
        JOIN tblRepairItemTran     rit ON r.lRepairKey        = rit.lRepairKey
        JOIN tblRepairItem         ri  ON rit.lRepairItemKey  = ri.lRepairItemKey
        JOIN tblRepairLevels       rl  ON ri.sMajorRepair     = rl.lRepairLevelKey
    WHERE CONVERT(date, r.dtDateOut) >= @StartDate
        AND   CONVERT(date, r.dtDateOut) <= @EndDate
        AND   ISDATE(r.dtDateOut) = 1
        AND   r.dtDateOut IS NOT NULL
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   rit.lRepairItemKey NOT IN (29, 246, 636)
    GROUP BY r.lRepairKey, st.sRigidOrFlexible, sc.bLargeDiameter,
             r.dtAprRecvd, r.dtDateOut, r.dtDateIn, r.lVendorKey
)
SELECT
    b.InstrCategory,
    rl.sRepairLevel,
    rl.lRepairLevelKey                                                       AS SortKey,
    COUNT(b.lRepairKey)                                                      AS WOCount,
    AVG(CASE WHEN b.TAT      >= 0 THEN b.TAT      END)                      AS AvgTAT,
    AVG(CASE WHEN b.LeadTime >= 0 THEN b.LeadTime END)                      AS AvgLeadTime,
    SUM(b.IsInHouse)                                                         AS InHouseCount,
    COUNT(b.lRepairKey) - SUM(b.IsInHouse)                                  AS OutsourcedCount
FROM S1_Base b
    JOIN tblRepairLevels rl ON b.MaxLevelKey = rl.lRepairLevelKey
GROUP BY b.InstrCategory, b.MaxLevelKey, rl.sRepairLevel
ORDER BY b.InstrCategory, b.MaxLevelKey;
```

- [ ] **Step 2: Run Section 1 and verify structure**

```powershell
cd C:\Projects\redesign-matched\docs\reports\sql\operations
.\Run-OpsReview.ps1 -StartDate "2026-03-01" -EndDate "2026-03-31"
```

Expected columns: `InstrCategory, sRepairLevel, SortKey, WOCount, AvgTAT, AvgLeadTime, InHouseCount, OutsourcedCount`

Expected rows: one row per InstrCategory × RepairLevel combination with data in the period. Should see Flex-Large, Flex-Small, Rigid at minimum.

- [ ] **Step 3: Spot-check against known data**

Run this verification query to check a specific known WO (NR26096009 — completed 04/06/2026):

```powershell
$connStr = "Server=10.0.0.15\Goldmine;Database=WinScopeNet;User Id=BrightLogixUser;Password=12345"
$sql = @"
SELECT r.lRepairKey, r.sWorkOrderNumber,
    CONVERT(date, r.dtDateIn) AS DateIn,
    CONVERT(date, r.dtDateOut) AS DateOut,
    CAST(dbo.fn_DateDiffWeekDays(r.dtAprRecvd, r.dtDateOut) AS decimal(10,2)) AS TAT,
    st.sRigidOrFlexible, sc.bLargeDiameter
FROM tblRepair r
    JOIN tblScope s ON r.lScopeKey = s.lScopeKey
    JOIN tblScopeType st ON s.lScopeTypeKey = st.lScopeTypeKey
    LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
WHERE r.sWorkOrderNumber = 'NR26096009'
"@
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = New-Object System.Data.SqlClient.SqlCommand($sql, $conn)
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$dt = New-Object System.Data.DataTable
$adapter.Fill($dt) | Out-Null
$dt | Format-Table -AutoSize
$conn.Close()
```

Confirm it appears in the Flex-Large category (BF P190 is a large-diameter flexible scope). If TAT shows negative, investigate dtAprRecvd — the AVG calculation filters negatives out but they indicate a data quality issue worth noting.

- [ ] **Step 4: Verify bSkipTracking exclusion works**

```powershell
$connStr = "Server=10.0.0.15\Goldmine;Database=WinScopeNet;User Id=BrightLogixUser;Password=12345"
$sql = "SELECT TOP 5 c.sClientName1 FROM tblClient c WHERE ISNULL(c.bSkipTracking,0) <> 0"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = New-Object System.Data.SqlClient.SqlCommand($sql, $conn)
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$dt = New-Object System.Data.DataTable
$adapter.Fill($dt) | Out-Null
Write-Host "Clients flagged bSkipTracking:"
$dt | Format-Table -AutoSize
$conn.Close()
```

None of these client names should appear in the Section 1 output.

- [ ] **Step 5: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat: add Section 1 - Throughput & TAT to ops review script"
```

---

## Task 4: Section 2 — 40-Day Returns & Warranty

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql` (replace Section 2 placeholder)

- [ ] **Step 1: Verify fnWithin40Days column names**

Before writing the query, confirm what columns fnWithin40Days returns (documented in Task 1 schema-notes.md). Specifically verify:
- Column name for work order number (should be `sWorkOrderNumber`)
- Column names for all 8 failure code columns
- Whether `lRepairKey` is present (it is NOT — per spec, join via `sWorkOrderNumber`)

```powershell
$connStr = "Server=10.0.0.15\Goldmine;Database=WinScopeNet;User Id=BrightLogixUser;Password=12345"
$sql = "SELECT TOP 1 * FROM dbo.fnWithin40Days('2026-03-01','2026-03-31','A',0)"
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = New-Object System.Data.SqlClient.SqlCommand($sql, $conn)
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$dt = New-Object System.Data.DataTable
$adapter.Fill($dt) | Out-Null
$dt.Columns | ForEach-Object { Write-Host $_.ColumnName }
$conn.Close()
```

- [ ] **Step 2: Replace Section 2 placeholder with full query**

In `monthly-ops-review.sql`, replace the Section 2 placeholder block with:

```sql
-- ============================================================
-- SECTION 2: 40-Day Returns & Warranty
-- Denominator: ALL WOs received in period (dtDateIn).
-- Warranty = 40-day return with Failure_ImproperTechnique='X'
--            OR Failure_PreviousInspection='X'
--            OR Failure_PreviousRepairs='X'
-- Fill rate gap = 40-day returns with NO failure code filled in.
-- ============================================================

;WITH S2_AllWOs AS (
    -- Total WOs received in period (denominator)
    SELECT
        r.lRepairKey,
        r.sWorkOrderNumber,
        CASE
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 1 THEN 'Flex-Large'
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 0 THEN 'Flex-Small'
            WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
            WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
            WHEN st.sRigidOrFlexible = 'I' THEN 'Instrument'
            ELSE 'Other'
        END AS InstrCategory
    FROM tblRepair r
        JOIN tblDepartment         d  ON r.lDepartmentKey  = d.lDepartmentKey
        JOIN tblClient             c  ON d.lClientKey      = c.lClientKey
        JOIN tblScope              s  ON r.lScopeKey       = s.lScopeKey
        JOIN tblScopeType          st ON s.lScopeTypeKey   = st.lScopeTypeKey
        LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
    WHERE CONVERT(date, r.dtDateIn) >= @StartDate
        AND   CONVERT(date, r.dtDateIn) <= @EndDate
        AND   ISNULL(c.bSkipTracking, 0) = 0
),
S2_FortyDay AS (
    -- 40-day returns and their failure codes
    SELECT
        w.sWorkOrderNumber,
        CASE WHEN w.Failure_ImproperTechnique  = 'X'
              OR  w.Failure_PreviousInspection = 'X'
              OR  w.Failure_PreviousRepairs    = 'X'
             THEN 1 ELSE 0 END AS IsWarranty,
        CASE WHEN ISNULL(w.Failure_ImproperCare,     '') = ''
              AND ISNULL(w.Failure_Part,              '') = ''
              AND ISNULL(w.Failure_Cosmetic,          '') = ''
              AND ISNULL(w.Failure_ImproperTechnique, '') = ''
              AND ISNULL(w.Failure_PreviousInspection,'') = ''
              AND ISNULL(w.Failure_PreviousRepairs,   '') = ''
              AND ISNULL(w.Failure_NoPreviousRepairs, '') = ''
              AND ISNULL(w.Failure_Other,             '') = ''
             THEN 1 ELSE 0 END AS NoCodeFilled
    FROM dbo.fnWithin40Days(@StartDate, @EndDate, 'A', 0) w
),
S2_FortyDayWithCategory AS (
    SELECT a.InstrCategory,
           f.IsWarranty,
           f.NoCodeFilled
    FROM S2_FortyDay f
        JOIN S2_AllWOs a ON f.sWorkOrderNumber = a.sWorkOrderNumber
)
SELECT
    t.InstrCategory,
    t.TotalWOs,
    ISNULL(fd.FortyDayCount, 0)   AS FortyDayCount,
    CAST(ISNULL(fd.FortyDayCount, 0) AS decimal(10,4))
        / NULLIF(t.TotalWOs, 0)   AS FortyDayRate,
    ISNULL(fd.WarrantyCount, 0)   AS WarrantyCount,
    CAST(ISNULL(fd.WarrantyCount, 0) AS decimal(10,4))
        / NULLIF(t.TotalWOs, 0)   AS WarrantyRate,
    ISNULL(fd.NoCodeCount, 0)     AS FillRateGap
FROM (
    SELECT InstrCategory, COUNT(lRepairKey) AS TotalWOs
    FROM S2_AllWOs GROUP BY InstrCategory
) t
LEFT JOIN (
    SELECT InstrCategory,
           COUNT(*)          AS FortyDayCount,
           SUM(IsWarranty)   AS WarrantyCount,
           SUM(NoCodeFilled) AS NoCodeCount
    FROM S2_FortyDayWithCategory
    GROUP BY InstrCategory
) fd ON t.InstrCategory = fd.InstrCategory
ORDER BY t.InstrCategory;
```

- [ ] **Step 3: Run and verify output**

```powershell
cd C:\Projects\redesign-matched\docs\reports\sql\operations
.\Run-OpsReview.ps1 -StartDate "2026-03-01" -EndDate "2026-03-31"
```

Expected columns: `InstrCategory, TotalWOs, FortyDayCount, FortyDayRate, WarrantyCount, WarrantyRate, FillRateGap`

Sanity checks:
- FortyDayCount ≤ TotalWOs for every row
- WarrantyCount ≤ FortyDayCount for every row
- FortyDayRate between 0 and 1
- FillRateGap = 40-day returns with no codes checked; expect this to be 50%+ of FortyDayCount based on prior analysis

- [ ] **Step 4: Spot-check NR26099009**

This WO was confirmed as a warranty case (Failure_PreviousRepairs checked). Verify it appears correctly:

```powershell
$connStr = "Server=10.0.0.15\Goldmine;Database=WinScopeNet;User Id=BrightLogixUser;Password=12345"
$sql = @"
SELECT w.sWorkOrderNumber, w.Failure_ImproperTechnique, w.Failure_PreviousInspection,
       w.Failure_PreviousRepairs, w.Failure_ImproperCare, w.Failure_Part,
       w.Failure_Cosmetic, w.Failure_NoPreviousRepairs, w.Failure_Other,
       w.nDaysSinceLastIn
FROM dbo.fnWithin40Days('2026-01-01','2026-12-31','A',0) w
WHERE w.sWorkOrderNumber = 'NR26099009'
"@
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = New-Object System.Data.SqlClient.SqlCommand($sql, $conn)
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$dt = New-Object System.Data.DataTable
$adapter.Fill($dt) | Out-Null
$dt | Format-Table -AutoSize
$conn.Close()
```

Expected: `Failure_PreviousRepairs = 'X'`, all others blank. If NR26099009 was received outside the current period, adjust the date range as above.

- [ ] **Step 5: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat: add Section 2 - 40-Day Returns & Warranty to ops review script"
```

---

## Task 5: Section 3 — Contract vs FFS Volume

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql` (replace Section 3 placeholder)

- [ ] **Step 1: Replace Section 3 placeholder with full query**

In `monthly-ops-review.sql`, replace the Section 3 placeholder block with:

```sql
-- ============================================================
-- SECTION 3: Contract vs FFS Volume
-- WOs completed in period (dtDateOut).
-- Contract = fn_scopeIsCoveredByContract(lScopeKey, dtDateIn) <> 0
-- ============================================================

;WITH S3_Base AS (
    SELECT
        r.lRepairKey,
        r.lScopeKey,
        r.dtDateIn,
        CASE
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 1 THEN 'Flex-Large'
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 0 THEN 'Flex-Small'
            WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
            WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
            WHEN st.sRigidOrFlexible = 'I' THEN 'Instrument'
            ELSE 'Other'
        END AS InstrCategory,
        CASE WHEN dbo.fn_scopeIsCoveredByContract(r.lScopeKey, r.dtDateIn) <> 0
             THEN 'Contract' ELSE 'FFS' END AS BillingType
    FROM tblRepair r
        JOIN tblDepartment         d  ON r.lDepartmentKey  = d.lDepartmentKey
        JOIN tblClient             c  ON d.lClientKey      = c.lClientKey
        JOIN tblScope              s  ON r.lScopeKey       = s.lScopeKey
        JOIN tblScopeType          st ON s.lScopeTypeKey   = st.lScopeTypeKey
        LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
    WHERE CONVERT(date, r.dtDateOut) >= @StartDate
        AND   CONVERT(date, r.dtDateOut) <= @EndDate
        AND   ISDATE(r.dtDateOut) = 1
        AND   r.dtDateOut IS NOT NULL
        AND   ISNULL(c.bSkipTracking, 0) = 0
)
SELECT
    BillingType,
    InstrCategory,
    COUNT(lRepairKey) AS WOCount
FROM S3_Base
GROUP BY BillingType, InstrCategory
ORDER BY BillingType, InstrCategory;
```

- [ ] **Step 2: Run and verify**

```powershell
cd C:\Projects\redesign-matched\docs\reports\sql\operations
.\Run-OpsReview.ps1 -StartDate "2026-03-01" -EndDate "2026-03-31"
```

Expected columns: `BillingType, InstrCategory, WOCount`

Verify: University Medical Center - TX (from the NR26096009 screenshot) is under contract (the repair window showed "This scope is under contract: University Medical Center – TX Capitated Service"). Find that client's WOs in the Section 3 output — they should appear under `BillingType = 'Contract'`.

- [ ] **Step 3: Spot-check contract flag**

```powershell
$connStr = "Server=10.0.0.15\Goldmine;Database=WinScopeNet;User Id=BrightLogixUser;Password=12345"
$sql = @"
SELECT r.sWorkOrderNumber,
    dbo.fn_scopeIsCoveredByContract(r.lScopeKey, r.dtDateIn) AS IsContract,
    c.sClientName1
FROM tblRepair r
    JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
    JOIN tblClient c ON d.lClientKey = c.lClientKey
WHERE r.sWorkOrderNumber IN ('NR26096009', 'NR26099009')
"@
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = New-Object System.Data.SqlClient.SqlCommand($sql, $conn)
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$dt = New-Object System.Data.DataTable
$adapter.Fill($dt) | Out-Null
$dt | Format-Table -AutoSize
$conn.Close()
```

NR26096009 should show `IsContract <> 0` (confirmed as contracted scope in WinScopeNet UI).

- [ ] **Step 4: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat: add Section 3 - Contract vs FFS Volume to ops review script"
```

---

## Task 6: Section 4 — Contract P&L

**Files:**
- Modify: `docs/reports/sql/operations/monthly-ops-review.sql` (replace Section 4 placeholder)

- [ ] **Step 1: Verify invoice join to repair**

Before writing the query, confirm how tblInvoice links to tblRepair:

```powershell
$connStr = "Server=10.0.0.15\Goldmine;Database=WinScopeNet;User Id=BrightLogixUser;Password=12345"
$sql = @"
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tblInvoice'
ORDER BY ORDINAL_POSITION
"@
$conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
$conn.Open()
$cmd = New-Object System.Data.SqlClient.SqlCommand($sql, $conn)
$adapter = New-Object System.Data.SqlClient.SqlDataAdapter($cmd)
$dt = New-Object System.Data.DataTable
$adapter.Fill($dt) | Out-Null
$dt | Format-Table -AutoSize

# Also check a sample invoice for NR26096009
$sql2 = @"
SELECT TOP 3 i.lInvoiceKey, i.lRepairKey, i.lClientKey, i.dblTranAmount, i.dtTranDate
FROM tblInvoice i
JOIN tblRepair r ON i.lRepairKey = r.lRepairKey
WHERE r.sWorkOrderNumber = 'NR26096009'
"@
$cmd2 = New-Object System.Data.SqlClient.SqlCommand($sql2, $conn)
$adapter2 = New-Object System.Data.SqlClient.SqlDataAdapter($cmd2)
$dt2 = New-Object System.Data.DataTable
$adapter2.Fill($dt2) | Out-Null
Write-Host "`nInvoice for NR26096009:"
$dt2 | Format-Table -AutoSize
$conn.Close()
```

Confirm `lRepairKey` is the join column between tblInvoice and tblRepair.

- [ ] **Step 2: Replace Section 4 placeholder with full query**

In `monthly-ops-review.sql`, replace the Section 4 placeholder block with:

```sql
-- ============================================================
-- SECTION 4: Contract P&L
-- Revenue = tblInvoice.dblTranAmount for contract WOs shipped in period.
-- Cost = tblRepair.dblOutSourceCost (outsource) only.
-- NOTE: Inventory cost added in Plan B once lot tables are confirmed.
-- ============================================================

;WITH S4_InvoiceTotals AS (
    -- Sum per repair first to avoid double-counting if tblInvoice has
    -- multiple rows per repair (line-item invoicing).
    SELECT lRepairKey, SUM(ISNULL(dblTranAmount, 0)) AS TotalInvoiced
    FROM tblInvoice
    GROUP BY lRepairKey
),
S4_ContractRepairs AS (
    SELECT
        r.lRepairKey,
        c.sClientName1,
        ISNULL(inv.TotalInvoiced, 0)  AS Revenue,
        ISNULL(r.dblOutSourceCost, 0) AS OutsourceCost
    FROM tblRepair r
        JOIN tblDepartment      d   ON r.lDepartmentKey = d.lDepartmentKey
        JOIN tblClient          c   ON d.lClientKey     = c.lClientKey
        LEFT JOIN S4_InvoiceTotals inv ON r.lRepairKey  = inv.lRepairKey
    WHERE CONVERT(date, r.dtDateOut) >= @StartDate
        AND   CONVERT(date, r.dtDateOut) <= @EndDate
        AND   ISDATE(r.dtDateOut) = 1
        AND   r.dtDateOut IS NOT NULL
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   dbo.fn_scopeIsCoveredByContract(r.lScopeKey, r.dtDateIn) <> 0
)
SELECT
    sClientName1,
    COUNT(lRepairKey)                                                            AS WOCount,
    SUM(Revenue)                                                                 AS TotalRevenue,
    SUM(OutsourceCost)                                                           AS TotalOutsourceCost,
    SUM(Revenue) - SUM(OutsourceCost)                                            AS GrossMargin,
    CASE WHEN SUM(Revenue) = 0 THEN NULL
         ELSE (SUM(Revenue) - SUM(OutsourceCost)) / SUM(Revenue) * 100
    END                                                                          AS GrossMarginPct
FROM S4_ContractRepairs
GROUP BY sClientName1
ORDER BY TotalRevenue DESC;
```

- [ ] **Step 3: Run and verify**

```powershell
cd C:\Projects\redesign-matched\docs\reports\sql\operations
.\Run-OpsReview.ps1 -StartDate "2026-03-01" -EndDate "2026-03-31"
```

Expected columns: `sClientName1, WOCount, TotalRevenue, TotalOutsourceCost, GrossMargin, GrossMarginPct`

Sanity check: University Medical Center - TX should appear. Revenue should be non-zero if invoices exist. `dblOutSourceCost` on in-house repairs will be 0 or NULL (expected).

Note in schema-notes.md if revenue is consistently $0.00 — this would indicate invoices use a different join path or contract billing is handled differently (follow up in Plan B to add inventory cost and verify invoice totals).

- [ ] **Step 4: Commit**

```bash
git add docs/reports/sql/operations/monthly-ops-review.sql
git commit -m "feat: add Section 4 - Contract P&L to ops review script"
```

---

## Task 7: Plan A Integration Test

Verify all 4 sections run cleanly together for a monthly and quarterly date range.

**Files:**
- No changes — run existing script

- [ ] **Step 1: Run for March 2026 (monthly)**

```powershell
cd C:\Projects\redesign-matched\docs\reports\sql\operations
.\Run-OpsReview.ps1 -StartDate "2026-03-01" -EndDate "2026-03-31"
```

Expected: 4 result sets, each with data rows (not empty, not errors).

- [ ] **Step 2: Run for Q1 2026 (quarterly)**

```powershell
.\Run-OpsReview.ps1 -StartDate "2026-01-01" -EndDate "2026-03-31"
```

Expected: Same 4 result sets with higher counts (3x monthly volume approx).

- [ ] **Step 3: Run for a prior month to confirm historical data**

```powershell
.\Run-OpsReview.ps1 -StartDate "2025-12-01" -EndDate "2025-12-31"
```

Expected: Data returns (WinScopeNet has historical data). Confirms the script isn't accidentally limited to recent data.

- [ ] **Step 4: Verify no skipped clients appear**

Cross-check: take any client name from Section 1 or 3 output, verify it is NOT in the bSkipTracking list found during Task 1 discovery.

- [ ] **Step 5: Final commit for Plan A**

```bash
git add docs/reports/sql/operations/
git commit -m "feat: Plan A complete — ops review Sections 1-4 + runner verified"
```

---

## What's Next

**Plan B** — Tech Accountability (Sections 6–12):
- Section 6: Tech Repair Scorecard
- Section 7: Tech D&I Finds
- Section 8: Tech Defect %
- Section 9: Tech Inventory Usage
- Section 10: Tech Amendments & Misquotes
- Section 11: Update Slips
- Section 12: Avoidable Damage

**Plan C** — Services, Supply Chain & Templates (Sections 5, 13–16 + Word templates):
- Section 5: Loaner Fulfillment
- Section 13: Van Service
- Section 14: Vendor/Outsourced Repairs
- Section 15: Inventory Ordering
- Section 16: Scope Outcomes
- Word template shells (Monthly + Quarterly)
