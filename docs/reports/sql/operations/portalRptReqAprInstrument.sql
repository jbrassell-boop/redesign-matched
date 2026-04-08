CREATE PROCEDURE [dbo].[portalRptReqAprInstrument]
	(
		@plRepairKey int,
		@plSessionID int,
		@psSessionTime nvarchar(50)
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.portalRptReqAprInstrument @plRepairKey = 484808

	Delete From dbo.tblRptReqAprIns Where lSessionID = @plSessionID

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
	From WinScopeNet.dbo.tblRepairInstrumentModels rim
	Where lRepairKey = @plRepairKey 
	
	
	Insert Into dbo.tblRptReqAprIns ( lRepairInstrumentModelKey, lRepairKey, lSessionID, sSessionTime, sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, sCompanyState, sCompanyZip, sCompanyPhoneVoice, sCompanyPhoneFAX,
		lBillType, sBillEmail, sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip, sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, 
		sShipZip, sWorkOrderNumber, lQuantity, sScopeCategory, sManufacturer, sScopeTypeDesc, sSerialNumber, dblUnitCost, Amount, mComment, sRepairType, sInstrumentComponent, TotalAmount, sPurchaseOrder,
		dblShippingAmt, dblSalesTax, sReviewedBy
		)
	Select rim.lRepairInstrumentModelKey, @plRepairKey, @plSessionID, @psSessionTime, c.sCompanyName1, c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, c.sCompanyState, c.sCompanyZip, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX,
		d.lBillType, d.sBillEmail, d.sBillName1, d.sBillName2, d.sBillAddr1, d.sBillAddr2, d.sBillCity, d.sBillState, d.sBillZip, 
		r.sShipName1, r.sShipName2, r.sShipAddr1, r.sShipAddr2,r .sShipCity, r.sShipState, r.sShipZip, 
		r.sWorkOrderNumber, rim.lQuantity, sc.sScopeCategory, m.sManufacturer, st.sScopeTypeDesc, rim.sSerialNumber, 
		rim.dblUnitCost, Cast(ISNULL(rim.lQuantity,0) * ISNULL(rim.dblUnitCost,0) as money) As Amount, rim.mComment, IsNull(co.sRepairType,''), IsNull(co.sInstrumentComponent,''), @TotalAmount, r.sPurchaseOrder,
		r.dblAmtShipping, r.nSalesTax, r.sReviewedBy
	From dbo.tblRepairInstrumentModels rim join	dbo.tblRepair r on (rim.lRepairKey = r.lRepairKey)
		join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblDistributor d2 on (r.lDistributorKey = d2.lDistributorKey)
		join dbo.tblCompany c on (d2.lCompanyKey = c.lCompanyKey)
		join dbo.tblScopeType st on (rim.lScopeTypeKey = st.lScopeTypeKey)
		left join dbo.tblScopeCategories sc on (st.lScopeCategoryKey = sc.lScopeCategoryKey)
		left join dbo.tblManufacturers m on (st.lManufacturerKey = m.lManufacturerKey)
		left join @ComponentsTemp co on (rim.lRepairInstrumentModelKey = co.lRepairInstrumentModelKey)
	Where rim.lRepairKey = @plRepairKey
END
