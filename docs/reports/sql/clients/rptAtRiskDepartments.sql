CREATE PROCEDURE [dbo].[rptAtRiskDepartments]
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptAtRiskDepartments
	
	--IF CHANGES ARE MADE HERE, THEY SHOULD ALSO BE MADE IN dbo.emailAtRiskDepartments

    Declare @dtDate date
	Set @dtDate = CONVERT(date,GetDate())

	Declare @DBName nvarchar(50)
	Set @DBName = DB_NAME()
	
	Declare @bTSI bit
	Set @bTSI = 1
	If UPPER(@DBName)='WINSCOPENETNASHVILLE'
		Set @bTSI = 0
					
	Declare @bCommissions bit
	Declare @bGPO bit
	Declare @bShipping bit
	Declare @bInventory bit
	Declare @bLabor bit
	Declare @bOutsource bit
	Declare @lMinInvoices int

	Select @bCommissions = ISNULL(e.Expense_Commission,0), @bGPO = ISNULL(e.Expense_GPO,0), @bInventory = ISNULL(e.Expense_Inventory,0), 
		@bLabor = ISNULL(e.Expense_Labor,0), @bOutsource = ISNULL(e.Expense_Outsource,0), @bShipping = ISNULL(e.Expense_Shipping,0), @lMinInvoices = ISNULL(e.lInvoiceCount,2)
	from dbo.tblAtRiskDepartmentExpenses e
	
	Create Table #Departments
		(
			ID int identity(1,1),
			sClientName1 nvarchar(300),
			sDepartmentName nvarchar(300),
			InvoiceCount int,
			Revenue decimal(10,2),
			Expenses decimal(10,2),
			MarginPercentage decimal(10,4)
		)

	Create Table #Depts 
		(
			lDepartmentKey int,
			cnt int
		)

	Insert Into #Depts ( lDepartmentKey, cnt ) 
	Select r.lDepartmentKey, Count(r.lDepartmentKey)
	From dbo.tblInvoice i join dbo.tblRepair r on (i.lRepairKey = r.lRepairKey)
	Where i.dtTranDate >= DATEADD(year,-1,@dtDate) And i.dtTranDate < @dtDate And i.bFinalized = 1 And ISNULL(r.lContractKey,0)=0
	Group By r.lDepartmentKey
	Having Count(r.lDepartmentKey) > @lMinInvoices

	Insert Into #Departments ( sClientName1, sDepartmentName, InvoiceCount, Revenue, Expenses, MarginPercentage )
	Select c.sClientName1, d.sDepartmentName, de.cnt, b.Revenue, b.Expenses, b.MarginPercentage
	From  (
			Select a.lDepartmentKey, a.Revenue, a.Expenses, Case When a.Revenue = 0 Then 0 Else (a.Revenue - a.Expenses)/a.Revenue End As MarginPercentage
			From (
					Select i.lDepartmentKey, 
						SUM(r.RevenueAmount) As Revenue,  
						SUM(	Case When @bCommissions=1 Then ISNULL(r.CommissionAmount,0) Else 0 End
								+ Case When @bGPO=1 Then ISNULL(r.GPOAmount,0)  Else 0 End
								+ Case When @bInventory=1 Then ISNULL(r.InventoryAmount,0) Else 0 End
								+ Case When @bOutsource=1 Then ISNULL(r.OutsourceAmount,0) Else 0 End
								+ Case When @bShipping=1 Then ISNULL(r.ShippingAmount,0) Else 0 End
								+ Case When @bLabor=1 Then ISNULL(r.LaborAmount,0) Else 0 End
							) As Expenses
					from dbo.tblRepairRevenueAndExpenses r join dbo.tblInvoice i on (r.lInvoiceKey = i.lInvoiceKey)
					Group By i.lDepartmentKey
				) a 
		) b join dbo.tblDepartment d on (b.lDepartmentKey = d.lDepartmentKey)
			join dbo.tblClient c on (d.lClientKey = c.lClientKey)
			join #Depts de on (b.lDepartmentKey = de.lDepartmentKey)
	Where b.MarginPercentage < .2 And Revenue > 0
	Order By c.sClientName1, d.sDepartmentName

	Select d.sClientName1, d.sDepartmentName, d.InvoiceCount, d.Revenue, d.Expenses, d.MarginPercentage
	From #Departments d
	Order By d.sClientName1, d.sDepartmentName

	Drop Table #Departments
	Drop Table #Depts
END
