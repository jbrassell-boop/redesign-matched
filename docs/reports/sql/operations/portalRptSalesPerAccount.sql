CREATE PROCEDURE [dbo].[portalRptSalesPerAccount]
	(
		@prmSalesRepKey int,
		@prmStartDate datetime,
		@prmEndDate datetime
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptSalesPerAccount @prmSalesRepKey=197, @prmStartDate='1/1/2024', @prmEndDate='6/6/2024'

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	Declare @bSalesPerAccountReport_AllInvoicesForDepartment bit
	Select @bSalesPerAccountReport_AllInvoicesForDepartment = ISNULL(bSalesPerAccountReport_AllInvoicesForDepartment,0) From dbo.tblSalesRep Where lSalesRepKey = @prmSalesRepKey

	Set @prmEndDate=DATEADD(day,1,@prmEndDate)

	If @bSalesPerAccountReport_AllInvoicesForDepartment = 0
		BEGIN
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
			From	(
						SELECT c.sClientName1, c.sMailState, sr.sRepFirst, sr.sRepLast, i.sTranNumber, i.dtTranDate, i.dblTranAmount
						FROM	dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey) 
							join dbo.tblClient c ON d.lClientKey = c.lClientKey
							join dbo.tblSalesRep sr ON i.lSalesRepKey = sr.lSalesRepKey
						WHERE	(sr.lSalesRepKey=@prmSalesRepKey) 
							And (i.dtTranDate >= @prmStartDate) 
							And (i.dtTranDate < @prmEndDate) And (i.bFinalized=1)
							And	(	(@lDatabaseKey = 1 And SUBSTRING(i.sTranNumber,1,1) <> 'S')
									Or
									(@lDatabaseKey = 2 And SUBSTRING(i.sTranNumber,1,1) = 'S')
								)
						
						UNION

						SELECT c.sClientName1, c.sMailState, sr.sRepFirst, sr.sRepLast, i.sTranNumber, i.dtTranDate, i.dblTranAmount
						FROM dbo.tblInvoice i INNER JOIN dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
							join dbo.tblClient c ON d.lClientKey = c.lClientKey
							join dbo.tblSalesRep sr ON i.lSalesRepKey = sr.lSalesRepKeyLink
						WHERE	(i.dtTranDate >= @prmStartDate) 
							And	(i.dtTranDate < @prmEndDate) 
							And (i.bFinalized=1)
							And (sr.lSalesRepKey=@prmSalesRepKey)
							And	@lDatabaseKey = 1 
							And SUBSTRING(i.sTranNumber,1,1) = 'S'

						UNION

						SELECT c.sClientName1, c.sMailState, sr.sRepFirst, sr.sRepLast, i.sTranNumber, i.dtTranDate, i.dblTranAmount
						FROM (	dbo.tblInvoice i INNER JOIN (dbo.tblDepartment d INNER JOIN dbo.tblClient c ON d.lClientKey = c.lClientKey) ON i.lDepartmentKey = d.lDepartmentKey) INNER JOIN dbo.tblSalesRep sr ON d.lSalesRepKey_CS = sr.lSalesRepKey
						WHERE	(d.lSalesRepKey_CS=@prmSalesRepKey) AND 
								(i.dtTranDate >= @prmStartDate) And
								(i.dtTranDate < @prmEndDate) And (i.bFinalized=1)
					) a
			Group By sClientName1, sMailState, sRepFirst, sRepLast
			Order By sClientName1, sMailState, sRepFirst, sRepLast
		END
	else
		BEGIN
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
			From	(
						SELECT c.sClientName1, c.sMailState, sr.sRepFirst, sr.sRepLast, i.sTranNumber, i.dtTranDate, i.dblTranAmount
						FROM dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey=d.lDepartmentKey) 
							Join dbo.tblClient c ON d.lClientKey = c.lClientKey
							Join dbo.tblSalesRep sr ON d.lSalesRepKey = sr.lSalesRepKey
						WHERE	(sr.lSalesRepKey=@prmSalesRepKey) 
							And (i.dtTranDate >= @prmStartDate) 
							And (i.dtTranDate < @prmEndDate) And (i.bFinalized=1)
							And	(	(@lDatabaseKey = 1 And SUBSTRING(i.sTranNumber,1,1) <> 'S')
									Or
									(@lDatabaseKey = 2 And SUBSTRING(i.sTranNumber,1,1) = 'S')
								)

						UNION 

						SELECT c.sClientName1, c.sMailState, sr.sRepFirst, sr.sRepLast, i.sTranNumber, i.dtTranDate, i.dblTranAmount
						FROM dbo.tblInvoice i INNER JOIN dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
							join dbo.tblClient c ON d.lClientKey = c.lClientKey
							join dbo.tblSalesRep sr ON i.lSalesRepKey = sr.lSalesRepKeyLink
						WHERE	(i.dtTranDate >= @prmStartDate) 
							And	(i.dtTranDate < @prmEndDate) 
							And (i.bFinalized=1)
							And (sr.lSalesRepKey=@prmSalesRepKey)
							And	@lDatabaseKey = 1 
							And SUBSTRING(i.sTranNumber,1,1) = 'S'

						UNION

						SELECT c.sClientName1, c.sMailState, sr.sRepFirst, sr.sRepLast, i.sTranNumber, i.dtTranDate, i.dblTranAmount
						FROM dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey=d.lDepartmentKey) 
							Join dbo.tblClient c ON d.lClientKey = c.lClientKey
							Join dbo.tblSalesRep sr ON d.lSalesRepKey_CS = sr.lSalesRepKey
						WHERE	(d.lSalesRepKey_CS=@prmSalesRepKey) AND 
								(i.dtTranDate >= @prmStartDate) And
								(i.dtTranDate < @prmEndDate) And (i.bFinalized=1)

					) a
			Group By sClientName1, sMailState, sRepFirst, sRepLast
			Order By sClientName1, sMailState, sRepFirst, sRepLast
		END

END
