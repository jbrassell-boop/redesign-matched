CREATE PROCEDURE [dbo].[rptRevenuePerState]
	(
		@pdtStartDate date,
		@pdtEndDate date,
		@psShipState nvarchar(2)
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptRevenuePerState @pdtStartDate='1/1/2014', @pdtEndDate='12/31/2014', @psShipState='PA'

	Create Table #Invoices
		(
			lInvoiceKey int,
			lClientKey int,
			lDepartmentKey int,
			sShipState nvarchar(2),
			sClientName nvarchar(200),
			sDepartmentName nvarchar(200),
			sInstrumentTypeSmall nvarchar(1),
			bLargeDiameter bit,
			sInstrumentType nvarchar(50),
			nRevenue decimal(10,2),
			nRevenueState decimal(10,2),
			nRevenueClient decimal(10,2),
			nRevenueDepartment decimal(10,2),
			dtLastRepair date
		)

	--Repair Invoices
	Insert Into #Invoices ( lInvoiceKey, lClientKey, lDepartmentKey, sShipState, sClientName, sDepartmentName, sInstrumentTypeSmall, bLargeDiameter, sInstrumentType, nRevenue )
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
		End, SUM(i.dblTranAmount) As Amt 
	From dbo.tblInvoice i join dbo.tblRepair r on (i.lRepairKey = r.lRepairKey)
		join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
		--left join dbo.tblSystemCodes sc on (st.lScopeTypeCatKey=sc.lSystemCodesKey)
		left join dbo.tblScopeTypeCategories sc on (st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey)
	Where i.bFinalized = 1 And i.sShipState = @psShipState
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
		End

	--Contract Invoices
	Insert Into #Invoices ( lInvoiceKey, lClientKey, lDepartmentKey, sShipState, sClientName, sDepartmentName, sInstrumentType, nRevenue )
	Select i.lInvoiceKey, c.lClientKey, i.lDepartmentKey, i.sShipState, c.sClientName1, d.sDepartmentName, 'Contract' As InstrumentType, SUM(i.dblTranAmount) As Amt 
	From dbo.tblInvoice i join dbo.tblContract co on (i.lContractKey = co.lContractKey)
		join dbo.tblClient c on (co.lClientKey = c.lClientKey)
		left join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
	Where i.bFinalized = 1 And i.sShipState = @psShipState
		And i.dtTranDate >= @pdtStartDate And i.dtTranDate < DATEADD(day,1,@pdtEndDate)
		And ISNULL(i.lRepairKey,0)=0
	Group By i.lInvoiceKey, c.lClientKey, i.lDepartmentKey, i.sShipState, c.sClientName1, d.sDepartmentName


	Update i
	Set nRevenueClient = c.RevenueClient
	From #Invoices i join (Select lClientKey, SUM(nRevenue) as RevenueClient From #Invoices Group By lClientKey) c on (i.lClientKey=c.lClientKey)

	Update i
	Set nRevenueDepartment = c.RevenueDept
	From #Invoices i join (Select lClientKey, lDepartmentKey, SUM(nRevenue) as RevenueDept From #Invoices Group By lClientKey, lDepartmentKey) c on (i.lClientKey=c.lClientKey) And (i.lDepartmentKey = c.lDepartmentKey)

	Update i
	Set nRevenueState = s.RevenueState
	From #Invoices i join (Select sShipState, SUM(nRevenue) as RevenueState From #Invoices Group By sShipState) s on (i.sShipState=s.sShipState)

	Update i
	Set dtLastRepair = d.MaxDateIn
	From #Invoices i join 
		(	Select i.lDepartmentKey, MAX(r.dtDateIn) As MaxDateIn 
			From #Invoices i join dbo.tblRepair r on (i.lDepartmentKey = r.lDepartmentKey) 
			Group By i.lDepartmentKey
		) d on (i.lDepartmentKey = d.lDepartmentKey)


	Select i.sShipState, s.StateName, i.sClientName, i.sDepartmentName, i.sInstrumentType, i.nRevenueState, i.nRevenueClient, i.nRevenueDepartment, SUM(i.nRevenue) As RevenueInstrumentType, i.dtLastRepair
	From #Invoices i join dbo.tblStates s on (i.sShipState = s.StateCode)
	Group By i.sShipState, s.StateName, i.sClientName, i.sDepartmentName, i.sInstrumentType, i.nRevenueState, i.nRevenueClient, i.nRevenueDepartment, i.dtLastRepair,
		Case	When i.sInstrumentType='Contract' Then 99
				When i.sInstrumentType='Cart' Then 98
				When i.sInstrumentTypeSmall = 'F' Then 1
				When i.sInstrumentTypeSmall = 'R' Then 2
				When i.sInstrumentTypeSmall = 'C' Then 3
				When i.sInstrumentTypeSmall = 'I' Then 4
				Else 100
		END
	Order By i.sShipState, i.sClientName, i.sDepartmentName,
		Case	When i.sInstrumentType='Contract' Then 99
				When i.sInstrumentType='Cart' Then 98
				When i.sInstrumentTypeSmall = 'F' Then 1
				When i.sInstrumentTypeSmall = 'R' Then 2
				When i.sInstrumentTypeSmall = 'C' Then 3
				When i.sInstrumentTypeSmall = 'I' Then 4
				Else 100
		END

	Drop Table #Invoices
END
