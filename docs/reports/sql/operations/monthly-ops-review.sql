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
-- ============================================================

SELECT 'Section 1 placeholder' AS Note;

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
