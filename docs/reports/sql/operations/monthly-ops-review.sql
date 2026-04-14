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
            WHEN st.sRigidOrFlexible = 'I' THEN 'Instrument'
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
-- ============================================================

SELECT 'Section 4 placeholder' AS Note;

-- ============================================================
-- SECTIONS 5-16: Added in Plans B and C
-- ============================================================

SELECT 'Sections 5-16 coming in Plans B and C' AS Note;
