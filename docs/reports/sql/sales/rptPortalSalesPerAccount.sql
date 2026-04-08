CREATE PROCEDURE dbo.rptPortalSalesPerAccount
	(
		@plSalesRepKey int,
		@pdtStartDate date,
		@pdtEndDate date
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptPortalSalesPerAccount @plSalesRepKey=113, @pdtStartDate='1/1/2020', @pdtEndDate='6/6/2020'

	Declare @bSalesPerAccountReport_AllInvoicesForDepartment bit
	Select @bSalesPerAccountReport_AllInvoicesForDepartment = ISNULL(bSalesPerAccountReport_AllInvoicesForDepartment,0) 
	From dbo.tblSalesRep Where lSalesRepKey = @plSalesRepKey

	Set @pdtEndDate=DATEADD(day,1,@pdtEndDate)

	Create Table #ResultsTemp
		(
			sClientName1 nvarchar(300),
			sMailState nvarchar(50),
			sRepFirst nvarchar(50),
			sRepLast nvarchar(50),
			sTranNumber nvarchar(50),
			dtTranDate date,
			dblTranAmount decimal(10,2)
		)

	Insert Into #ResultsTemp ( sClientName1, sMailState, sRepFirst, sRepLast, sTranNumber, dtTranDate, dblTranAmount )
	SELECT c.sClientName1, c.sMailState, sr.sRepFirst, sr.sRepLast, i.sTranNumber, i.dtTranDate, i.dblTranAmount
	FROM	dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey) 
		join dbo.tblClient c ON d.lClientKey = c.lClientKey
		join dbo.tblSalesRep sr ON i.lSalesRepKey = sr.lSalesRepKey
	WHERE	(sr.lSalesRepKey=@plSalesRepKey) 
		And (i.dtTranDate >= @pdtStartDate) 
		And (i.dtTranDate < @pdtEndDate) 
		And (i.bFinalized=1)
		And SUBSTRING(i.sTranNumber,1,1)<>'S'

	UNION

	SELECT c.sClientName1, c.sMailState, sr.sRepFirst, sr.sRepLast, i.sTranNumber, i.dtTranDate, i.dblTranAmount
	FROM	dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey) 
		join dbo.tblClient c ON d.lClientKey = c.lClientKey
		join dbo.tblSalesRep sr ON i.lSalesRepKey = sr.lSalesRepKeyLink
	WHERE	(sr.lSalesRepKey=@plSalesRepKey) 
		And (i.dtTranDate >= @pdtStartDate) 
		And (i.dtTranDate < @pdtEndDate) 
		And (i.bFinalized=1)
		And SUBSTRING(i.sTranNumber,1,1) = 'S'
						
	UNION

	SELECT c.sClientName1, c.sMailState, sr.sRepFirst, sr.sRepLast, i.sTranNumber, i.dtTranDate, i.dblTranAmount
	FROM dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey) 
		join dbo.tblClient c ON d.lClientKey = c.lClientKey
		join dbo.tblSalesRep sr ON d.lSalesRepKey_CS = sr.lSalesRepKey
	WHERE	(d.lSalesRepKey_CS=@plSalesRepKey) 
		And (i.dtTranDate >= @pdtStartDate) 
		And (i.dtTranDate < @pdtEndDate) 
		And (i.bFinalized=1)


	Select sClientName1, sMailState, sRepFirst, sRepLast, 
				SUM(Case When Month(a.dtTranDate)=1 Then a.dblTranAmount Else 0 End) As Jan,
				SUM(Case When Month(a.dtTranDate)=2 Then a.dblTranAmount Else 0 End) As Feb,
				SUM(Case When Month(a.dtTranDate)=3 Then a.dblTranAmount Else 0 End) As Mar,
				SUM(Case When Month(a.dtTranDate)=4 Then a.dblTranAmount Else 0 End) As Apr,
				SUM(Case When Month(a.dtTranDate)=5 Then a.dblTranAmount Else 0 End) As May,
				SUM(Case When Month(a.dtTranDate)=6 Then a.dblTranAmount Else 0 End) As Jun,
				SUM(Case When Month(a.dtTranDate)=7 Then a.dblTranAmount Else 0 End) As Jul,
				SUM(Case When Month(a.dtTranDate)=8 Then a.dblTranAmount Else 0 End) As Aug,
				SUM(Case When Month(a.dtTranDate)=9 Then a.dblTranAmount Else 0 End) As Sep,
				SUM(Case When Month(a.dtTranDate)=10 Then a.dblTranAmount Else 0 End) As Oct,
				SUM(Case When Month(a.dtTranDate)=11 Then a.dblTranAmount Else 0 End) As Nov,
				SUM(Case When Month(a.dtTranDate)=12 Then a.dblTranAmount Else 0 End) As Dec,
				SUM(a.dblTranAmount) As Total
	From #ResultsTemp a
	Group By sClientName1, sMailState, sRepFirst, sRepLast
	Order By sClientName1, sMailState, sRepFirst, sRepLast
END
