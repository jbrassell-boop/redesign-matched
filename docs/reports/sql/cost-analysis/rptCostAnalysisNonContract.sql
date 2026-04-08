CREATE PROCEDURE [dbo].[rptCostAnalysisNonContract]
	(	
		@plClientKey int = null,
		@plSubGroupKey int = null,
		@plScopeTypeKey int = null,
		@pdtStartDate datetime = null,
		@pdtEndDate datetime = null,
		@psRigidOrFlexible nvarchar(1) = 'A',
		@plReportType tinyint,
		@pbExcludeShipping bit = 0,
		@psContractStatus nvarchar(1) = 'A',
		@plContractKey int = null,
		@pdtEffectiveDate datetime = null
	)
			
AS
BEGIN
	SET NOCOUNT ON;

	--Contract Status:  A - All, C - Contract Only, N - Non-Contract Only
	
	--exec dbo.rptCostAnalysisNonContract @plClientKey=0, @pdtStartDate='7/1/2015', @pdtEndDate='7/8/2015', @psRigidOrFlexible='F', @plReportType=1
	--exec dbo.rptCostAnalysisNonContract @plContractKey=126, @pdtStartDate='5/16/2017', @pdtEndDate='5/31/2019', @plReportType=2
	
	Declare @i int
	Declare @lRepairKey int

	Create Table #Contracts
		(
			lContractKey int
		)

	If @plReportType = 3
		Insert Into #Contracts ( lContractKey ) 
		Select lContractKey From dbo.tblContract Where dtDateEffective <= @pdtEffectiveDate And ((dtDateTermination Is Null) Or (dtDateTermination >= @pdtEffectiveDate))


	Create Table #Repairs
		(
			ID int identity(1,1),
			lRepairKey int,
			dtDateOut datetime,
			bFlexible bit,
			dblAmtRepair decimal(10,2),
			sShipState nvarchar(20),
			dblOutsourceAmount decimal(10,2),
			ShippingCost decimal(10,2),
			ShippingCount int,					--2 = Inbound & Outbound exist, 1 = Inbound or Outbound exist, but not both, 0 = No existing Shipping charges 
			GPOCost decimal(10,2),
			Commissions decimal(10,2)
		)

	Create Table #Results
	(
		ID int identity(1,1),
		lRepairKey int, 
		sClientName1 nvarchar(100), 
		sDepartmentName nvarchar(100), 
		dtDateOut datetime,
		sWorkOrderNumber nvarchar(50), 
		sScopeTypeDesc nvarchar(100), 
		sSerialNumber nvarchar(100), 
		dblAmtRepair decimal(10,2), 
		dblOutSourceCost decimal(10,2),
		lRepairItemTranKey int,
		lRepairItemKey int,
		RepairItem nvarchar(100),
		lScopeTypeKey int,
		lTechnicianKey int,
		sShipState nvarchar(20),
		bFlexible bit,
		ShippingCost decimal(10,2),
		sContractName nvarchar(200),
		dtEffectiveDate datetime,
		dtTerminationDate datetime,
		lContractKey int,
		LaborCost decimal(10,2),
		InventoryCost decimal(10,2),
		dtInvoiceDate date,
		RepairLevel nvarchar(50),
		GPOCost decimal(10,2),
		Commissions decimal(10,2)
	)
	
	Create Table #SubGroupDepts 
		(
			lDepartmentKey int
		)

	Create Table #LaborCosts		
		(
			lRepairItemTranKey int,
			lRepairKey int,
			LaborCost money
		)

	Create Table #InventoryByRepair 
		(
			lRepairKey int,
			lRepairItemTranKey int,
			sItemDescription nvarchar(200),
			sSizeDescription nvarchar(200),
			dblInventorySizeRepairAmount money
		)

	If ISNull(@plSubGroupKey,0) > 0
		Insert Into #SubGroupDepts ( lDepartmentKey ) Select g.lDepartmentKey From tblDepartmentSubGroups g Where g.lSubGroupKey = @plSubGroupKey Group by g.lDepartmentKey

	Create Index idxSubGroupDepts On #SubGroupDepts ( lDepartmentKey)

	Insert Into #Results ( lRepairKey, sClientName1, sDepartmentName, dtDateOut, sWorkOrderNumber, lScopeTypeKey, sScopeTypeDesc, sSerialNumber, lRepairItemTranKey, lRepairItemKey, RepairItem, lTechnicianKey, sShipState, bFlexible, dtEffectiveDate, dtTerminationDate, sContractName, lContractKey )
	Select r.lRepairKey, c.sClientName1, d.sDepartmentName, r.dtDateOut, r.sWorkOrderNumber, st.lScopeTypeKey, st.sScopeTypeDesc, s.sSerialNumber, rit.lRepairItemTranKey, ri.lRepairItemKey, ri.sItemDescription As RepairItem, rit.lTechnicianKey, d.sShipState, Case When st.sRigidOrFlexible='F' Then 1 Else 0 End,
		co.dtDateEffective, co.dtDateTermination, co.sContractName1, co.lContractKey
	From tblRepair r join tblScope s on (r.lScopeKey=s.lScopeKey)
		join tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
		join tblDepartment d on (r.lDepartmentKey=d.lDepartmentKey)
		join tblClient c on (d.lClientKey=c.lClientKey)
		left join tblRepairItemTran rit on (r.lRepairKey=rit.lRepairKey)
		left join tblRepairItem ri on (rit.lRepairItemKey=ri.lRepairItemKey)
		left join #SubGroupDepts gd on (r.lDepartmentKey = gd.lDepartmentKey)
		left join tblContract co on (dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn) = co.lContractKey)
		left join #Contracts ct on (r.lContractKey = ct.lContractKey)
	Where	((IsNull(@plClientKey,0)=0) Or (c.lClientKey=@plClientKey))
		And ((ISNULL(@plSubGroupKey,0)=0) Or (gd.lDepartmentKey Is Not Null))
		And ((IsNull(@plScopeTypeKey,0)=0) Or (st.lScopeTypeKey=@plScopeTypeKey))
		And IsDate(r.dtAprRecvd)=1 
		And IsDate(r.dtDateOut)=1
		And ((IsNull(@pdtStartDate,'1/1/1753')='1/1/1753') Or (r.dtDateOut >= Convert(Date,@pdtStartDate)))
		And ((IsNull(@pdtEndDate,'1/1/1753')='1/1/1753') Or (r.dtDateOut < DateAdd(day,1,Convert(Date,@pdtEndDate))))
		And ((ISNULL(@plContractKey,0)=0) Or (dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn) = @plContractKey))
		And (
				(IsNull(@plContractKey,0)>0)
				Or
				((@psContractStatus='A' Or (@psContractStatus='N' And dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn)=0) Or (@psContractStatus = 'C' And dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn)>0)))
			)
		And ((IsNull(@psRigidOrFlexible,'A')='A') Or (st.sRigidOrFlexible=@psRigidOrFlexible))
		And (	(ISNULL(@pdtEffectiveDate,'1/1/1753')='1/1/1753') 
			Or	((co.dtDateEffective <= @pdtEffectiveDate) And ((co.dtDateTermination Is Null) Or (co.dtDateTermination>=@pdtEffectiveDate)))
			)
		And ((@plReportType <> 3) Or (ct.lContractKey Is Not Null))
	

	Insert Into #Repairs ( lRepairKey, dblAmtRepair, dblOutsourceAmount, sShipState, bFlexible, dtDateOut )
	--Select r.lRepairKey, r.dblAmtRepair, r.dblOutSourceCost, re.sShipState, re.bFlexible, re.dtDateOut
	Select r.lRepairKey, i.dblTranAmount, r.dblOutSourceCost, re.sShipState, re.bFlexible, re.dtDateOut
	From #Results re join dbo.tblRepair r on (re.lRepairKey=r.lRepairKey)
		join dbo.tblInvoice i on (re.lRepairKey=i.lRepairKey)
	Where i.bFinalized=1
	--Group By r.lRepairKey, r.dblAmtRepair, r.dblOutSourceCost, re.sShipState, re.bFlexible, re.dtDateOut
	Group By r.lRepairKey, i.dblTranAmount, r.dblOutSourceCost, re.sShipState, re.bFlexible, re.dtDateOut

	Create Index idxResults_RepairKey On #Results ( lRepairKey )
	
	Declare @nShippingCost decimal(10,2)

	Set @i = 1
	While (Select COUNT(*) From #Repairs)>=@i
		BEGIN
			Select @lRepairKey = lRepairKey From #Repairs Where ID = @i

			--Inventory Costs
			Insert Into #InventoryByRepair ( lRepairKey, lRepairItemTranKey, sItemDescription, sSizeDescription, dblInventorySizeRepairAmount )
			Select @lRepairKey, ISNULL(c.lRepairItemTranKey,-1), c.sItemDescription, c.sSizeDescription, c.InventoryCost
			From dbo.fn_RepairInventoryCost(@lRepairKey,0) c
			
			------Labor Costs
			Insert Into #LaborCosts ( lRepairKey, lRepairItemTranKey, LaborCost ) 
			Select @lRepairKey, c.lRepairItemTranKey, c.LaborCost 
			From dbo.fn_GetRepairLaborCosts(@lRepairKey) c join #Results r on (c.lRepairKey=r.lRepairKey) And (c.lRepairItemTranKey=r.lRepairItemTranKey)

			--Add Final Inspection Labor Cost
			Insert Into #LaborCosts ( lRepairKey, lRepairItemTranKey, LaborCost )
			Select @lRepairKey, 0, c.LaborCost
			From dbo.fn_GetRepairLaborCosts(@lRepairKey) c 
			Where c.lRepairItemKey=0 And c.lRepairItemTranKey=0 And c.sItemDescription='Final Inspection'
			
			--Shipping Costs
			--if @pbExcludeShipping=0
			--	BEGIN
			--		Select @nShippingCost = a.ShippingAmount From dbo.fn_RepairExpenseSummary(@lRepairKey) a 
			--		Update #Repairs Set ShippingCost = @nShippingCost Where ID = @i
			--	END

			--GPO And Commissions
			Update r
			Set GPOCost = e.GPOAmount, Commissions = e.CommissionAmount, ShippingCost = Case When @pbExcludeShipping = 1 Then Null Else e.ShippingAmount End
			From #Repairs r join dbo.fn_RepairExpenseSummary(@lRepairKey) e on (r.lRepairKey = e.lRepairKey)
			Where r.lRepairKey = @lRepairKey

			Set @i = @i + 1
		END
		
	--Add repair item for "Unknown" if we have inventory not associated with repair items
	Insert Into #Results ( lRepairKey, sClientName1, sDepartmentName, dtDateOut, sWorkOrderNumber, lScopeTypeKey, sScopeTypeDesc, sSerialNumber, lRepairItemTranKey, lRepairItemKey, RepairItem, lTechnicianKey, sShipState, bFlexible, dtEffectiveDate, dtTerminationDate, sContractName, lContractKey )
	Select r.lRepairKey, r.sClientName1, r.sDepartmentName, r.dtDateOut, r.sWorkOrderNumber, r.lScopeTypeKey, r.sScopeTypeDesc, r.sSerialNumber, -1, 0, 'Unknown', re.lTechnicianKey, r.sShipState, r.bFlexible, r.dtEffectiveDate, r.dtTerminationDate, r.sContractName, r.lContractKey
	From #Results r join dbo.tblRepair re on (r.lRepairKey=re.lRepairKey)
		join #InventoryByRepair i on (r.lRepairKey=i.lRepairKey)
	Where i.lRepairItemTranKey=-1
	Group By r.lRepairKey, r.sClientName1, r.sDepartmentName, r.dtDateOut, r.sWorkOrderNumber, r.lScopeTypeKey, r.sScopeTypeDesc, r.sSerialNumber, re.lTechnicianKey, r.sShipState, r.bFlexible, r.dtEffectiveDate, r.dtTerminationDate, r.sContractName, r.lContractKey


	--Add repair item for Final Inspection if necessary
	Insert Into #Results ( lRepairKey, sClientName1, sDepartmentName, dtDateOut, sWorkOrderNumber, lScopeTypeKey, sScopeTypeDesc, sSerialNumber, lRepairItemTranKey, lRepairItemKey, RepairItem, lTechnicianKey, sShipState, bFlexible, dtEffectiveDate, dtTerminationDate, sContractName, lContractKey )
	Select r.lRepairKey, r.sClientName1, r.sDepartmentName, r.dtDateOut, r.sWorkOrderNumber, r.lScopeTypeKey, r.sScopeTypeDesc, r.sSerialNumber, 0, 0, 'Final Inspection', re.lTechnicianKey, r.sShipState, r.bFlexible, r.dtEffectiveDate, r.dtTerminationDate, r.sContractName, r.lContractKey
	From #Results r join dbo.tblRepair re on (r.lRepairKey=re.lRepairKey)
		join #LaborCosts lc on (r.lRepairKey=lc.lRepairKey)
	Where lc.lRepairItemTranKey=0
	Group By r.lRepairKey, r.sClientName1, r.sDepartmentName, r.dtDateOut, r.sWorkOrderNumber, r.lScopeTypeKey, r.sScopeTypeDesc, r.sSerialNumber, re.lTechnicianKey, r.sShipState, r.bFlexible, r.dtEffectiveDate, r.dtTerminationDate, r.sContractName, r.lContractKey
	

	--Update Repair Level
	Update #Results Set RepairLevel = dbo.fnRepairLevel(lRepairKey)

	----Shipping Costs 
	--if @pbExcludeShipping = 0
	--	Begin
	--		Declare @RepairKeys typIDs
	--		Insert Into @RepairKeys ( ID ) Select lRepairKey From #Repairs Group By lRepairKey

	--		Update r
	--		Set ShippingCost = c.ShippingCharge, ShippingCount = c.ShippingCount
	--		From #Repairs r join dbo.fnRepairShippingChargesTotalFromIDs(@RepairKeys) c on (r.lRepairKey=c.lRepairKey)

	--		--Update r
	--		--Set ShippingCost = c.ShippingCharge, ShippingCount = c.ShippingCount
	--		--From #Repairs r join dbo.fnRepairShippingChargesTotal(0) c on (r.lRepairKey=c.lRepairKey)
			
	--		--(	Select lRepairKey, Sum(IsNull(a.InboundCharge,0)+IsNull(OutboundCharge,0)) As ShippingCharge
	--		--	From dbo.fnRepairShippingCharges('1/1/1900','12/31/3000') a
	--		--	Group By lRepairKey
	--		--) c on (r.lRepairKey = c.lRepairKey)

	--		--Add default shipping charges if no real charges exist
	--		Update r Set ShippingCost = f.nShippingFee * Case When ISNULL(r.ShippingCount,0)=0 Then 2 Else 1 End 
	--		From #Repairs r join tblStates s on (r.sShipState=s.StateCode)
	--			join tblShippingFees f on (s.lShippingAreaKey = f.lShippingAreaKey) And (r.bFlexible = f.bFlexible)
	--		Where f.dtFeeStartDate <= r.dtDateOut And ((f.dtFeeEndDate Is Null) Or (f.dtFeeEndDate >= r.dtDateOut))
	--			And ISNULL(r.ShippingCount,0) < 2
			
	--		--(Double for incoming and outgoing shipping)
	--		--Update r Set ShippingCost = f.nShippingFee * 2
	--		--From #Results r join tblStates s on (r.sShipState=s.StateCode)
	--		--	join tblShippingFees f on (s.lShippingAreaKey = f.lShippingAreaKey) And (r.bFlexible = f.bFlexible)
	--		--Where f.dtFeeStartDate <= r.dtDateOut And ((f.dtFeeEndDate Is Null) Or (f.dtFeeEndDate >= r.dtDateOut))
	--	End


	--Add contract invoices if necessary
	If @psContractStatus <> 'N' 
		Begin
			Insert Into #Results ( lContractKey, sClientName1, sDepartmentName, dtDateOut, sWorkOrderNumber, dblAmtRepair, dtEffectiveDate, dtTerminationDate, sContractName )
			Select i.lContractKey, c.sClientName1, d.sDepartmentName, i.dtTranDate, i.sTranNumber, i.dblTranAmount, co.dtDateEffective, co.dtDateTermination, co.sContractName1
			From tblInvoice i join tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
				join tblClient c on (d.lClientKey = c.lClientKey)
				left join #SubGroupDepts gd on (i.lDepartmentKey = gd.lDepartmentKey)
				left join tblContract co on (i.lContractKey = co.lContractKey)
				left join #Contracts ct on (i.lContractKey = ct.lContractKey)
			Where --IsNull(i.lContractKey,0)>0 
				(SUBSTRING(i.sTranNumber,1,1)='C' Or SUBSTRING(i.sTranNumber,2,1)='C' Or SUBSTRING(i.sTranNumber,2,1)='P')
				And ((IsNull(@plClientKey,0)=0) Or (c.lClientKey=@plClientKey))
				And ((ISNULL(@plSubGroupKey,0)=0) Or (gd.lDepartmentKey Is Not Null))
				And ((IsNull(@pdtStartDate,'1/1/1753')='1/1/1753') Or (i.dtTranDate >= Convert(Date,@pdtStartDate)))
				And ((IsNull(@pdtEndDate,'1/1/1753')='1/1/1753') Or (i.dtTranDate < DateAdd(day,1,Convert(Date,@pdtEndDate))))
				And ((ISNULL(@plContractKey,0)=0) Or (i.lContractKey = @plContractKey))
				And ((@plReportType <> 3) Or (ct.lContractKey Is Not Null))
		End


	Create Index idxResults_RepairItemTran On #Results ( lRepairItemTranKey ) 
	Create Index idxInventoryByRepair On #InventoryByRepair ( lRepairItemTranKey )
	Create Index idxLaborCost On #LaborCosts ( lRepairKey ) 

	Update r Set dtInvoiceDate = i.dtTranDate From #Results r join dbo.tblInvoice i on (r.lRepairKey=i.lRepairKey) Where i.bFinalized=1 
	Update r Set dtInvoiceDate = i.dtTranDate From #Results r join dbo.tblInvoice i on (r.lContractKey=i.lContractKey) Where i.bFinalized=1 And ISNULL(i.lRepairKey,0)=0 And ISNULL(r.lRepairKey,0)=0

	--If @plReportType = 1
	--	--Summary per Work Order
	--	Select sClientName1, sDepartmentName, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, dblAmtRepair, r.dblOutSourceCost, Sum(dblInventorySizeRepairAmount) As InventorySizeRepairAmount, lc.LaborCost, ShippingCost
	--	From #Results r left join #InventoryByRepair i on (r.lRepairItemTranKey=i.lRepairItemTranKey)
	--		left join (Select lRepairKey, Sum(LaborCost) As LaborCost From #LaborCosts Group By lRepairKey)  lc on (r.lRepairKey=lc.lRepairKey)
	--	Group By sClientName1, sDepartmentName, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, dblAmtRepair, dblOutSourceCost, lc.LaborCost, ShippingCost 
	--	Order By sClientName1, sDepartmentName, sWorkOrderNumber
	
	If @plReportType = 1 Or @plReportType = 2 
		BEGIN
			--Select sClientName1, sDepartmentName, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, dblAmtRepair, r.dblOutSourceCost, RepairItem, sItemDescription, sSizeDescription, dblInventorySizeRepairAmount As InventorySizeRepairAmount, lc.LaborCost, ShippingCost
			--From #Results r left join #InventoryByRepair i on (r.lRepairItemTranKey=i.lRepairItemTranKey)
			--	left join #LaborCosts lc on (i.lRepairItemTranKey=lc.lRepairItemTranKey)
			--Order By sClientName1, sDepartmentName, sWorkOrderNumber, RepairItem, sItemDescription, sSizeDescription

			Create Table #FullResults
				(
					ID int identity(1,1),
					lRepairKey int, 
					lContractKey int,
					lRepairItemTranKey int,
					sClientName1 nvarchar(100), 
					sDepartmentName nvarchar(100), 
					sWorkOrderNumber nvarchar(50), 
					sScopeTypeDesc nvarchar(100), 
					sSerialNumber nvarchar(100), 
					InvoiceDate date,
					RepairItem nvarchar(100),
					sItemDescription nvarchar(200),
					sSizeDescription nvarchar(200),
					dblAmtRepair decimal(10,2), 
					dblOutSourceCost decimal(10,2),
					ShippingCost decimal(10,2),
					LaborCost decimal(10,2),
					InventoryCost decimal(10,2),
					GPOCost decimal(10,2),
					Commissions decimal(10,2),
					RepairLevel nvarchar(50)
				)

			Insert Into #FullResults ( lRepairKey, lContractKey, lRepairItemTranKey, sClientName1, sDepartmentName, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, InvoiceDate,
				RepairItem, sItemDescription, sSizeDescription, InventoryCost, RepairLevel )
			Select r.lRepairKey, r.lContractKey, r.lRepairItemTranKey, r.sClientName1, r.sDepartmentName, r.sWorkOrderNumber, r.sScopeTypeDesc, r.sSerialNumber, r.dtInvoiceDate,
				r.RepairItem, i.sItemDescription, i.sSizeDescription, i.dblInventorySizeRepairAmount, r.RepairLevel
			From #Results r left join #InventoryByRepair i on (r.lRepairKey=i.lRepairKey) And (r.lRepairItemTranKey=i.lRepairItemTranKey)
			Order By r.sClientName1, r.sDepartmentName, r.sWorkOrderNumber, Case When r.RepairItem='Final Inspection' Then 'ZZZZZZ' Else r.RepairItem End, i.sItemDescription, i.sSizeDescription

			--Add Labor Costs
			Update r 
			Set LaborCost = lc.LaborCost 
			From #FullResults r join (
										Select r.lRepairKey, r.lRepairItemTranKey, Min(r.ID) As ID 
										From #FullResults r 
										Group By r.lRepairKey, r.lRepairItemTranKey
									) a on (r.ID=a.ID)
				join #LaborCosts lc on (a.lRepairKey=lc.lRepairKey) And (a.lRepairItemTranKey=lc.lRepairItemTranKey)

			--Add Repair Costs
			Update r
			Set dblAmtRepair = re.dblAmtRepair, dblOutSourceCost = re.dblOutsourceAmount, ShippingCost = re.ShippingCost, GPOCost = re.GPOCost, Commissions = re.Commissions
			From #FullResults r join (
										Select r.lRepairKey, Min(r.ID) As ID
										From #FullResults r
										Group By r.lRepairKey
									) a on (r.ID = a.ID)
				join #Repairs re on (r.lRepairKey = re.lRepairKey)

			Update r 
			Set dblAmtRepair = re.dblAmtRepair
			From #FullResults r join #Results re on (r.sWorkOrderNumber=re.sWorkOrderNumber)
			Where (SUBSTRING(r.sWorkOrderNumber,1,1)='C' Or SUBSTRING(r.sWorkOrderNumber,2,1)='C' Or SUBSTRING(r.sWorkOrderNumber,2,1)='P') 

			If @plReportType = 1 
				Select r.sClientName1, r.sDepartmentName, r.sWorkOrderNumber, r.sScopeTypeDesc, r.sSerialNumber, r.InvoiceDate,
					Sum(ISNULL(r.dblAmtRepair,0)) as dblAmtRepair, 
					Sum(ISNULL(r.dblOutSourceCost,0)) As dblOutSourceCost, 
					Sum(ISNULL(r.InventoryCost,0)) As InventorySizeRepairAmount, 
					Sum(ISNULL(r.LaborCost,0)) As LaborCost, 
					Sum(ISNULL(r.ShippingCost,0)) As ShippingCost,
					Sum(ISNULL(r.GPOCost,0)) As GPOCost,
					Sum(ISNULL(r.Commissions,0)) As Commissions,
					r.RepairLevel
				From #FullResults r
				Group By r.sClientName1, r.sDepartmentName, r.sWorkOrderNumber, r.sScopeTypeDesc, r.sSerialNumber, r.InvoiceDate, r.RepairLevel
				Order By sClientName1, sDepartmentName, sWorkOrderNumber
			else
				Select r.sClientName1, r.sDepartmentName, r.sWorkOrderNumber, r.sScopeTypeDesc, r.sSerialNumber, r.InvoiceDate, r.dblAmtRepair, r.dblOutSourceCost, 
					r.RepairItem, r.sItemDescription, r.sSizeDescription, r.InventoryCost As InventorySizeRepairAmount, r.LaborCost, r.ShippingCost, r.GPOCost, r.Commissions, r.RepairLevel
				From #FullResults r
				Order By ID

			--Testing Only
			--Select r.lRepairKey, Sum(r.dblAmtRepair) As RepairAmount, Sum(r.dblOutSourceCost) As OutsourceAmount, 
			--	Sum(r.ShippingCost) As Shipping, Sum(r.LaborCost) As Labor, Sum(r.InventoryCost) As Inventory
			--From #FullResults r
			--Group By r.lRepairKey
			--Order By r.lRepairKey


			Drop Table #FullResults
		END
	If @plReportType = 3
		BEGIN
			CREATE TABLE #AllContractsResults
				(
					lContractKey int,
					sContractName nvarchar(200),
					sClientName1 nvarchar(200),
					dtEffectiveDate date,
					dtTerminationDate date,
					Revenue decimal(10,2),
					OutsourceCost decimal(10,2),
					InventoryCost decimal(10,2),
					LaborCost decimal(10,2),
					ShippingCost decimal(10,2),
					GPOCost decimal(10,2),
					Commissions decimal(10,2),
					GrossProfit decimal(10,2),
					ProfitPercentage decimal(10,4),
					NumberOfRepairs int,
					SalesRep nvarchar(100),
					InvoiceDate date,
					RepairLevel nvarchar(50)
				)

			;WITH TOTALS AS 
				(
					Select r.lContractKey , r.sContractName, r.dtEffectiveDate, r.dtTerminationDate, r.sClientName1, r.dblAmtRepair, r.dblOutSourceCost, 
						Sum(dblInventorySizeRepairAmount) As InventorySizeRepairAmount, lc.LaborCost, ShippingCost, GPOCost, Commissions, sWorkOrderNumber, r.dtInvoiceDate, r.RepairLevel
					From #Results r left join #InventoryByRepair i on (r.lRepairItemTranKey=i.lRepairItemTranKey)
						left join (Select lRepairKey, Sum(LaborCost) As LaborCost From #LaborCosts Group By lRepairKey)  lc on (r.lRepairKey=lc.lRepairKey)
					Group By r.lContractKey, r.sContractName, r.dtEffectiveDate, r.dtTerminationDate, r.sClientName1, r.dblAmtRepair, r.dblOutSourceCost, lc.LaborCost, ShippingCost, GPOCost, Commissions, sWorkOrderNumber, r.dtInvoiceDate, r.RepairLevel
				)
			Insert Into #AllContractsResults ( lContractKey, sContractName, dtEffectiveDate, dtTerminationDate, sClientName1, Revenue, OutsourceCost,
				InventoryCost, LaborCost, ShippingCost, GPOCost, Commissions, NumberOfRepairs, InvoiceDate, RepairLevel ) 
			Select a.lContractKey, a.sContractName, a.dtEffectiveDate, a.dtTerminationDate, a.sClientName1, Sum(a.dblAmtRepair) As Revenue, Sum(a.dblOutSourceCost) as OutsourceCost,
				Sum(a.InventorySizeRepairAmount) as InventoryCost, Sum(a.LaborCost) as LaborCost, Sum(a.ShippingCost) As ShippingCost, SUM(a.GPOCost) As GPOCosts, 
				SUM(a.Commissions) As Commissions, COUNT(a.lContractKey) As cnt, a.dtInvoiceDate,
				a.RepairLevel
			From TOTALS a 
			Group By a.lContractKey, a.sContractName, a.dtEffectiveDate, a.dtTerminationDate, a.sClientName1, a.dtInvoiceDate, a.RepairLevel

			Update #AllContractsResults
			Set GrossProfit = (Revenue - ISNULL(OutsourceCost,0) - ISNULL(InventoryCost,0) - ISNULL(LaborCost,0) - ISNULL(ShippingCost,0) - ISNULL(GPOCost,0) - ISNULL(Commissions,0)),
				ProfitPercentage = (Revenue - ISNULL(OutsourceCost,0) - ISNULL(InventoryCost,0) - ISNULL(LaborCost,0) - ISNULL(ShippingCost,0) - ISNULL(GPOCost,0) - ISNULL(Commissions,0)) / Revenue
			Where ISNULL(Revenue,0) <> 0

			Update #AllContractsResults
			Set GrossProfit = 0, ProfitPercentage = 0 
			Where ISNULL(Revenue,0) = 0 

			Create Index idxAllContracts On #AllContractsResults ( lContractKey ) 

			Update a
			Set SalesRep = LTrim(Rtrim(LTrim(Rtrim(IsNull(sr.sRepFirst,''))) + ' ' + LTrim(Rtrim(IsNull(sr.sRepLast,'')))))
			From #AllContractsResults a join tblContract c on (a.lContractKey = c.lContractKey)
				join tblSalesRep sr on (c.lSalesRepKey = sr.lSalesRepKey)

			Select r.sClientName1, r.dtEffectiveDate, r.dtTerminationDate, r.SalesRep, r.InvoiceDate, r.Revenue, r.OutsourceCost, r.InventoryCost,	
				r.LaborCost, r.ShippingCost, r.GPOCost, r.Commissions, r.GrossProfit, r.ProfitPercentage, r.NumberOfRepairs, r.RepairLevel
			From #AllContractsResults r
			Order By r.sClientName1

			DROP TABLE #AllContractsResults
		END

	Drop Table #Contracts
	Drop Table #Repairs
	Drop Table #InventoryByRepair
	Drop Table #LaborCosts
	Drop Table #Results
	Drop Table #SubGroupDepts
END
