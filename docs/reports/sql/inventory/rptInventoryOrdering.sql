CREATE PROCEDURE [dbo].[rptInventoryOrdering]
	(
		@pdtStartDate datetime,
		@pdtEndDate datetime
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptInventoryOrdering @pdtStartDate='10/25/2015', @pdtEndDate='10/27/2015'

	Set @pdtStartDate = Convert(Date,@pdtStartDate)
	Set @pdtEndDate = Convert(Date,DateAdd(day,1,@pdtEndDate))

	Select pot.lSupplierPOTranKey, s.sSupplierName1, dbo.fn_FormatDate(po.dtDateOfPO,'MM/dd/yyyy') As dtDateOfPO, ss.sSupplierPartNo, ivs.sSizeDescription, ivt.sLotNumber, 
		i.sItemDescription, ivs.sSizeDescription,
		pot.nOrderQuantity, pot.dblUnitCost, ivt.nTranQuantity As nReceivedQuantity, --pot.dblItemCost, 
		Round(ISNULL(ivt.nTranQuantity,0) * pot.dblUnitCost,2) As dblItemCost,
		dbo.fn_FormatDate(ivt.dtCreateDate,'mm/dd/yyyy') As DateReceived
	From tblSupplierPO po join tblSupplierPOTran pot on (po.lSupplierPOKey=pot.lSupplierPOKey)
		join tblSupplier s on (po.lSupplierKey=s.lSupplierKey)
		join tblSupplierSizes ss on (pot.lSupplierSizesKey=ss.lSupplierSizesKey)
		join tblInventorySize ivs on (ss.lInventorySizeKey=ivs.lInventorySizeKey)
		join dbo.tblInventory i on (ivs.lInventoryKey = i.lInventoryKey)
		left join tblInventoryTran ivt on (pot.lSupplierPOTranKey=ivt.lSupplierPOTranKey)
	Where po.dtDateOfPO>=@pdtStartDate And po.dtDateOfPO<@pdtEndDate And IsNull(po.bCancelled,0)<>1
	Order By s.sSupplierName1, po.dtDateOfPO, pot.lSupplierPOTranKey
END
