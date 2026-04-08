CREATE PROCEDURE [dbo].[rptMobileAppMetrics]
	(
		@pdtStartDate datetime,
		@pdtEndDate datetime
	)
AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptMobileAppMetrics @pdtStartDate='1/1/2016', @pdtEndDate='10/31/2016'

	Declare @Results Table
		(
			lScopeTypeKey int,
			sScopeTypeDesc nvarchar(50),
			lRepairItemKey int,
			sItemDescription nvarchar(50),
			sInstrumentType nvarchar(50),
			sTechLevel nvarchar(1),
			TotalElapsedTimeInSeconds int,
			TotalElapsedTime nvarchar(50),
			NumberOfRepairs int,
			AverageElapsedTimeInSeconds int,
			AverageElapsedTime nvarchar(50)
		)

	Declare @RepairItemsPerRepair Table
		(
			lRepairKey int,
			sTechLevel nvarchar(1),
			lRepairItemKey int
		)

	Insert Into @RepairItemsPerRepair (lRepairKey, sTechLevel, lRepairItemKey ) 
	Select c.lRepairKey, t.sTechLevel, c.lRepairItemKey 
	From dbo.fnTechAllCompletedRepairs() c join tblRepair r on (c.lRepairKey = r.lRepairKey)
		join tblTechnicians t on (c.lTechKey=t.lTechnicianKey)
	Where r.dtDateIn >= @pdtStartdate And r.dtDateIn < DATEADD(day,1,@pdtEndDate)
	Group By c.lRepairKey, t.sTechLevel, c.lRepairItemKey 

	Declare @RepairItemCounts Table
		(
			lRepairItemKey int,
			lScopeTypeKey int,
			sTechLevel nvarchar(1),
			RepairCount int
		)

	Insert Into @RepairItemCounts ( lRepairItemKey, lScopeTypeKey, sTechLevel, RepairCount ) 
	Select pr.lRepairItemKey, s.lScopeTypeKey, pr.sTechLevel, COUNT(pr.lRepairItemKey) As cnt 
	From @RepairItemsPerRepair pr join tblRepair r on (pr.lRepairKey=r.lRepairKey)
		join tblScope s on (r.lScopeKey=s.lScopeKey)
	Group By pr.lRepairItemKey, s.lScopeTypeKey, pr.sTechLevel


	Insert Into @Results ( lScopeTypeKey, sScopeTypeDesc, lRepairItemKey, sItemDescription, sInstrumentType, sTechLevel, NumberOfRepairs, TotalElapsedTimeInSeconds ) 
	Select st.lScopeTypeKey, st.sScopeTypeDesc, c.lRepairItemKey, ri.sItemDescription, 
		Case st.sRigidOrFlexible
			When 'F' Then 'Flexible'
			When 'R' Then 'Rigid'
			When 'C' then 'Camera'
			When 'I' Then 'Instrument'
		End As InstrumentType, t.sTechLevel, ric.RepairCount, Sum(c.ElapsedTimeInSeconds) As TotalElapsedTime
	from dbo.fnTechAllCompletedRepairs() c join tblRepairItem ri on (c.lRepairItemKey=ri.lRepairItemKey)
		join dbo.tblRepair r on (c.lRepairKey=r.lRepairKey)
		join dbo.tblScope s on (r.lScopeKey=s.lScopeKey)
		join dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
		join dbo.tblTechnicians t on (c.lTechKey=t.lTechnicianKey)
		join @RepairItemCounts ric on (c.lRepairItemKey = ric.lRepairItemKey)
	Group By st.lScopeTypeKey, st.sScopeTypeDesc, c.lRepairItemKey, ri.sItemDescription, 
		Case st.sRigidOrFlexible
			When 'F' Then 'Flexible'
			When 'R' Then 'Rigid'
			When 'C' then 'Camera'
			When 'I' Then 'Instrument'
		End, t.sTechLevel, ric.RepairCount

	Update @Results 
	Set AverageElapsedTimeInSeconds = IsNull(TotalElapsedTimeInSeconds,0) / NumberOfRepairs

	Update @Results 
	Set TotalElapsedTime = 
		Case When TotalElapsedTimeInSeconds >= 86400 Then
				CONVERT(varchar, TotalElapsedTimeInSeconds / 86400 ) + ' day' + Case When TotalElapsedTimeInSeconds >= 172800 Then 's + ' Else ' + ' End 
			Else ''
		End + CONVERT(varchar, DATEADD(ms, ( TotalElapsedTimeInSeconds % 86400 ) * 1000, 0), 108),
		AverageElapsedTime = 
		Case When AverageElapsedTimeInSeconds >= 86400 Then
				CONVERT(varchar, AverageElapsedTimeInSeconds / 86400 ) + ' day' + Case When AverageElapsedTimeInSeconds >= 172800 Then 's + ' Else ' + ' End 
			Else ''
		End + CONVERT(varchar, DATEADD(ms, ( AverageElapsedTimeInSeconds % 86400 ) * 1000, 0), 108)
	
	Select * from @Results

END
