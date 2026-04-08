CREATE PROCEDURE [dbo].[rptExpiringInventory]
	(
		@pdtStartDate datetime,
		@pdtEndDate datetime 
	)
AS
BEGIN
	SET NOCOUNT ON;

	Select inv.sItemDescription, ivs.sSizeDescription, dbo.fn_FormatDate(ivt.dtExpDate,'MM/dd/yyyy') As dtExpDate, ivt.sLotNumber, ivt.nTranQuantity, 
		dbo.fn_FormatDate(ivt.dtTranDate,'MM/dd/yyyy') As dtTranDate
	From tblInventoryTran ivt join tblInventorySize ivs on (ivt.lInventorySizeKey=ivs.lInventorySizeKey) 
		join tblInventory inv on (ivs.lInventoryKey=inv.lInventoryKey)
	where dtExpDate is not null And dtExpDate >= @pdtStartDate And dtExpDate < DateAdd(day,1,@pdtEndDate)
	Order By dtExpDate, inv.sItemDescription, ivs.sSizeDescription
END
