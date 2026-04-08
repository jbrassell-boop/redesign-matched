CREATE PROCEDURE dbo.rptContractSubGroupExtract
	(
		@plSubGroupKey int,
		@pdtStartDate date,
		@pdtEndDate date
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptContractSubGroupExtract 4, '1/1/2020', '12/31/2021'

	Create Table #Results
		(
			ID int identity(1,1),
			lContractKey int,
			StartDate date,
			EndDate date,
			SubGroup nvarchar(200),
			SalesRep nvarchar(200),
			ContractName nvarchar(300),
			Client nvarchar(300),
			Revenue decimal(10,2),
			Expenses decimal(10,2),
			Consumption decimal(10,2),
			MarginPercentage decimal(10,4),
			ScopesUnderContract int
		)

	Insert Into #Results ( lContractKey, StartDate, EndDate, ContractName, Client, SalesRep ) 
	Select c.lContractKey, @pdtStartDate, @pdtEndDate, c.sContractName1, cl.sClientName1, LTrim(RTrim(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) As SalesRep
	From dbo.tblContract c join dbo.tblContractDepartments cd on (c.lContractKey = cd.lContractKey)
		join dbo.tblDepartmentSubGroups g on (cd.lDepartmentKey = g.lDepartmentKey)
		join dbo.tblClient cl on (c.lClientKey = cl.lClientKey)
		join dbo.tblSalesRep sr on (c.lSalesRepKey = sr.lSalesRepKey)
	Where c.dtDateEffective <= @pdtEndDate And c.dtDateTermination >= @pdtStartDate
		And g.lSubGroupKey = @plSubGroupKey
	Group By c.lContractKey, c.sContractName1, cl.sClientName1, sr.sRepFirst, sr.sRepLast

	Update r Set ScopesUnderContract = a.cnt
	From #Results r join 
		(
			Select s.lContractKey, Count(s.lContractKey) As cnt 
			From (
					Select cs.lContractKey, cs.lScopeKey 
					From dbo.tblContractScope cs 
					Where cs.dtScopeAdded <= @pdtEndDate And ((cs.dtScopeRemoved Is Null) Or (cs.dtScopeRemoved >= @pdtEndDate))
					Group By cs.lContractKey, cs.lScopeKey
				) s 
			Group By s.lContractKey
		) a on (r.lContractKey = a.lContractKey)
		
	Update r
	Set Expenses = b.Expense
	From #Results r join 
		(
			Select a.lContractKey, ISNULL(a.OutsourceAmount,0) + ISNULL(a.ShippingAmount,0) + ISNULL(a.LaborAmount,0) + ISNULL(a.InventoryAmount,0) + ISNULL(a.GPOAmount,0) + ISNULL(a.CommissionAmount,0) As Expense
			From 
				(	Select c.lContractKey, SUM(c.OutsourceAmount) as OutsourceAmount, SUM(c.ShippingAmount) As ShippingAmount, SUM(c.LaborAmount) As LaborAmount, 
						SUM(c.InventoryAmount) As InventoryAmount, SUM(c.GPOAmount) As GPOAmount, SUM(c.CommissionAmount) As CommissionAmount
					from #Results r join dbo.tblInvoice i on (r.lContractKey=i.lContractKey)
						join dbo.tblRepair re on (i.lRepairKey = re.lRepairKey)
						join dbo.tblRepairRevenueAndExpensesContract c on (i.lInvoiceKey = c.lInvoiceKey)
					Where i.dtTranDate >= @pdtStartDate And i.dtTranDate < DATEADD(DAY,1,@pdtEndDate)
					Group By c.lContractKey
				) a
		) b on (r.lContractKey = b.lContractKey)

	Update r 
	Set Revenue = a.Revenue
	From #Results r join 
		(
			Select i.lContractKey, SUM(ISNULL(i.dblTranAmount,0) + ISNULL(i.dblShippingAmt,0)) As Revenue -- + ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0))
			From dbo.tblInvoice i join #Results r on (i.lContractKey = r.lContractKey)
			Where ISNULL(i.lRepairKey,0)=0 And i.bFinalized=1 And i.dtTranDate >= @pdtStartDate And i.dtTranDate < DATEADD(DAY,1,@pdtEndDate)
			Group By i.lContractKey
		) a on (r.lContractKey = a.lContractKey)


	Declare @i int
	Set @i = 1
	Declare @cnt int
	Select @cnt = Count(*) From #Results

	Declare @lContractKey int
	Declare @Consumption decimal(10,2)
	--Declare @Expenses decimal(10,2)
	--Declare @Revenue decimal(10,2)
	Declare @Margin decimal(10,4)

	While (@i <= @cnt)
		BEGIN
			Select @lContractKey = lContractKey From #Results Where ID = @i
			Set @Consumption=0
			--Set @Expenses=0
			--Set @Revenue=0
			Set @Margin=0

			--Select	@Expenses = SUM(ISNULL(c.OutsourceAmount,0) + ISNULL(c.InventoryAmount,0) + ISNULL(c.LaborAmount,0) + ISNULL(c.ShippingAmount,0) + ISNULL(c.GPOAmount,0) + ISNULL(c.CommissionAmount,0))
			--From dbo.tblRepairRevenueAndExpensesContract c 
			--Where c.lContractKey = @lContractKey
			--	And c.dtTranDate >= @pdtStartDate And c.dtTranDate < DATEADD(DAY,1,@pdtEndDate)

			--Select @Revenue = SUM(ISNULL(i.dblTranAmount,0) + ISNULL(i.dblShippingAmt,0)) -- + ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0))
			--From dbo.tblInvoice i 
			--Where i.lContractKey = @lContractKey And ISNULL(i.lRepairKey,0)=0 And i.bFinalized=1
			--	And i.dtTranDate >= @pdtStartDate And i.dtTranDate < DATEADD(DAY,1,@pdtEndDate)
	
			Select @Consumption = SUM(a.Amount) From dbo.fn_ContractConsumptionSummaryByDateRange(@lContractKey,@pdtStartDate,@pdtEndDate) a
			Update #Results Set Consumption = @Consumption Where ID = @i

			--Set @Margin = Case When ISNULL(@Revenue,0) = 0 Then 0 Else (ISNULL(@Revenue,0)-ISNULL(@Expenses,0))/@Revenue End

			--Update #Results 
			--Set Consumption = @Consumption, Expenses = @Expenses, Revenue = @Revenue, MarginPercentage = @Margin
			--Where ID = @i

			Set @i = @i + 1
		END

	Update #Results Set MarginPercentage = Case When ISNULL(Revenue,0)=0 Then 0 Else (Revenue - ISNULL(Expenses,0))/Revenue End
	
	Declare @SubGroup nvarchar(200)
	Select @SubGroup = g.sSubGroup From dbo.tblSubGroups g Where g.llSubGroupKey = @plSubGroupKey

	Update #Results Set SubGroup = @SubGroup

	Select * From #Results
	Drop Table #Results
END
