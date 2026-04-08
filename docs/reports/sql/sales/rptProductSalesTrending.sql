CREATE PROCEDURE dbo.rptProductSalesTrending
	(
		@plDepartmentKey int,
		@pdtStartDate date,
		@pdtEndDate date
	)
AS
BEGIN
	SET NOCOUNT ON;
    
	Select i.dtTranDate, i.sTranNumber, s.sSizeDescription, s.sSizeDescription2, s.sSizeDescription3, s.lQty, s.nUnitCost, s.nTotalCost
	From dbo.tblInvoice i left join dbo.tblProductSaleInvoiceDetail s on (i.lInvoiceKey = s.lInvoiceKey)
	Where i.lDepartmentKey = @plDepartmentKey And i.bFinalized = 1
		And i.dtTranDate >= @pdtStartDate
		And i.dtTranDate < DATEADD(day,1,@pdtEndDate) 
	Order By i.dtTranDate, i.sTranNumber, s.sSizeDescription2
END
