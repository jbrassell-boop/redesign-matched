CREATE PROCEDURE [dbo].[rptInvoiceListAvalara]
	(
		@pdtStartDate date,
		@pdtEndDate date
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptInvoiceListAvalara '9/1/2021','9/7/2021'

	--Select i.dtTranDate, c.sClientName1, d.sDepartmentName, 
	Select i.dtGPProcessDate, c.sClientName1, d.sDepartmentName, 
		i.sTranNumber + Case When ISNULL(i.sTranNumberSuffix,0)=0 Then '' Else '-' + Cast(i.sTranNumberSuffix as varchar(10)) End As sTranNumber,
		i.dblTranAmount, i.dblShippingAmt, ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0) As TaxAmount,
		ISNULL(i.dblTranAmount,0) + ISNULL(i.dblShippingAmt,0) + ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0) As TotalAmount,
		i.sShipState, i.sShipCity
	From dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
	--Where i.dtTranDate >= @pdtStartDate And i.dtTranDate < DATEADD(day,1,@pdtEndDate)
	Where i.dtGPProcessDate >= @pdtStartDate And i.dtGPProcessDate < DATEADD(day,1,@pdtEndDate)
		And i.bFinalized = 1
		And ISNULL(i.dblTranAmount,0) + ISNULL(i.dblShippingAmt,0) + ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0) <> 0
	Order By i.dtTranDate, i.sTranNumber
END
