CREATE PROCEDURE [dbo].[rptProductSaleQuote]
	(
		@plSessionID int,
		@psSessionTime nvarchar(50),
		@plProductSalesKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	--dbo.rptProductSaleQuote @plSessionID=1, @psSessionTime='ABCD', @plProductSalesKey=3
	--Select * from dbo.tblProductSaleQuoteDetail
		
	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()
	
	Delete From dbo.tblProductSaleQuote Where lSessionID = @plSessionID
	Delete From dbo.tblProductSaleQuoteDetail Where lSessionID = @plSessionID
		
	Declare @lBarCodeKey int
	Set @lBarCodeKey = 23
	
	Declare @lDepartmentKey int
	Declare @nQuoteAmount decimal(10,2)
	Declare @sQuoteNumber nvarchar(50)
	Declare @lSalesRepKey int

	Select @lDepartmentKey = lDepartmentKey, @nQuoteAmount = s.nQuoteAmount, @sQuoteNumber = s.sInvoiceNumber, @lSalesRepKey = s.lSalesRepKey 
	From dbo.tblProductSales s 
	Where s.lProductSaleKey = @plProductSalesKey
	
	Declare @sContactName nvarchar(100)
	--Declare @sContactPhone nvarchar(50)
	--Declare @sContactEmail nvarchar(100)
	
	Select	@sContactName = LTrim(RTrim(ISNULL(c.sContactFirst,'') + ' ' + ISNULL(c.sContactLast,'')))--, 
			--@sContactPhone = c.sContactPhoneVoice,
			--@sContactEmail = c.sContactEmail
	From dbo.tblContactTran ct join dbo.tblContacts c on (ct.lContactKey=c.lContactKey) 
	Where ct.lDepartmentKey=@lDepartmentKey And c.bActive=1 and c.bInventorySale = 1

	--Set @sContactPhone = dbo.fn_FormatPhone(ISNULL(@sContactPhone,''))
	
	Insert Into dbo.tblProductSaleQuote ( lSessionID, sSessionTime, lProductSalesKey, QuoteNumber, custAddressLine1, custAddressLine2, custAddressLine3, custAddressLine4, custAddressLine5,
		sContactName, sClientPhoneNumber, sContactEmailAddress, sRepName, dtQuoteDate, dtExpireDate, nSalesTax, nShippingAmount, nQuoteAmount, nTotalAmount, sBarCode, sNote )
	Select @plSessionID, @psSessionTime, s.lProductSaleKey, s.sInvoiceNumber, 
		dbo.fnAddressLine(1,c.sClientName1, d.sDepartmentName, s.sAddressLine1, s.sAddressLine2, s.sCity, s.sState, s.sZipCode, d.sShipCountry) As Addr1,
		dbo.fnAddressLine(2,c.sClientName1, d.sDepartmentName, s.sAddressLine1, s.sAddressLine2, s.sCity, s.sState, s.sZipCode, d.sShipCountry) As Addr2,
		dbo.fnAddressLine(3,c.sClientName1, d.sDepartmentName, s.sAddressLine1, s.sAddressLine2, s.sCity, s.sState, s.sZipCode, d.sShipCountry) As Addr3,
		dbo.fnAddressLine(4,c.sClientName1, d.sDepartmentName, s.sAddressLine1, s.sAddressLine2, s.sCity, s.sState, s.sZipCode, d.sShipCountry) As Addr4,
		dbo.fnAddressLine(5,c.sClientName1, d.sDepartmentName, s.sAddressLine1, s.sAddressLine2, s.sCity, s.sState, s.sZipCode, d.sShipCountry) As Addr5,
		@sContactName, s.sClientPhoneNumber, s.sContactEmailAddress, LTrim(Rtrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As sRepName,
		dbo.fn_FormatDate(s.dtQuoteDate,'mm/dd/yyyy') as QuoteDate,
		dbo.fn_FormatDate(DATEADD(month,6,s.dtQuoteDate),'mm/dd/yyyy') as ExpirationDate,
		ISNULL(s.nTaxAmount,0) As SalesTaxAmount, 
		ISNULL(s.nShippingAmount, 0) As ShippingAmount,
		@nQuoteAmount As nQuoteAmount, 
		s.nTotalAmount As nTotalAmount,
		'*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(s.lProductSaleKey as varchar(15)) + '*' As sBarCode, s.sNote
	From dbo.tblProductSales s join dbo.tblDepartment d on (s.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		left join dbo.tblSalesRep sr on (s.lSalesRepKey = sr.lSalesRepKey)
	Where s.lProductSaleKey = @plProductSalesKey

	if @lDatabaseKey = 1 And SUBSTRING(@sQuoteNumber,1,1)='S'
		BEGIN
			Declare @sRepName nvarchar(100)
			Select @sRepName = LTrim(Rtrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) 
			From TSS.WinscopeNetNashville.dbo.tblSalesRep sr 
			Where sr.lSalesRepKey = @lSalesRepKey

			Update dbo.tblProductSaleQuote 
			Set sRepName = @sRepName
			Where lSessionID = @plSessionID And lProductSalesKey = @plProductSalesKey
		END
		
	Insert Into dbo.tblProductSaleQuoteDetail ( lSessionID, sSessionTime, lProductSalesKey, lInventoryKey, lInventorySizeKey, sItemDescription, sSizeDescription, lQty, nUnitCost, nTotalCost, 
		lProductSaleInventoryKey, sSizeDescription2,sSizeDescription3, sSubDescription )
	Select @plSessionID, @psSessionTime, @plProductSalesKey, ivs.lInventoryKey, i.lInventorySizeKey, iv.sItemDescription, ivs.sSizeDescription, SUM(i.lQuantity), i.nUnitCost, SUM(i.nTotalCost),
		MAX(i.lProductSaleInventoryKey), ivs.sSizeDescription2, ivs.sSizeDescription3,
			ISNULL(ivs.sSizeDescription2,'') + Case When ISNULL(ivs.sSizeDescription3,'')='' Then '' Else ' - ' + ISNULL(ivs.sSizeDescription3,'') End As sSubDescription
	From dbo.tblProductSalesInventory i join dbo.tblInventorySize ivs on (i.lInventorySizeKey = ivs.lInventorySizeKey)
		join dbo.tblInventory iv on (ivs.lInventoryKey = iv.lInventoryKey)
	Where i.lProductSaleKey = @plProductSalesKey
	Group By ivs.lInventoryKey, i.lInventorySizeKey, iv.sItemDescription, ivs.sSizeDescription, i.nUnitCost, ivs.sSizeDescription2, ivs.sSizeDescription3,
			ISNULL(ivs.sSizeDescription2,'') + Case When ISNULL(ivs.sSizeDescription3,'')='' Then '' Else ' - ' + ISNULL(ivs.sSizeDescription3,'') End
	Order By ivs.sSizeDescription
END
