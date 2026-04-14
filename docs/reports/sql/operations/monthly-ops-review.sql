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
-- SECTION 10A: Tech Amendments
-- Amendments created in period (dtAmendmentDate).
-- Cost = sum of dblRepairPrice on tblRepairItemTran rows linked
--   to the amendment via lAmendRepairCommentKey.
-- Missed D&I = reason 11; Repeat damage = reason 14.
-- ============================================================

;WITH S10_AmendLines AS (
    SELECT
        t.sTechName,
        arc.lAmendRepairCommentKey,
        arc.lAmendRepairReasonKey,
        CAST(ISNULL(arc.bApprovalDateReset, 0) AS int)                        AS bApprovalDateReset,
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
    GROUP BY t.sTechName, arc.lAmendRepairCommentKey,
             arc.lAmendRepairReasonKey, arc.bApprovalDateReset
)
SELECT
    sTechName,
    COUNT(CASE WHEN lAmendRepairReasonKey = 11 THEN 1 END)                    AS MissedDICount,
    CAST(SUM(CASE WHEN lAmendRepairReasonKey = 11
                  THEN AmendCost ELSE 0 END) AS decimal(10,2))                 AS MissedDICost,
    COUNT(CASE WHEN lAmendRepairReasonKey = 14 THEN 1 END)                    AS RepeatDamageCount,
    CAST(SUM(CASE WHEN lAmendRepairReasonKey = 14
                  THEN AmendCost ELSE 0 END) AS decimal(10,2))                 AS RepeatDamageCost,
    SUM(bApprovalDateReset)                                                    AS TATResetCount,
    CAST(SUM(AmendCost) AS decimal(10,2))                                      AS TotalAmendCost
FROM S10_AmendLines
GROUP BY sTechName
ORDER BY TotalAmendCost DESC;

-- ============================================================
-- SECTION 10B: Ops Misquotes
-- Amendments with reason 15 (Misquote by operations) in period.
-- Ops user identified via arc.lUserKey → tblTechnicians.lUserKey.
-- ============================================================

;WITH S10B_Lines AS (
    SELECT
        ISNULL(t.sTechName,
               'User ' + CAST(arc.lUserKey AS nvarchar(10)))                   AS OpsUser,
        arc.lAmendRepairCommentKey,
        SUM(ISNULL(rit.dblRepairPrice, 0))                                     AS MisquoteCost
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
    GROUP BY ISNULL(t.sTechName,
                    'User ' + CAST(arc.lUserKey AS nvarchar(10))),
             arc.lAmendRepairCommentKey
)
SELECT
    OpsUser,
    COUNT(lAmendRepairCommentKey)                                              AS MisquoteCount,
    CAST(SUM(MisquoteCost) AS decimal(10,2))                                   AS TotalMisquoteCost
FROM S10B_Lines
GROUP BY OpsUser
ORDER BY MisquoteCount DESC;

-- ============================================================
-- SECTION 11: Update Slips
-- Update slips created in period (dtUpdateRequestDate).
-- By responsible tech and top-level reason category.
-- ============================================================

SELECT
    t.sTechName,
    r.sMainRepairUpdateSlipReason                                              AS SlipReason,
    COUNT(rus.lRepairUpdateSlipKey)                                            AS SlipCount
FROM tblRepairUpdateSlips               rus
    JOIN tblRepair                      rep ON rus.lRepairKey                     = rep.lRepairKey
    JOIN tblDepartment                  d   ON rep.lDepartmentKey                 = d.lDepartmentKey
    JOIN tblClient                      c   ON d.lClientKey                       = c.lClientKey
    JOIN tblTechnicians                 t   ON rus.lResponsibleTech               = t.lTechnicianKey
    JOIN tblMainRepairUpdateSlipReasons r   ON rus.lMainRepairUpdateSlipReasonKey = r.lMainRepairUpdateSlipReasonKey
WHERE CONVERT(date, rus.dtUpdateRequestDate) >= @StartDate
    AND   CONVERT(date, rus.dtUpdateRequestDate) <= @EndDate
    AND   ISNULL(c.bSkipTracking, 0) = 0
    AND   t.bIsActive = 1
    AND   t.lJobTypeKey = 2
    AND   t.lTechnicianKey <> 96
GROUP BY t.sTechName, r.sMainRepairUpdateSlipReason
ORDER BY t.sTechName, COUNT(rus.lRepairUpdateSlipKey) DESC;

-- ============================================================
-- SECTION 12: Avoidable Damage
-- In-house WOs completed in period (dtDateOut) with lRepairReasonKey filled.
-- NOTE: ~54% coverage — lRepairReasonKey is not set on all WOs.
-- Category 2 = Avoidable; Category 1 = Normal Wear & Tear.
-- Top 10 reasons per category by WO count.
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
        END                                                                    AS InstrCategory,
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
    GROUP BY rrc.sRepairReasonCategory, rr.lRepairReasonCategoryKey,
             rr.sRepairReason, st.sRigidOrFlexible, sc.bLargeDiameter
),
S12_Ranked AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY DamageCategory
            ORDER BY WOCount DESC
        ) AS RankWithinCategory
    FROM S12_Base
)
SELECT
    DamageCategory,
    DamageReason,
    InstrCategory,
    WOCount
FROM S12_Ranked
WHERE RankWithinCategory <= 10
ORDER BY DamageCategory DESC, WOCount DESC, InstrCategory;

-- ============================================================
-- SECTION 13: Van Service
-- ============================================================
-- Counts instruments from tblSiteServiceTrays; lTotalInstruments/lRepairCount
-- on tblSiteServices are not populated in the current data entry workflow.
-- Revenue = nInvoiceAmount; Cost = nTotalCostPreCap (pre-cap field reflects
-- billable amount before any cap applied).
;WITH S13_Trays AS (
    SELECT
        sst.lSiteServiceKey,
        SUM(sst.lInstrumentsCount)            AS TrayInstruments,
        SUM(sst.lRepairedCount)               AS TrayRepaired,
        SUM(sst.lSentToTSICount)              AS TraySentToTSI,
        SUM(sst.lBeyondEconomicalRepairCount) AS TrayBER
    FROM tblSiteServiceTrays sst
    GROUP BY sst.lSiteServiceKey
)
SELECT
    COUNT(ss.lSiteServiceKey)                                           AS Visits,
    COUNT(DISTINCT ss.lClientKey)                                       AS UniqueClients,
    SUM(ss.lTrayCount)                                                  AS Trays,
    SUM(ISNULL(st.TrayInstruments, 0))                                  AS Instruments,
    SUM(ISNULL(st.TrayRepaired, 0))                                     AS Repaired,
    SUM(ISNULL(st.TraySentToTSI, 0))                                    AS SentToTSI,
    SUM(ISNULL(st.TrayBER, 0))                                          AS BER,
    SUM(CAST(ss.nInvoiceAmount   AS decimal(12,2)))                     AS Revenue,
    SUM(CAST(ss.nTotalCostPreCap AS decimal(12,2)))                     AS CostPreCap,
    SUM(CAST(ss.nInvoiceAmount   AS decimal(12,2)))
        - SUM(CAST(ss.nTotalCostPreCap AS decimal(12,2)))               AS Margin
FROM tblSiteServices ss
LEFT JOIN S13_Trays st ON ss.lSiteServiceKey = st.lSiteServiceKey
WHERE ss.dtOnsiteDate >= @StartDate
  AND ss.dtOnsiteDate <= @EndDate
  AND ss.dtDateSubmitted IS NOT NULL;

-- ============================================================
-- SECTION 14: Outsourced Repairs by Vendor
-- ============================================================
-- IsInternal=1 flags suppliers whose name contains 'Total Scope' — these are
-- intercompany part flows (TSS, TSF, TSI) recorded with placeholder $0 cost;
-- their margin figures are not meaningful as third-party outsource metrics.
-- Revenue = finalized invoice amount tied to the repair WO.
;WITH S14_Base AS (
    SELECT
        s.sSupplierName1,
        CASE WHEN s.sSupplierName1 LIKE '%Total Scope%' THEN 1 ELSE 0 END AS IsInternal,
        r.lRepairKey,
        ISNULL(r.dblOutSourceCost, 0)   AS OutsourceCost,
        ISNULL(i.dblTranAmount, 0)       AS Revenue
    FROM tblRepair r
    JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
    JOIN tblClient c     ON d.lClientKey = c.lClientKey
    JOIN tblSupplier s   ON r.lVendorKey = s.lSupplierKey
    LEFT JOIN tblInvoice i ON r.lRepairKey = i.lRepairKey AND i.bFinalized = 1
    WHERE ISNULL(r.lVendorKey, 0) > 0
      AND ISDATE(r.dtDateOut) = 1
      AND r.dtDateOut IS NOT NULL
      AND CONVERT(date, r.dtDateOut) >= @StartDate
      AND CONVERT(date, r.dtDateOut) <= @EndDate
      AND ISNULL(c.bSkipTracking, 0) = 0
)
SELECT
    sSupplierName1                          AS Vendor,
    IsInternal,
    COUNT(lRepairKey)                       AS WOCount,
    SUM(OutsourceCost)                      AS OutsourceCost,
    SUM(Revenue)                            AS Revenue,
    SUM(Revenue) - SUM(OutsourceCost)       AS Margin
FROM S14_Base
GROUP BY sSupplierName1, IsInternal
ORDER BY IsInternal, WOCount DESC;

-- ============================================================
-- SECTION 15: Inventory Ordering
-- ============================================================
-- dblItemCost on tblSupplierPOTran is the line total (not unit price);
-- dblUnitCost on tblSupplierSizes is the unit price.
-- Top 30 parts ordered in period by total spend.
;WITH S15_Lines AS (
    SELECT
        inv.sItemDescription,
        sz.sSizeDescription,
        s.sSupplierName1,
        pot.nOrderQuantity,
        pot.nReceivedQuantity,
        pot.dblItemCost                 AS LineCost
    FROM tblSupplierPO po
    JOIN tblSupplier s          ON po.lSupplierKey      = s.lSupplierKey
    JOIN tblSupplierPOTran pot  ON po.lSupplierPOKey    = pot.lSupplierPOKey
    JOIN tblSupplierSizes ss    ON pot.lSupplierSizesKey = ss.lSupplierSizesKey
    JOIN tblInventorySize sz    ON ss.lInventorySizeKey  = sz.lInventorySizeKey
    JOIN tblInventory inv       ON sz.lInventoryKey      = inv.lInventoryKey
    WHERE po.dtDateOfPO >= @StartDate
      AND po.dtDateOfPO < DATEADD(day, 1, CAST(@EndDate AS datetime))
      AND po.bCancelled = 0
)
SELECT TOP 30
    sItemDescription,
    sSizeDescription,
    SUM(nOrderQuantity)     AS TotalOrdered,
    SUM(nReceivedQuantity)  AS TotalReceived,
    SUM(LineCost)           AS TotalCost,
    COUNT(*)                AS POLineCount
FROM S15_Lines
GROUP BY sItemDescription, sSizeDescription
ORDER BY TotalCost DESC;

-- ============================================================
-- SECTION 16A: Not Repairable Rate by Instrument Category
-- ============================================================
-- NR repair item keys: 63, 197, 379, 508, 657, 259
-- (sItemDescription LIKE '%Not Rep%')
-- In-house repairs only (lVendorKey IS NULL / 0).
;WITH S16A_Base AS (
    SELECT
        CASE
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 1 THEN 'Flex-Large'
            WHEN st.sRigidOrFlexible = 'F' AND ISNULL(sc.bLargeDiameter,0) = 0 THEN 'Flex-Small'
            WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
            WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
            WHEN st.sRigidOrFlexible = 'I' THEN 'Instrument'
            ELSE 'Other'
        END AS InstrCategory,
        r.lRepairKey,
        MAX(CASE WHEN rit.lRepairItemKey IN (63,197,379,508,657,259) THEN 1 ELSE 0 END) AS IsNR
    FROM tblRepair r
    JOIN tblRepairItemTran rit ON r.lRepairKey = rit.lRepairKey
    JOIN tblScope s            ON r.lScopeKey  = s.lScopeKey
    JOIN tblScopeType st       ON s.lScopeTypeKey = st.lScopeTypeKey
    LEFT JOIN dbo.tblScopeTypeCategories sc ON st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey
    JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
    JOIN tblClient c     ON d.lClientKey = c.lClientKey
    WHERE ISDATE(r.dtDateOut) = 1
      AND r.dtDateOut IS NOT NULL
      AND CONVERT(date, r.dtDateOut) >= @StartDate
      AND CONVERT(date, r.dtDateOut) <= @EndDate
      AND ISNULL(r.lVendorKey, 0) = 0
      AND ISNULL(c.bSkipTracking, 0) = 0
    GROUP BY
        st.sRigidOrFlexible, sc.bLargeDiameter,
        r.lRepairKey
)
SELECT
    COALESCE(InstrCategory, 'TOTAL')                            AS InstrCategory,
    COUNT(lRepairKey)                                           AS TotalWOs,
    SUM(IsNR)                                                   AS NRCount,
    CAST(SUM(IsNR) AS decimal(10,4))
        / NULLIF(COUNT(lRepairKey), 0)                          AS NRRate
FROM S16A_Base
GROUP BY GROUPING SETS ((InstrCategory), ())
ORDER BY GROUPING(InstrCategory), NRRate DESC;

-- ============================================================
-- SECTION 16B: D&I Work Order Breakdown
-- ============================================================
-- D&I item keys: 29, 246, 636
-- DIOnly  = WO has D&I item(s) but NO repair items → inspection only, no repair approved
-- DIPlus  = WO has D&I item(s) AND repair item(s)
-- Approved = dtAprRecvd IS NOT NULL (customer approved repair estimate)
;WITH S16B_Base AS (
    SELECT
        r.lRepairKey,
        MAX(CASE WHEN rit.lRepairItemKey IN (29,246,636) THEN 1 ELSE 0 END)         AS HasDI,
        MAX(CASE WHEN rit.lRepairItemKey NOT IN (29,246,636) THEN 1 ELSE 0 END)     AS HasNonDI,
        MAX(CASE WHEN r.dtAprRecvd IS NOT NULL THEN 1 ELSE 0 END)                   AS WasApproved
    FROM tblRepair r
    JOIN tblRepairItemTran rit ON r.lRepairKey = rit.lRepairKey
    JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
    JOIN tblClient c     ON d.lClientKey = c.lClientKey
    WHERE CONVERT(date, r.dtDateIn) >= @StartDate
      AND CONVERT(date, r.dtDateIn) <= @EndDate
      AND ISNULL(c.bSkipTracking, 0) = 0
    GROUP BY r.lRepairKey
)
SELECT
    SUM(HasDI)                                                          AS TotalDIWOs,
    SUM(CASE WHEN HasDI=1 AND HasNonDI=0 THEN 1 ELSE 0 END)           AS DIOnly,
    SUM(CASE WHEN HasDI=1 AND HasNonDI=1 THEN 1 ELSE 0 END)           AS DIWithRepair,
    SUM(CASE WHEN HasDI=1 AND WasApproved=1 THEN 1 ELSE 0 END)        AS DIApproved,
    CAST(SUM(CASE WHEN HasDI=1 AND HasNonDI=1 THEN 1 ELSE 0 END) AS decimal(10,4))
        / NULLIF(SUM(HasDI), 0)                                         AS ConversionRate,
    CAST(SUM(CASE WHEN HasDI=1 AND WasApproved=1 THEN 1 ELSE 0 END) AS decimal(10,4))
        / NULLIF(SUM(HasDI), 0)                                         AS ApprovalRate
FROM S16B_Base
WHERE HasDI = 1;
