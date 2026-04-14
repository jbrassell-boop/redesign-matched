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
-- ============================================================

SELECT 'Section 2 placeholder' AS Note;

-- ============================================================
-- SECTION 3: Contract vs FFS Volume
-- ============================================================

SELECT 'Section 3 placeholder' AS Note;

-- ============================================================
-- SECTION 4: Contract P&L
-- ============================================================

SELECT 'Section 4 placeholder' AS Note;

-- ============================================================
-- SECTIONS 5-16: Added in Plans B and C
-- ============================================================

SELECT 'Sections 5-16 coming in Plans B and C' AS Note;
