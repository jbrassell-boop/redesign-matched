CREATE PROCEDURE dbo.rptContractBillingDiscrepancies
	
AS
BEGIN
	SET NOCOUNT ON;

    Declare @dtToday date
	Set @dtToday = GETDATE()

	Create Table #Results
		(
			ID int identity(1,1),
			lContractKey int,
			sContractName1 nvarchar(200),
			sContractType nvarchar(50),
			nAmountBilled decimal(10,2),
			nAmountPerSchedule decimal(10,2)
		)

	Insert Into #Results ( lContractKey, sContractName1, sContractType ) 
	Select c.lContractKey, c.sContractName1, ct.sContractType
	From dbo.tblContract c join dbo.tblContractTypes ct on (c.lContractTypeKey=ct.lContractTypeKey)
	Where c.dtDateTermination >= @dtToday

	Update r
	Set nAmountBilled = a.SumAmt
	From #Results r join 
		(
			Select i.lContractKey, SUM(i.dblTranAmount) As SumAmt 
			From dbo.tblInvoice i join #Results r on (i.lContractKey=r.lContractKey) 
			Where i.bFinalized=1 And ISNULL(i.lRepairKey,0)=0
			Group By i.lContractKey
		) a on (r.lContractKey = a.lContractKey)

	Declare @lContractKey int
	Declare @i int
	Set @i = 1
	Declare @Amt decimal(10,2)

	Declare @lBillDay int
	Declare @sInstallmentType nvarchar(50)
	Declare @dtStart date
	Declare @dtEnd date
	Declare @sContractType nvarchar(50)
	Declare @nBillAmount decimal(10,2)
	Declare @dtBillDate date
	Declare @cnt int
	Declare @PrevAmount decimal(10,2)
	Declare @dtAmendmentDate date
	Declare @j int

	Create Table #Schedule
		(
			dtBillDate date,
			nBillAmount decimal(10,2)
		)

	Create Table #Amendments
		(
			ID int identity(1,1),
			AmendmentDate date,
			PreviousInvoiceAmount decimal(10,2)
		)


	While (Select Count(*) From #Results)>=@i
		BEGIN
			Select @lContractKey = lContractKey From #Results Where ID = @i
		
			Delete From #Schedule
		
			Select @dtStart = c.dtDateEffective, @dtEnd = c.dtDateTermination, @sInstallmentType = cit.sInstallmentType,
				@sContractType = ct.sContractType, @nBillAmount = c.dblAmtInvoiced
			From dbo.tblContract c join dbo.tblContractInstallmentTypes cit on (c.lInstallmentTypeID = cit.lInstallmentTypeID)
				join dbo.tblContractTypes ct on (c.lContractTypeKey = ct.lContractTypeKey)
			Where c.lContractKey = @lContractKey

			Set @lBillDay = DatePart(day,@dtStart)
		
			Set @dtBillDate = @dtStart	
		
			Truncate Table #Amendments

			Insert Into #Amendments ( AmendmentDate, [PreviousInvoiceAmount] )
			Select a.dtContractAmendmentDate, a.nPreviousInvoiceAmount 
			From tblContractAmendments a 
			Where a.lContractKey = @lContractKey 
			Order By a.dtContractAmendmentDate
		
			Select @cnt = Count(*) From #Amendments
		
			If @cnt = 0 
				BEGIN
					While @dtBillDate < @dtEnd
						BEGIN
							Insert Into #Schedule ( dtBillDate, nBillAmount ) Values ( @dtBillDate, @nBillAmount )
				
							If @sContractType = 'CPO' Or @sInstallmentType = 'Once'
								Set @dtBillDate = @dtEnd
							else
								Set @dtBillDate = DateAdd(month, Case @sInstallmentType
																	When 'Monthly' Then 1
																	When 'Quarterly' Then 3
																	When 'Annual' Then 12
																	Else 1 
																End, @dtBillDate)
						END
				END
			else
				BEGIN
					Set @j = 1
					While (Select Count(*) From #Amendments)>=@j
						BEGIN
							Select @dtAmendmentDate = a.AmendmentDate, @PrevAmount = a.PreviousInvoiceAmount 
							From #Amendments a 
							Where ID = @j

							While @dtBillDate < @dtAmendmentDate
								BEGIN
									Insert Into #Schedule ( dtBillDate, nBillAmount ) Values ( @dtBillDate, @PrevAmount )
								
									If @sContractType = 'CPO' Or @sInstallmentType = 'Once'
										Set @dtBillDate = @dtEnd
									else
										Set @dtBillDate = DateAdd(month, Case @sInstallmentType
																			When 'Monthly' Then 1
																			When 'Quarterly' Then 3
																			When 'Annual' Then 12
																			Else 1 
																		End, @dtBillDate)
								END

							Set @j = @j + 1
						END

					While @dtBillDate < @dtEnd
						BEGIN
							Insert Into #Schedule ( dtBillDate, nBillAmount ) Values ( @dtBillDate, @nBillAmount )
				
									If @sContractType = 'CPO' Or @sInstallmentType = 'Once'
										Set @dtBillDate = @dtEnd
									else
										Set @dtBillDate = DateAdd(month, Case @sInstallmentType
																			When 'Monthly' Then 1
																			When 'Quarterly' Then 3
																			When 'Annual' Then 12
																			Else 1 
																		End, @dtBillDate)
						END
				END

			Select @Amt = Sum(nBillAmount) From #Schedule Where dtBillDate <= @dtToday

			Update #Results Set nAmountPerSchedule = @Amt Where lContractKey = @lContractKey

			Set @i = @i + 1
		END

	Select * From #Results 
	Where ISNULL(nAmountBilled,0) <> ISNULL(nAmountPerSchedule,0) 
	Order By sContractName1

	Drop Table #Results
	Drop Table #Schedule
	Drop Table #Amendments
END
