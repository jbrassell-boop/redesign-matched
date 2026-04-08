
CREATE PROCEDURE [dbo].[portalRptDataSrcRepairReqAprIns]
	(
		@plRepairKey INT
	)
AS
BEGIN


--exec dbo.portalRptDataSrcRepairReqAprIns @plRepairKey=499326

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
	Where lRepairKey = @plRepairKey 
	
	Select rim.lRepairInstrumentModelKey, @plRepairKey As lRepairKey, c.sCompanyName1, c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, c.sCompanyState, c.sCompanyZip, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX,
		d.lBillType, d.sBillEmail, d.sBillName1, d.sBillName2, d.sBillAddr1, d.sBillAddr2, d.sBillCity, d.sBillState, d.sBillZip, 
		r.sShipName1, r.sShipName2, r.sShipAddr1, r.sShipAddr2,r .sShipCity, r.sShipState, r.sShipZip, 
		r.sWorkOrderNumber, rim.lQuantity, sc.sScopeCategory, m.sManufacturer, st.sScopeTypeDesc, rim.sSerialNumber, 
		rim.dblUnitCost, Cast(ISNULL(rim.lQuantity,0) * ISNULL(rim.dblUnitCost,0) as money) As Amount, rim.mComment, co.sRepairType, co.sInstrumentComponent, @TotalAmount As Totalamount, r.sPurchaseOrder,
		dbo.fn_GetAddressBlock(1,c.sCompanyName1,c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, c.sCompanyState, c.sCompanyZip, 1, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX) As CompanyAddressLine1,
		dbo.fn_GetAddressBlock(2,c.sCompanyName1,c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, c.sCompanyState, c.sCompanyZip, 1, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX) As CompanyAddressLine2,
		dbo.fn_GetAddressBlock(3,c.sCompanyName1,c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, c.sCompanyState, c.sCompanyZip, 1, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX) As CompanyAddressLine3,
		dbo.fn_GetAddressBlock(4,c.sCompanyName1,c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, c.sCompanyState, c.sCompanyZip, 1, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX) As CompanyAddressLine4,
		dbo.fn_GetAddressBlock(5,c.sCompanyName1,c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, c.sCompanyState, c.sCompanyZip, 1, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX) As CompanyAddressLine5,
		dbo.fn_GetAddressBlock(6,c.sCompanyName1,c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, c.sCompanyState, c.sCompanyZip, 1, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX) As CompanyAddressLine6,
		dbo.fn_GetAddressBlock(1,d.sBillName1, d.sBillName2, d.sBillAddr1, d.sBillAddr2, d.sBillCity, d.sBillState, d.sBillZip, 0, '', '') As BillAddressLine1,
		dbo.fn_GetAddressBlock(2,d.sBillName1, d.sBillName2, d.sBillAddr1, d.sBillAddr2, d.sBillCity, d.sBillState, d.sBillZip, 0, '', '') As BillAddressLine2,
		dbo.fn_GetAddressBlock(3,d.sBillName1, d.sBillName2, d.sBillAddr1, d.sBillAddr2, d.sBillCity, d.sBillState, d.sBillZip, 0, '', '') As BillAddressLine3,
		dbo.fn_GetAddressBlock(4,d.sBillName1, d.sBillName2, d.sBillAddr1, d.sBillAddr2, d.sBillCity, d.sBillState, d.sBillZip, 0, '', '') As BillAddressLine4,
		dbo.fn_GetAddressBlock(5,d.sBillName1, d.sBillName2, d.sBillAddr1, d.sBillAddr2, d.sBillCity, d.sBillState, d.sBillZip, 0, '', '') As BillAddressLine5,
		dbo.fn_GetAddressBlock(1,r.sShipName1, r.sShipName2, r.sShipAddr1, r.sshipAddr2, r.sShipCity, r.sShipState, r.sShipZip, 0, '', '') As ShipAddressLine1,
		dbo.fn_GetAddressBlock(2,r.sShipName1, r.sShipName2, r.sShipAddr1, r.sshipAddr2, r.sShipCity, r.sShipState, r.sShipZip, 0, '', '') As ShipAddressLine2,
		dbo.fn_GetAddressBlock(3,r.sShipName1, r.sShipName2, r.sShipAddr1, r.sshipAddr2, r.sShipCity, r.sShipState, r.sShipZip, 0, '', '') As ShipAddressLine3,
		dbo.fn_GetAddressBlock(4,r.sShipName1, r.sShipName2, r.sShipAddr1, r.sshipAddr2, r.sShipCity, r.sShipState, r.sShipZip, 0, '', '') As ShipAddressLine4,
		dbo.fn_GetAddressBlock(5,r.sShipName1, r.sShipName2, r.sShipAddr1, r.sshipAddr2, r.sShipCity, r.sShipState, r.sShipZip, 0, '', '') As ShipAddressLine5,
		'ops-tsi@totalscopeinc.com' As sCompanyEmailAddress
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
