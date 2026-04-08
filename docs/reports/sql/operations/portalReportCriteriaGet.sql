CREATE PROCEDURE [dbo].[portalReportCriteriaGet]
	(
		@plPortalReportKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

    Select * 
	From dbo.tblPortalReportCriteria c
	Where c.lPortalReportKey = @plPortalReportKey
	Order By c.DisplayOrder, c.CriteriaColumn
END
