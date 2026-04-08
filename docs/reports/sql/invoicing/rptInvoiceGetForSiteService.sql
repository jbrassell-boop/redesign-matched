CREATE PROCEDURE [dbo].[rptInvoiceGetForSiteService]
	(
		@plSiteServiceKey int,
		@plSessionID int,
		@psSessionTime nvarchar(20)
	)
AS
BEGIN
	SET NOCOUNT ON;

    Delete r from dbo.tblRptInvoiceHdr r join dbo.tblInvoice i on (r.lInvoiceKey = i.lInvoiceKey) Where i.lSiteServiceKey = @plSiteServiceKey And r.lSessionID = @plSessionID
	Delete r from dbo.tblrptInvoiceProductSaleDetail r join dbo.tblInvoice i on (r.lInvoiceKey = i.lInvoiceKey) Where i.lSiteServiceKey = @plSiteServiceKey And r.lSessionID = @plSessionID

	Insert Into dbo.tblRptInvoiceHdr ( lSessionID, sSessionTime, lInvoiceKey, sTranNumber, sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, 
		sCompanyState, sCompanyZip, sCompanyPhoneVoice, sCompanyPhoneFAX, sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip, 
		sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, dtTranDate, sDeliveryDesc, sTermsDesc, sPurchaseOrder, dtAprRecvd, sRepFirst, sRepLast, 
		dtDateDue, dblShippingAmt, dblTranAmount, dblJuris1Amt, sBillEmail, lBillType, sShipTrackingNumber, sBillEmailName, lDepartmentKey, 
		lClientKey, sCompanyWebsite, sCompanyEmail_AR, RemittAddr1, RemittAddr2, RemittCity, RemittState, RemittZip, CompanyLogo, sSalesTaxFlag,
		bFinalized, dtBillMonth )
	Select @plSessionID, @psSessionTime, lInvoiceKey, sTranNumber, c.sCompanyName1, c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, 
		c.sCompanyState, c.sCompanyZip, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX, i.sBillName1, i.sBillName2, i.sBillAddr1, i.sBillAddr2, i.sBillCity, i.sBillState, i.sBillZip, 
		i.sShipName1, i.sShipName2, i.sShipAddr1, i.sShipAddr2, i.sShipCity, i.sShipState, i.sShipZip, i.dtTranDate, i.sDeliveryDesc, i.sTermsDesc, i.sPurchaseOrder, i.dtAprRecvd, 
		i.sRepFirst, i.sRepLast, i.dtDueDate, i.dblShippingAmt, i.dblTranAmount, i.dblJuris1Amt, i.sBillEmail, i.lBillType, sShipTrackingNumber, i.sBillEmailName, i.lDepartmentKey, 
		d.lDepartmentKey, c.sCompanyWebsite, c.sCompanyEmail_AR, c.RemittAddr1, c.RemittAddr2, c.RemittCity, c.RemittState, c.RemittZip, c.CompanyLogo, i.SalesTaxFlag, 
		i.bFinalized, i.dtAprRecvd
	From dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey) 
		join dbo.tblSalesRep sr on (i.lSalesRepKey=sr.lSalesRepKey)
		join dbo.tblDistributor di on (sr.lDistributorKey=di.lDistributorKey)
		join dbo.tblCompany c on (di.lCompanyKey=c.lCompanyKey)
	Where i.lSiteServiceKey = @plSiteServiceKey

	--Insert Into dbo.tblrptInvoiceProductSaleDetail ( lInvoiceKey, lProductSalesKey, lSessionID, sSessionTime, lInventoryKey, lInventorySizeKey, sItemDescription, sSizeDescription,
	--	lQty, nUnitCost, nTotalCost, sComment, lProductSaleInventoryKey, sSizeDescription2, sSizeDescription3, sSubDescription, sLotNumber )
	--Select lInvoiceKey, lProductSalesKey, @plSessionID, @psSessionTime, lInventoryKey, lInventorySizeKey, sItemDescription, sSizeDescription,
	--	lQty, nUnitCost, nTotalCost, sComment, lProductSaleInventoryKey, sSizeDescription2, sSizeDescription3, sSubDescription, sLotNumber
	--From dbo.tblProductSaleInvoiceDetail d 
	--Where d.lProductSalesKey = @plProductSaleKey
	
	Declare @lBarCodeKey int
	Select @lBarCodeKey = t.lBarCodeKey from dbo.tblBarCodeTypes t Where t.sBarCode = 'Product Sale'

	Update ih 
	Set sBarCode = '*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(ih.lInvoiceKey as varchar(15)) + '*' 
	From dbo.tblRptInvoiceHdr ih join dbo.tblInvoice i on (ih.lInvoiceKey=i.lInvoiceKey)
	Where ih.lSessionID=@plSessionID And ih.sSessionTime=@psSessionTime And i.lSiteServiceKey = @plSiteServiceKey
END
