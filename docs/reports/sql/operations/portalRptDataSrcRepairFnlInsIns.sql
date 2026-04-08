
CREATE PROCEDURE [dbo].[portalRptDataSrcRepairFnlInsIns]
	(
		@plRepairKey		INT
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.portalRptDataSrcRepairFnlInsIns @plRepairKey = 484808

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

	Select rim.lRepairInstrumentModelKey, @plRepairKey As lRepairKey, c.sCompanyName1, c.sCompanyName2, c.sCompanyAddr1, c.sCompanyAddr2, c.sCompanyCity, c.sCompanyState, c.sCompanyZip, c.sCompanyPhoneVoice, c.sCompanyPhoneFAX,
		d.lBillType, d.sBillEmail, d.sBillName1, d.sBillName2, d.sBillAddr1, d.sBillAddr2, d.sBillCity, d.sBillState, d.sBillZip, 
		r.sShipName1, r.sShipName2, r.sShipAddr1, r.sShipAddr2,r .sShipCity, r.sShipState, r.sShipZip, 
		r.sWorkOrderNumber, rim.lQuantity, sc.sScopeCategory, m.sManufacturer, st.sScopeTypeDesc, rim.sSerialNumber, 
		rim.mComment, co.sRepairType, co.sInstrumentComponent, IsNull(rim.sApproved,'N') As sApproved, r.sPurchaseOrder
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

