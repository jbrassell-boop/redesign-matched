CREATE PROCEDURE [dbo].[rptSalesTax]
	(
		@pdtStartDate date,
		@pdtEndDate date,
		@psState nvarchar(2) = Null
	)	
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptSalesTax @pdtStartDate='10/1/2014', @pdtEndDate='12/31/2016'

	Declare @SalesTaxStates Table
		(
			StateCode nvarchar(50)
		)

	Insert Into @SalesTaxStates ( StateCode ) 
	Select s.sState 
	From dbo.tblSalesTax s
	Group by s.sState

	Select s.StateName, d.lClientKey, d.lDepartmentKey, i.sTranNumber As InvoiceNumber, i.dtTranDate, d.sPeachTreeCustID, c.sClientName1, d.sDepartmentName, Case When IsNull(i.sPeachTaxCode,'')='' Then Null Else i.dblTranAmount End As TaxableSales,
		i.dblTranAmount As InvoiceAmount, i.dblJuris1Amt As SalesTax, IsNull(i.dblTranAmount,0) + IsNull(i.dblJuris1Amt,0) As TotalInvoiceAmount
	From dbo.tblInvoice i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
		join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		join dbo.tblStates s on (d.sShipState = s.StateCode)
		join @SalesTaxStates st on (d.sShipState=st.StateCode)
	Where	((IsNull(@psState,'')='') Or (d.sShipState = @psState)) 
		And i.dtTranDate >= @pdtStartDate And i.dtTranDate < DateAdd(day,1,@pdtEndDate)

END
