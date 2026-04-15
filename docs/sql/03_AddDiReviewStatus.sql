-- docs/sql/03_AddDiReviewStatus.sql
-- Adds 'Pending D&I Review' status if it does not already exist
IF NOT EXISTS (
    SELECT 1 FROM dbo.tblRepairStatuses WHERE sRepairStatus = 'Pending D&I Review'
)
BEGIN
    INSERT INTO dbo.tblRepairStatuses (sRepairStatus, lRepairStatusSortOrder)
    VALUES ('Pending D&I Review', 999);
END
GO
