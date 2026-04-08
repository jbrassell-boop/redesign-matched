CREATE PROCEDURE dbo.rptOpsNewCustomers
	(
		@pdtDateFrom date,
		@pdtDateTo date = Null
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptOpsNewCustomers @pdtDateFrom='1/1/2019', @pdtDateTo='1/31/2019'

	Declare @dtDateTo date
	Set @dtDateTo = DateAdd(month,1,@pdtDateFrom)
	
	SELECT c.lClientKey, d.lDepartmentKey, c.sClientName1, d.sDepartmentName, MIN(i.dtTranDate) as MinInvoiceDate, Sum(i.dblTranAmount) AS SumInvoiceAmount,
		Count(i.sTranNumber) AS InvoiceCount,
		LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As RepName
	FROM dbo.tblClient c join dbo.tblDepartment d on (c.lClientKey=d.lClientKey) 
		join dbo.tblInvoice i on (d.lDepartmentKey=i.lDepartmentKey)
		join dbo.tblSalesRep sr on (d.lSalesRepKey = sr.lSalesRepKey)
	WHERE i.dtTranDate > DateAdd(month,-6,@pdtDateFrom) And i.bFinalized = 1
	GROUP BY c.lClientKey, d.lDepartmentKey, c.sClientName1, d.sDepartmentName,
		LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,'')))
	HAVING MIN(i.dtTranDate) >= @pdtDateFrom And MIN(i.dtTranDate)<@dtDateTo And SUM(i.dblTranAmount)<>0
	ORDER BY c.sClientName1, d.sDepartmentName

END
