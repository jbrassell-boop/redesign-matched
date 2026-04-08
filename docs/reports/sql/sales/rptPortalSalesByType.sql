CREATE PROCEDURE dbo.rptPortalSalesByType
	(
		@plSalesRepKey int,
		@pdtStartDate date,
		@pdtEndDate date
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptPortalSalesByType @plSalesRepKey=0, @pdtStartDate='1/1/2012', @pdtEndDate='12/31/2012'
	
	Set @pdtEndDate=DATEADD(day,1,@pdtEndDate)
	
	Create Table #ResultsTemp
		(
			lSalesRepKey int,
			dtTranDate date,
			sRepFirst nvarchar(50),
			sRepLast nvarchar(50),
			dblTranAmount decimal(10,2),
			sInstrumentType nvarchar(50)
		)

	Insert Into #ResultsTemp ( lSalesRepKey, dtTranDate, sRepFirst, sRepLast, dblTranAmount, sInstrumentType )
	Select i.lSalesRepKey, i.dtTranDate, i.sRepFirst, i.sRepLast, i.dblTranAmount,
		Case s.sRigidOrFlexible
			When 'F' Then 'Flexible'
			When 'R' Then 'Rigid'
			When 'C' Then 'Camera'
			Else 'Instrument'
		End As sInstrumentType
	From dbo.tblInvoice i join dbo.tblScope s ON i.lScopeKey = s.lScopeKey
	Where	i.dtTranDate >= @pdtStartDate 
		And i.dtTranDate < @pdtEndDate
		And i.bFinalized = 1
		And SUBSTRING(i.sTranNumber,1,1)<>'S'
		And ((@plSalesRepKey=0) Or (i.lSalesRepKey=@plSalesRepKey))

	Insert Into #ResultsTemp ( lSalesRepKey, dtTranDate, sRepFirst, sRepLast, dblTranAmount, sInstrumentType )
	Select i.lSalesRepKey, i.dtTranDate, i.sRepFirst, i.sRepLast, i.dblTranAmount,
		Case s.sRigidOrFlexible
			When 'F' Then 'Flexible'
			When 'R' Then 'Rigid'
			When 'C' Then 'Camera'
			Else 'Instrument'
		End As sInstrumentType
	From dbo.tblInvoice i join dbo.tblScope s ON i.lScopeKey = s.lScopeKey
		join dbo.tblSalesRep sr on (i.lSalesRepKey = sr.lSalesRepKey)
	Where	i.dtTranDate >= @pdtStartDate 
		And i.dtTranDate < @pdtEndDate
		And i.bFinalized = 1
		And SUBSTRING(i.sTranNumber,1,1) = 'S'
		And ((@plSalesRepKey=0) Or (sr.lSalesRepKeyLink=@plSalesRepKey))

	Select a.lSalesRepKey, LTrim(RTrim(ISNULL(a.sRepFirst,'') + ' ' + ISNULL(a.sRepLast,''))) As RepName, a.sInstrumentType, COUNT(a.dtTranDate) As Cnt, SUM(a.dblTranAmount) as TotalInvoiced, 
		Round(SUM(a.dblTranAmount)/COUNT(a.dtTranDate),2) As AverageInvoiced, 
		Round(SUM(a.dblTranAmount)/12,2) As MonthlyInvoiced
	From #ResultsTemp a
	Group By a.lSalesRepKey, LTrim(RTrim(ISNULL(a.sRepFirst,'') + ' ' + ISNULL(a.sRepLast,''))), a.sInstrumentType, a.sRepLast, a.sRepFirst
	Order By a.sRepLast, a.sRepFirst, a.lSalesRepKey

	Drop Table #ResultsTemp
END
