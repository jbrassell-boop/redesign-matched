
CREATE PROCEDURE [dbo].[rptTurnAroundTimesYTDByMonth]
	(
		@plYear int,
		@psInstrumentType nvarchar(1),
		@plDiameterSize int = 0,
		@pbInHouse bit = 1,
		@pbUseDateApproved bit = 1,
		@plContractType int = 0,
		@plEndoChoiceFlag tinyint = 1				--1 = All, 2 = EndoChoice Only, 3 = All Except EndoChoice
	)

AS
BEGIN
	SET NOCOUNT ON;

	--exec dbo.rptTurnAroundTimesYTDByMonth 2021, 'F', 1, 1

	Create Table #Results
		(
			lMonth int,
			lRepairLevelKey int,
			sRepairLevel nvarchar(50),
			TurnAroundTime decimal(10,4),
			RepairCount int
		)

	/*Diameter Size (Flex Only)
		0 = All
		1 - Large Diameter 
		2 - Small Diameter
	*/
    Create Table #Repairs
		(
			lRepairKey int,
			lRepairLevelKey int,
			TurnAroundTime decimal(10,4)
		)

	Declare @i int
	Declare @dtStartDate date
	Declare @dtEndDate date 
	Declare @dtStartYear date 

	Set @dtStartYear = dbo.BuildDate2(1, 1, @plYear)

	Declare @lMonth int 
	if @plYear < DatePart(year,GETDATE())
		Set @lMonth = 12
	else
		BEGIN
			Set @lMonth = DATEPART(month,GETDATE())

			if (Convert(date,GETDATE()) < Convert(date,dbo.fn_LastOfMonth(GETDATE())))
				BEGIN
					Set @lMonth = @lMonth - 1
				END
		END

	Set @i = 0
	While (@i < @lMonth)
		BEGIN
			Set @dtStartDate = DATEADD(month,@i, @dtStartYear)
			Set @dtEndDate = DATEADD(month,1,@dtStartDate)
		
			Print 'From ' + Cast(@dtStartDate as varchar(20)) + ' to ' + Cast(@dtEndDate as varchar(20))

			Truncate Table #Repairs
			
				If @pbUseDateApproved = 1
					BEGIN
						Insert Into #Repairs ( lRepairKey, lRepairLevelKey, TurnAroundTime ) 
						Select r.lRepairKey, Max(rl.lRepairLevelKey) As RepairLevelKey, Cast(dbo.fn_DateDiffWeekDays(r.dtAprRecvd, r.dtDateOut) as decimal(10,4))
						From tblRepair r join tblRepairItemTran rit on (r.lRepairKey=rit.lRepairKey)
							join tblDepartment d on (r.lDepartmentKey=d.lDepartmentKey)
							join tblClient c on (d.lClientKey=c.lClientKey)
							join tblRepairItem ri on (rit.lRepairItemKey=ri.lRepairItemKey)
							join tblRepairLevels rl on (ri.sMajorRepair=rl.lRepairLevelKey)
							join tblScope s on (r.lScopeKey=s.lScopeKey)
							join tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey) 
							--left join tblSystemCodes sc on (st.lScopeTypeCatKey=sc.lSystemCodesKey)
							left join dbo.tblScopeTypeCategories sc on (st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey)
							left join dbo.tblManufacturers m on (st.lManufacturerKey = m.lManufacturerKey)
						Where CONVERT(Date,r.dtAprRecvd) >= @dtStartDate And CONVERT(Date,r.dtAprRecvd) < @dtEndDate And IsDate(r.dtDateOut)=1
							And ((@psInstrumentType = 'A') Or (st.sRigidOrFlexible=@psInstrumentType))
							And ((@pbInHouse = 1 And IsNull(r.lVendorKey,0)=0) Or (IsNull(@pbInHouse,0) <> 1 And IsNull(r.lVendorKey,0)>0))
							And ((@psInstrumentType <> 'F') Or (@plDiameterSize = 0) Or ((@plDiameterSize=1 And IsNull(sc.bLargeDiameter,0)<>0)) Or ((@plDiameterSize=2 And IsNull(sc.bLargeDiameter,0)=0)))
							And IsNull(c.bSkipTracking,0) = 0
							And (	(@plContractType = 0)
									Or
									(@plContractType = 1 And dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn)=0)
									Or
									(@plContractType = 2 and dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn)<>0)
								)
							And (	(@plEndoChoiceFlag = 1)
									Or
									(@plEndoChoiceFlag = 2 And m.sManufacturer='EndoChoice')
									Or
									(@plEndoChoiceFlag = 3 And m.sManufacturer<>'EndoChoice')
								)
						Group By r.lRepairKey, r.dtAprRecvd, r.dtDateOut
					END
				else
					BEGIN
						Insert Into #Repairs ( lRepairKey, lRepairLevelKey, TurnAroundTime ) 
						Select r.lRepairKey, Max(rl.lRepairLevelKey) As RepairLevelKey, Cast(dbo.fn_DateDiffWeekDays(r.dtDateIn, r.dtDateOut) as decimal(10,4))
						From tblRepair r join tblRepairItemTran rit on (r.lRepairKey=rit.lRepairKey)
							join tblDepartment d on (r.lDepartmentKey=d.lDepartmentKey)
							join tblClient c on (d.lClientKey=c.lClientKey)
							join tblRepairItem ri on (rit.lRepairItemKey=ri.lRepairItemKey)
							join tblRepairLevels rl on (ri.sMajorRepair=rl.lRepairLevelKey)
							join tblScope s on (r.lScopeKey=s.lScopeKey)
							join tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey) 
							--left join tblSystemCodes sc on (st.lScopeTypeCatKey=sc.lSystemCodesKey)
							left join dbo.tblScopeTypeCategories sc on (st.lScopeTypeCatKey = sc.lScopeTypeCategoryKey)
							left join dbo.tblManufacturers m on (st.lManufacturerKey = m.lManufacturerKey)
						Where CONVERT(Date,r.dtAprRecvd) >= @dtStartDate And CONVERT(Date,r.dtAprRecvd) < @dtEndDate And IsDate(r.dtDateOut)=1
							And ((@psInstrumentType = 'A') Or (st.sRigidOrFlexible=@psInstrumentType))
							And ((@pbInHouse = 1 And IsNull(r.lVendorKey,0)=0) Or (IsNull(@pbInHouse,0) <> 1 And IsNull(r.lVendorKey,0)>0))
							And ((@psInstrumentType <> 'F') Or (@plDiameterSize = 0) Or ((@plDiameterSize=1 And IsNull(sc.bLargeDiameter,0)<>0)) Or ((@plDiameterSize=2 And IsNull(sc.bLargeDiameter,0)=0)))
							And IsNull(c.bSkipTracking,0) = 0
							And (	(@plContractType = 0)
									Or
									(@plContractType = 1 And dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn)=0)
									Or
									(@plContractType = 2 and dbo.fn_scopeIsCoveredByContract(r.lScopeKey,r.dtDateIn)<>0)
								)
							And (	(@plEndoChoiceFlag = 1)
									Or
									(@plEndoChoiceFlag = 2 And m.sManufacturer='EndoChoice')
									Or
									(@plEndoChoiceFlag = 3 And m.sManufacturer<>'EndoChoice')
								)
						Group By r.lRepairKey, r.dtDateIn, r.dtDateOut
					END

				Update #Repairs Set TurnAroundTime = 0 Where TurnAroundTime < 0
			
				Insert Into #Results ( lMonth, lRepairLevelKey, sRepairLevel, TurnAroundTime, RepairCount )
				Select @i+1, r.lRepairLevelKey, rl.sRepairLevel, Avg(r.TurnAroundTime) As TurnAroundTime, Count(r.lRepairLevelKey) As RepairCount
				From #Repairs r join tblRepairLevels rl on (r.lRepairLevelKey=rl.lRepairLevelKey)
				Group By r.lRepairLevelKey, rl.sRepairLevel
							
				Set @i = @i + 1
			END

	Select * From #Results Order By lMonth, lRepairLevelKey

	Drop Table #Repairs
	Drop Table #Results
END
