CREATE PROCEDURE [dbo].[rptRevenuePerStateAndSalesRep]
	(
		@pdtStartDate date,
		@pdtEndDate date,
		@psShipState nvarchar(2) = '',
		@plSalesRepKey int = 0 
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptRevenuePerStateAndSalesRep @pdtStartDate='1/1/2020', @pdtEndDate='12/31/2020', @psShipState='PA'
	--exec dbo.rptRevenuePerStateAndSalesRep @pdtStartDate='1/1/2020', @pdtEndDate='12/31/2020', @plSalesRepKey=197

	Create Table #Invoices
		(
			lInvoiceKey int,
			lClientKey int,
			lDepartmentKey int,
			sShipState nvarchar(50),
			sClientName nvarchar(300),
			sDepartmentName nvarchar(300),
			sInstrumentTypeSmall nvarchar(1),
			bLargeDiameter bit,
			sInstrumentType nvarchar(50),
			nRevenue decimal(10,2),
			nRevenueState decimal(10,2),
			nRevenueDepartment decimal(10,2),
			nRevenueSalesRep decimal(10,2),
			nRevenueClient decimal(10,2),
			lInstrumentCount int,
			lSalesRepKey int,
			dtLastRepair date
		)

	--Repair Invoices
	Insert Into #Invoices ( lInvoiceKey, lClientKey, lDepartmentKey, sShipState, sClientName, sDepartmentName, sInstrumentTypeSmall, bLargeDiameter, sInstrumentType, nRevenue, lSalesRepKey )
	Select i.lInvoiceKey, c.lClientKey, r.lDepartmentKey, i.sShipState, c.sClientName1, d.sDepartmentName, st.sRigidOrFlexible, IsNull(sc.bLargeDiameter,0),
		Case	When st.sScopeTypeDesc = 'Endocart' Then 'Cart'
				Else 
					Case st.sRigidOrFlexible
						When 'F' Then
							Case When IsNull(sc.bLargeDiameter,0)=1 Then 'Flex - Large' Else 'Flex - Small' End
						When 'R' Then 'Rigid'
						When 'C' Then 'Camera'
						When 'I' Then 'Instrument'
					End
		End, SUM(i.dblTranAmount) As Amt, i.lSalesRepKey
	From dbo.tblInvoice i join dbo.tblRepair r on (i.lRepairKey = r.lRepairKey)
		join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		--left join dbo.tblSystemCodes sc on (st.lScopeTypeCatKey=sc.lSystemCodesKey)
		left join dbo.tblScopeTypeCategories sc on (st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey)
	Where i.bFinalized = 1 
		And ((@psShipState='') Or (i.sShipState = @psShipState))
		And ((@plSalesRepKey=0) Or (i.lSalesRepKey = @plSalesRepKey))
		And i.dtTranDate >= @pdtStartDate And i.dtTranDate < DATEADD(day,1,@pdtEndDate)
	Group By i.lInvoiceKey, c.lClientKey, r.lDepartmentKey, i.sShipState, c.sClientName1, d.sDepartmentName, st.sRigidOrFlexible, IsNull(sc.bLargeDiameter,0),
		Case	When st.sScopeTypeDesc = 'Endocart' Then 'Cart'
				Else 
					Case st.sRigidOrFlexible
						When 'F' Then
							Case When IsNull(sc.bLargeDiameter,0)=1 Then 'Flex - Large' Else 'Flex - Small' End
						When 'R' Then 'Rigid'
						When 'C' Then 'Camera'
						When 'I' Then 'Instrument'
					End
		End, i.lSalesRepKey

	--Contract Invoices
	Insert Into #Invoices ( lInvoiceKey, lClientKey, lDepartmentKey, sShipState, sClientName, sDepartmentName, sInstrumentTypeSmall, bLargeDiameter, sInstrumentType, nRevenue, lSalesRepKey )
	Select i.lInvoiceKey, c.lClientKey, i.lDepartmentKey, i.sShipState, c.sClientName1, d.sDepartmentName, 'X' As sInstrumentTypeSmall, 0 As bLargeDiameter, 'Contract' As InstrumentType, SUM(i.dblTranAmount) As Amt, i.lSalesRepKey
	From dbo.tblInvoice i join dbo.tblContract co on (i.lContractKey = co.lContractKey)
		join dbo.tblClient c on (co.lClientKey = c.lClientKey)
		left join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
	Where i.bFinalized = 1 
		And ((@psShipState='') Or (i.sShipState = @psShipState))
		And ((@plSalesRepKey=0) Or (i.lSalesRepKey = @plSalesRepKey))
		And i.dtTranDate >= @pdtStartDate And i.dtTranDate < DATEADD(day,1,@pdtEndDate)
		And ISNULL(i.lRepairKey,0)=0
	Group By i.lInvoiceKey, c.lClientKey, i.lDepartmentKey, i.sShipState, c.sClientName1, d.sDepartmentName, i.lSalesRepKey


	if @psShipState <> ''
		BEGIN
			Update i 
			Set nRevenueSalesRep = c.RevenueSalesRep
			From #Invoices i join (Select sShipState, lSalesRepKey, SUM(nRevenue) as RevenueSalesRep From #Invoices Group By sShipState, lSalesRepKey) c on (i.sShipState=c.sShipState) And (i.lSalesRepKey=c.lSalesRepKey)
		END
	else
		BEGIN
			Update i 
			Set nRevenueSalesRep = c.RevenueSalesRep
			From #Invoices i join (Select lSalesRepKey, SUM(nRevenue) as RevenueSalesRep From #Invoices Group By lSalesRepKey) c on (i.lSalesRepKey=c.lSalesRepKey)
		END

	Update i
	Set nRevenueState = s.RevenueState
	From #Invoices i join (Select sShipState, SUM(nRevenue) as RevenueState From #Invoices Group By sShipState) s on (i.sShipState=s.sShipState)	

	Update i 
	Set nRevenueClient = a.RevenueClient
	From #Invoices i join 
		(	Select i.sShipState, i.lSalesRepKey, i.lClientKey, SUM(i.nRevenue) As RevenueClient
			From #Invoices i 
			Group By i.sShipState, i.lSalesRepKey, i.lClientKey
		) a on (i.sShipState=a.sShipState) And (i.lSalesRepKey=a.lSalesRepKey) and (i.lClientKey=a.lClientKey)
		
	Update i 
	Set nRevenueDepartment = a.RevenueDept
	From #Invoices i join 
		(	Select i.sShipState, i.lSalesRepKey, i.lClientKey, i.lDepartmentKey, SUM(i.nRevenue) As RevenueDept
			From #Invoices i 
			Group By i.sShipState, i.lSalesRepKey, i.lClientKey, i.lDepartmentKey
		) a on (i.sShipState=a.sShipState) And (i.lSalesRepKey=a.lSalesRepKey) and (i.lClientKey=a.lClientKey) And (i.lDepartmentKey=a.lDepartmentKey)


	Update i 
	Set lInstrumentCount = a.cnt
	From #Invoices i join 
		(	Select i.sShipState, i.lSalesRepKey, i.lClientKey, i.sInstrumentTypeSmall, i.bLargeDiameter, Count(i.sInstrumentTypeSmall) As cnt
			From #Invoices i 
			Group By i.sShipState, i.lSalesRepKey, i.lClientKey, i.sInstrumentTypeSmall, i.bLargeDiameter
		) a on (i.sShipState=a.sShipState) And (i.lSalesRepKey=a.lSalesRepKey) and (i.lClientKey=a.lClientKey) And (i.sInstrumentTypeSmall=a.sInstrumentTypeSmall) And (i.bLargeDiameter = a.bLargeDiameter)


	Update i
	Set dtLastRepair = d.MaxDateIn
	From #Invoices i join 
		(	Select i.lDepartmentKey, MAX(r.dtDateIn) As MaxDateIn 
			From #Invoices i join dbo.tblRepair r on (i.lDepartmentKey = r.lDepartmentKey) 
			Group By i.lDepartmentKey
		) d on (i.lDepartmentKey = d.lDepartmentKey)
		

	If @psShipState = ''
		BEGIN
			Select i.lSalesRepKey, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As RepName, s.StateName, i.sClientName, i.sDepartmentName, i.sInstrumentType, i.nRevenueSalesRep, i.nRevenueState, i.nRevenueClient, i.nRevenueDepartment, SUM(i.nRevenue) As RevenueInstrumentType, i.lInstrumentCount, i.dtLastRepair
			From #Invoices i join dbo.tblStates s on (i.sShipState = s.StateCode)
				join dbo.tblSalesRep sr on (i.lSalesRepKey = sr.lSalesRepKey)
			Group By i.lSalesRepKey, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))), i.lSalesRepKey, s.StateName, sr.sRepLast, sr.sRepFirst, i.sClientName, i.sDepartmentName, i.sInstrumentType, i.nRevenueSalesRep, i.nRevenueState, i.nRevenueClient, i.nRevenueDepartment, i.dtLastRepair,
				Case	When i.sInstrumentType='Contract' Then 99
						When i.sInstrumentType='Cart' Then 98
						When i.sInstrumentTypeSmall = 'F' Then 1
						When i.sInstrumentTypeSmall = 'R' Then 2
						When i.sInstrumentTypeSmall = 'C' Then 3
						When i.sInstrumentTypeSmall = 'I' Then 4
						Else 100
				END, i.lInstrumentCount
			Order By sr.sRepLast, sr.sRepFirst, i.lSalesRepKey, s.StateName, i.sClientName, i.sDepartmentName,
				Case	When i.sInstrumentType='Contract' Then 99
						When i.sInstrumentType='Cart' Then 98
						When i.sInstrumentTypeSmall = 'F' Then 1
						When i.sInstrumentTypeSmall = 'R' Then 2
						When i.sInstrumentTypeSmall = 'C' Then 3
						When i.sInstrumentTypeSmall = 'I' Then 4
						Else 100
				END
		END
	else
		BEGIN
			Select i.sShipState, s.StateName, i.lSalesRepKey, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As RepName, i.sClientName, i.sDepartmentName, i.sInstrumentType, i.nRevenueState, i.nRevenueSalesRep, i.nRevenueClient, i.nRevenueDepartment, SUM(i.nRevenue) As RevenueInstrumentType, i.lInstrumentCount, i.dtLastRepair
			From #Invoices i join dbo.tblStates s on (i.sShipState = s.StateCode)
				join dbo.tblSalesRep sr on (i.lSalesRepKey = sr.lSalesRepKey)
			Group By i.sShipState, s.StateName, i.lSalesRepKey, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))), sr.sRepLast, sr.sRepFirst, i.sClientName, i.sDepartmentName, i.sInstrumentType, i.nRevenueState, i.nRevenueSalesRep, i.nRevenueClient, i.nRevenueDepartment, i.dtLastRepair,
				Case	When i.sInstrumentType='Contract' Then 99
						When i.sInstrumentType='Cart' Then 98
						When i.sInstrumentTypeSmall = 'F' Then 1
						When i.sInstrumentTypeSmall = 'R' Then 2
						When i.sInstrumentTypeSmall = 'C' Then 3
						When i.sInstrumentTypeSmall = 'I' Then 4
						Else 100
				END, i.lInstrumentCount
			Order By i.sShipState, sr.sRepLast, sr.sRepFirst, i.lSalesRepKey, i.sClientName, i.sDepartmentName,
				Case	When i.sInstrumentType='Contract' Then 99
						When i.sInstrumentType='Cart' Then 98
						When i.sInstrumentTypeSmall = 'F' Then 1
						When i.sInstrumentTypeSmall = 'R' Then 2
						When i.sInstrumentTypeSmall = 'C' Then 3
						When i.sInstrumentTypeSmall = 'I' Then 4
						Else 100
				END
		END

	Drop Table #Invoices

END
