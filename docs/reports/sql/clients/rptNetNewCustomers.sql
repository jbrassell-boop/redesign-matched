CREATE PROCEDURE [dbo].[rptNetNewCustomers]
	(
		@plSalesRepKey int = 0,
		@pdtStartDate date,
		@pdtEndDate date,
		@pbSummary bit
	)
AS
BEGIN
	SET NOCOUNT ON;

	Set @pdtEndDate = DATEADD(day,1,@pdtEndDate)

	Create Table #Results
		(
			lSalesRepKey int,
			lInvoiceKey int,
			lClientKey int,
			lDepartmentKey int,
			RepName nvarchar(100),
			sClientName1 nvarchar(200),
			sDepartmentName nvarchar(200),
			sTranNumber nvarchar(50),
			dtTranDate date,
			InvoiceMonth date,
			InvoiceAmount decimal(10,2),
			RollingRevenue decimal(10,2)
		)

	Insert Into #Results ( lSalesRepKey, lInvoiceKey, lClientKey, lDepartmentKey, RepName, sClientName1, sDepartmentName, sTranNumber, dtTranDate, InvoiceMonth, InvoiceAmount )
	Select i.lSalesRepKey, i.lInvoiceKey, d.lClientKey, d.lDepartmentKey,
		ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,'') As RepName, 
		c.sClientName1, d.sDepartmentName, i.sTranNumber, i.dtTranDate, dbo.fn_FirstOfMonth(i.dtTranDate),
		ISNULL(i.dblTranAmount,0) + ISNULL(i.dblShippingAmt,0) + ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0) As InvoiceAmount
	From dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey=c.lClientKey)
		join dbo.tblSalesRep sr on (i.lSalesRepKey = sr.lSalesRepKey)
	Where i.dtTranDate >= @pdtStartDate And i.dtTranDate < @pdtEndDate
		And i.bFinalized = 1
		And ((ISNULL(@plSalesRepKey,0)=0) Or (i.lSalesRepKey = @plSalesRepKey))
		And d.dtCustomerSince > DATEADD(year,-1,i.dtTranDate)

	
	If @pbSummary = 1
		BEGIN
			Declare @SQL nvarchar(MAX)
			Declare @strSelect nvarchar(MAX)

			Set @strSelect = 'SELECT RepName, InvoiceMonth, InvoiceAmount From #Results'
			Set @SQL = 'exec dbo.GetCrossTab @DBFetch=''' + @strSelect + ''', @DBField=''InvoiceMonth'', @PCField=''InvoiceAmount'', @PCBuild=''Sum'''
			EXEC (@SQL)
		END
	else
		BEGIN
			Create Table #RollingRevenue
				(
					ID int identity(1,1),
					lSalesRepKey int,	
					lClientKey int,
					lDepartmentKey int,
					lInvoiceKey int,
					dtTranDate date,
					RollingRevenue decimal(10,2)
				)

			Insert Into #RollingRevenue ( lSalesRepKey, lClientKey, lDepartmentKey, lInvoiceKey, dtTranDate ) 
			Select r.lSalesRepKey, r.lClientKey, r.lDepartmentKey, r.lInvoiceKey, r.dtTranDate
			From #Results r 
			Order By r.lSalesRepKey, r.lClientKey, r.lDepartmentKey, r.dtTranDate, r.lInvoiceKey

			Declare @i int
			Declare @lDepartmentKey int
			Declare @lInvoiceKey int
			Declare @dtTranDate date
			Declare @Revenue decimal(10,2)

			Set @i = 1

			While (Select Count(*) From #RollingRevenue)>=@i
				BEGIN
					Select @lDepartmentKey = lDepartmentKey, @dtTranDate = dtTranDate, @lInvoiceKey = lInvoiceKey From #RollingRevenue Where ID = @i
					Set @Revenue = 0

					Select @Revenue = SUM(ISNULL(i.dblTranAmount,0) + ISNULL(i.dblShippingAmt,0) + ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0))
					From dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
					Where	i.bFinalized = 1 
						And i.lDepartmentKey = @lDepartmentKey 
						And i.dtTranDate >= DATEADD(day,1,DATEADD(year,-1,@dtTranDate))
						And i.dtTranDate <= @dtTranDate
						And ((i.dtTranDate < @dtTranDate) Or (i.lInvoiceKey <= @lInvoiceKey))
						And i.dtTranDate >= d.dtCustomerSince

					Update #RollingRevenue Set RollingRevenue = ISNULL(@Revenue,0) Where ID = @i
					
					Set @i = @i + 1
				END

			Update r
			Set RollingRevenue = rr.RollingRevenue
			From #Results r join #RollingRevenue rr on (r.lInvoiceKey = rr.lInvoiceKey)

			Select r.RepName, r.sClientName1, r.sDepartmentName, r.sTranNumber, r.dtTranDate, r.InvoiceAmount, r.RollingRevenue
			From #Results r 
			Order By r.RepName, r.sClientName1, r.sDepartmentName, r.dtTranDate, r.lInvoiceKey

			Drop Table #RollingRevenue
		END
	
	Drop Table #Results

END
