CREATE PROCEDURE [dbo].[portalReportColumnsGet]
	(
		@plPortalReportKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

    Select * 
	From dbo.tblPortalReportColumns c 
	Where c.lPortalReportKey = @plPortalReportKey
	Order By c.lColumnNumber 
END
