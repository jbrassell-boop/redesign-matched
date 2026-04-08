CREATE PROCEDURE [dbo].[rptFinalInspectionFlex]
	(
		@plRepairKey int,
		@plSessionID int
	)	
AS
BEGIN
	SET NOCOUNT ON;

	Select h.*, d.sItemDescription, d.sComments, d.sApproved, d.dblRepairPrice, d.sFixType, d.sProductID, d.sUAorNWT, dbo.fn_FormatDate(h.dtDateOut, 'mmmm d, yyyy') As DateOutLong,
		Case When h.sInsScopeIsUsableYN = 'Y' And sInsFinalPF = 'P' Then '** SCOPE HAS BEEN REPAIRED **' Else '' End As RepairStatus
	From tblRptFnlInsHdr h join tblRptFnlInsDtl d on (h.lRepairKey=d.lRepairKey) and (h.lSessionID=d.lSessionID) And (h.sSessionTime=d.sSessionTime)
	Where h.lRepairKey=@plRepairKey And h.lSessionID=@plSessionID
	Order By d.sApproved, d.lDisplayOrder
END
