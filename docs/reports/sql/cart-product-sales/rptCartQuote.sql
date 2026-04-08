CREATE PROCEDURE [dbo].[rptCartQuote]
	(
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@plRepairKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	--dbo.rptCartQuote @plSessionID=1, @psSessionTime='ABCD', @plRepairKey=10011869
	
	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()
	
	Delete From dbo.tblRptCartQuote Where lSessionID = @plSessionID
	Delete From dbo.tblRptCarTQuoteDetail Where lSessionID = @plSessionID

	Declare @lBarCodeKey int
	Set @lBarCodeKey = 21
	
	Declare @lDepartmentKey int
	Select @lDepartmentKey = lDepartmentKey from dbo.tblRepair Where lRepairKey = @plRepairKey
	
	Declare @nQuoteAmount decimal(10,2)
	Select @nQuoteAmount = SUM(rit.dblRepairPrice) From dbo.tblRepairItemTran rit Where rit.lRepairKey = @plRepairKey
	Set @nQuoteAmount = ISNULL(@nQuoteAmount,0)
	
	Declare @sContactName nvarchar(100)
	Declare @sContactPhone nvarchar(50)
	Declare @sContactEmail nvarchar(100)
	
	Select	@sContactName = LTrim(RTrim(ISNULL(c.sContactFirst,'') + ' ' + ISNULL(c.sContactLast,''))), 
			@sContactPhone = c.sContactPhoneVoice,
			@sContactEmail = c.sContactEmail
	From dbo.tblContactTran ct join dbo.tblContacts c on (ct.lContactKey=c.lContactKey) 
	Where ct.lDepartmentKey=@lDepartmentKey And c.bActive=1 and c.bCartQuote = 1

	Set @sContactPhone = dbo.fn_FormatPhone(ISNULL(@sContactPhone,''))

	Declare @sWorkOrderNumber nvarchar(50)
	Declare @lSalesRepKey int
	Select @sWorkOrderNumber = r.sWorkOrderNumber, @lSalesRepKey = r.lSalesRepKey From dbo.tblRepair r Where r.lRepairKey = @plRepairKey
	
	Insert Into dbo.tblRptCartQuote ( lSessionID, sSessionTime, lRepairKey, sWorkOrderNumber, custAddressLine1, custAddressLine2, custAddressLine3, custAddressLine4, custAddressLine5,
		sContactName, sClientPhoneNumber, sContactEmailAddress, sRepName, dtQuoteDate, dtExpireDate, nSalesTax, nShippingAmount, nQuoteAmount, nTotalAmount, sBarCode )
	Select @plSessionID, @psSessionTime, r.lRepairKey, r.sWorkOrderNumber, 
		dbo.fnAddressLine(1,r.sShipName1, r.sShipName2, r.sShipAddr1, r.sShipAddr2, r.sShipCity, r.sShipState, r.sShipZip, r.sShipCountry) As Addr1,
		dbo.fnAddressLine(2,r.sShipName1, r.sShipName2, r.sShipAddr1, r.sShipAddr2, r.sShipCity, r.sShipState, r.sShipZip, r.sShipCountry) As Addr2,
		dbo.fnAddressLine(3,r.sShipName1, r.sShipName2, r.sShipAddr1, r.sShipAddr2, r.sShipCity, r.sShipState, r.sShipZip, r.sShipCountry) As Addr3,
		dbo.fnAddressLine(4,r.sShipName1, r.sShipName2, r.sShipAddr1, r.sShipAddr2, r.sShipCity, r.sShipState, r.sShipZip, r.sShipCountry) As Addr4,
		dbo.fnAddressLine(5,r.sShipName1, r.sShipName2, r.sShipAddr1, r.sShipAddr2, r.sShipCity, r.sShipState, r.sShipZip, r.sShipCountry) As Addr5,
		@sContactName, @sContactPhone, @sContactEmail, LTrim(Rtrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As sRepName,
		dbo.fn_FormatDate(r.dtDateIn,'mm/dd/yyyy') as QuoteDate,
		dbo.fn_FormatDate(DATEADD(month,6,r.dtDateIn),'mm/dd/yyyy') as ExpirationDate,
		ISNULL(r.nSalesTax,0) As SalesTaxAmount, 
		ISNULL(r.dblAmtShipping, 0) As ShippingAmount,
		@nQuoteAmount As CartAmount, 
		ISNULL(r.nSalesTax,0) + ISNULL(r.dblAmtShipping,0) + @nQuoteAmount As TotalQuoteAmount,
		'*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(@plRepairKey as varchar(15)) + '*' As sBarCode
	From dbo.tblRepair r 
		join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		left join dbo.tblSalesRep sr on (r.lSalesRepKey = sr.lSalesRepKey)
	Where r.lRepairKey = @plRepairKey

	if @lDatabaseKey = 1 And SUBSTRING(@sWorkOrderNumber,1,1)='S'
		BEGIN
			Declare @sRepName nvarchar(100)
			Select @sRepName = LTrim(Rtrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) 
			From TSS.WinscopeNetNashville.dbo.tblSalesRep sr 
			Where sr.lSalesRepKey = @lSalesRepKey

			Update dbo.tblRptCartQuote 
			Set sRepName = @sRepName
			Where lSessionID = @plSessionID And lRepairKey = @plRepairKey
		END
		

	Insert Into dbo.tblRptCartQuoteDetail ( lSessionID, sSessionTime, lRepairKey, lRepairItemTranKey, lRepairItemKey, sItemDescription, lQty, nUnitCost, nTotalCost, sComment )
	Select @plSessionID, @psSessionTime, @plRepairKey, rit.lRepairItemTranKey, rit.lRepairItemKey, ri.sItemDescription, rit.lQuantity, rit.nRepairPRiceUnitCost, 
		rit.dblRepairPrice, rit.sComments
	From dbo.tblRepairItemTran rit join dbo.tblRepairItem ri on (rit.lRepairItemKey = ri.lRepairItemKey)
	Where rit.lRepairKey = @plRepairKey
	Order By ri.sItemDescription
END

