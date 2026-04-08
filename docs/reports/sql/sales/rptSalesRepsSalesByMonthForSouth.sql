CREATE PROCEDURE [dbo].[rptSalesRepsSalesByMonthForSouth]
	(
		@pdtDateFrom datetime,
		@pdtDateTo datetime,
		@prmInvoiceType nvarchar(50) = 'All'
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptSalesRepsSalesByMonth @pdtDateFrom='12/1/2014 1:26:22 PM', @pdtDateTo='12/31/2014 1:26:22 PM', @prmInvoiceType='All'

	/*
	--Per Denis, just default to All and don't show in screen.

	--Invoice Types:  
		T & M 
		Contract
		All
	*/

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	Set @pdtDateFrom = DATEADD(dd, DATEDIFF(dd, 0, @pdtDateFrom), 0)
	Set @pdtDateTo = DATEADD(dd, DATEDIFF(dd, 0, @pdtDateTo), 0)
	
	Set @prmInvoiceType = 'All'

	Create Table #Results 
		(
			lSalesRepKey int,
			Jan decimal(10,2),
			Feb decimal(10,2),
			Mar decimal(10,2),
			Apr decimal(10,2),
			May decimal(10,2),
			Jun decimal(10,2),
			Jul decimal(10,2),
			Aug decimal(10,2),
			Sep decimal(10,2),
			Oct decimal(10,2),
			Nov decimal(10,2),
			Dec decimal(10,2),
			RepTotal decimal(10,2)
		)

	if @lDatabaseKey = 1
		BEGIN
			Insert Into #Results ( lSalesRepKey, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec )
			Select a.lSalesRepKey, 
				Sum(Case When a.[Month] = 1 Then InvoiceTotal Else 0. End) As Jan,
				Sum(Case When a.[Month] = 2 Then InvoiceTotal Else 0. End) As Feb,
				Sum(Case When a.[Month] = 3 Then InvoiceTotal Else 0. End) As Mar,
				Sum(Case When a.[Month] = 4 Then InvoiceTotal Else 0. End) As Apr,
				Sum(Case When a.[Month] = 5 Then InvoiceTotal Else 0. End) As May,
				Sum(Case When a.[Month] = 6 Then InvoiceTotal Else 0. End) As Jun,
				Sum(Case When a.[Month] = 7 Then InvoiceTotal Else 0. End) As Jul,
				Sum(Case When a.[Month] = 8 Then InvoiceTotal Else 0. End) As Aug,
				Sum(Case When a.[Month] = 9 Then InvoiceTotal Else 0. End) As Sep,
				Sum(Case When a.[Month] = 10 Then InvoiceTotal Else 0. End) As Oct,
				Sum(Case When a.[Month] = 11 Then InvoiceTotal Else 0. End) As Nov,
				Sum(Case When a.[Month] = 12 Then InvoiceTotal Else 0. End) As Dec
			From	(
						SELECT iv.lSalesRepKey, Month(iv.dtTranDate) AS [Month], Sum(iv.dblTranAmount) AS InvoiceTotal
						FROM dbo.tblInvoice iv
						Where iv.dtTranDate >= @pdtDateFrom And iv.dtTranDate < DateAdd(day,1,@pdtDateTo)
							And (
									(@prmInvoiceType='All') Or
									(@prmInvoiceType='Contract' And (SubString(iv.sTranNumber,1,1)='C' Or SubString(iv.sTranNumber,2,1)='C') And IsNull(iv.lContractKey,0)>0) Or
									(@prmInvoiceType='T & M' And SubString(iv.sTranNumber,1,1)<>'C' And SubString(iv.sTranNumber,2,1)<>'C')
								)
							And SUBSTRING(iv.sTranNumber,1,1)='S'
						Group by iv.lSalesRepKey, Month(iv.dtTranDate)
					) a
			Group By a.lSalesRepKey

			Update #Results Set RepTotal = Jan + Feb + Mar + Apr + May + Jun + Jul + Aug + Sep + Oct + Nov + Dec

			Update #Results Set Jan = Null Where Jan = 0.
			Update #Results Set Feb = Null Where Feb = 0.
			Update #Results Set Mar = Null Where Mar = 0.
			Update #Results Set Apr = Null Where Apr = 0.
			Update #Results Set May = Null Where May = 0.
			Update #Results Set Jun = Null Where Jun = 0.
			Update #Results Set Jul = Null Where Jul = 0.
			Update #Results Set Aug = Null Where Aug = 0.
			Update #Results Set Sep = Null Where Sep = 0.
			Update #Results Set Oct = Null Where Oct = 0.
			Update #Results Set Nov = Null Where Nov = 0.
			Update #Results Set Dec = Null Where Dec = 0.
		END

	Select * from #Results
	Drop Table #Results
END
