CREATE PROCEDURE [dbo].[rptBonusPoolTechs]
	(
		@plTechKey int = 0,
		@plYear int
	)

AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptBonusPoolTechs 0, 2022
	--exec dbo.rptBonusPoolTechs 21, 2023
	
	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	Declare @dtStartDate date
	Set @dtStartDate = dbo.BuildDate2(1,1,@plYear)

	Declare @dtEndDate date
	Set @dtEndDate = DATEADD(day,-1,DATEADD(year,1,@dtStartDate))

	Create Table #Results
		(
			lTechKey int,
			lRepairKey int,
			lRepairItemTranKey int,
			sWorkOrderNumber nvarchar(50),
			sClientName1 nvarchar(300),
			sDepartmentName nvarchar(300),
			dtInvoiceDate date,
			RepairItem nvarchar(300),
			MinorPoints decimal(10,2),
			MidLevelPoints decimal(10,2),
			MajorPoints decimal(10,2),
			VSIPoints decimal(10,2),
			DIPoints decimal(10,2),
			FinalPoints decimal(10,2),
			UpdateSlipPoints decimal(10,2),
			BonusPool decimal(10,2)
		)

	Insert Into #Results ( lTechKey, lRepairKey, lRepairItemTranKey, sWorkOrderNumber, sClientName1, sDepartmentName, dtInvoiceDate, RepairItem,
		MinorPoints, MidLevelPoints, MajorPoints, VSIPoints, DIPoints, FinalPoints, UpdateSlipPoints, BonusPool )
	Select a.lTechnicianKey, a.lRepairKey, a.lRepairItemTranKey, a.sWorkOrderNumber, a.sClientName1, a.sDepartmentName, a.DateOut, a.RepairItem,
		a.MinorPoints, a.MidLevelPoints, a.MajorPoints, a.VSIPoints, a.DIPoints, a.FinalPoints, a.UpdateSlipPoints, a.BonusPool
	From dbo.fn_GetPointsTech(@dtStartDate,@dtEndDate,0) a 
	Where ((@plTechKey=0) Or (a.lTechnicianKey = @plTechKey))
	
	if @lDatabaseKey = 2
		BEGIN
			Create Table #PointsNorth 
				(
					lTechnicianKey int,
					sTechName nvarchar(50),
					lRepairKey int,
					sWorkOrderNumber nvarchar(50),
					sClientName1 nvarchar(100),
					sDepartmentName nvarchar(100),
					DateOut date,
					lRepairItemTranKey int,
					RepairItem nvarchar(200),
					MinorPoints decimal(10, 2),
					MidLevelPoints decimal(10, 2),
					MajorPoints decimal(10, 2),
					VSIPoints decimal(10, 2),
					DIPoints decimal(10, 2),
					FinalPoints decimal(10, 2),
					UpdateSlipPoints decimal(10,2),
					PointValue decimal(10,2),
					BonusPool decimal(10,2)
				)

			Insert Into #PointsNorth EXEC TSI.WinscopeNEt.dbo.pointsTechsGetForSouth 0, @plTechKey, @dtStartDate, @dtEndDate

			Update p Set sTechName = t.sTechName From #PointsNorth p join dbo.tblTechnicians t on (p.lTechnicianKey = t.lTechnicianKey)

			Insert Into #Results ( lTechKey, lRepairKey, lRepairItemTranKey, sWorkOrderNumber, sClientName1, sDepartmentName, dtInvoiceDate, RepairItem,
				MinorPoints, MidLevelPoints, MajorPoints, VSIPoints, DIPoints, FinalPoints, UpdateSlipPoints, BonusPool )
			Select p.lTechnicianKey, lRepairKey, lRepairItemTranKey, sWorkOrderNumber, sClientName1, sDepartmentName, p.DateOut, RepairItem,
				MinorPoints, MidLevelPoints, MajorPoints, VSIPoints, DIPoints, FinalPoints, UpdateSlipPoints, BonusPool
			From #PointsNorth p
			Where ((@plTechKey=0) Or (p.lTechnicianKey = @plTechKey))

			Drop Table #PointsNorth
		END

	Delete r
	From #Results r join dbo.tblTechnicians t on (r.lTechKey = t.lTechnicianKey)
	Where t.bIsActive = 0 Or t.lJobTypeKey <> 2

	Create Table #Summary
		(
			ID int identity(1,1),
			RecType nvarchar(50),
			lMonth int,
			NameOfMonth nvarchar(50),
			lTechKey int,
			sTechName nvarchar(100),
			MinorPoints decimal(10,2),
			MidLevelPoints decimal(10,2),
			MajorPoints decimal(10,2),
			VSIPoints decimal(10,2),
			DIPoints decimal(10,2),
			FinalPoints decimal(10,2),
			UpdateSlipPoints decimal(10,2),
			BonusPool decimal(10,2)
		)

	Insert Into #Summary ( RecType, lMonth, NameOfMonth, lTechKey, MinorPoints, MidLevelPoints, MajorPoints, VSIPoints, DIPoints, FinalPoints, UpdateSlipPoints, BonusPool )
	Select 1 As RecType, DATEPART(month,r.dtInvoiceDate) As lMnth, DATENAME(month,r.dtInvoiceDate) As Mnth, r.lTechKey,
		SUM(r.MinorPoints) As MinorPoints, SUM(r.MidLevelPoints) As MidLevelPoints, SUM(r.MajorPoints) As MajorPoints, SUM(r.VSIPoints) As VSIPoints, SUM(r.DIPoints) As DIPoints, 
		SUM(r.FinalPoints) As FinalPoints, SUM(r.UpdateSlipPoints) As UpdateSlipPoints, SUM(r.BonusPool) As BonusPool
	From #Results r
	Group By DATEPART(month,r.dtInvoiceDate), DATENAME(month,r.dtInvoiceDate), r.lTechKey

	Insert Into #Summary ( RecType, lTechKey, MinorPoints, MidLevelPoints, MajorPoints, VSIPoints, DIPoints, FinalPoints, UpdateSlipPoints, BonusPool )
	Select 2 As RecType, r.lTechKey, SUM(r.MinorPoints) As MinorPoints, SUM(r.MidLevelPoints) As MidLevelPoints, SUM(r.MajorPoints) As MajorPoints, 
		SUM(r.VSIPoints) As VSIPoints, SUM(r.DIPoints) As DIPoints, SUM(r.FinalPoints) As FinalPoints, SUM(r.UpdateSlipPoints) As UpdateSlipPoints, SUM(r.BonusPool) As BonusPool
	From #Results r
	Group By r.lTechKey

	Update s
	Set sTechName = t.sTechName
	From #Summary s join dbo.tblTechnicians t on (s.lTechKey = t.lTechnicianKey)


	Select * From #Summary Order By RecType, lMonth, sTechName

	Drop Table #Results
	Drop Table #Summary
END
