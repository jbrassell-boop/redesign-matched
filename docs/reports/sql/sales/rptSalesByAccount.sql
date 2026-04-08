CREATE PROCEDURE [dbo].[rptSalesByAccount]
	(
		@pdtDateFrom date,
		@pdtDateTo date,
		@plSalesRepKey int = 0,
		@prmInvoiceType nvarchar(50)='All'
	)

AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptSalesByAccount @pdtDateFrom='7/1/2025', @pdtDateTo='7/31/2025', @plSalesRepKey=0, @prmInvoiceType='All'
	
	Set @pdtDateTo = DATEADD(day,1,@pdtDateTo)
	
	Create Table #ResultsTemp
		(
			lSalesRepKey int,
			lSalesRepKeyInvoice int,
			lSalesRepKey_CS int,
			lDepartmentKey int,
			sLocation nvarchar(50),
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

	Insert Into #ResultsTemp ( lSalesRepKey, lSalesRepKeyInvoice, lDepartmentKey, sLocation, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec )
	Select a.lSalesRepKey, a.lSalesRepKey, a.lDepartmentKey, a.sLocation,
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
				SELECT iv.lSalesRepKey, SUBSTRING(iv.sTranNumber,1,1) As sLocation, iv.lDepartmentKey, DATEPART(month,iv.dtTranDate) AS [Month], Sum(iv.dblTranAmount) AS InvoiceTotal
				FROM dbo.tblInvoice iv 
				Where iv.dtTranDate >= @pdtDateFrom And iv.dtTranDate < @pdtDateTo
					And iv.bFinalized = 1
					And (
							(@prmInvoiceType='All') Or
							(@prmInvoiceType='Contract' And (SubString(iv.sTranNumber,1,1)='C' Or SubString(iv.sTranNumber,2,1)='C') And IsNull(iv.lContractKey,0)>0) Or
							(@prmInvoiceType='T & M' And SubString(iv.sTranNumber,1,1)<>'C' And SubString(iv.sTranNumber,2,1)<>'C')
						)
				Group by iv.lSalesRepKey, SUBSTRING(iv.sTranNumber,1,1), iv.lDepartmentKey, DATEPART(month,iv.dtTranDate)
			) a
	Group By a.lSalesRepKey, a.lDepartmentKey, a.sLocation



	Update r 
	Set lSalesRepKey = sr.lSalesRepKey
	From #ResultsTemp r join dbo.tblSalesRep sr on (r.lSalesRepKeyInvoice = sr.lSalesRepKeyLink)
	Where r.sLocation = 'S'

	--Add the CS sales rep key - North service location
	Update r Set lSalesRepKey_CS = d.lSalesRepKey_CS From #ResultsTemp r join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey) Where ISNULL(d.lSalesRepKey_CS,0) > 0  And d.lServiceLocationKey = 1
	--Add the CS sales rep key - South service location
	Update r Set lSalesRepKey_CS = sr.lSalesRepKey From #ResultsTemp r join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey) join dbo.tblSalesRep sr on (d.lSalesRepKey_CS=sr.lSalesRepKeyLink) Where ISNULL(d.lSalesRepKey_CS,0) > 0  And d.lServiceLocationKey = 2

	if @plSalesRepKey > 0
		Delete From #ResultsTemp Where lSalesRepKey <> @plSalesRepKey And ISNULL(lSalesRepKey_CS,0) <> @plSalesRepKey

	CREATE TABLE #Results
		(
			ClientName nvarchar(50),
			DepartmentName nvarchar(50),
			RepName nvarchar(100),
			RepFullName nvarchar(100),
			MailState nvarchar(15),
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

	Insert Into #Results ( ClientName, DepartmentName, RepName, RepFullName, MailState, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec )
	Select c.sClientName1, d.sDepartmentName, sr.sRepLast, ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''), d.sMailState, SUM(t.Jan), SUM(t.Feb), SUM(t.Mar), SUM(t.Apr), SUM(t.May), SUM(t.Jun), SUM(t.Jul), SUM(t.Aug), SUM(t.Sep), SUM(t.Oct), SUM(t.Nov), SUM(t.Dec)
	From #ResultsTemp t join dbo.tblDepartment d on (t.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblSalesRep sr on (t.lSalesRepKey = sr.lSalesRepKey)
	Group By c.sClientName1, d.sDepartmentName, sr.sRepLast, ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''), d.sMailState

	Update #Results Set RepTotal = ISNULL(Jan,0) + ISNULL(Feb,0) + ISNULL(Mar,0) + ISNULL(Apr,0) + ISNULL(May,0) + ISNULL(Jun,0) + ISNULL(Jul,0) + ISNULL(Aug,0) + ISNULL(Sep,0) + ISNULL(Oct,0) + ISNULL(Nov,0) + ISNULL(Dec,0)

	Delete From #Results Where RepTotal = 0

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

	Select * from #Results r Order By ClientName
	
	Drop Table #Results
	Drop Table #ResultsTemp
END

