CREATE PROCEDURE [dbo].[rptSalesRepLeaderboard]
	(
		@pdtMonth date,
		@psReportType nvarchar(50)
	)	
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptSalesRepLeaderboard @pdtMonth='11/1/2019', @psReportType='Summary'
	--exec dbo.rptSalesRepLeaderboard @pdtMonth='11/1/2019', @psReportType='New Customers'
	--exec dbo.rptSalesRepLeaderboard @pdtMonth='11/1/2019', @psReportType='Work Orders'

	Declare @dtStartDate date
	Declare @dtEndDate date

	Set @dtStartDate = dbo.fn_FirstOfMonth(@pdtMonth)
	Set @dtEndDate = DATEADD(month,1,@dtStartDate)

	Create Table #NewCustomers
		(
			lSalesRepKey int,
			lClientKey int,
			lDepartmentKey int,
			dtCustomerSince date
		)

	Create Table #Invoices
		(
			lSalesRepKey int,
			lInvoiceKey int,
			lRepairKey int,
			lClientKey int,
			lDepartmentKey int,
			lScopeKey int,
			sWorkOrderNumber nvarchar(50),
			sInstrumentType nvarchar(1),
			dtDateIn date,
			dtTranDate date,
			InvoiceAmount decimal(10,2)
		)

	Create Table #Summary
		(
			lSalesRepKey int,
			RepName nvarchar(100),
			NewCustomerCount int,
			FlexCount int,
			RigidCount int,
			CameraCount int,
			InstrumentCount int
		)

	Insert Into #NewCustomers ( lSalesRepKey, lClientKey, lDepartmentKey, dtCustomerSince )
	Select d.lSalesRepKey, d.lClientKey, d.lDepartmentKey, d.dtCustomerSince
	From dbo.tblDepartment d
	Where d.dtCustomerSince >= @dtStartDate And d.dtCustomerSince < @dtEndDate

	If @psReportType = 'New Customers'
		BEGIN
			Select dbo.fn_FullName(ISNULL(sr.sRepFirst,''), ISNULL(sr.sRepLast,'')) As RepName,
				c.sClientName1, d.sDepartmentName, d.dtCustomerSince 
			From #NewCustomers nc join dbo.tblSalesRep sr on (nc.lSalesRepKey = sr.lSalesRepKey)
				join dbo.tblClient c on (nc.lClientKey = c.lClientKey)
				join dbo.tblDepartment d on (nc.lDepartmentKey = d.lDepartmentKey)
			Order By sr.sRepLast, sr.sRepFirst, c.sClientName1, d.sDepartmentName
		END

	If @psReportType <> 'New Customers'
		BEGIN
			Insert Into #Invoices ( lSalesRepKey, lInvoiceKey, lRepairKey, lClientKey, lDepartmentKey, lScopeKey, sWorkOrderNumber, 
				sInstrumentType, dtDateIn, dtTranDate, InvoiceAmount )
			Select i.lSalesRepKey, i.lInvoiceKey, i.lRepairKey, d.lClientKey, d.lDepartmentKey, r.lScopeKey, r.sWorkOrderNumber, 
				st.sRigidOrFlexible, r.dtDateIn, i.dtTranDate, 
				ISNULL(i.dblTranAmount,0) + ISNULL(i.dblShippingAmt,0) + ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0)
			From dbo.tblInvoice i join dbo.tblRepair r on (i.lRepairKey = r.lRepairKey)
				join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
				join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
			Where d.dtCustomerSince > DATEADD(year,-1, i.dtTranDate)
				And i.dtTranDate >= @dtStartDate
				And i.dtTranDate < @dtEndDate
				And i.bFinalized = 1
				And ISNULL(i.dblTranAmount,0) + ISNULL(i.dblShippingAmt,0) + ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0) > 0

			If @psReportType = 'Work Orders'
				BEGIN
					Select dbo.fn_FullName(ISNULL(sr.sRepFirst,''), ISNULL(sr.sRepLast,'')) As RepName,
						c.sClientName1, d.sDepartmentName, 
						Case i.sInstrumentType
							When 'F' Then 'Flexible'
							When 'R' Then 'Rigid'
							When 'I' Then 'Instrument'
							When 'C' Then 'Camera'
						End As sInstrumentType, 
						i.sWorkOrderNumber, i.dtDateIn, st.sScopeTypeDesc,
						s.sSerialNumber, i.dtTranDate, i.InvoiceAmount
					From #Invoices i join dbo.tblSalesRep sr on (i.lSalesRepKey = sr.lSalesRepKey)
						join dbo.tblClient c on (i.lClientKey = c.lClientKey)
						join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
						join dbo.tblScope s on (i.lScopeKey = s.lScopeKey)
						join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
					Order By sr.sRepLast, sr.sRepFirst, 
						Case i.sInstrumentType
							When 'F' Then 'Flexible'
							When 'R' Then 'Rigid'
							When 'I' Then 'Instrument'
							When 'C' Then 'Camera'
						End, c.sClientName1, d.sDepartmentName, i.sWorkOrderNumber
				END
			else
				BEGIN
					Insert Into #Summary ( lSalesRepKey, RepName, NewCustomerCount )
					Select nc.lSalesRepKey, dbo.fn_FullName(ISNULL(sr.sRepFirst,''), ISNULL(sr.sRepLast,'')) As RepName,
						COUNT(nc.lDepartmentKey)
					From #NewCustomers nc join dbo.tblSalesRep sr on (nc.lSalesRepKey = sr.lSalesRepKey)
					Group By nc.lSalesRepKey, dbo.fn_FullName(ISNULL(sr.sRepFirst,''), ISNULL(sr.sRepLast,''))

					Insert Into #Summary ( lSalesRepKey, RepName, NewCustomerCount ) 
					Select a.lSalesRepKey, a.RepName, 0 
					From (
							Select i.lSalesRepKey, dbo.fn_FullName(ISNULL(sr.sRepFirst,''), ISNULL(sr.sRepLast,'')) As RepName
							From #Invoices i join dbo.tblSalesRep sr on (i.lSalesRepKey = sr.lSalesRepKey)
							Group By i.lSalesRepKey, dbo.fn_FullName(ISNULL(sr.sRepFirst,''), ISNULL(sr.sRepLast,''))
						) a left join #Summary s on (a.lSalesRepKey = s.lSalesRepKey)
					Where s.lSalesRepKey Is Null

					Update s
					Set FlexCount = a.cnt
					From #Summary s 
						join (	Select i.lSalesRepKey, Count(i.lInvoiceKey) As cnt 
								From #Invoices i 
								Where i.sInstrumentType = 'F'
								Group By i.lSalesRepKey
							 ) a on (s.lSalesRepKey = a.lSalesRepKey)

					Update s
					Set RigidCount = a.cnt
					From #Summary s 
						join (	Select i.lSalesRepKey, Count(i.lInvoiceKey) As cnt 
								From #Invoices i 
								Where i.sInstrumentType = 'R'
								Group By i.lSalesRepKey
							 ) a on (s.lSalesRepKey = a.lSalesRepKey)

					Update s
					Set CameraCount = a.cnt
					From #Summary s 
						join (	Select i.lSalesRepKey, Count(i.lInvoiceKey) As cnt 
								From #Invoices i 
								Where i.sInstrumentType = 'C'
								Group By i.lSalesRepKey
							 ) a on (s.lSalesRepKey = a.lSalesRepKey)

					Update s
					Set InstrumentCount = a.cnt
					From #Summary s 
						join (	Select i.lSalesRepKey, Count(i.lInvoiceKey) As cnt 
								From #Invoices i 
								Where i.sInstrumentType = 'I'
								Group By i.lSalesRepKey
							 ) a on (s.lSalesRepKey = a.lSalesRepKey)

					Select s.RepName, s.NewCustomerCount, s.FlexCount, s.RigidCount, s.CameraCount, s.InstrumentCount 
					From #Summary s join dbo.tblSalesRep sr on (s.lSalesRepKey=sr.lSalesRepKey)
					Order By sr.sRepLast, sr.sRepFirst
				END
		END
			
	Drop Table #NewCustomers
	Drop Table #Invoices
	Drop Table #Summary
END
