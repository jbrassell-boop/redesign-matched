CREATE PROCEDURE [dbo].[activityReportGet]
	(
		@pdtStartDate date,
		@pdtEndDate date,
		@pbIncludeRepairItems bit = 0,
		@pbBasedOnDateIn bit = 1
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.activityReportGet @pdtStartDate='1/1/2020', @pdtEndDate='1/10/2020'

	Declare @pdtEndDate_Local date
	Set @pdtEndDate_Local = @pdtEndDate

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	Create Table #Results
		(
			lRepairKey int,
			lDepartmentKey int,
			lScopeKey int,
			dtDateIn date,
			dtInvoiceDate date,
			sClientName1 nvarchar(200),
			sDepartmentName nvarchar(200),
			sInstrumentType nvarchar(50),
			ScopeCategory nvarchar(200),
			Diameter nvarchar(50),
			sScopeCategory nvarchar(50),
			sManufacturer nvarchar(200),
			sWorkOrderNumber nvarchar(50),
			sScopeTypeDesc nvarchar(200),
			sSerialNumber nvarchar(50),
			Outsourced nvarchar(1),
			IsContract bit,
			bNewCustomer bit,
			dtTranDate date,
			dblTranAmount decimal(10,2),
			ConsumptionAmount decimal(10,2),
			lRepairItemTranKey int,
			sItemDescription nvarchar(200),
			RepairLevelKey int,
			sRepairLevel nvarchar(50),
			sPrimaryRepair nvarchar(200),
			sShipState nvarchar(50),
			sSubGroups nvarchar(500),
			sTaxExempt nvarchar(5),
			nDaysSinceLastIn decimal(10,2),
			nDaysSinceLastInActual nvarchar(50),
			nTurnTime int,
			AssemblyType nvarchar(200),
			sTrackingNumberIn nvarchar(50),
			sTrackingNumberOut nvarchar(50),
			RepairReason nvarchar(50),
			RepairReasonCategory nvarchar(50),
			lTechKey int,
			sTechName nvarchar(200),
			sTechName2 nvarchar(200),
			sOptimalServiceLocation nvarchar(50),
			dtApprovedDate date
		)

	Set @pdtEndDate = DateAdd(day,1,@pdtEndDate)

	--Already Invoiced
	Insert Into #Results ( lRepairKey, lDepartmentKey, lScopeKey, dtDateIn, dtInvoiceDate, sClientName1, sDepartmentName, sInstrumentType, ScopeCategory,
		Diameter, sScopeCategory, sManufacturer, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, Outsourced,
		IsContract, bNewCustomer, dtTranDate, dblTranAmount, lRepairItemTranKey, sItemDescription, RepairLevelKey, sShipState, sTaxExempt, nDaysSinceLastIn, nDaysSinceLastInActual,
		sTrackingNumberIn, sTrackingNumberOut, RepairReason, RepairReasonCategory, lTechKey, sTechName, sTechName2, sOptimalServiceLocation, dtApprovedDate )
	Select r.lRepairKey, r.lDepartmentKey, r.lScopeKey, r.dtDateIn, i.dtTranDate, c.sClientName1, d.sDepartmentName, it.sInstrumentType, 
		--ISNULL(sc.sItemText,'') As ScopeCategory,
		sc.sScopeTypeCategory As ScopeCategory,
		Case 
			When st.sRigidOrFlexible='F' Then 
				--Case When IsNull(sc.lValueInteger02,0)=1 Then 'Large' Else 'Small' End
				Case When sc.bLargeDiameter = 1 Then 'Large' Else 'Small' End
			Else '' 
		End As Diameter, sca.sScopeCategory,
		m.sManufacturer, r.sWorkOrderNumber, st.sScopeTypeDesc, s.sSerialNumber, 
		Case When ISNULL(r.lVendorKey,0)=0 Then '' Else 'X' End As Outsourced,
		--Case When ISNULL(r.lContractKey,0)=0 Then 0 Else 1 End As IsContract,
		Case When dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn)=0 Then 0 Else 1 End As IsContract,
		Case When ISDATE(Convert(datetime,r.dtCustomerSince))=1 Then r.bNewCustomer
			 When ISDATE(d.dtCustomerSince)=1 And r.dtDateIn < DateAdd(year,1,d.dtCustomerSince) Then 1
			 Else 0 
		End As bNewCustomer, i.dtTranDate, i.dblTranAmount,
		Case When @pbIncludeRepairItems=0 Then 0 Else rit.lRepairItemTranKey End As lRepairItemTranKey,
		Case When @pbIncludeRepairItems=0 Then '' Else ri.sItemDescription End As sItemDescription,
		MAX(ISNULL(ri.sMajorRepair,0)) As RepairLevelKey, d.sShipState,
		Case When d.bTaxExempt=1 Then 'Yes' Else 'No' End As sTaxExempt, ISNULL(r.nDaysSinceLastIn,0), 
		Case When ISNULL(r.nDaysSinceLastIn,0)=0 Then 'N/A' Else Cast(r.nDaysSinceLastIn as varchar(10)) End,
		Case When LTrim(RTrim(ISNULL(r.sShipTrackingNumberIn,'')))='' Then r.sShipTrackingNumberFedExIn Else r.sShipTrackingNumberIn End As TrackingNumberIn,
		Case When LTrim(RTrim(ISNULL(r.sShipTrackingNumber,'')))='' Then r.sShipTrackingNumberFedEx Else r.sShipTrackingNumber End As TrackingNumberOut,
		--Case When ISNULL(r.sShipTrackingNumberIn,'')='' Then ISNULL(r.sShipTrackingNumberFedExIn,'') else ISNULL(r.sShipTrackingNumberIn,'') End As TrackingNumberIn,
		--Case When ISNULL(r.sShipTrackingNumber,'')='' Then ISNULL(r.sShipTrackingNumberFedEx,'') else ISNULL(r.sShipTrackingNumber,'') End As TrackingNumberOut,
		--ISNULL(r.sShipTrackingNumberIn, r.sShipTrackingNumberFedExIn) As TrackingNumberIn,
		--ISNULL(r.sShipTrackingNumber, r.sShipTrackingNumberFedEx) As TrackingNumberOut,
		rr.sRepairReason, rrc.sRepairReasonCategory, 
		Case When @pbIncludeRepairItems=0 Then 0 Else rit.lTechnicianKey End, 
		Case When @pbIncludeRepairItems=0 Then '' Else t.sTechName End,
		Case When @pbIncludeRepairItems=0 Then '' Else t2.sTechName End,
		d.sOptimalServiceLocation, r.dtAprRecvd
	From dbo.tblRepair r join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join dbo.tblManufacturers m on (st.lManufacturerKey = m.lManufacturerKey)
		join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblInvoice i on (r.lRepairKey = i.lRepairKey)
		join dbo.tblInstrumentTypes it on (st.sRigidOrFlexible=it.sInstrumentTypeKey)
		--left join dbo.tblSystemCodes sc on (st.lScopeTypeCatKey=sc.lSystemCodesKey)
		left join dbo.tblScopeTypeCategories sc on (st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey)
		left join dbo.tblScopeCategories sca on (st.lScopeCategoryKey=sca.lScopeCategoryKey)
		left join dbo.tblRepairItemTran rit on (r.lRepairKey=rit.lRepairKey)
		left join dbo.tblRepairItem ri on (rit.lRepairItemKey=ri.lRepairItemKey)
		left join dbo.tblRepairReasons rr on (r.lRepairReasonKey = rr.lRepairReasonKey)
		left join dbo.tblRepairReasonCategories rrc on (rr.lRepairReasonCategoryKey = rrc.lRepairReasonCategoryKey)
		left join dbo.tblTechnicians t on (rit.lTechnicianKey=t.lTechnicianKey)
		left join dbo.tblTechnicians t2 on (rit.lTechnician2Key = t2.lTechnicianKey)
	Where	(	(@pbBasedOnDateIn=1 And r.dtDateIn >= @pdtStartDate And r.dtDateIn < @pdtEndDate And i.bFinalized=1)
				Or
				(@pbBasedOnDateIn=0 And i.dtTranDate >= @pdtStartDate And i.dtTranDate < @pdtEndDate And i.bFinalized=1)
			)
		And (	(@lDatabaseKey=1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
				Or
				(@lDatabaseKey=2 And SUBSTRING(r.sWorkOrderNumber,1,1)='S')
			)
		--And (	ISNULL(d.lServiceLocationKey,@lDatabaseKey) = @lDatabaseKey
		--		Or
		--		(@lDatabaseKey=1 And d.lServiceLocationKey=2 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
		--	)
	Group By r.lRepairKey, r.lDepartmentKey, r.lScopeKey, r.dtDateIn, i.dtTranDate, c.sClientName1, d.sDepartmentName, it.sInstrumentType, 
		--ISNULL(sc.sItemText,''),
		sc.sScopeTypeCategory,
		Case 
			When st.sRigidOrFlexible='F' Then 
				--Case When IsNull(sc.lValueInteger02,0)=1 Then 'Large' Else 'Small' End
				Case When sc.bLargeDiameter = 1 Then 'Large' Else 'Small' End
			Else '' 
		End, sca.sScopeCategory, m.sManufacturer, r.sWorkOrderNumber, st.sScopeTypeDesc, s.sSerialNumber, 
		r.lVendorKey,
		Case When dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn)=0 Then 0 Else 1 End,
		Case When ISDATE(Convert(datetime,r.dtCustomerSince))=1 Then r.bNewCustomer
			 When ISDATE(d.dtCustomerSince)=1 And r.dtDateIn < DateAdd(year,1,d.dtCustomerSince) Then 1
			 Else 0 
		End , i.dtTranDate, i.dblTranAmount,
		Case When @pbIncludeRepairItems=0 Then 0 Else rit.lRepairItemTranKey End,
		Case When @pbIncludeRepairItems=0 Then '' Else ri.sItemDescription End,
		d.sShipState,
		Case When d.bTaxExempt=1 Then 'Yes' Else 'No' End, ISNULL(r.nDaysSinceLastIn,0),
		Case When ISNULL(r.nDaysSinceLastIn,0)=0 Then 'N/A' Else Cast(r.nDaysSinceLastIn as varchar(10)) End,
		Case When LTrim(RTrim(ISNULL(r.sShipTrackingNumberIn,'')))='' Then r.sShipTrackingNumberFedExIn Else r.sShipTrackingNumberIn End,
				Case When LTrim(RTrim(ISNULL(r.sShipTrackingNumber,'')))='' Then r.sShipTrackingNumberFedEx Else r.sShipTrackingNumber End,
		--Case When ISNULL(r.sShipTrackingNumberIn,'')='' Then ISNULL(r.sShipTrackingNumberFedExIn,'') else ISNULL(r.sShipTrackingNumberIn,'') End,
		--Case When ISNULL(r.sShipTrackingNumber,'')='' Then ISNULL(r.sShipTrackingNumberFedEx,'') else ISNULL(r.sShipTrackingNumber,'') End,
		rr.sRepairReason, rrc.sRepairReasonCategory,
		Case When @pbIncludeRepairItems=0 Then 0 Else rit.lTechnicianKey End, 
		Case When @pbIncludeRepairItems=0 Then '' Else t.sTechName End,
		Case When @pbIncludeRepairItems=0 Then '' Else t2.sTechName End,
		d.sOptimalServiceLocation, r.dtAprRecvd
	Order By r.dtDateIn


	--Approved by not invoiced yet
	--Per Joe, 7/19/2023 - show all (approved and unapproved)
	Insert Into #Results ( lRepairKey, lDepartmentKey, lScopeKey, dtDateIn, dtInvoiceDate, sClientName1, sDepartmentName, sInstrumentType, ScopeCategory,
		Diameter, sScopeCategory, sManufacturer, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, Outsourced,
		IsContract, bNewCustomer, dtTranDate, dblTranAmount, lRepairItemTranKey, sItemDescription, RepairLevelKey, sShipState, sTaxExempt, nDaysSinceLastIn, nDaysSinceLastInActual,
		sTrackingNumberIn, sTrackingNumberOut, RepairReason, RepairReasonCategory, lTechKey, sTechName, sTechName2, sOptimalServiceLocation, dtApprovedDate )
	Select r.lRepairKey, r.lDepartmentKey, r.lScopeKey, r.dtDateIn, i.dtTranDate, c.sClientName1, d.sDepartmentName, it.sInstrumentType, 
		--ISNULL(sc.sItemText,'') As ScopeCategory,
		sc.sScopeTypeCategory As ScopeCategory,
		Case 
			When st.sRigidOrFlexible='F' Then 
				--Case When IsNull(sc.lValueInteger02,0)=1 Then 'Large' Else 'Small' End
				Case When sc.bLargeDiameter = 1 Then 'Large' Else 'Small' End
			Else '' 
		End As Diameter, sca.sScopeCategory,
		m.sManufacturer, r.sWorkOrderNumber, st.sScopeTypeDesc, s.sSerialNumber, 
		Case When ISNULL(r.lVendorKey,0)=0 Then '' Else 'X' End As Outsourced,
		Case When dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn)=0 Then 0 Else 1 End As IsContract,
		Case When ISDATE(Convert(datetime,r.dtCustomerSince))=1 Then r.bNewCustomer
			 When ISDATE(d.dtCustomerSince)=1 And r.dtDateIn < DateAdd(year,1,d.dtCustomerSince) Then 1
			 Else 0 
		End As bNewCustomer, i.dtTranDate, i.dblTranAmount,
		Case When @pbIncludeRepairItems=0 Then 0 Else rit.lRepairItemTranKey End As lRepairItemTranKey,
		Case When @pbIncludeRepairItems=0 Then '' Else ri.sItemDescription End As sItemDescription,
		MAX(ISNULL(ri.sMajorRepair,0)) As RepairLevelKey, d.sShipState,
		Case When d.bTaxExempt=1 Then 'Yes' Else 'No' End As sTaxExempt, ISNULL(r.nDaysSinceLastIn,0), 
		Case When ISNULL(r.nDaysSinceLastIn,0)=0 Then 'N/A' Else Cast(r.nDaysSinceLastIn as varchar(10)) End,
		Case When LTrim(RTrim(ISNULL(r.sShipTrackingNumberIn,'')))='' Then r.sShipTrackingNumberFedExIn Else r.sShipTrackingNumberIn End As TrackingNumberIn,
		Case When LTrim(RTrim(ISNULL(r.sShipTrackingNumber,'')))='' Then r.sShipTrackingNumberFedEx Else r.sShipTrackingNumber End As TrackingNumberOut,
		--Case When ISNULL(r.sShipTrackingNumberIn,'')='' Then ISNULL(r.sShipTrackingNumberFedExIn,'') else ISNULL(r.sShipTrackingNumberIn,'') End As TrackingNumberIn,
		--Case When ISNULL(r.sShipTrackingNumber,'')='' Then ISNULL(r.sShipTrackingNumberFedEx,'') else ISNULL(r.sShipTrackingNumber,'') End As TrackingNumberOut,
		rr.sRepairReason, rrc.sRepairReasonCategory, 
		Case When @pbIncludeRepairItems=0 Then 0 Else rit.lTechnicianKey End, 
		Case When @pbIncludeRepairItems=0 Then '' Else t.sTechName End,
		Case When @pbIncludeRepairItems=0 Then '' Else t2.sTechName End,
		d.sOptimalServiceLocation, r.dtAprRecvd
	From dbo.tblRepair r join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		join dbo.tblManufacturers m on (st.lManufacturerKey = m.lManufacturerKey)
		join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		left join (Select * from dbo.tblInvoice Where bFinalized=1) i on (r.lRepairKey = i.lRepairKey)
		join dbo.tblInstrumentTypes it on (st.sRigidOrFlexible=it.sInstrumentTypeKey)
		--left join dbo.tblSystemCodes sc on (st.lScopeTypeCatKey=sc.lSystemCodesKey)
		left join dbo.tblScopeTypeCategories sc on (st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey)
		left join dbo.tblScopeCategories sca on (st.lScopeCategoryKey=sca.lScopeCategoryKey)
		left join dbo.tblRepairItemTran rit on (r.lRepairKey=rit.lRepairKey)
		left join dbo.tblRepairItem ri on (rit.lRepairItemKey=ri.lRepairItemKey)
		left join dbo.tblRepairReasons rr on (r.lRepairReasonKey = rr.lRepairReasonKey)
		left join dbo.tblRepairReasonCategories rrc on (rr.lRepairReasonCategoryKey = rrc.lRepairReasonCategoryKey)
		left join dbo.tblTechnicians t on (rit.lTechnicianKey=t.lTechnicianKey)
		left join dbo.tblTechnicians t2 on (rit.lTechnician2Key = t2.lTechnicianKey)
	Where	@pbBasedOnDateIn=1 
		And r.dtDateIn >= @pdtStartDate And r.dtDateIn < @pdtEndDate
		And r.dtDateIn >= '1/1/2022'
		--And r.dtAprRecvd Is Not Null
		And i.lRepairKey Is Null
		And (	(@lDatabaseKey=1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
				Or
				(@lDatabaseKey=2 And SUBSTRING(r.sWorkOrderNumber,1,1)='S')
			)
	Group By r.lRepairKey, r.lDepartmentKey, r.lScopeKey, r.dtDateIn, i.dtTranDate, c.sClientName1, d.sDepartmentName, it.sInstrumentType, 
		--ISNULL(sc.sItemText,''),
		sc.sScopeTypeCategory,
		Case 
			When st.sRigidOrFlexible='F' Then 
				--Case When IsNull(sc.lValueInteger02,0)=1 Then 'Large' Else 'Small' End
				Case When sc.bLargeDiameter = 1 Then 'Large' Else 'Small' End
			Else '' 
		End, sca.sScopeCategory, m.sManufacturer, r.sWorkOrderNumber, st.sScopeTypeDesc, s.sSerialNumber, 
		r.lVendorKey,
		Case When dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn)=0 Then 0 Else 1 End,
		Case When ISDATE(Convert(datetime,r.dtCustomerSince))=1 Then r.bNewCustomer
			 When ISDATE(d.dtCustomerSince)=1 And r.dtDateIn < DateAdd(year,1,d.dtCustomerSince) Then 1
			 Else 0 
		End , i.dtTranDate, i.dblTranAmount,
		Case When @pbIncludeRepairItems=0 Then 0 Else rit.lRepairItemTranKey End,
		Case When @pbIncludeRepairItems=0 Then '' Else ri.sItemDescription End,
		d.sShipState,
		Case When d.bTaxExempt=1 Then 'Yes' Else 'No' End, ISNULL(r.nDaysSinceLastIn,0),
		Case When ISNULL(r.nDaysSinceLastIn,0)=0 Then 'N/A' Else Cast(r.nDaysSinceLastIn as varchar(10)) End,
		Case When LTrim(RTrim(ISNULL(r.sShipTrackingNumberIn,'')))='' Then r.sShipTrackingNumberFedExIn Else r.sShipTrackingNumberIn End,
		Case When LTrim(RTrim(ISNULL(r.sShipTrackingNumber,'')))='' Then r.sShipTrackingNumberFedEx Else r.sShipTrackingNumber End,
		--Case When ISNULL(r.sShipTrackingNumberIn,'')='' Then ISNULL(r.sShipTrackingNumberFedExIn,'') else ISNULL(r.sShipTrackingNumberIn,'') End,
		--Case When ISNULL(r.sShipTrackingNumber,'')='' Then ISNULL(r.sShipTrackingNumberFedEx,'') else ISNULL(r.sShipTrackingNumber,'') End,
		rr.sRepairReason, rrc.sRepairReasonCategory,
		Case When @pbIncludeRepairItems=0 Then 0 Else rit.lTechnicianKey End, 
		Case When @pbIncludeRepairItems=0 Then '' Else t.sTechName End,
		Case When @pbIncludeRepairItems=0 Then '' Else t2.sTechName End,
		d.sOptimalServiceLocation, r.dtAprRecvd
	Order By r.dtDateIn
	

	Update r
	Set sRepairLevel = s.sRepairLevel 
	From #Results r join tblRepairLevels s on (r.RepairLevelKey=s.lRepairLevelKey)

	Update r
	Set sPrimaryRepair=ri.sItemDescription
	From #Results r join dbo.tblRepairItemTran rit on (r.lRepairKey=rit.lRepairKey)
		join dbo.tblRepairItem ri on (rit.lRepairItemKey=ri.lRepairItemKey)
	Where rit.sPrimaryRepair='Y'
		
	Update r
	Set AssemblyType = t.AssemblyType
	From #Results r join 
		(
			select r.lRepairKey, MAX(i.sItemDescription) As AssemblyType
			From #Results r join tblinventorytran it on (r.lRepairKey=it.lRepairKey)
				join dbo.tblInventorySize ivs on (it.lInventorySizeKey=ivs.lInventorySizeKey)
				join dbo.tblInventory i on (ivs.lInventoryKey=i.lInventoryKey)
			Where ivs.lInventoryKey in (391,578)
			Group By r.lRepairKey
		) t on (r.lRepairKey = t.lRepairKey)

	Update #Results Set sSubGroups = dbo.fnDepartmentSubGroups(lDepartmentKey)

	Create Table #Consumption
		(
			lRepairKey int,
			ConsumptionAmount decimal(10,2)
		)

	Declare @IDs dbo.typIDs
	Insert Into @IDs ( ID ) Select r.lRepairKey from #Results r Where r.sInstrumentType <> 'I'

	Insert Into #Consumption ( lRepairKey, ConsumptionAmount )
	Select a.lRepairKey, a.ConsumptionAmount
	From dbo.fn_RepairNonInstrumentConsumptionByKeys(@IDs) a

	Update r 
	Set ConsumptionAmount = c.ConsumptionAmount
	From #Results r join #Consumption c on (r.lRepairKey = c.lRepairKey)

	Delete From @IDs
	Insert Into @IDs ( ID ) Select r.lRepairKey From #Results r Where r.sInstrumentType = 'I'
	
	Insert Into #Consumption ( lRepairKey, ConsumptionAmount )
	Select a.lRepairKey, a.ConsumptionAmount
	From dbo.fn_RepairInstrumentConsumptionByKeys(@IDs) a

	Update r 
	Set ConsumptionAmount = c.ConsumptionAmount
	From #Results r join #Consumption c on (r.lRepairKey = c.lRepairKey)

	Update #Results Set ConsumptionAmount = dblTranAmount Where ConsumptionAmount Is Null

	--Turn Times
	Update #Results Set nTurnTime = dbo.fn_DateDiffWeekDays(dtApprovedDate, dtInvoiceDate)
	
	if @lDatabaseKey = 2
		BEGIN
			Insert Into #Results
			EXEC TSI.WinscopeNet.dbo.activityReportGetForSouth @pdtStartDate, @pdtEndDate_Local, @pbIncludeRepairItems, @pbBasedOnDateIn
		END

	Declare @AvgDaysIn decimal(10,2)
	Select @AvgDaysIn = Avg(r.nDaysSinceLastIn) From #Results r Where r.nDaysSinceLastIn > 0

	Update #Results
	Set nDaysSinceLastIn = Case When DATEDIFF(day,dtTranDate, GETDATE()) > @AvgDaysIn Then DATEDIFF(day,dtTranDate, GETDATE()) Else @AvgDaysIn End
	Where nDaysSinceLastIn = 0

	Select dtDateIn, sClientName1, sDepartmentName, sInstrumentType, ScopeCategory, Diameter, sScopeCategory, sManufacturer,
		sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, Outsourced, IsContract, bNewCustomer, dtTranDate, dblTranAmount, ConsumptionAmount,
		lRepairItemTranKey, sItemDescription, sRepairLevel, sPrimaryRepair, sShipState, sSubGroups, sTaxExempt, nDaysSinceLastIn, nDaysSinceLastInActual, nTurnTime, AssemblyType,
		sTrackingNumberIn, sTrackingNumberOut, RepairReason, RepairReasonCategory, sTechName, sTechName2, sOptimalServiceLocation
	From #Results
	Order By dtDateIn, sClientName1, sDepartmentName

	Drop Table #Results
END


