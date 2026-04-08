CREATE PROCEDURE [dbo].[rptPOReceipts]
	(
		@pdtStartDate datetime = Null,
		@pdtEndDate datetime = Null,
		@psLotNumber nvarchar(50) = Null
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptPOReceipts @pdtStartDate='2/1/2015', @pdtEndDate='2/28/2015'

	Select s.sSupplierName1, RIGHT('000'+ CONVERT(VARCHAR,Cast(PO.lSupplierKey as varchar(3))),3) As SupplierCode, SS.sSupplierPartNo, 
		IV.sItemDescription, NS.sSizeDescription, dbo.fn_FormatDate(IT.dtCreateDate,'mm/dd/yyyy') As DateReceived, IT.sLotNumber, IT.sBinNumber, 
		dbo.fn_FormatDate(IT.dtExpDate,'mm/dd/yyyy') As ExpirationDate, IT.sStorageLocation, u.sUserName
	from tblInventoryTran IT join tblSupplierPOTran PT on (IT.lSupplierPOTranKey=PT.lSupplierPOTranKey)
			join tblSupplierPO PO ON (PT.lSupplierPOKey=PO.lSupplierPOKey)
			join tblSupplier S on (PO.lSupplierKey=S.lSupplierKey)
			left join tblSupplierSizes SS ON (PT.lSupplierSizesKey=SS.lSupplierSizesKey)
			left join tblInventorySize NS ON (SS.lInventorySizeKey=NS.lInventorySizeKey)
			left join tblInventory IV ON (NS.lInventoryKey=IV.lInventoryKey)
			left join tblUsers u on (IT.lUserKey=u.lUserKey)
	Where	(sLotNumber Not Like '99%')
		And (
				((IsNull(@psLotNumber,'')='') Or (IT.sLotNumber=@psLotNumber))
			And ((@pdtStartDate Is Null) Or (IT.dtTranDate >= @pdtStartDate))
			And ((@pdtEndDate Is Null) Or (IT.dtTranDate < DateAdd(day,1,@pdtEndDate)))
			)
	--Order By Convert(Date,IT.dtTranDate), Cast(IT.sLotNumber as int)
	Order By Convert(Date,IT.dtTranDate), Case When ISNUMERIC(IT.sLotNumber)=1 Then Convert(int,IT.sLotNumber) else 9999999999 End, IT.sLotNumber
END




