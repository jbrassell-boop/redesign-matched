CREATE PROCEDURE [dbo].[rptBonusPoolOps]
	(
		@plUserKey int = 0,
		@plYear int
	)

AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptBonusPoolOps 0, 2022
	--exec dbo.rptBonusPoolOps 121, 2023
	
	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	Declare @dtStartDate date
	Set @dtStartDate = dbo.BuildDate2(1,1,@plYear)

	Declare @dtEndDate date
	Set @dtEndDate = DATEADD(year,1,@dtStartDate)

	Create Table #Results
		(
			lUserKey int,
			lRepairKey int,
			sWorkOrderNumber nvarchar(50),
			sClientName1 nvarchar(300),
			sDepartmentName nvarchar(300),
			dtInvoiceDate date,
			ScopeInPoints decimal(10,2),
			BlankInspectionPoints decimal(10,2),
			FinalInspectionPoints decimal(10,2),
			ReqApprovedPoints decimal(10,2),
			InspectedByPoints decimal(10,2),
			UpdateSlipPoints decimal(10,2),
			PickupRequestPoints decimal(10,2),
			BonusPool decimal(10,2)
		)

	Insert Into #Results ( lUserKey, lRepairKey, sWorkOrderNumber, sClientName1, sDepartmentName, dtInvoiceDate, ScopeInPoints, BlankInspectionPoints, FinalInspectionPoints, 
		ReqApprovedPoints, InspectedByPoints, UpdateSlipPoints, PickupRequestPoints, BonusPool )
	Select p.lUserKey, p.lRepairKey, p.sWorkOrderNumber, p.sClientName1, p.sDepartmentName, p.dtInvoiceDate, p.ScopeInPoints, p.BlankInspectionPoints, p.FinalInspectionPoints, 
		p.ReqApprovedPoints, p.InspectedByPoints, p.UpdateSlipPoints, p.PickupRequestPoints, p.BonusPool
	From dbo.tblPointsOps p 
	Where	p.dtInvoiceDate >= @dtStartDate And p.dtInvoiceDate < @dtEndDate
		And ((@plUserKey = 0) Or (p.lUserKey = @plUserKey))

	Delete r
	From #Results r join dbo.tblUsers u on (r.lUserKey = u.lUserKey)
	Where u.bActive = 0

	Create Table #Summary
		(
			ID int identity(1,1),
			RecType nvarchar(50),
			lMonth int,
			NameOfMonth nvarchar(50),
			lUserKey int,
			sUserFullName nvarchar(100),
			ScopeInPoints decimal(10,2),
			BlankInspectionPoints decimal(10,2),
			FinalInspectionPoints decimal(10,2),
			ReqApprovedPoints decimal(10,2),
			InspectedByPoints decimal(10,2),
			UpdateSlipPoints decimal(10,2),
			PickupRequestPoints decimal(10,2),
			BonusPool decimal(10,2)
		)

	Insert Into #Summary ( RecType, lMonth, NameOfMonth, lUserKey, ScopeInPoints, BlankInspectionPoints, FinalInspectionPoints, ReqApprovedPoints, InspectedByPoints, 
		UpdateSlipPoints, PickupRequestPoints, BonusPool)
	Select 1 As RecType, DATEPART(month,r.dtInvoiceDate) As lMnth, DATENAME(month,r.dtInvoiceDate) As Mnth, r.lUserKey,
		SUM(r.ScopeInPoints) As ScopeInPoints, SUM(r.BlankInspectionPoints) As BlankInspectionPoints, SUM(r.FinalInspectionPoints) As FinalInspectionPoints, 
		SUM(r.ReqApprovedPoints) As ReqApprovedPoints, SUM(r.InspectedByPoints) As InspectedByPoints, SUM(r.UpdateSlipPoints) As UpdateSlipPoints, 
		SUM(r.PickupRequestPoints) As PickupRequestPoints, SUM(r.BonusPool) As BonusPool
	From #Results r
	Group By DATEPART(month,r.dtInvoiceDate), DATENAME(month,r.dtInvoiceDate), r.lUserKey

	Insert Into #Summary ( RecType, lUserKey, ScopeInPoints, BlankInspectionPoints, FinalInspectionPoints, ReqApprovedPoints, InspectedByPoints, 
		UpdateSlipPoints, PickupRequestPoints, BonusPool )
	Select 2 As RecType, r.lUserKey, SUM(r.ScopeInPoints) As ScopeInPoints, SUM(r.BlankInspectionPoints) As BlankInspectionPoints, SUM(r.FinalInspectionPoints) As FinalInspectionPoints, 
		SUM(r.ReqApprovedPoints) As ReqApprovedPoints, SUM(r.InspectedByPoints) As InspectedByPoints, SUM(r.UpdateSlipPoints) As UpdateSlipPoints, 
		SUM(r.PickupRequestPoints) As PickupRequestPoints, SUM(r.BonusPool) As BonusPool
	From #Results r
	Group By r.lUserKey

	Update s
	Set sUserFullName = u.sUserFullName
	From #Summary s join dbo.tblUsers u on (s.lUserKey = u.lUserKey)
	
	Select * From #Summary Order By RecType, lMonth, sUserFullName

	Drop Table #Results
	Drop Table #Summary
END
