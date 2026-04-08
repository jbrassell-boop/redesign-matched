CREATE PROCEDURE [dbo].[portalInvoicePrepareForPrintInstrument]
	(
		@plInvoiceKey int,
		@plRepairKey int = 0,
		@plSessionID int,
		@psSessionTime nvarchar(50)
	)
AS
BEGIN
	SET NOCOUNT ON;

	Delete From dbo.tblRptInvoiceInstrument Where lSessionID = @plSessionID
	
	Declare @lBarCodeKey int
	Set @lBarCodeKey = 8
	
	Declare @ComponentsTemp Table
		(
			ID int identity(1,1),
			lRepairInstrumentModelKey int,
			sInstrumentComponent nvarchar(50),
			sRepairType nvarchar(50)
		)

	Insert Into @ComponentsTemp ( lRepairInstrumentModelKey, sInstrumentComponent, sRepairType )
	Select rc.lRepairInstrumentModelKey, c.sInstrumentComponent, Case When rc.bRepair = 1 Then 'Repair/Refurbish' Else 'Replace' End 
	From dbo.tblRepairInstrumentModelComponents rc join dbo.tblInstrumentComponents c on (rc.lInstrumentComponentKey = c.lInstrumentComponentKey)
		join dbo.tblRepairInstrumentModels rm on (rc.lRepairInstrumentModelKey = rm.lRepairInstrumentModelKey)
	Where rm.lRepairKey = @plRepairKey 
	Order By lRepairInstrumentModelKey, rc.lRepairInstrumentModelComponentKey

	Declare @TotalAmount money
	Select @TotalAmount = SUM(Cast(ISNULL(rim.lQuantity,0) * ISNULL(rim.dblUnitCost,0) as money))
	From dbo.tblRepairInstrumentModels rim 
	Where lRepairKey = @plRepairKey And rim.sApproved='Y'
	
	Set @TotalAmount = IsNull(@TotalAmount,0)

	INSERT INTO dbo.tblRptInvoiceInstrument ( lSessionID, sSessionTime, lInvoiceKey, sTranNumber, 
		sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, sCompanyState, sCompanyZip, sCompanyPhoneVoice, sCompanyPhoneFAX, 
		sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip, 
		sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, 
		dtTranDate, sDeliveryDesc, sTermsDesc, sPurchaseOrder, dtAprRecvd, sRepFirst, sRepLast, 
		dtDateDue, dblShippingAmt, dblTranAmount,  
		sBillEmail, lBillType, sCommentContract, sPreview, sShipTrackingNumber, sBillEmailName,
		lDepartmentKey, lClientKey, lRepairInstrumentModelKey, 
		lQuantity, sScopeCategory, sManufacturer, sScopeTypeDesc, sSerialNumber, dblUnitCost, Amount, mComment, sRepairType, sInstrumentComponent, TotalAmount, dblSalesTax, CompanyLogo,
		RemittAddr1, RemittAddr2, RemittaddrCity, RemittAddrState, RemittAddrZip, sSalesTaxFlag, bFinalized )
	SELECT @plSessionID, @psSessionTime, lInvoiceKey, sTranNumber,  
		c.sCompanyName1, c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, c.sCompanyState, c.sCompanyZip, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX, 
		i.sBillName1, i.sBillName2, i.sBillAddr1, i.sBillAddr2, i.sBillCity, i.sBillState, i.sBillZip, 
		i.sShipName1, i.sShipName2, i.sShipAddr1, i.sShipAddr2, i.sShipCity, i.sShipState, i.sShipZip, 
		dtTranDate, sDeliveryDesc, sTermsDesc, r.sPurchaseOrder, r.dtAprRecvd, sRepFirst, sRepLast, 
		dtDueDate, i.dblShippingAmt, dblTranAmount,  
		i.sBillEmail, i.lBillType, sCommentContract, sPreview, r.sShipTrackingNumber, i.sBillEmailName,
		i.lDepartmentKey, d.lClientKey, rim.lRepairInstrumentModelKey, 
		IsNull(rim.lQuantity,0), sc.sScopeCategory, m.sManufacturer, st.sScopeTypeDesc, rim.sSerialNumber, 
		IsNull(rim.dblUnitCost,0), 
		Case when rim.sApproved='Y' Then 
			Cast(ISNULL(rim.lQuantity,0) * ISNULL(rim.dblUnitCost,0) as money) 
			Else 0 
		End As Amount, rim.mComment, IsNull(co.sRepairType,''), IsNull(co.sInstrumentComponent,''), @TotalAmount, IsNull(i.dblJuris1Amt,0) + IsNull(i.dblJuris2Amt,0) + IsNull(i.dblJuris3Amt,0), c.CompanyLogo,
		c.RemittAddr1, c.RemittAddr2, c.RemittCity, c.RemittState, c.RemittZip, i.SalesTaxFlag, i.bFinalized
	FROM dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblRepair r ON (i.lRepairKey = r.lRepairKey)
		left Join (Select * From dbo.tblRepairInstrumentModels Where lRepairKey=@plRepairKey) rim on (r.lRepairKey = rim.lRepairKey)
		join dbo.tblDistributor d2 on (r.lDistributorKey = d2.lDistributorKey)
		join dbo.tblCompany c on (d2.lCompanyKey = c.lCompanyKey)
		left join dbo.tblScopeType st on (rim.lScopeTypeKey = st.lScopeTypeKey)
		left join dbo.tblScopeCategories sc on (st.lScopeCategoryKey = sc.lScopeCategoryKey)
		left join dbo.tblManufacturers m on (st.lManufacturerKey = m.lManufacturerKey)
		left join @ComponentsTemp co on (rim.lRepairInstrumentModelKey = co.lRepairInstrumentModelKey)
	WHERE i.lInvoiceKey=@plInvoiceKey 
	
	UPDATE dbo.tblRptInvoiceInstrument 
	Set sBarCode = '*' + Cast(IsNull(@lBarCodeKey,0) as varchar(5)) + '.' + Cast(@plRepairKey as varchar(15)) + '*'
	WHERE lSessionID = @plSessionID AND sSessionTime = @psSessionTime AND lInvoiceKey = @plInvoiceKey
END
