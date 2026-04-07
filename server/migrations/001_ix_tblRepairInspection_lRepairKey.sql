-- Migration 001: Add missing FK index on tblRepairInspection.lRepairKey
--
-- Without this index the GET /api/quality/inspections query does a full
-- table scan of ~34K rows on every page request (join drive side has no
-- seek path). Adding this index lets SQL Server seek directly to the
-- inspection rows that belong to each repair, dropping query time from
-- ~3 s to < 100 ms at 34K rows.
--
-- Safe to run on a live database: CREATE INDEX ... WITH (ONLINE = ON)
-- does not block reads or writes on SQL Server Enterprise / Developer.
-- For Standard/Express edition remove the ONLINE = ON option and run
-- during a low-traffic window.
--
-- Run once against WinScopeNet (North and South databases separately
-- if they are distinct instances).

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.tblRepairInspection')
      AND name      = 'IX_tblRepairInspection_lRepairKey'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_tblRepairInspection_lRepairKey
        ON dbo.tblRepairInspection (lRepairKey)
        WITH (ONLINE = ON);
END
