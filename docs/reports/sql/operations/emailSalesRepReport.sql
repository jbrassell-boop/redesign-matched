CREATE PROCEDURE [dbo].[emailSalesRepReport]
	(
		@pdtDate date = '1/1/1900',
		@prmTesting bit = 0
	)
AS
BEGIN
	SET NOCOUNT ON;

	Declare @pdtAsOfDate Date
	
	--exec dbo.emailSalesRepReport @prmTesting = 1

	If @pdtDate = '1/1/1900'
		Set @pdtAsOfDate = Convert(Date,DATEADD(day,-1,GetDate()))
	else
		Set @pdtAsOfDate = @pdtDate 



	--First fix issue with repair statuses of "Waiting for Approval" even though an approval date exists
	Create Table #RepairKeysForStatus
		(
			ID int identity(1,1),
			lRepairKey int,
			sWorkOrderNumber nvarchar(50)
		)
	
	Declare @lRepairStatusID int
	Select @lRepairStatusID = lRepairStatusID From dbo.tblRepairStatuses Where sRepairStatus='Waiting for Approved'
	Declare @lRepairStatusID_DryingRoom int
	Select @lRepairStatusID_DryingRoom = lRepairStatusID From dbo.tblRepairStatuses Where sRepairStatus='In the Drying Room'
	Declare @lRepairStatusID_POReceived int
	Select @lRepairStatusID_POReceived = lRepairStatusID from tblRepairStatuses Where sRepairStatus = 'PO Received - Awaiting build'
	Declare @sWorkOrderNumber nvarchar(50)

	Insert Into #RepairKeysForStatus ( lRepairKey, sWorkOrderNumber ) 
	Select r.lRepairKey, r.sWorkOrderNumber
	From tblRepair r
	Where ISDATE(r.dtAprRecvd)=1 And r.dtDateOut Is Null And r.lRepairStatusID In (@lRepairStatusID,@lRepairStatusID_DryingRoom)

	Declare @i int
	Set @i=1
	Declare @lRepairKey int
	Declare @sRepairStatus nvarchar(50)

	While (Select Count(*) From #RepairKeysForStatus)>=@i
		Begin
			Set @lRepairStatusID=0
			Select @lRepairKey = lRepairKey, @sWorkOrderNumber = sWorkOrderNumber From #RepairKeysForStatus Where ID=@i
			
			If SUBSTRING(@sWorkOrderNumber,2,1)='K' And ISNULL(@lRepairStatusID_POReceived,0)>0
				BEGIN
					Set @lRepairStatusID = @lRepairStatusID_POReceived
				END
			else
				BEGIN
					Select @lRepairStatusID=IsNull(ri.lRepairStatusID,0), @sRepairStatus=rs.sRepairStatus
					From tblRepairItemTran rit join tblRepairItem ri on (rit.lRepairItemKey = ri.lRepairItemKey)
						join tblRepairStatuses rs on (ri.lRepairStatusID=rs.lRepairStatusID)
					Where rit.lRepairKey=@lRepairKey And rit.sPrimaryRepair = 'Y' And rs.sAlertType='On Approval'
				END

			If IsNull(@lRepairStatusID,0)<>0
				Begin
					Update tblRepair Set lRepairStatusID=@lRepairStatusID, dtRepairStatusDate=GetDate()
					Where lRepairKey=@lRepairKey

					Insert Into tblRepairStatusLog ( lRepairKey, lRepairStatusID, sRepairStatus, ChangeDate ) Values ( @lRepairKey, @lRepairStatusID, @sRepairStatus, GetDate() )
				End 
			Set @i=@i+1
		End
	
	Drop Table #RepairKeysForStatus
	-------------------------------------Done fixing statuses

	

	DECLARE @subject nvarchar(max)
	DECLARE @tableHTML nvarchar(max)
	DECLARE @tableHTML2 nvarchar(max)
	DECLARE @tableHTML3 nvarchar(max)
	DECLARE @tableHTML4 nvarchar(max)
	Declare @emailHTML nvarchar(max)
	DECLARE @Table NVARCHAR(MAX) = N''
	DECLARE @Table2 NVARCHAR(MAX) = N''
	DECLARE @Table3 NVARCHAR(MAX) = N''
	DECLARE @Table4 NVARCHAR(MAX) = N''
	DECLARE @sEmailRecipients nvarchar(2000)

	Declare @StartDate date

	--Email Settings
	Declare @ProfileName nvarchar(50)

	If @@ServerName='SBLACK17R'		
		Set @ProfileName = 'Master Profile'
	Else
		Set @ProfileName = 'TSI Profile'

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()

	Declare @SalesReps Table
		(
			ID int identity(1,1),
			lSalesRepKey int,
			sRepName nvarchar(100),
			sRepEmail nvarchar(200)
		)

	Insert Into @SalesReps ( lSalesRepKey, sRepName, sRepEmail ) 
	Select sr.lSalesRepKey, LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))), sr.sRepEmail
	From dbo.tblSalesRep sr 
	Where sr.bDailySalesRepEmail = 1 And ISNULL(sr.sRepEmail,'')<>''

	--Get Primary Repairs for all applicable repairs (Waiting for Approval) here so we don't need to do it within the loop
	Create Table #PrimaryRepairs
	(
		lRepairKey int,
		sPrimaryRepair nvarchar(500),
		lSalesRepKey int
	)

	Insert Into #PrimaryRepairs ( lRepairKey, sPrimaryRepair, lSalesRepKey )

	Select r.lRepairKey, ri.sItemDescription, r.lSalesRepKey
	From dbo.tblRepair r join dbo.tblRepairItemTran rit on (r.lRepairKey = rit.lRepairKey)
		join dbo.tblRepairItem ri on (rit.lRepairItemKey=ri.lRepairItemKey)
		join dbo.tblRepairStatuses rs on (r.lRepairStatusID=rs.lRepairStatusID)
		join @SalesReps sr on (r.lSalesRepKey = sr.lSalesRepKey)
	Where rs.sRepairStatus = 'Waiting for Approved' And rit.sPrimaryRepair='Y'
	UNION
	Select r.lRepairKey, ri.sItemDescription, d.lSalesRepKey_CS As lSalesRepKey
	From dbo.tblRepair r join dbo.tblRepairItemTran rit on (r.lRepairKey = rit.lRepairKey)
		join dbo.tblRepairItem ri on (rit.lRepairItemKey=ri.lRepairItemKey)
		join dbo.tblRepairStatuses rs on (r.lRepairStatusID=rs.lRepairStatusID)
		join dbo.tblDepartment d on (r.lDepartmentKey=d.lDepartmentKey)
		join @SalesReps sr on (d.lSalesRepKey_CS = sr.lSalesRepKey)
	Where rs.sRepairStatus = 'Waiting for Approved' And rit.sPrimaryRepair='Y'
	

	--Get Outstanding Loaners once.
	CREATE TABLE #Loaners
	(
		lScopeKey int,
		lLoanerTranKey int,
		lRepairKey int,
		lDepartmentKey int,
		sScopeTypeDesc nvarchar(200),
		sSerialNumber nvarchar(50),
		sLoanerRackPosition nvarchar(50),
		LoanerStatus nvarchar(20),
		sWorkOrderNumber nvarchar(20),
		DateOut nvarchar(20),
		OnSiteLoaner nvarchar(3),
		sClientName1 nvarchar(200),
		sDepartmentName nvarchar(200),
		RepName nvarchar(200),
		ScopeCategory nvarchar(50),
		RedFlag nvarchar(1),
		sTrackingNumber nvarchar(50),
		lSalesRepKey int,
		lServiceLocationKey int,
		sLocation nvarchar(50)
	)
	Insert Into #Loaners EXEC dbo.dashLoaners @psLoanersFlags='0010'
	
	--Get Turn Around Times Once
	Declare @emailHTML_TurnAroundTimes nvarchar(MAX)
	SET @emailHTML_TurnAroundTimes = N'<H2><font color="black">Turn Around Times - Last 30 Days</H2>'

	Create Table #TurnAroundTimesResults
		(
			lRepairLevelKey int,
			sRepairLevel nvarchar(50),
			Last6Months decimal(10,4),
			Last6MonthsCount int,
			Last3Months decimal(10,4),
			Last3MonthsCount int,
			LastMonth decimal(10,4),
			LastMonthCount int,
			CurrentMonth decimal(10,4),
			CurrentMonthCount int
		)


	Create Table #TurnAroundTimesInHouse
		(
			ID int identity(1,1),
			sRepairLevel nvarchar(50),
			LastMonth decimal(10,4),
			LastMonthCount int,
			InstrumentCount int
		)

	Create Table #TurnAroundTimesOutsourced
		(
			ID int identity(1,1),
			sRepairLevel nvarchar(50),
			LastMonth decimal(10,4),
			LastMonthCount int,
			InstrumentCount int
		)

	Create Table #TurnAroundTimesInHouseSmallDiameter
		(
			ID int identity(1,1),
			sRepairLevel nvarchar(50),
			LastMonth decimal(10,4),
			LastMonthCount int
		)

	Create Table #TurnAroundTimesOutsourcedSmallDiameter
		(
			ID int identity(1,1),
			sRepairLevel nvarchar(50),
			LastMonth decimal(10,4),
			LastMonthCount int
		)

	Declare @sRepairLevelInHouse nvarchar(50)
	Declare @sRepairLevelOutsourced nvarchar(50)
	Declare @sRepairLevelInHouseSmall nvarchar(50)
	Declare @sRepairLevelOutsourcedSmall nvarchar(50)

	Declare @LastMonthInHouse decimal(10,4)
	Declare @LastMonthOutsourced decimal(10,4)
	Declare @LastMonthInHouseSmall decimal(10,4)
	Declare @LastMonthOutsourcedSmall decimal(10,4)

	Declare @LastMonthCountInHouse int
	Declare @LastMonthCountOutsourced int
	Declare @LastMonthCountInHouseSmall int
	Declare @LastMonthCountOutsourcedSmall int

	Declare @InstrumentType nvarchar(1)

	Declare @lEndoChoiceFlag tinyint			--1 = All Manufacturers, 2 = EndoChoice Only, 3 = All Except EndoChoice

	Declare @ID int
	Set @ID = @@SPID

	Set @i = 1
	While @i < 6
		Begin
			Set @InstrumentType = Case @i	
									When 1 Then 'F'
									When 2 Then 'R'
									When 3 Then 'C'
									When 4 Then 'I'
									When 5 Then 'F'	
									End 

			Set @lEndoChoiceFlag = 1

			If @i = 1
				Set @lEndoChoiceFlag = 3
			If @i = 5
				Set @lEndoChoiceFlag = 2

			Truncate Table #TurnAroundTimesInHouse
			Truncate Table #TurnAroundTimesOutsourced
			Truncate Table #TurnAroundTimesInHouseSmallDiameter
			Truncate Table #TurnAroundTimesOutsourcedSmallDiameter

			Set @Table = ''
			Set @Table2 = ''
			Set @Table3 = ''
			Set @Table4 = ''
			Set @tableHTML = ''
			Set @tableHTML2 = ''
			Set @tableHTML3 = ''
			Set @tableHTML4 = ''

			If @InstrumentType <> 'I'
				Begin
					Truncate Table #TurnAroundTimesResults
					--if @lDatabaseKey = 2
					--	BEGIN	
					--		--This adds data to a temp table in the North database.  The below EXEC statement uses this data.
					--		exec TSI.WinscopeNet.dbo.repairTurnTimesByWorkOrderForSouth @ID, @InstrumentType,1,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag
					--	END
					Insert Into #TurnAroundTimesResults EXEC dbo.repairTurnTimesByWorkOrder @ID, @InstrumentType,1,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag

					--Insert Into #TurnAroundTimesInHouse (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From dbo.fnTurnAroundTimesByWorkOrder(@InstrumentType,1,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag)
					Insert Into #TurnAroundTimesInHouse (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From #TurnAroundTimesResults r
					Order By Case lRepairLevelKey 
									When 1 Then 3		--Minor
									When 2 Then 2		--Mid-Level
									When 3 Then 1		--Major
									When 4 Then 4		--VSI
							End

					Truncate Table #TurnAroundTimesResults
					--if @lDatabaseKey = 2
					--	BEGIN	
					--		--This adds data to a temp table in the North database.  The below EXEC statement uses this data.
					--		exec TSI.WinscopeNet.dbo.repairTurnTimesByWorkOrderForSouth @ID, @InstrumentType,1,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag
					--	END
					Insert Into #TurnAroundTimesResults EXEC dbo.repairTurnTimesByWorkOrder @ID, @InstrumentType,1,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag

					--Insert Into #TurnAroundTimesOutsourced (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From dbo.fnTurnAroundTimesByWorkOrder(@InstrumentType,1,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag)
					Insert Into #TurnAroundTimesOutsourced (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From #TurnAroundTimesResults r
					Order By Case lRepairLevelKey 
									When 1 Then 3		--Minor
									When 2 Then 2		--Mid-Level
									When 3 Then 1		--Major
									When 4 Then 4		--VSI
							End
						
					SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
						'<td style="font-size: 10px;">' + IsNull(sRepairLevel,'') + '</td>' +
						--'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
						'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
						'</tr>'
					FROM #TurnAroundTimesInHouse 
					ORDER BY ID

					SELECT @Table2 = @Table2 +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
						'<td style="font-size: 10px;">' + IsNull(sRepairLevel,'') + '</td>' +
						--'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
						'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
						'</tr>'
					FROM #TurnAroundTimesOutsourced
					ORDER BY ID

					SET @tableHTML = 
					--N'<H4><font color="black">' + Case @InstrumentType When 'F' Then 'Flexible' When 'R' Then 'Rigid' When 'I' Then 'Instrument' When 'C' Then 'Camera' End + ' In House' + Case When @InstrumentType = 'F' Then ' Large Diameter' Else '' End + '</H4>' +
					N'<H4><font color="black">' + Case @InstrumentType When 'F' Then Case When @lEndoChoiceFlag=3 Then 'Flexible' Else 'FUSE' End  When 'R' Then 'Rigid' When 'I' Then 'Instrument' When 'C' Then 'Camera' End + ' In House' + Case When @InstrumentType = 'F' Then ' Large Diameter' Else '' End + '</H4>' +
					N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
					N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
					<th style="padding-left:10px; padding-right:10px">Repair Level</th>
					<th style="padding-left:10px; padding-right:10px">Turnaround Time</th>
					</tr>' + @Table + N'</table>'

					SET @tableHTML2 = 
					--N'<H4><font color="black">' + Case @InstrumentType When 'F' Then 'Flexible' When 'R' Then 'Rigid' When 'I' Then 'Instrument' When 'C' Then 'Camera' End + ' Outsourced' + Case When @InstrumentType = 'F' Then ' Large Diameter' Else '' End + '</H4>' +
					N'<H4><font color="black">' + Case @InstrumentType When 'F' Then Case When @lEndoChoiceFlag=3 Then 'Flexible' Else 'FUSE' End When 'R' Then 'Rigid' When 'I' Then 'Instrument' When 'C' Then 'Camera' End + ' Outsourced' + Case When @InstrumentType = 'F' Then ' Large Diameter' Else '' End + '</H4>' +
					N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
					N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
					<th style="padding-left:10px; padding-right:10px">Repair Level</th>
					<th style="padding-left:10px; padding-right:10px">Turnaround Time</th>
					</tr>' + @Table2 + N'</table>'

					If @InstrumentType='F' And @lEndoChoiceFlag = 3
						Begin
							Truncate Table #TurnAroundTimesResults
							--if @lDatabaseKey = 2
							--	BEGIN	
							--		--This adds data to a temp table in the North database.  The below EXEC statement uses this data.
							--		exec TSI.WinscopeNet.dbo.repairTurnTimesByWorkOrderForSouth @ID, @InstrumentType,2,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag
							--	END
							Insert Into #TurnAroundTimesResults EXEC dbo.repairTurnTimesByWorkOrder @ID, @InstrumentType,2,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag

							--Insert Into #TurnAroundTimesInHouseSmallDiameter (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From dbo.fnTurnAroundTimesByWorkOrder(@InstrumentType,2,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag)
							Insert Into #TurnAroundTimesInHouseSmallDiameter (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From #TurnAroundTimesResults r
							Order By Case lRepairLevelKey 
											When 1 Then 3		--Minor
											When 2 Then 2		--Mid-Level
											When 3 Then 1		--Major
											When 4 Then 4		--VSI
									End
		
							Truncate Table #TurnAroundTimesResults
							--if @lDatabaseKey = 2
							--	BEGIN	
							--		--This adds data to a temp table in the North database.  The below EXEC statement uses this data.
							--		exec TSI.WinscopeNet.dbo.repairTurnTimesByWorkOrderForSouth @ID, @InstrumentType,2,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag
							--	END
							Insert Into #TurnAroundTimesResults EXEC dbo.repairTurnTimesByWorkOrder @ID, @InstrumentType,2,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag

							--Insert Into #TurnAroundTimesOutsourcedSmallDiameter (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From dbo.fnTurnAroundTimesByWorkOrder(@InstrumentType,2,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag)
							Insert Into #TurnAroundTimesOutsourcedSmallDiameter (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From #TurnAroundTimesResults r
							Order By Case lRepairLevelKey 
											When 1 Then 3		--Minor
											When 2 Then 2		--Mid-Level
											When 3 Then 1		--Major
											When 4 Then 4		--VSI
									End

							SELECT @Table3 = @Table3 +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
								'<td style="font-size: 10px;">' + IsNull(sRepairLevel,'') + '</td>' +
								--'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
								'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
								'</tr>'
							FROM #TurnAroundTimesInHouseSmallDiameter
							ORDER BY ID

							SELECT @Table4 = @Table4 +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
								'<td style="font-size: 10px;">' + IsNull(sRepairLevel,'') + '</td>' +
								--'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
								'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
								'</tr>'
							FROM #TurnAroundTimesOutsourcedSmallDiameter
							ORDER BY ID

							SET @tableHTML3 = 
							N'<H4><font color="black">Flexible In House Small Diameter</H4>' +
							N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
							N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
							<th style="padding-left:10px; padding-right:10px">Repair Level</th>
							<th style="padding-left:10px; padding-right:10px">Turnaround Time</th>
							</tr>' + @Table3 + N'</table>'

							SET @tableHTML4 = 
							N'<H4><font color="black">Flexible Outsourced Small Diameter</H4>' +
							N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
							N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
							<th style="padding-left:10px; padding-right:10px">Repair Level</th>
							<th style="padding-left:10px; padding-right:10px">Turnaround Time</th>
							</tr>' + @Table4 + N'</table>'

						End 
				End
			else
				Begin
					--Insert Into #TurnAroundTimesInHouse ( LastMonth, LastMonthCount, InstrumentCount ) Select LastMonth, LastMonthCount, TotalInstrumentCount from dbo.fnTurnAroundTimesInstrument(1)
					--Insert Into #TurnAroundTimesOutsourced ( LastMonth, LastMonthCount, InstrumentCount ) Select LastMonth, LastMonthCount, TotalInstrumentCount from dbo.fnTurnAroundTimesInstrument(0)
					Insert Into #TurnAroundTimesInHouse ( LastMonth, LastMonthCount, InstrumentCount ) EXEC dbo.repairTurnTimesByWorkOrderInstrument 1
					Insert Into #TurnAroundTimesOutsourced ( LastMonth, LastMonthCount, InstrumentCount ) EXEC dbo.repairTurnTimesByWorkOrderInstrument 0

					SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
						'<td style="font-size: 10px;">' + Cast(IsNull(InstrumentCount,0) as varchar(10)) + '</td>' +
						--'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
						'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
						'</tr>'
					FROM #TurnAroundTimesInHouse 
					ORDER BY ID

					SELECT @Table2 = @Table2 +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
						'<td style="font-size: 10px;">' + Cast(IsNull(InstrumentCount,0) as varchar(10)) + '</td>' +
						--'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
						'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
						'</tr>'
					FROM #TurnAroundTimesOutsourced
					ORDER BY ID

					SET @tableHTML = 
					N'<H4><font color="black">' + Case @InstrumentType When 'F' Then 'Flexible' When 'R' Then 'Rigid' When 'I' Then 'Instrument' When 'C' Then 'Camera' End + ' In House' + Case When @InstrumentType = 'F' Then ' Large Diameter' Else '' End + '</H4>' +
					N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
					N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
					<th style="padding-left:10px; padding-right:10px">Total Instruments</th>
					<th style="padding-left:10px; padding-right:10px">Turnaround Time</th>
					</tr>' + @Table + N'</table>'

					SET @tableHTML2 = 
					N'<H4><font color="black">' + Case @InstrumentType When 'F' Then 'Flexible' When 'R' Then 'Rigid' When 'I' Then 'Instrument' When 'C' Then 'Camera' End + ' Outsourced' + Case When @InstrumentType = 'F' Then ' Large Diameter' Else '' End + '</H4>' +
					N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
					N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
					<th style="padding-left:10px; padding-right:10px">Total Instruments</th>
					<th style="padding-left:10px; padding-right:10px">Turnaround Time</th>
					</tr>' + @Table2 + N'</table>'
				End

			SET @tableHTML = 
				N'<table border="0" cellpadding="4" cellspacing="0">' +
				N'<tr style ="font-size: 10px;font-weight: normal; vertical-align:top">' +
				N'<td>' +
					@tableHTML
				+ '</td>' +
				N'<td>' +
					@tableHTML2
				+ '</td>' +
				N'<td>' +
					@tableHTML3
				+ '</td>' +
				N'<td>' +
					@tableHTML4
				+ '</td>'
				+ '</tr></table>'

			Set @emailHTML_TurnAroundTimes = @emailHTML_TurnAroundTimes + @tableHTML

			Set @i = @i + 1

			If @i = 5 And @lDatabaseKey = 1 
				Set @i = 6				--Skip FUSE for North
		End

			--Set @Table = @Table + '<tr><td colspan="7"></td></tr><tr><td colspan="7"></td></tr>'
			--Set @Table = @Table + '<tr><td colspan="7">The numbers of repairs estimated to be shipped on ' + dbo.fn_FormatDate(DateAdd(day,-1,@dtCheckDate),'MM/dd/yyyy') + ' was ' + Cast(@totalCount as varchar(10)) + '.  The numbers of repairs actually shipped was ' + Cast(@shipCount as varchar(10)) + '.</td></tr>'
			--Set @Table = @Table + '<tr><td colspan="7">This a ship percentage of ' + Cast(@percentageShipped*100 as varchar(10)) + '%.</td></tr>'

	Drop Table #TurnAroundTimesInHouse
	Drop Table #TurnAroundTimesOutsourced
	Drop Table #TurnAroundTimesInHouseSmallDiameter
	Drop Table #TurnAroundTimesOutsourcedSmallDiameter

	Create Table #OutstandingInvoices
		(
			lInvoiceKey int,
			lRepairKey int,
			lClientKey int,
			lDepartmentKey int,
			lSalesRepKey int,
			sClientName1 nvarchar(300),
			sDepartmentName nvarchar(300),
			ContractName nvarchar(300),
			RepName nvarchar(100),
			IsContract bit,
			sTranNumber nvarchar(50),
			sPurchaseOrder nvarchar(100),
			dtTranDate date,
			Aging int,
			TaxAmount decimal(10,2),
			dblShippingAmt decimal(10,2),
			dblTranAmount decimal(10,2),
			TotalAmount decimal(10,2),
			Payment decimal(10,2),
			Balance decimal(10,2),
			sInvoiceStatus nvarchar(MAX),
			dtFollowUp date
		)

	Insert Into #OutstandingInvoices ( lInvoiceKey, lRepairKey, lClientKey, lDepartmentKey, lSalesRepKey, sClientName1, sDepartmentName, ContractName, RepName,
		IsContract, sTranNumber, sPurchaseOrder, dtTranDate, Aging, TaxAmount, dblShippingAmt, dblTranAmount, TotalAmount, Payment, Balance, sInvoiceStatus, dtFollowUp )
	SELECT a.lInvoiceKey, a.lRepairKey, a.lClientKey, a.lDepartmentKey, a.lSalesRepKey, a.sClientName1, a.sDepartmentName, a.ContractName, a.RepName, a.IsContract, 
		a.sTranNumber, a.sPurchaseOrder, a.dtTranDate, a.Aging, a.TaxAmount, a.dblShippingAmt, a.dblTranAmount, a.TotalAmount, a.Payment, a.Balance, a.sInvoiceStatus, a.dtFollowUp
	From dbo.fnOutstandingInvoices(0,0) a 
	Where a.Aging >= 120 
	
	Create Table #RepairAmounts
		(
			lRepairKey int,
			RepairAmount decimal(10,2)
		)

	Declare @TotalAmount decimal(10,2)
	Declare @lSalesRepKey int
	Declare @sRepName nvarchar(100)
	Declare @sRepEmail nvarchar(200)
	Declare @lRepCnt int
	Set @lRepCnt = 1

	Create Table #CSReps
		(
			ID int identity(1,1),
			sEmail nvarchar(100)
		)
	Declare @csCnt int
	Declare @csEmails nvarchar(500)
	Declare @csEmail nvarchar(100)

	While (Select Count(*) From @SalesReps)>=@lRepCnt
		BEGIN
			Select @lSalesRepKey = lSalesRepKey, @sRepName = sRepName, @sRepEmail = sRepEmail From @SalesReps Where ID = @lRepCnt

			--Get Customer Service Reps
			Truncate Table #CSReps

			Insert Into #CSReps ( sEmail ) 
			Select u.sEmailAddress
			From dbo.tblCustomerServiceSalesReps r join dbo.tblUsers u on (r.lUserKey=u.lUserKey)
			Where r.lSalesRepKey = @lSalesRepKey And ISNULL(u.sEmailAddress,'')<>'' And u.bActive=1
			
			Set @csEmails=''
			Set @csCnt = 1
			While (Select Count(*) From #CSReps)>=@csCnt
				BEGIN
					Select @csEmail = sEmail From #CSReps Where ID = @csCnt

					if @csEmail <> @sRepEmail
						Set @csEmails = @csEmails + ';' + @csEmail

					Set @csCnt = @csCnt + 1
				END


			Delete From #RepairAmounts

			Insert Into #RepairAmounts ( lRepairKey, RepairAmount ) 
			Select rit.lRepairKey, SUM(rit.dblRepairPrice) As RepairAmount
			From dbo.tblRepair r join dbo.tblRepairStatuses rs on (r.lRepairStatusID=rs.lRepairStatusID)
				join dbo.tblRepairItemTran rit on (r.lRepairKey = rit.lRepairKey)
				join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
			Where rs.sRepairStatus = 'Waiting for Approved' 
				And (r.lSalesRepKey = @lSalesRepKey Or d.lSalesRepKey_CS=@lSalesRepKey)
				And r.dtDateOut Is Null And IsNull(r.sRepairClosed,'N') <> 'Y' 
			Group By rit.lRepairKey


			--Instrument Repairs
			Insert Into #RepairAmounts ( lRepairKey, RepairAmount ) 
			Select rim.lRepairKey, SUM(ISNULL(rim.lQuantity,0) * ISNULL(rim.dblUnitCost,0))
			From dbo.tblRepair r join dbo.tblRepairStatuses rs on (r.lRepairStatusID=rs.lRepairStatusID) 
				join tblRepairInstrumentModels rim on (r.lRepairKey = rim.lRepairKey)
				join dbo.tblDepartment d on (r.lDepartmentKey=d.lDepartmentKey)
			Where rs.sRepairStatus = 'Waiting for Approved' 
				And (r.lSalesRepKey = @lSalesRepKey Or d.lSalesRepKey_CS=@lSalesRepKey)
				And r.dtDateOut Is Null And ISNULL(r.sRepairClosed,'N') <> 'Y'
			Group By rim.lRepairKey


			Set @emailHTML = ''
			Set @subject = 'Daily Sales Rep Email for ' + @sRepName


			--Waiting for Approval
			Set @Table = ''
			SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY r.dtDateIn, c.sClientName1, d.sDepartmentName, r.lRepairKey))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + dbo.fn_FormatDate(r.dtDateIn,'MM/dd/yyyy') + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + c.sClientName1 + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + d.sDepartmentName + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + r.sWorkOrderNumber + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + st.sScopeTypeDesc + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + s.sSerialNumber + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + ISNULL(pr.sPrimaryRepair,'') + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:right;">' + dbo.fn_FormatCurrency(ISNULL(ra.RepairAmount,0)) + '</td>' +
				'</tr>'
			From dbo.tblRepair r 
				join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
				join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
				join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient c on (d.lClientKey = c.lClientKey)
				join dbo.tblRepairStatuses rs on (r.lRepairStatusID=rs.lRepairStatusID)
				left join #PrimaryRepairs pr on (r.lRepairKey = pr.lRepairKey)
				left join #RepairAmounts ra on (r.lRepairKey = ra.lRepairKey)
			Where rs.sRepairStatus = 'Waiting for Approved' --And r.lSalesRepKey = @lSalesRepKey
				And (r.lSalesRepKey=@lSalesRepKey Or d.lSalesRepKey_CS=@lSalesRepKey)
				And r.dtDateOut Is Null And IsNull(r.sRepairClosed,'N') <> 'Y' 
				And (st.sRigidOrFlexible<>'I' Or ISNULL(ra.RepairAmount,0)>0)
			Order By r.dtDateIn, c.sClientName1, d.sDepartmentName, r.lRepairKey
			
			Set @TotalAmount = 0
			Select @TotalAmount = SUM(ra.RepairAmount)
			From dbo.tblRepair r 
				join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
				join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
				join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient c on (d.lClientKey = c.lClientKey)
				join dbo.tblRepairStatuses rs on (r.lRepairStatusID=rs.lRepairStatusID)
				left join #PrimaryRepairs pr on (r.lRepairKey = pr.lRepairKey)
				left join #RepairAmounts ra on (r.lRepairKey = ra.lRepairKey)
			Where rs.sRepairStatus = 'Waiting for Approved' 
				And (r.lSalesRepKey = @lSalesRepKey Or d.lSalesRepKey_CS=@lSalesRepKey)
				And r.dtDateOut Is Null And IsNull(r.sRepairClosed,'N') <> 'Y' 

			Set @Table = @Table + '<tr>' + 
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;"></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;"></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;"></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;"></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;"></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;"></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;"><b>TOTAL:</b></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:right;"><b>' + dbo.fn_FormatCurrency(ISNULL(@TotalAmount,0)) + '</b></td>' +
				'</tr>'

			SET @tableHTML = 
				N'<H4><font color="black">Products Waiting for Approval</H4>' +
				N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
				N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
				<th style="padding-left:10px; padding-right:10px">Date In</th>
				<th style="padding-left:10px; padding-right:10px">Client</th>
				<th style="padding-left:10px; padding-right:10px">Department</th>
				<th style="padding-left:10px; padding-right:10px">Work Order</th>
				<th style="padding-left:10px; padding-right:10px">Model</th>
				<th style="padding-left:10px; padding-right:10px">Serial #</th>
				<th style="padding-left:10px; padding-right:10px">Primary Repair</th>
				<th style="padding-left:10px; padding-right:10px">Repair Amount</th>
				</tr>' + @Table + N'</table>'

			Set @emailHTML = @emailHTML + @tableHTML + '<br /><br />'


			--Draft Invoices
			Set @Table = ''
			SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY i.dtTranDate, c.sClientName1, d.sDepartmentName, i.sTranNumber, i.lInvoiceKey))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + dbo.fn_FormatDate(i.dtTranDate,'MM/dd/yyyy') + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + c.sClientName1 + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + d.sDepartmentName + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + i.sTranNumber + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + i.DraftReason + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:right;">' + dbo.fn_FormatCurrency(ISNULL(i.InvoiceAmount,0)) + '</td>' +
				'</tr>'
			From dbo.fnInvoicesDraft() i join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient c on (d.lClientKey = c.lClientKey)
			Where (i.lSalesRepKey = @lSalesRepKey Or d.lSalesRepKey_CS=@lSalesRepKey)
			Order By i.dtTranDate, c.sClientName1, d.sDepartmentName, i.sTranNumber, i.lInvoiceKey

			SET @tableHTML = 
				N'<H4><font color="black">Invoices Needing PO or Tracking Number</H4>' +
				N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
				N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
				<th style="padding-left:10px; padding-right:10px">Invoice Date</th>
				<th style="padding-left:10px; padding-right:10px">Client</th>
				<th style="padding-left:10px; padding-right:10px">Department</th>
				<th style="padding-left:10px; padding-right:10px">Work Order</th>
				<th style="padding-left:10px; padding-right:10px">Draft Reason</th>
				<th style="padding-left:10px; padding-right:10px">Invoice Amount</th>
				</tr>' + @Table + N'</table>'

			Set @emailHTML = @emailHTML + @tableHTML + '<br /><br />'


			--Invoiced
			Set @Table = ''
			SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY i.dtTranDate, c.sClientName1, d.sDepartmentName, i.sTranNumber, i.lInvoiceKey))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + c.sClientName1 + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + d.sDepartmentName + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + r.sWorkOrderNumber + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + st.sScopeTypeDesc + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + s.sSerialNumber + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + Case When ISNULL(d.dtCustomerSince,'1/1/1900') > DATEADD(year,-1, i.dtTranDate) Then 'X' Else '' End + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:right;">' + dbo.fn_FormatCurrency(ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0) + ISNULL(i.dblShippingAmt,0) + ISNULL(i.dblTranAmount,0)) + '</td>' +
				'</tr>'
			From dbo.tblRepair r join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
				join dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
				join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient c on (d.lClientKey = c.lClientKey)
				join dbo.tblInvoice i on (r.lRepairKey = i.lRepairKey)
			Where i.dtTranDate = @pdtAsOfDate And i.bFinalized=1 
				And (r.lSalesRepKey = @lSalesRepKey Or d.lSalesRepKey_CS = @lSalesRepKey)


			Set @TotalAmount = 0
			Select @TotalAmount = SUM(ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0) + ISNULL(i.dblShippingAmt,0) + ISNULL(i.dblTranAmount,0))
			From dbo.tblRepair r join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
				join dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
				join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient c on (d.lClientKey = c.lClientKey)
				join dbo.tblInvoice i on (r.lRepairKey = i.lRepairKey)
			Where i.dtTranDate = @pdtAsOfDate And i.bFinalized=1 
				And (r.lSalesRepKey = @lSalesRepKey Or d.lSalesRepKey_CS = @lSalesRepKey)

			Set @Table = @Table + '<tr>' + 
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;"></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;"></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;"></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;"></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;"></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;"><b>TOTAL:</b></td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:right;"><b>' + dbo.fn_FormatCurrency(ISNULL(@TotalAmount,0)) + '</b></td>' +
				'</tr>'

			SET @tableHTML = 
				N'<H4><font color="black">Invoiced Yesterday</H4>' +
				N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
				N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
				<th style="padding-left:10px; padding-right:10px">Client</th>
				<th style="padding-left:10px; padding-right:10px">Department</th>
				<th style="padding-left:10px; padding-right:10px">Work Order</th>
				<th style="padding-left:10px; padding-right:10px">Model</th>
				<th style="padding-left:10px; padding-right:10px">Serial Number</th>
				<th style="padding-left:10px; padding-center:10px">New Customer</th>
				<th style="padding-left:10px; padding-right:10px">Invoice Amount</th>
				</tr>' + @Table + N'</table>'

			Set @emailHTML = @emailHTML + @tableHTML + '<br /><br />'

			--Invoices Paid
			Set @Table = ''
			SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY i.dtTranDate, c.sClientName1, d.sDepartmentName, i.sTranNumber, i.lInvoiceKey))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + dbo.fn_FormatDate(i.dtTranDate,'MM/dd/yyyy') + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + c.sClientName1 + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + d.sDepartmentName + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + i.sTranNumber + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:right;">' + dbo.fn_FormatCurrency(ISNULL(i.dblJuris1Amt,0) + ISNULL(i.dblJuris2Amt,0) + ISNULL(i.dblJuris3Amt,0) + ISNULL(i.dblShippingAmt,0) + ISNULL(i.dblTranAmount,0)) + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:right;">' + dbo.fn_FormatCurrency(ISNULL(ip.nInvoicePayment,0)) + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:right;">' + dbo.fn_FormatCurrency(ISNULL(ip.WriteOffAmount,0)) + '</td>' +
				'</tr>'
			From dbo.tblInvoicePayments ip join dbo.tblInvoice i on (ip.lInvoiceKey=i.lInvoiceKey)
				join dbo.tblDepartment d on (i.lDepartmentKey = d.lDepartmentKey)
				join dbo.tblClient c on (d.lClientKey = c.lClientKey)
			Where (i.lSalesRepKey = @lSalesRepKey Or d.lSalesRepKey_CS = @lSalesRepKey)
				And ip.dtPaymentDate = @pdtAsOfDate
			Order By c.sClientName1, d.sDepartmentName, i.sTranNumber, i.lInvoiceKey

			SET @tableHTML = 
				N'<H4><font color="black">Invoices Paid Yesterday</H4>' +
				N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
				N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
				<th style="padding-left:10px; padding-right:10px">Invoice Date</th>
				<th style="padding-left:10px; padding-right:10px">Client</th>
				<th style="padding-left:10px; padding-right:10px">Department</th>
				<th style="padding-left:10px; padding-right:10px">Work Order</th>
				<th style="padding-left:10px; padding-right:10px">Invoice Amount</th>
				<th style="padding-left:10px; padding-right:10px">Paid Amount</th>
				<th style="padding-left:10px; padding-right:10px">Write Off Amount</th>
				</tr>' + @Table + N'</table>'

			Set @emailHTML = @emailHTML + @tableHTML + '<br /><br />'

			--Clients on Hold
			Set @Table = ''
			SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY a.sClientName1, a.sDepartmentName, a.sTranNumber, a.lInvoiceKey))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + a.sClientName1 + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + a.sDepartmentName + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + a.sTranNumber + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + Cast(a.Aging as varchar(10)) + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + ISNULL(st.sScopeTypeDesc,'') + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + ISNULL(s.sSerialNumber,'') + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:right;">' + dbo.fn_FormatCurrency(ISNULL(a.TotalAmount,0)) + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:right;">' + dbo.fn_FormatCurrency(ISNULL(a.Payment,0)) + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:right;">' + dbo.fn_FormatCurrency(ISNULL(a.Balance,0)) + '</td>' +
				'</tr>'
			From #OutstandingInvoices a 
				join dbo.tblDepartment d On (a.lDepartmentKey = d.lDepartmentKey)
				left join dbo.tblRepair r on (a.lRepairKey=r.lRepairKey)
				left join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
				left join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
			Where a.Aging >= 120 
				And (a.lSalesRepKey=@lSalesRepKey Or d.lSalesRepKey_CS=@lSalesRepKey)
				--And IsNull(r.bBypassOnHold,0) = 0
			Order By a.sClientName1, a.sDepartmentName, a.sTranNumber, a.lInvoiceKey

			SET @tableHTML = 
				N'<H4><font color="black">Clients On Hold</H4>' +
				N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
				N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
				<th style="padding-left:10px; padding-right:10px">Client</th>
				<th style="padding-left:10px; padding-right:10px">Department</th>
				<th style="padding-left:10px; padding-right:10px">Work Order</th>
				<th style="padding-left:10px; padding-right:10px">Age</th>
				<th style="padding-left:10px; padding-right:10px">Model</th>
				<th style="padding-left:10px; padding-right:10px">Serial Number</th>
				<th style="padding-left:10px; padding-right:10px">Invoice Amount</th>
				<th style="padding-left:10px; padding-right:10px">Previously Paid</th>
				<th style="padding-left:10px; padding-right:10px">Balance</th>
				</tr>' + @Table + N'</table>'

			Set @emailHTML = @emailHTML + @tableHTML + '<br /><br />'


			--Outstanding Loaners
			Set @Table = ''
			SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY l.sClientName1, l.sDepartmentName, l.DateOut))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + l.sClientName1 + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + l.sDepartmentName + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + l.DateOut + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + l.sScopeTypeDesc + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + l.sSerialNumber + '</td>' +
				'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:center;">' + Case When ISNULL(l.OnSiteLoaner,'')='Yes' Then 'X' Else '' End + '</td>' +
				'</tr>'
			From #Loaners l join dbo.tblDepartment d on (l.lDepartmentKey = d.lDepartmentKey)
			Where (l.lSalesRepKey = @lSalesRepKey Or d.lSalesRepKey_CS = @lSalesRepKey)
			Order By l.sClientName1, l.sDepartmentName, l.DateOut

			SET @tableHTML = 
				N'<H4><font color="black">Outstanding Loaners</H4>' +
				N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
				N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
				<th style="padding-left:10px; padding-right:10px">Client</th>
				<th style="padding-left:10px; padding-right:10px">Department</th>
				<th style="padding-left:10px; padding-right:10px">Date Out</th>
				<th style="padding-left:10px; padding-right:10px">Model</th>
				<th style="padding-left:10px; padding-right:10px">Serial Number</th>
				<th style="padding-left:10px; padding-right:10px">Onsite Loaner</th>
				</tr>' + @Table + N'</table>'

			Set @emailHTML = @emailHTML + @tableHTML + '<br /><br />'


			--Add in Turn Around Times
			Set @emailHTML = @emailHTML + @emailHTML_TurnAroundTimes
			
			If @lDatabaseKey = 1
				BEGIN
					If @prmTesting = 1
						Set @sEmailRecipients = 'steve.black@brightlogix.com'
					else
						BEGIN
							If @sRepEmail = 'rgeorge@totalscopeinc.com'
								Set @sEmailRecipients = @sRepEmail + ';jbrassell@totalscopeinc.com;dkennedy@totalscopeinc.com'
							else
								iF @sRepEmail = 'ktsipouras@totalscopeinc.com'
									Set @sEmailRecipients = 'jbrassell@totalscopeinc.com;dkennedy@totalscopeinc.com;rgeorge@totalscopeinc.com'
								else
									Set @sEmailRecipients = @sRepEmail + ';jbrassell@totalscopeinc.com;dkennedy@totalscopeinc.com;rgeorge@totalscopeinc.com'

							If @csEmails <> ''
								Set @sEmailRecipients = @sEmailRecipients + @csEmails

						END

					EXEC msdb.dbo.sp_send_dbmail @recipients=@sEmailRecipients,
					@profile_name = @ProfileName,
					@subject = @subject,
					@body = @emailHTML,
					@body_format = 'HTML' ;
				END
			else
				BEGIN
					If @prmTesting = 1
						Set @sEmailRecipients = 'steve.black@brightlogix.com'
					else
						Set @sEmailRecipients = @sRepEmail + ';dkennedy@totalscopeinc.com'

					If @csEmails <> ''
						Set @sEmailRecipients = @sEmailRecipients + @csEmails

					EXEC msdb.dbo.sp_send_dbmail @recipients=@sEmailRecipients,
					@profile_name = @ProfileName,
					@subject = @subject,
					@body = @emailHTML,
					@body_format = 'HTML' ;
				END

			Set @lRepCnt = @lRepCnt + 1
		END

	Drop Table #PrimaryRepairs
	Drop Table #Loaners
	Drop Table #CSReps
	Drop Table #RepairAmounts
	Drop Table #OutstandingInvoices
	Drop Table #TurnAroundTimesResults
END
