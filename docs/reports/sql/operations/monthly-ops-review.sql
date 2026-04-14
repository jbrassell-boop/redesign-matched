-- ============================================================
-- TSI MONTHLY OPS REVIEW -- MASTER SCRIPT
-- ============================================================
-- Usage: Set @StartDate and @EndDate, then run via Run-OpsReview.ps1
--   Monthly:   @StartDate = first day of month, @EndDate = last day of month
--   Quarterly: @StartDate = first day of quarter, @EndDate = last day of quarter
--
-- Produces 16 result sets in order (one per section).
-- All sections filter: ISNULL(c.bSkipTracking,0) = 0
-- Placeholder tech "000" (lTechnicianKey=96) excluded from all tech sections.
-- Read-only -- no write operations.
-- Server: 10.0.0.15\Goldmine | DB: WinScopeNet
-- ============================================================

DECLARE @StartDate date = '2026-03-01'
DECLARE @EndDate   date = '2026-03-31'

-- ============================================================
-- SECTION 1: Throughput & TAT
-- WOs completed in period (dtDateOut), counted at highest non-D&I
-- repair level per WO. In-house and outsourced shown separately.
-- WOs that are 100% D&I items are intentionally excluded from counts.
-- WOs with NULL dtAprRecvd are counted in WOCount but excluded from AvgTAT.
-- TAT = fn_DateDiffWeekDays(dtAprRecvd, dtDateOut) business days.
-- Scope is on tblRepair (one scope per WO); tblRepairItemTran has no lScopeKey.
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
        JOIN tblDepartment               d   ON r.lDepartmentKey     = d.lDepartmentKey
        JOIN tblClient                   c   ON d.lClientKey         = c.lClientKey
        JOIN tblScope                    s   ON r.lScopeKey          = s.lScopeKey
        JOIN tblScopeType                st  ON s.lScopeTypeKey      = st.lScopeTypeKey
        LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
        JOIN tblRepairItemTran           rit ON r.lRepairKey         = rit.lRepairKey
        JOIN tblRepairItem               ri  ON rit.lRepairItemKey   = ri.lRepairItemKey
        JOIN tblRepairLevels             rl  ON ri.sMajorRepair      = rl.lRepairLevelKey
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
GROUP BY b.InstrCategory, b.MaxLevelKey, rl.sRepairLevel, rl.lRepairLevelKey
ORDER BY b.InstrCategory, b.MaxLevelKey;

-- ============================================================
-- SECTION 2: 40-Day Returns & Warranty
-- Denominator: ALL WOs received in period (dtDateIn).
-- Warranty = 40-day return with ImproperTechnique, PreviousInspection,
--   or PreviousRepairs failure code = 'X'.
-- Warranty RATE denominator = total WOs that month, NOT just 40-day.
-- Fill rate gap = 40-day returns with zero failure codes checked.
-- Instrument (sRigidOrFlexible='I') excluded — failure code workflow
--   does not apply to handheld instruments.
-- ============================================================

;WITH S2_AllWOs AS (
    SELECT
        r.lRepairKey,
        r.sWorkOrderNumber,
        CASE
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 1 THEN 'Flex-Large'
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 0 THEN 'Flex-Small'
            WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
            WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
            ELSE 'Other'
        END AS InstrCategory
    FROM tblRepair r
        JOIN tblDepartment               d   ON r.lDepartmentKey  = d.lDepartmentKey
        JOIN tblClient                   c   ON d.lClientKey      = c.lClientKey
        JOIN tblScope                    s   ON r.lScopeKey       = s.lScopeKey
        JOIN tblScopeType                st  ON s.lScopeTypeKey   = st.lScopeTypeKey
        LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
    WHERE CONVERT(date, r.dtDateIn) >= @StartDate
        AND   CONVERT(date, r.dtDateIn) <= @EndDate
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   st.sRigidOrFlexible <> 'I'
),
S2_FortyDay AS (
    -- MAX() deduplicates in case fnWithin40Days returns multiple rows per WO.
    -- If the function returns one row per WO (expected), MAX() is a no-op.
    SELECT
        w.sWorkOrderNumber,
        MAX(CASE WHEN ISNULL(w.Failure_ImproperTechnique,  '') = 'X'
                  OR  ISNULL(w.Failure_PreviousInspection, '') = 'X'
                  OR  ISNULL(w.Failure_PreviousRepairs,    '') = 'X'
                 THEN 1 ELSE 0 END) AS IsWarranty,
        MAX(CASE WHEN ISNULL(w.Failure_ImproperCare,      '') = ''
                  AND ISNULL(w.Failure_Part,              '') = ''
                  AND ISNULL(w.Failure_Cosmetic,          '') = ''
                  AND ISNULL(w.Failure_ImproperTechnique, '') = ''
                  AND ISNULL(w.Failure_PreviousInspection,'') = ''
                  AND ISNULL(w.Failure_PreviousRepairs,   '') = ''
                  AND ISNULL(w.Failure_NoPreviousRepairs, '') = ''
                  AND ISNULL(w.Failure_Complaint,         '') = ''
                  AND ISNULL(w.Failure_Other,             '') = ''
                 THEN 1 ELSE 0 END) AS NoCodeFilled
    FROM dbo.fnWithin40Days(@StartDate, @EndDate, 'A', 0) w
    GROUP BY w.sWorkOrderNumber
),
S2_Matched AS (
    SELECT a.InstrCategory, f.IsWarranty, f.NoCodeFilled
    FROM S2_FortyDay f
        JOIN S2_AllWOs a ON f.sWorkOrderNumber = a.sWorkOrderNumber
)
SELECT
    t.InstrCategory,
    t.TotalWOs,
    ISNULL(fd.FortyDayCount, 0)                                               AS FortyDayCount,
    CAST(ISNULL(fd.FortyDayCount, 0) AS decimal(10,4))
        / NULLIF(t.TotalWOs, 0)                                               AS FortyDayRate,
    ISNULL(fd.WarrantyCount, 0)                                               AS WarrantyCount,
    CAST(ISNULL(fd.WarrantyCount, 0) AS decimal(10,4))
        / NULLIF(t.TotalWOs, 0)                                               AS WarrantyRate,
    ISNULL(fd.NoCodeCount, 0)                                                 AS FillRateGap
FROM (
    SELECT InstrCategory, COUNT(lRepairKey) AS TotalWOs
    FROM S2_AllWOs GROUP BY InstrCategory
) t
LEFT JOIN (
    SELECT InstrCategory,
           COUNT(*)          AS FortyDayCount,
           SUM(IsWarranty)   AS WarrantyCount,
           SUM(NoCodeFilled) AS NoCodeCount
    FROM S2_Matched
    GROUP BY InstrCategory
) fd ON t.InstrCategory = fd.InstrCategory
ORDER BY t.InstrCategory;

-- ============================================================
-- SECTION 3: Contract vs FFS Volume
-- WOs completed in period (dtDateOut).
-- Contract = fn_scopeIsCoveredByContract(lScopeKey, dtDateIn) <> 0
-- ============================================================

;WITH S3_Base AS (
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
        CASE WHEN dbo.fn_scopeIsCoveredByContract(r.lScopeKey, r.dtDateIn) <> 0
             THEN 'Contract' ELSE 'FFS' END AS BillingType
    FROM tblRepair r
        JOIN tblDepartment               d   ON r.lDepartmentKey  = d.lDepartmentKey
        JOIN tblClient                   c   ON d.lClientKey      = c.lClientKey
        JOIN tblScope                    s   ON r.lScopeKey       = s.lScopeKey
        JOIN tblScopeType                st  ON s.lScopeTypeKey   = st.lScopeTypeKey
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

-- ============================================================
-- SECTION 4: Contract P&L
-- Revenue: contract invoices posted in period (dtTranDate).
--   Contract invoices have lRepairKey=NULL and join via lContractKey.
--   Filter: bFinalized=1, ISNULL(lRepairKey,0)=0.
--   Source: tblInvoice -> tblContract -> tblClient.
-- Cost: outsource cost for contract repairs completed in period (dtDateOut).
-- NOTE: Revenue and cost are on different date bases by design —
--   revenue = when billed, cost = when repair shipped. This matches
--   how Joe's monthly revenue report works.
-- NOTE: Inventory cost will be added in Plan B once lot tables confirmed.
-- ============================================================

;WITH S4_ContractRevenue AS (
    -- Contract billing invoices: lRepairKey is NULL on contract rows;
    -- they link to tblContract via lContractKey.
    SELECT
        con.lClientKey,
        SUM(ISNULL(i.dblTranAmount, 0)) AS TotalRevenue
    FROM tblInvoice i
        JOIN tblContract con ON i.lContractKey = con.lContractKey
    WHERE i.bFinalized = 1
        AND   ISNULL(i.lRepairKey, 0) = 0
        AND   CONVERT(date, i.dtTranDate) >= @StartDate
        AND   CONVERT(date, i.dtTranDate) <= @EndDate
    GROUP BY con.lClientKey
),
S4_ContractCost AS (
    -- Outsource cost for contract repairs shipped in period.
    SELECT
        c.lClientKey,
        COUNT(r.lRepairKey)                AS WOCount,
        SUM(ISNULL(r.dblOutSourceCost, 0)) AS TotalOutsourceCost
    FROM tblRepair r
        JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
        JOIN tblClient     c ON d.lClientKey     = c.lClientKey
    WHERE CONVERT(date, r.dtDateOut) >= @StartDate
        AND   CONVERT(date, r.dtDateOut) <= @EndDate
        AND   ISDATE(r.dtDateOut) = 1
        AND   r.dtDateOut IS NOT NULL
        AND   ISNULL(c.bSkipTracking, 0) = 0
        AND   dbo.fn_scopeIsCoveredByContract(r.lScopeKey, r.dtDateIn) <> 0
    GROUP BY c.lClientKey
)
SELECT
    cl.sClientName1,
    ISNULL(cost.WOCount,           0)                                        AS WOCount,
    ISNULL(rev.TotalRevenue,       0)                                        AS TotalRevenue,
    ISNULL(cost.TotalOutsourceCost,0)                                        AS TotalOutsourceCost,
    ISNULL(rev.TotalRevenue, 0) - ISNULL(cost.TotalOutsourceCost, 0)        AS GrossMargin,
    CASE WHEN ISNULL(rev.TotalRevenue, 0) = 0 THEN NULL
         ELSE ROUND(
             (ISNULL(rev.TotalRevenue,0) - ISNULL(cost.TotalOutsourceCost,0))
             / rev.TotalRevenue * 100, 2)
    END                                                                      AS GrossMarginPct
FROM tblClient cl
    LEFT JOIN S4_ContractRevenue  rev  ON cl.lClientKey = rev.lClientKey
    LEFT JOIN S4_ContractCost     cost ON cl.lClientKey = cost.lClientKey
WHERE ISNULL(cl.bSkipTracking, 0) = 0
    AND (rev.lClientKey IS NOT NULL OR cost.lClientKey IS NOT NULL)
ORDER BY TotalRevenue DESC;

-- ============================================================
-- SECTION 5: Loaner Fulfillment Rate
-- Source: tblTasks (lTaskTypeKey 1=Loaner Request, 6=Loaner Wait List)
--   joined to tblTaskLoaners (scope type) and vwTaskStatuses (outcome).
-- Fulfilled = status 'Request Fulfilled' OR 'Customer Scope Sent'.
-- Unfulfilled = 'Unable to Fulfill' OR 'Request Declined'.
-- Closed Duplicate tasks are excluded (not real requests).
-- tblTasks.dtTaskDate is the request date — filtered by period.
-- bSkipTracking applied via tblTasks.lDepartmentKey → tblDepartment → tblClient.
-- ============================================================

;WITH S5_Base AS (
    SELECT
        t.lTaskKey,
        CASE
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 1 THEN 'Flex-Large'
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 0 THEN 'Flex-Small'
            WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
            WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
            WHEN st.sRigidOrFlexible = 'I' THEN 'Instrument'
            ELSE 'Other'
        END AS InstrCategory,
        CASE WHEN vts.TaskStatus IN ('Request Fulfilled', 'Customer Scope Sent')
             THEN 1 ELSE 0 END                                                 AS IsFulfilled,
        CASE WHEN vts.TaskStatus IN ('Unable to Fulfill', 'Request Declined')
             THEN 1 ELSE 0 END                                                 AS IsUnfulfilled
    FROM tblTasks                        t
        JOIN tblTaskLoaners              tl  ON t.lTaskKey          = tl.lTaskKey
        JOIN tblScopeType                st  ON tl.lScopeTypeKey    = st.lScopeTypeKey
        LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
        JOIN vwTaskStatuses              vts ON t.lTaskKey          = vts.lTaskKey
        JOIN tblDepartment               d   ON t.lDepartmentKey    = d.lDepartmentKey
        JOIN tblClient                   c   ON d.lClientKey        = c.lClientKey
    WHERE t.dtTaskDate >= @StartDate
        AND   t.dtTaskDate <= @EndDate
        AND   t.lTaskTypeKey IN (1, 6)
        AND   vts.TaskStatus <> 'Closed Duplicate'
        AND   ISNULL(c.bSkipTracking, 0) = 0
)
SELECT
    COALESCE(InstrCategory, 'TOTAL')                                          AS InstrCategory,
    COUNT(lTaskKey)                                                            AS LoanerRequested,
    SUM(IsFulfilled)                                                           AS LoanerFulfilled,
    SUM(IsUnfulfilled)                                                         AS LoanerUnfulfilled,
    CAST(SUM(IsFulfilled) AS decimal(10,4))
        / NULLIF(COUNT(lTaskKey), 0)                                           AS FulfillmentRate
FROM S5_Base
GROUP BY GROUPING SETS ((InstrCategory), ())
ORDER BY GROUPING(InstrCategory), LoanerUnfulfilled DESC;

-- Section 5B: Loaner model detail — unfulfilled by specific scope type model
SELECT
    st.sScopeTypeDesc                                                          AS ScopeModel,
    CASE
        WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 1 THEN 'Flex-Large'
        WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 0 THEN 'Flex-Small'
        WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
        WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
        WHEN st.sRigidOrFlexible = 'I' THEN 'Instrument'
        ELSE 'Other'
    END                                                                        AS InstrCategory,
    COUNT(t.lTaskKey)                                                          AS LoanerRequested,
    SUM(CASE WHEN vts.TaskStatus IN ('Request Fulfilled', 'Customer Scope Sent')
             THEN 1 ELSE 0 END)                                                AS LoanerFulfilled,
    SUM(CASE WHEN vts.TaskStatus IN ('Unable to Fulfill', 'Request Declined')
             THEN 1 ELSE 0 END)                                                AS LoanerUnfulfilled
FROM tblTasks                        t
    JOIN tblTaskLoaners              tl  ON t.lTaskKey          = tl.lTaskKey
    JOIN tblScopeType                st  ON tl.lScopeTypeKey    = st.lScopeTypeKey
    LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
    JOIN vwTaskStatuses              vts ON t.lTaskKey          = vts.lTaskKey
    JOIN tblDepartment               d   ON t.lDepartmentKey    = d.lDepartmentKey
    JOIN tblClient                   c   ON d.lClientKey        = c.lClientKey
WHERE t.dtTaskDate >= @StartDate
    AND   t.dtTaskDate <= @EndDate
    AND   t.lTaskTypeKey IN (1, 6)
    AND   vts.TaskStatus <> 'Closed Duplicate'
    AND   ISNULL(c.bSkipTracking, 0) = 0
GROUP BY st.sScopeTypeDesc, st.sRigidOrFlexible, sc.bLargeDiameter
ORDER BY LoanerUnfulfilled DESC, LoanerRequested DESC;

-- ============================================================
-- SECTION 6: Tech Repair Scorecard
-- In-house WOs completed in period (dtDateOut), per tech.
-- Counted at highest non-D&I repair level per WO per tech.
-- D&I items (29, 246, 636) excluded. Placeholder tech 96 excluded.
-- In-house only: ISNULL(r.lVendorKey,0)=0.
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

-- ============================================================
-- SECTION 7: Tech D&I Finds
-- WOs received in period (dtDateIn) where tech performed a D&I item.
-- AvgFindsPerWO = avg non-D&I repair items on those same WOs (thoroughness).
-- ============================================================

;WITH S7_DIWOs AS (
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

-- ============================================================
-- SECTION 8: Tech Defect %
-- In-house WOs completed in period (dtDateOut).
-- Defects attributed via tblRepair.lTechnicianKey_DefectTracking.
-- Denominator: WOs where tech is tblRepair.lTechnicianKey (primary tech).
-- ============================================================

;WITH S8_WOsWorked AS (
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
    SELECT
        t.sTechName,
        t.lTechnicianKey,
        COUNT(r.lRepairKey) AS DefectCount
    FROM tblRepair r
        JOIN tblDepartment  d ON r.lDepartmentKey                = d.lDepartmentKey
        JOIN tblClient      c ON d.lClientKey                    = c.lClientKey
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

-- ============================================================
-- SECTION 9: Tech Inventory Usage
-- In-house WOs completed in period (dtDateOut).
-- Cost via vwRepairInventoryCosts joined to tech via tblRepairItemTran.
-- ============================================================

SELECT
    t.sTechName,
    vic.sItemDescription                                                       AS PartCategory,
    CAST(SUM(vic.InventorySizeRepairAmount) AS decimal(10,2))                  AS PartCost
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
ORDER BY t.sTechName, SUM(vic.InventorySizeRepairAmount) DESC;

-- ============================================================
-- SECTIONS 10-16: Added in Plans B and C
-- ============================================================

SELECT 'Sections 10-16 coming in Plans B and C' AS Note;
