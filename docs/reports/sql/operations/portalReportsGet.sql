CREATE PROCEDURE [dbo].[portalReportsGet]
	(
		@plPortalUserRoleKey int,
		@pbIncludeHidden bit = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

    Select * 
	From dbo.tblPortalReports r 
	Where r.lPortalUserRoleKey = @plPortalUserRoleKey 
		And (@pbIncludeHidden = 1 Or r.bVisible = 1)
	Order By r.sReportName
END
