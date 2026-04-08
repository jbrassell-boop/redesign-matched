CREATE PROCEDURE [dbo].[rptAverageExpensesPerScopeType]
	(
		@pdtStartDate date,
		@pdtEndDate date ,
		@psInstrumentType nvarchar(1) = '',
		@pbExpense_GPO bit = 1,
		@pbExpense_Commission bit = 1,
		@pbExpense_Shipping bit = 1,
		@pbExpense_Labor bit = 1,
		@pbExpense_Inventory bit = 1,
		@pbExpense_Outsource bit = 1,
		@plSalesRepKey int = 0
	)

AS
BEGIN
	SET NOCOUNT ON;
	
	--exec dbo.rptAverageExpensesPerScopeType @pdtStartDate='1/1/2018', @pdtEndDate='12/31/2018'

	Create Table #ResultsTemp
		(
			lScopeTypeKey int,
			sManufacturer nvarchar(100),
			sScopeCategory nvarchar(100),
			sScopeCategory2 nvarchar(200),
			sModel nvarchar(300),
			sRigidOrFlexible nvarchar(1),
			sRepairLevel nvarchar(50),
			lRepairLevelCount int,
			nRepairLevelAvg decimal(10,2)
		)

	Insert Into #ResultsTemp ( lScopeTypeKey, sManufacturer, sScopeCategory, sModel, sRigidOrFlexible, sRepairLevel, lRepairLevelCount, nRepairLevelAvg, sScopeCategory2 )
	Select re.lScopeTypeKey, m.sManufacturer, sc.sScopeTypeCategory, st.sScopeTypeDesc, st.sRigidOrFlexible, rl.sRepairLevel, Count(rl.sRepairLevel) As cnt,
			AVG(	Case When @pbExpense_Outsource=1 Then ISNULL(re.OutsourceAmount,0) Else 0 End  
				+ Case When @pbExpense_Shipping=1 Then ISNULL(re.ShippingAmount,0) Else 0 End  
				+ Case When @pbExpense_Labor=1 Then ISNULL(re.LaborAmount,0) Else 0 End  
				+ Case When @pbExpense_Inventory=1 Then ISNULL(re.InventoryAmount,0) Else 0 End  
				+ Case When @pbExpense_GPO=1 Then ISNULL(re.GPOAmount,0) Else 0 End  
				+ Case When @pbExpense_Commission=1 Then ISNULL(re.CommissionAmount,0) Else 0 End  
				) As ExpenseAvg,
		Case When st.sRigidOrFlexible = 'R' Then c.sScopeCategory Else Null End As sScopeCategory2
	from dbo.tblRepairRevenueAndExpenses re join dbo.tblScopeType st on (re.lScopeTypeKey=st.lScopeTypeKey)
		--left join dbo.tblSystemCodes sc on (st.lScopeTypeCatKey = sc.lSystemCodesKey)
		left join dbo.tblScopeTypeCategories sc on (st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey)
		left join dbo.tblManufacturers m on (st.lManufacturerKey = m.lManufacturerKey)
		join dbo.tblRepairLevels rl on (re.lRepairLevelKey = rl.lRepairLevelKey)
		left join dbo.tblScopeCategories c on (st.lScopeCategoryKey = c.lScopeCategoryKey)
	Where re.dtTranDate >= @pdtStartDate And re.dtTranDate < DATEADD(day,1,@pdtEndDate)
		And ISNULL(re.lRepairLevelKey,0) In (1,2,3)
		And ((@psInstrumentType='') Or (st.sRigidOrFlexible=@psInstrumentType))
		And ((@plSalesRepKey=0) Or (re.lSalesRepKey=@plSalesRepKey))
	Group By re.lScopeTypeKey, m.sManufacturer, sc.sScopeTypeCategory, st.sScopeTypeDesc, st.sRigidOrFlexible, rl.sRepairLevel, Case When st.sRigidOrFlexible = 'R' Then c.sScopeCategory Else Null End

	Create Table #Results
		(
			lScopeTypeKey int,
			sManufacturer nvarchar(100),
			sScopeCategory nvarchar(100),
			sScopeCategory2 nvarchar(200),
			sModel nvarchar(300),
			sInstrumentType nvarchar(50),
			lMinorCount int,
			nMinorExpenseAvg decimal(10,2),
			lMidCount int,
			nMidExpenseAvg decimal(10,2),
			lMajorCount int,
			nMajorExpenseAvg decimal(10,2),
			nTotalExpenseAvg decimal(10,2),
			AvgDays decimal(10,2),
			nExpenseMultiplier decimal(10,2)
		)

	Insert Into #Results ( lScopeTypeKey, sManufacturer, sScopeCategory, sScopeCategory2, sModel, sInstrumentType, lMinorCount, nMinorExpenseAvg, lMidCount, nMidExpenseAvg, lMajorCount, nMajorExpenseAvg, nTotalExpenseAvg )
	Select t.lScopeTypeKey, t.sManufacturer, t.sScopeCategory, t.sScopeCategory2, t.sModel, 
		Case t.sRigidOrFlexible When 'F' Then 'Flexible' When 'R' Then 'Rigid' When 'C' Then 'Camera' When 'I' Then 'Instrument' Else t.sRigidOrFlexible End,
		t.lRepairLevelCount, t.nRepairLevelAvg, 0, 0, 0, 0, 0
	From #ResultsTemp t 
	Where t.sRepairLevel = 'Minor'

	Update r
	Set lMidCount = t.lRepairLevelCount, nMidExpenseAvg = t.nRepairLevelAvg
	From #Results r join #ResultsTemp t on (r.lScopeTypeKey = t.lScopeTypeKey)
	Where t.sRepairLevel = 'Mid-Level'

	Insert Into #Results ( lScopeTypeKey, sManufacturer, sScopeCategory, sScopeCategory2, sModel, sInstrumentType, lMinorCount, nMinorExpenseAvg, lMidCount, nMidExpenseAvg, lMajorCount, nMajorExpenseAvg, nTotalExpenseAvg )
	Select t.lScopeTypeKey, t.sManufacturer, t.sScopeCategory, t.sScopeCategory2, t.sModel, 
		Case t.sRigidOrFlexible When 'F' Then 'Flexible' When 'R' Then 'Rigid' When 'C' Then 'Camera' When 'I' Then 'Instrument' Else t.sRigidOrFlexible End,
		0, 0, t.lRepairLevelCount, t.nRepairLevelAvg, 0, 0, 0
	From #ResultsTemp t left join #Results r on (t.lScopeTypeKey = r.lScopeTypeKey)
	Where t.sRepairLevel = 'Mid-Level' And r.lScopeTypeKey Is Null

	Update r
	Set lMajorCount = t.lRepairLevelCount, nMajorExpenseAvg = t.nRepairLevelAvg
	From #Results r join #ResultsTemp t on (r.lScopeTypeKey = t.lScopeTypeKey)
	Where t.sRepairLevel = 'Major'

	Insert Into #Results ( lScopeTypeKey, sManufacturer, sScopeCategory, sScopeCategory2, sModel, sInstrumentType, lMinorCount, nMinorExpenseAvg, lMidCount, nMidExpenseAvg, lMajorCount, nMajorExpenseAvg, nTotalExpenseAvg )
	Select t.lScopeTypeKey, t.sManufacturer, t.sScopeCategory, t.sScopeCategory2, t.sModel, 
		Case t.sRigidOrFlexible When 'F' Then 'Flexible' When 'R' Then 'Rigid' When 'C' Then 'Camera' When 'I' Then 'Instrument' Else t.sRigidOrFlexible End,
		0, 0, 0, 0, t.lRepairLevelCount, t.nRepairLevelAvg, 0
	From #ResultsTemp t left join #Results r on (t.lScopeTypeKey = r.lScopeTypeKey)
	Where t.sRepairLevel = 'Major' And r.lScopeTypeKey Is Null

	Update #Results
	Set nTotalExpenseAvg = ((lMinorCount * nMinorExpenseAvg) + (lMidCount * nMidExpenseAvg) + (lMajorCount * nMajorExpenseAvg)) / (lMinorCount+lMidCount+lMajorCount)

	Update r
	Set AvgDays = a.AvgDaysSinceLastIn
	From #Results r join dbo.fn_AverageDaysSinceLastIn(0) a on (r.lScopeTypeKey = a.lScopeTypeKey)	
	
	Update #Results Set nExpenseMultiplier = Case When ISNULL(AvgDays,0)=0 Then 1 Else Cast(365./AvgDays as decimal(10,2)) End
	Update #Results Set nExpenseMultiplier = 1 Where nExpenseMultiplier < 1

	Select * From #Results Order By sModel

	Drop Table #Results
	Drop Table #ResultsTemp
END
