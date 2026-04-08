CREATE PROCEDURE [dbo].[rptRevenuePerSalesRep]
	(
		@pdtStartDate date,
		@pdtEndDate date,
		@plSalesRepKey int
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptRevenuePerSalesRep @pdtStartDate='1/1/2014', @pdtEndDate='12/31/2014', @@plSalesRepKey=0

	Create Table #Invoices
		(
			lInvoiceKey int,
			lClientKey int,
			lDepartmentKey int,
			lSalesRepKey int,
			sSalesRep nvarchar(100),
			sClientName nvarchar(200),
			sDepartmentName nvarchar(200),
			sInstrumentTypeSmall nvarchar(1),
			bLargeDiameter bit,
			sInstrumentType nvarchar(50),
			nRevenue decimal(10,2),
			nRevenueSalesRep decimal(10,2),
			nRevenueClient decimal(10,2),
			nRevenueDepartment decimal(10,2),
			dtLastRepair date
		)

	--Repair Invoices
	Insert Into #Invoices ( lInvoiceKey, lSalesRepKey, lClientKey, lDepartmentKey, sSalesRep, sClientName, sDepartmentName, sInstrumentTypeSmall, bLargeDiameter, sInstrumentType, nRevenue )
	Select i.lInvoiceKey, i.lSalesRepKey, c.lClientKey, r.lDepartmentKey, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As RepName, c.sClientName1, d.sDepartmentName, st.sRigidOrFlexible, IsNull(sc.bLargeDiameter,0),
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
		join dbo.tblSalesRep sr on (i.lSalesRepKey = sr.lSalesRepKey)
	Where i.bFinalized = 1 And i.lSalesRepKey = @plSalesRepKey
		And i.dtTranDate >= @pdtStartDate And i.dtTranDate < DATEADD(day,1,@pdtEndDate)
	 Group By i.lInvoiceKey, i.lSalesRepKey, c.lClientKey, r.lDepartmentKey, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))), c.sClientName1, d.sDepartmentName, st.sRigidOrFlexible, IsNull(sc.bLargeDiameter,0),
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
	Insert Into #Invoices ( lInvoiceKey, lClientKey, lDepartmentKey, lSalesRepKey, sSalesRep, sClientName, sDepartmentName, sInstrumentType, nRevenue )
	Select i.lInvoiceKey, c.lClientKey, i.lDepartmentKey, i.lSalesRepKey, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As RepName, c.sClientName1, d.sDepartmentName, 'Contract' As InstrumentType, SUM(i.dblTranAmount) As Amt 
	From dbo.tblInvoice i join dbo.tblContract co on (i.lContractKey = co.lContractKey)
		join dbo.tblClient c on (co.lClientKey = c.lClientKey)
		left join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblSalesRep sr on (i.lSalesRepKey = sr.lSalesRepKey)
	Where i.bFinalized = 1 And i.lSalesRepKey = @plSalesRepKey
		And i.dtTranDate >= @pdtStartDate And i.dtTranDate < DATEADD(day,1,@pdtEndDate)
		And ISNULL(i.lRepairKey,0)=0
	Group By i.lInvoiceKey, c.lClientKey, i.lDepartmentKey, i.lSalesRepKey, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))), c.sClientName1, d.sDepartmentName


	Update i
	Set nRevenueClient = c.RevenueClient
	From #Invoices i join (Select lClientKey, SUM(nRevenue) as RevenueClient From #Invoices Group By lClientKey) c on (i.lClientKey=c.lClientKey)

	Update i
	Set nRevenueDepartment = c.RevenueDept
	From #Invoices i join (Select lClientKey, lDepartmentKey, SUM(nRevenue) as RevenueDept From #Invoices Group By lClientKey, lDepartmentKey) c on (i.lClientKey=c.lClientKey) And (i.lDepartmentKey = c.lDepartmentKey)

	Update i
	Set nRevenueSalesRep = s.RevenueSalesRep
	From #Invoices i join (Select lSalesRepKey, SUM(nRevenue) as RevenueSalesRep From #Invoices Group By lSalesRepKey) s on (i.lSalesRepKey=s.lSalesRepKey)

	Update i
	Set dtLastRepair = d.MaxDateIn
	From #Invoices i join 
		(	Select i.lDepartmentKey, MAX(r.dtDateIn) As MaxDateIn 
			From #Invoices i join dbo.tblRepair r on (i.lDepartmentKey = r.lDepartmentKey) 
			Group By i.lDepartmentKey
		) d on (i.lDepartmentKey = d.lDepartmentKey)


	Select i.sSalesRep, i.sClientName, i.sDepartmentName, i.sInstrumentType, i.nRevenueSalesRep, i.nRevenueClient, i.nRevenueDepartment, SUM(i.nRevenue) As RevenueInstrumentType, i.dtLastRepair
	From #Invoices i 
	Group By i.sSalesRep, i.sClientName, i.sDepartmentName, i.sInstrumentType, i.nRevenueSalesRep, i.nRevenueClient, i.nRevenueDepartment, i.dtLastRepair,
		Case	When i.sInstrumentType='Contract' Then 99
				When i.sInstrumentType='Cart' Then 98
				When i.sInstrumentTypeSmall = 'F' Then 1
				When i.sInstrumentTypeSmall = 'R' Then 2
				When i.sInstrumentTypeSmall = 'C' Then 3
				When i.sInstrumentTypeSmall = 'I' Then 4
				Else 100
		END
	Order By i.sSalesRep, i.sClientName, i.sDepartmentName,
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
