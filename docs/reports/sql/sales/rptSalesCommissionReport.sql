CREATE PROCEDURE [dbo].[rptSalesCommissionReport]
	(
		@pdtMonth date,
		@plSalesRepKey int = 0		
	)
AS
BEGIN
	SET NOCOUNT ON;


	Select r.lSalesRepKey, r.RepName, r.dtPaymentDate, r.dtInvoiceDate, r.sPurchaseOrder, r.sClientName1, r.sDepartmentName, r.dtCustomerSince, r.sTranNumber, r.dblTranAmount, r.CommissionPercentageUsed, r.CommissionPaymentUsed
	From tblSalesCommissionReport r
	Where	r.dtCommissionMonth = @pdtMonth
		And ((IsNull(@plSalesRepKey,0)=0) Or (r.lSalesRepKey = @plSalesRepKey))
	Order By r.RepName, r.lSalesRepKey, r.sClientName1, r.sDepartmentName, r.dtPaymentDate


END
