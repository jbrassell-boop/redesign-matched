CREATE PROCEDURE [dbo].[rptSalesRepsSalesByMonth]
	(
		@pdtDateFrom date,
		@pdtDateTo date,
		@prmInvoiceType nvarchar(50) = 'All'
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptSalesRepsSalesByMonth @pdtDateFrom='7/1/2025', @pdtDateTo='7/31/2025', @prmInvoiceType='All'

	/*
	--Per Denis, just default to All and don't show in screen.

	--Invoice Types:  
		T & M 
		Contract
		All
	*/

	Set @prmInvoiceType = 'All'

	Create Table #Results 
		(
			RepName nvarchar(100),
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

	Create Table #ResultsTemp
		(
			lSalesRepKey int,
			lSalesRepKeyInvoice int,
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

	Insert Into #ResultsTemp ( lSalesRepKey, lSalesRepKeyInvoice, sLocation, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec )
	Select a.lSalesRepKey, a.lSalesRepKey, a.sLocation,
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
				SELECT iv.lSalesRepKey, SUBSTRING(iv.sTranNumber,1,1) As sLocation, DATEPART(month,iv.dtTranDate) AS [Month], Sum(iv.dblTranAmount) AS InvoiceTotal
				FROM dbo.tblInvoice iv 
				Where iv.dtTranDate >= @pdtDateFrom And iv.dtTranDate < DateAdd(day,1,@pdtDateTo)
					And iv.bFinalized = 1
					And (
							(@prmInvoiceType='All') Or
							(@prmInvoiceType='Contract' And (SubString(iv.sTranNumber,1,1)='C' Or SubString(iv.sTranNumber,2,1)='C') And IsNull(iv.lContractKey,0)>0) Or
							(@prmInvoiceType='T & M' And SubString(iv.sTranNumber,1,1)<>'C' And SubString(iv.sTranNumber,2,1)<>'C')
						)
				Group by iv.lSalesRepKey, SUBSTRING(iv.sTranNumber,1,1), DATEPART(month,iv.dtTranDate)
			) a
	Group By a.lSalesRepKey, a.sLocation

	Update r 
	Set lSalesRepKey = sr.lSalesRepKey
	From #ResultsTemp r join dbo.tblSalesRep sr on (r.lSalesRepKeyInvoice = sr.lSalesRepKeyLink)
	Where r.sLocation = 'S'


	Insert Into #Results ( RepName, Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec )
	Select LTrim(Rtrim(ISNULL(sr.sRepLast,'') + Case When ISNULL(sr.sRepLast,'')='' Then '' Else ', ' End + ISNULL(sr.sRepFirst,''))) As RepName,
		SUM(t.Jan), SUM(t.Feb), SUM(t.Mar), SUM(t.Apr), SUM(t.May), SUM(t.Jun), SUM(t.Jul), SUM(t.Aug), SUM(t.Sep), SUM(t.Oct), SUM(t.Nov), SUM(t.Dec)
	From #ResultsTemp t join dbo.tblSalesRep sr on (t.lSalesRepKey = sr.lSalesRepKey)
	Group By LTrim(Rtrim(ISNULL(sr.sRepLast,'') + Case When ISNULL(sr.sRepLast,'')='' Then '' Else ', ' End + ISNULL(sr.sRepFirst,'')))

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

	Select * from #Results Order By RepName

	Drop Table #Results
	Drop Table #ResultsTemp
END
