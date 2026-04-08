CREATE PROCEDURE [dbo].[portalRptSalesRepCountByType]
	(
		@prmSalesRepKey int,
		@prmStartDate datetime,
		@prmEndDate datetime
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptSalesRepCountByType @prmSalesRepKey=0, @prmStartDate='1/1/2012', @prmEndDate='12/31/2012'
	
	Set @prmEndDate=DATEADD(day,1,@prmEndDate)
	
	Select a.lSalesRepKey, a.sRepFirst, a.sRepLast, a.RigidOrFlexible, COUNT(a.dtTranDate) As Cnt, SUM(a.dblTranAmount) as TotalInvoiced, 
		Round(SUM(a.dblTranAmount)/COUNT(a.dtTranDate),2) As AverageInvoiced, 
		Round(SUM(a.dblTranAmount)/12,2) As MonthlyInvoiced
	From
	(
	SELECT i.lSalesRepKey, i.dtTranDate, i.sRepFirst, i.sRepLast, i.dblTranAmount,
		Case s.sRigidOrFlexible
			When 'F' Then 'Flexible'
			When 'R' Then 'Rigid'
			When 'C' Then 'Camera'
			Else 'Instrument'
		End As RigidOrFlexible
	FROM dbo.tblInvoice i join dbo.tblScope s ON i.lScopeKey = s.lScopeKey
	WHERE	(i.dtTranDate >= @prmStartDate) And (i.dtTranDate < @prmEndDate) And
			((ISNULL(@prmSalesRepKey,0)=0) Or (i.lSalesRepKey=@prmSalesRepKey)) And (i.bFinalized=1)
	) a
	Group By a.lSalesRepKey, a.sRepFirst, a.sRepLast, a.RigidOrFlexible
	Order By a.sRepLast, a.sRepFirst, a.lSalesRepKey
END
