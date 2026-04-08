CREATE PROCEDURE [dbo].[emailManagersReport]
	(
		@pdtDate date = '1/1/1900'
	)
AS
BEGIN
	SET NOCOUNT ON;
    
	Declare @pdtAsOfDate Date
	
	--exec dbo.emailManagersReport @pdtDate = '2/20/2025'
	--exec dbo.emailManagersReport_Steve @pdtDate = '11/15/2019'

	--Per Joe 9/28/2016, run this report at 8:00PM instead of 3:00AM.  Therefore we need to change the As Of Date to be the current date instead of yesterday
	--Set @pdtAsOfDate = Convert(Date,DateAdd(day,-1,GetDate()))

	If @pdtDate = '1/1/1900'
		Set @pdtAsOfDate = Convert(Date,GetDate())
	else
		Set @pdtAsOfDate = @pdtDate 
	
	Declare @dtFirstOfMonth date
	Set @dtFirstOfMonth = dbo.fn_FirstOfMonth(@pdtAsOfDate)
	Declare @dtFirstOfNextMonth date
	Set @dtFirstOfNextMonth = DATEADD(month,1,@dtFirstOfMonth)

	Declare @DBName nvarchar(50)
	Set @DBName = DB_NAME()

	Declare @bTSI bit
	Set @bTSI = 1
	If UPPER(@DBName)='WINSCOPENETNASHVILLE'
		Set @bTSI = 0

	Declare @lDatabaseKey int
	Set @lDatabaseKey = dbo.fnDatabaseKey()


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

	Declare @StartDate date

	Set @emailHTML = ''
	Set @subject = 'Manager''s Report for ' + dbo.fn_FormatDate(@pdtAsOfDate,'MM/dd/yyyy')

	Begin --Invoiced Summary
		Declare @InvoicedTemp Table
			(
				ID int identity(1,1),
				InstrumentType nvarchar(20),
				SubCategory nvarchar(50),
				Cnt int,
				SubCnt int,
				Amt decimal(10,2),
				IsSub bit
			)

		Declare @TotalCount int
		Declare @TotalInvoiced decimal(10,2)

		Insert Into @InvoicedTemp ( InstrumentType, Cnt, Amt, IsSub ) 
		Select Case st.sRigidOrFlexible
				When 'F' Then 'Flexible'
				When 'R' Then 'Rigid'
				When 'I' Then 'Instrument'
				When 'C' Then 'Camera'
				Else '' 
				End As InstrumentType, Count(st.sRigidOrFlexible) As Cnt, Sum(i.dblTranAmount) As Amt, 0
		From dbo.tblInvoice i join dbo.tblRepair r on (i.lRepairKey=r.lRepairKey) 
			join dbo.tblScope s on (r.lScopeKey=s.lScopeKey)
			join dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
			join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		Where Convert(Date,dtTranDate)=@pdtAsOfDate And i.bFinalized=1
			And (	(@lDatabaseKey = 1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
					Or
					(@lDatabaseKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)='S')
				)
			--And (	ISNULL(d.lServiceLocationKey,@lDatabaseKey) = @lDatabaseKey
			--		Or
			--		@lDatabaseKey = 1 And d.lServiceLocationKey = 2 and SUBSTRING(r.sWorkOrderNumber,1,1)<>'S'
			--	)
		Group By st.sRigidOrFlexible
		Order By Case st.sRigidOrFlexible
					When 'F' Then 1
					When 'R' Then 2
					When 'I' Then 3
					When 'C' Then 4
				End
	

		--Get In-House and Outsourced
		Insert Into @InvoicedTemp ( InstrumentType, SubCategory, SubCnt, Amt, IsSub ) 
		Select Case st.sRigidOrFlexible
				When 'F' Then 'Flexible'
				When 'R' Then 'Rigid'
				When 'I' Then 'Instrument'
				End As InstrumentType, 
				Case When IsNull(r.lVendorKey,0)=0 Then 'In House' else 'Outsourced' End,
				Count(st.sRigidOrFlexible) As Cnt, Sum(i.dblTranAmount) As Amt, 1
		From dbo.tblInvoice i join dbo.tblRepair r on (i.lRepairKey=r.lRepairKey) 
			join dbo.tblScope s on (r.lScopeKey=s.lScopeKey)
			join dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
			join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
		Where Convert(Date,dtTranDate)=@pdtAsOfDate
			And st.sRigidOrFlexible In ('F','R','I')
			And i.bFinalized=1
			And (	(@lDatabaseKey = 1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
					Or
					(@lDatabaseKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)='S')
				)
			--And (	ISNULL(d.lServiceLocationKey,@lDatabaseKey) = @lDatabaseKey
			--		Or
			--		@lDatabaseKey = 1 And d.lServiceLocationKey = 2 and SUBSTRING(r.sWorkOrderNumber,1,1)<>'S'
			--	)
		Group By st.sRigidOrFlexible, 
			Case When IsNull(r.lVendorKey,0)=0 Then 'In House' else 'Outsourced' End
	

		if @lDatabaseKey = 2 
			BEGIN
				Create Table #InvoicedTempFromNorth
					(
						ID int,
						InstrumentType nvarchar(20),
						SubCategory nvarchar(50),
						Cnt int,
						SubCnt int,
						Amt decimal(10,2),
						IsSub bit
					)

				Insert Into #InvoicedTempFromNorth EXEC TSI.WinscopeNet.dbo.emailManagersReportInvoicedForSouth @pdtAsOfDate

				Update t Set cnt = ISNULL(t.cnt,0) + ISNULL(n.cnt,0)
				From @InvoicedTemp t join #InvoicedTempFromNorth n on (t.InstrumentType = n.InstrumentType)
				Where t.IsSub = 0 And n.IsSub = 0

				Insert Into @InvoicedTemp ( InstrumentType, SubCategory, Cnt, SubCnt, Amt, IsSub )
				Select n.InstrumentType, n.SubCategory, n.Cnt, n.SubCnt, n.Amt, n.IsSub
				From #InvoicedTempFromNorth n left join (Select * from @InvoicedTemp Where IsSub = 0) t on (n.InstrumentType = t.InstrumentType)
				Where n.IsSub = 0 And t.InstrumentType Is Null

				Update t Set SubCnt = ISNULL(t.SubCnt,0) + ISNULL(n.SubCnt,0)
				From @InvoicedTemp t join #InvoicedTempFromNorth n on (t.InstrumentType = n.InstrumentType) And (t.SubCategory=n.SubCategory)
				Where t.IsSub = 1 And n.IsSub = 1

				Insert Into @InvoicedTemp ( InstrumentType, SubCategory, Cnt, SubCnt, Amt, IsSub )
				Select n.InstrumentType, n.SubCategory, n.Cnt, n.SubCnt, n.Amt, n.IsSub
				From #InvoicedTempFromNorth n left join (Select * from @InvoicedTemp Where IsSub = 1) t on (n.InstrumentType = t.InstrumentType) And (n.SubCategory=t.SubCategory)
				Where n.IsSub = 1 And (t.InstrumentType Is Null Or t.SubCategory Is Null)

				--Insert Into @InvoicedTemp ( InstrumentType, SubCategory, Cnt, SubCnt, Amt, IsSub ) 
				--select t.InstrumentType, t.SubCategory, t.Cnt, t.SubCnt, t.Amt, t.IsSub
				--From #InvoicedTempFromNorth t

				Drop Table #InvoicedTempFromNorth
			END


		Select @TotalCount = Sum(Cnt), @TotalInvoiced = Sum(Amt) From @InvoicedTemp Where IsSub=0

		Declare @Invoiced Table
			(
				ID int identity(1,1),
				InstrumentType nvarchar(20),
				Cnt int,
				Amt decimal(10,2)
			)

		Insert Into @Invoiced ( InstrumentType, Cnt, Amt )
		Select 
			Case When ISNull(t.SubCategory,'')='' Then t.InstrumentType Else IsNull(t.SubCategory,'') End, 
			Case When ISNull(t.SubCategory,'')='' Then t.Cnt Else t.SubCnt End, 
			t.Amt
		From @InvoicedTemp t
		Order By 
			Case t.InstrumentType	
				When 'Flexible' Then 1
				When 'Rigid' Then 2
				When 'Instrument' Then 3
				When 'Camera' Then 4
			End, IsNull(t.SubCategory,'')

		SELECT @Table = @Table +'<tr style="font-weight:bolder; background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;' + Case When IsNull(InstrumentType,'') In ('In House','Outsourced') Then 'color:graytext;' Else '' End + '">' +
			--'<td style="font-size: 10px; text-align: left;">' + IsNull(InstrumentType,'') + '</td>' +
			'<td style="width:120px; text-align:' + Case When IsNull(InstrumentType,'') In ('In House','Outsourced') Then 'center' else 'left' end + ';">' + IsNull(InstrumentType,'') + '</td>' +
			'<td style="width:80px; text-align:center;">' + Cast(IsNull(Cnt,0) as varchar(10)) + '</td>' +
			'<td style="width:100px; text-align:right;">' + cast('$' + Convert(varchar(20),Amt,1) as varchar(20)) + '</td>' +
			'</tr>'
		FROM @Invoiced
		ORDER BY ID

		SELECT @Table = @Table +'<tr style="font-size: 10px;">' +
			'<td style="font-size: 10px; font-weight:bold;">Totals:</td>' +
			'<td style="font-size: 10px; font-weight:bold;">' + Cast(@TotalCount as varchar(10)) + '</td>' +
			'<td style="font-size: 10px; font-weight:bold; text-align: right">' + cast('$' + Convert(varchar(20),@TotalInvoiced,1) as varchar(20)) + '</td>' +
			'</tr>'
		
		SET @tableHTML = 
		N'<H2><font color="black">Invoiced By Instrument Type</H2>' +
		N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
		N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
		<th>Instrument Type</th>
		<th>Count</th>
		<th>Amount</th></tr>' + @Table + N'</table>'

		Set @emailHTML = @emailHTML + @tableHTML + '<br /><br />'
	End 

	Begin --Approved/Unapproved Amounts
		Declare @ApprovedAmt decimal(10,2)
		Declare @UnapprovedAmt decimal(10,2)

		Set @StartDate = DATEADD(year,-2,@pdtAsOfDate)

		Declare @ApprovedAmtIns decimal(10,2)
		Declare @UnapprovedAmtIns decimal(10,2)

		Select @ApprovedAmt = a.Approved, @UnapprovedAmt = a.Unapproved
		From (
				Select	SUM(Case When ISNULL(r.lContractKey,0) > 0 Then 0 Else Case When rit.sApproved='Y' Then rit.dblRepairPrice Else 0 End End) As Approved,
						SUM(Case When ISNULL(r.lContractKey,0) > 0 Then 0 Else Case When rit.sApproved='Y' Then 0 Else rit.dblRepairPrice End End) As Unapproved
				From dbo.tblRepair r join dbo.tblRepairItemTran rit on (r.lRepairKey=rit.lRepairKey)
					join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
				Where	r.sRepairClosed='N' 
					And r.dtDateIn >= @StartDate 
					And r.dtDateIn < DATEADD(day,1,@pdtAsOfDate)
					And (	(@lDatabaseKey = 1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
							Or
							(@lDatabaseKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)='S')
						)
					--And	(	ISNULL(d.lServiceLocationKey,@lDatabaseKey) = @lDatabaseKey 
					--		Or 
					--		(@lDatabaseKey=1 And d.lServiceLocationKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
					--	)
			) a

		Select @ApprovedAmtIns = a.Approved, @UnapprovedAmtIns = a.Unapproved
		From (
				Select	SUM(Case When ISNULL(r.lContractKey,0) > 0 Then 0 Else Case When rim.sApproved='Y' Then ISNULL(rim.lQuantity,0) * ISNULL(rim.dblUnitCost,0) Else 0 End End) As Approved,
						SUM(Case When ISNULL(r.lContractKey,0) > 0 Then 0 Else Case When rim.sApproved='Y' Then 0 Else ISNULL(rim.lQuantity,0) * ISNULL(rim.dblUnitCost,0) End End) As Unapproved
				From dbo.tblRepair r join dbo.tblRepairInstrumentModels rim on (r.lRepairKey=rim.lRepairKey)
					join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
				Where	r.sRepairClosed='N' 
					And r.dtDateIn >= @StartDate 
					And r.dtDateIn < DATEADD(day,1,@pdtAsOfDate)
					And (	(@lDatabaseKey = 1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
							Or
							(@lDatabaseKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)='S')
						)
					--And	(	ISNULL(d.lServiceLocationKey,@lDatabaseKey) = @lDatabaseKey 
					--		Or 
					--		(@lDatabaseKey=1 And d.lServiceLocationKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
					--	)
			) a 

		Set @ApprovedAmt = ISNULL(@ApprovedAmt,0) + ISNULL(@ApprovedAmtIns,0)
		Set @UnapprovedAmt = ISNULL(@UnapprovedAmt,0) + ISNULL(@UnapprovedAmtIns,0)

		if @lDatabaseKey = 2
			BEGIN
				Create Table #ApprovedNorth 
					(
						ApprovedAmount decimal(10,2),
						UnapprovedAmount decimal(10,2)
					)
				
				Insert Into #ApprovedNorth (ApprovedAmount, UnapprovedAmount ) EXEC TSI.WinscopeNet.dbo.repairApprovedAndUnapprovedAmountsForSouth @StartDate, @pdtAsOfDate

				Select	@ApprovedAmt = @ApprovedAmt + ISNULL(a.ApprovedAmount,0),
						@UnapprovedAmt = @UnapprovedAmt + ISNULL(a.UnapprovedAmount,0)
				From #ApprovedNorth a 

				Drop Table #ApprovedNorth
			END

		
		
		SET @tableHTML = N'<H2><font color="black">Approved/Unapproved - Two Year Period (Open Repairs)</H2>' 
		Set @tableHTML = @tableHTML + 'Approved: ' + dbo.fn_FormatCurrency(Cast(IsNull(@ApprovedAmt,0) as nvarchar(50))) + '<br />'
		Set @tableHTML = @tableHTML + 'Unapproved: ' + dbo.fn_FormatCurrency(Cast(IsNull(@UnapprovedAmt,0) as nvarchar(50))) + '<br />'

		Set @emailHTML = @emailHTML + @tableHTML + '<br /><br />'
	End
	
	Begin --Delivery Rates
		Declare @EndDate Date
		Declare @ScheduledToShip int
		Declare @ActuallyShipped int

		Set @StartDate = Convert(Date, @pdtAsOfDate)
		Set @EndDate = DateAdd(day,1,Convert(Date, @pdtAsOfDate))

		Select @ActuallyShipped=nShippedOnTime, @ScheduledToship=nTotalToShip 
		From tblShipPercentage
		Where dtShipDate >= @StartDate And dtShipDate < @EndDate

		SET @tableHTML = 
		N'<H2><font color="black">Delivery Rate</H2>' + Cast(IsNull(@ScheduledToShip,0) as varchar(5)) + ' scheduled to ship.  ' + Cast(IsNull(@ScheduledToShip,0)-IsNull(@ActuallyShipped,0) as varchar(5)) + ' did not.'

		Set @emailHTML = @emailHTML + @tableHTML

		Declare @dtCheckDate datetime
		--Set @dtCheckDate = GetDate()
		Set @dtCheckDate = DateAdd(day,1,GetDate())

		Declare @lStatusKey int
		Select @lStatusKey = lStatusKey From tblStatus Where sStatusDesc = 'Delivered'

		Declare @Repairs Table
			(
				lRepairKey int,
				dtDateOut datetime,
				EstDelDate nvarchar(50),
				bNoShip bit,
				lTechKey int
			)

		Insert Into @Repairs ( lRepairKey, dtDateOut, EstDelDate, bNoShip, lTechKey ) 
		Select r.lRepairKey, r.dtDateOut, dbo.fn_EstimatedDeliveryDate(r.dtDateOut,r.dtExpDelDateFrom,r.dtExpDelDateTo,r.dtAprRecvd) As EstDelDate,
			Case When r.dtDateOut Is Null And sd.lRepairKey Is Null Then 1 Else 0 End, r.lResponsibleTech
		From dbo.tblRepair r join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
			left join (Select * from tblStatusTran Where lStatusKey=@lStatusKey) sd on (r.lRepairKey=sd.lRepairKey)
		Where	(	(@lDatabaseKey = 1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
					Or
					(@lDatabaseKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)='S')
				)
				--(	ISNULL(d.lServiceLocationKey,@lDatabaseKey) = @lDatabaseKey
				--	Or
				--	(@lDatabaseKey = 1 And d.lServiceLocationKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
				--)

		Delete From @Repairs Where IsDate(EstDelDate)=0
		Delete From @Repairs Where Convert(Date,EstDelDate) < Convert(Date,DateAdd(day,-1,@dtCheckDate))
			Or Convert(Date,EstDelDate) >= Convert(Date,@dtCheckDate)

		Declare @NotShipped Table
			(
				ID int identity(1,1),
				lRepairKey int,
				WorkOrder nvarchar(50),
				Client nvarchar(200),
				Department nvarchar(200),
				DateIn nvarchar(20),
				Model nvarchar(50),
				SerialNumber nvarchar(50),
				InstrumentType nvarchar(50),
				Tech nvarchar(50),
				InvoiceAmount decimal(10,2)
			)

		Insert Into @NotShipped ( lRepairKey, WorkOrder, Client, Department, DateIn, Model, SerialNumber, InstrumentType, Tech )--, InvoiceAmount )
		Select r.lRepairKey, r.sWorkOrderNumber, c.sClientName1, d.sDepartmentName, dbo.fn_FormatDate(r.dtDateIn,'MM/dd/yyyy'), st.sScopeTypeDesc, s.sSerialNumber, 
			Case st.sRigidOrFlexible
				When 'F' Then 'Flexible'
				When 'R' Then 'Rigid'
				When 'I' Then 'Instrument'
				When 'C' Then 'Camera'
				Else '' 
				End As InstrumentType, --t.sTechName --, r.dblAmtRepair 
			Case When IsNull(r.lVendorKey,0)=0 Then t.sTechName Else v.sSupplierName1 End As sTechName
		From @Repairs tr join tblRepair r on (tr.lRepairKey=r.lRepairKey)
			join tblScope s on (r.lscopekey=s.lscopekey)
			join tblscopetype st on (s.lscopetypekey=st.lscopetypekey)
			join tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
			join tblClient c on (d.lClientKey = c.lClientKey)
			 left join tblTechnicians t on (tr.lTechKey=t.lTechnicianKey) 
			 left join tblSupplier v on (r.lVendorKey=v.lSupplierKey)
		Where bNoShip=1
		Order By r.dtDateIn, r.sWorkOrderNumber

		Update ns Set InvoiceAmount = a.InvoiceAmount
		From @NotShipped ns 
			join (
					Select ns.lRepairKey, SUM(rit.dblRepairPrice) As InvoiceAmount
					From @NotShipped ns join tblRepairItemTran rit on (ns.lRepairKey = rit.lRepairKey)
					Where rit.sApproved = 'Y'
					Group By ns.lRepairKey
				) a on (ns.lRepairKey = a.lRepairKey)

		Update ns Set InvoiceAmount = a.InvoiceAmount 
		From @NotShipped ns 
			join (
					Select ns.lRepairKey, Round(SUM(Round(IsNull(rim.dblUnitCost,0) * IsNull(rim.lQuantity,0),2)),2) As InvoiceAmount
					From @NotShipped ns join tblRepairInstrumentModels rim on (ns.lRepairKey = rim.lRepairKey)
					Where rim.sApproved = 'Y'
					Group By ns.lRepairKey
				) a on (ns.lRepairKey = a.lRepairKey)

		if @lDatabaseKey = 2 
			BEGIN
				Create Table #NotShippedFromNorth
					(
						ID int,
						lRepairKey int,
						WorkOrder nvarchar(50),
						Client nvarchar(200),
						Department nvarchar(200),
						DateIn nvarchar(20),
						Model nvarchar(50),
						SerialNumber nvarchar(50),
						InstrumentType nvarchar(50),
						Tech nvarchar(50),
						InvoiceAmount decimal(10,2),
						lTechKey int,
						lVendorKey int,
						sSupplierName1 nvarchar(200)
					)

				Insert Into #NotShippedFromNorth EXEC TSI.WinscopeNet.dbo.repairsNotShippedForSouth
				Insert Into @NotShipped ( lRepairKey, WorkOrder, Client, Department, DateIn, Model, SerialNumber, InstrumentType, Tech, InvoiceAmount )
				Select n.lRepairKey, n.WorkOrder, n.Client, n.Department, n.DateIn, n.Model, n.SerialNumber, n.InstrumentType, 
					Case When IsNull(n.lVendorKey,0)=0 Then t.sTechName Else n.sSupplierName1 End As sTechName, n.InvoiceAmount
				From #NotShippedFromNorth n left join dbo.tblTechnicians t on (n.lTechKey = t.lTechnicianKey)

				Drop Table #NotShippedFromNorth
			END


		Set @Table = ''
		SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY s.DateIn, s.WorkOrder))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
			'<td style="font-size: 10px; padding-left:10px; padding-right:10px">' + WorkOrder + '</td>' +
			'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + Client + '</td>' +
			'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + Department + '</td>' +
			'<td style="font-size: 10px; padding-left:10px; padding-right:10px">' + DateIn + '</td>' +
			'<td style="font-size: 10px; padding-left:10px; padding-right:10px; text-align:left;">' + Model + '</td>' +
			'<td style="font-size: 10px; padding-left:10px; padding-right:10px">' + SerialNumber + '</td>' +
			'<td style="font-size: 10px; padding-left:10px; padding-right:10px">' + InstrumentType + '</td>' +
			'<td style="font-size: 10px; padding-left:10px; padding-right:10px">' + IsNull(Tech,'') + '</td>' +
			'<td style="font-size: 10px; padding-left:10px; padding-right:10px">' + dbo.fn_FormatCurrency(ISNULL(InvoiceAmount,0)) + '</td>' +
			'</tr>'
		FROM @NotShipped s
		ORDER BY s.DateIn, s.WorkOrder

		SET @tableHTML = 
		N'<H4><font color="black">Repairs Not Shipped</H4>' +
		N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
		N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
		<th style="padding-left:10px; padding-right:10px">Work Order</th>
		<th style="padding-left:10px; padding-right:10px">Client</th>
		<th style="padding-left:10px; padding-right:10px">Department</th>
		<th style="padding-left:10px; padding-right:10px">Date In</th>
		<th style="padding-left:10px; padding-right:10px">Model</th>
		<th style="padding-left:10px; padding-right:10px">Serial #</th>
		<th style="padding-left:10px; padding-right:10px">Instrument Type</th>
		<th style="padding-left:10px; padding-right:10px">Technician</th>
		<th style="padding-left:10px; padding-right:10px">Invoice Amount</th>
		</tr>' + @Table + N'</table>'

		Set @emailHTML = @emailHTML + @tableHTML + '<br /><br />'
	End 

	Begin --Month-to-Date Turn Around Times
		SET @emailHTML = @emailHTML + N'<H2><font color="black">Turn Around Times - Last 30 Days</H2>'

		Create Table #TurnAroundTimeResults
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

		Declare @i int
		Declare @InstrumentType nvarchar(1)

		Declare @lEndoChoiceFlag tinyint			--1 = All Manufacturers, 2 = EndoChoice Only, 3 = All Except EndoChoice

		Declare @ID int
		Set @ID = @@SPID

		if @bTSI = 1
			BEGIN
				--We need to get the Rigid In House Turn Times from the South database
				Declare @dtStartDate date
				Declare @dtEndDate date 
				Set @dtEndDate = DateAdd(day,1,Convert(Date,GetDate()))
				Set @dtStartDate = DateAdd(day,-30,@dtEndDate)	

				exec dbo.utilSouthRigidInHouseTurnTimes @dtStartDate,@dtEndDate
			END

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
						Truncate Table #TurnAroundTimeResults

						--if @lDatabaseKey = 2
						--	BEGIN	
						--		--This adds data to a temp table in the North database.  The below EXEC statement uses this data.
						--		exec TSI.WinscopeNet.dbo.repairTurnTimesByWorkOrderForSouth @ID, @InstrumentType,1,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag
						--	END
						Insert Into #TurnAroundTimeResults EXEC dbo.repairTurnTimesByWorkOrder @ID, @InstrumentType,1,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag

						--Insert Into #TurnAroundTimesInHouse (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From dbo.fnTurnAroundTimesByWorkOrder(@InstrumentType,1,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag)
						Insert Into #TurnAroundTimesInHouse (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From #TurnAroundTimeResults r
						Order By Case lRepairLevelKey 
										When 1 Then 3		--Minor
										When 2 Then 2		--Mid-Level
										When 3 Then 1		--Major
										When 4 Then 4		--VSI
								End

						--if @lDatabaseKey = 2
						--	BEGIN	
						--		--This adds data to a temp table in the North database.  The below EXEC statement uses this data.
						--		exec TSI.WinscopeNet.dbo.repairTurnTimesByWorkOrderForSouth @ID, @InstrumentType,1,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag
						--	END

						Truncate Table #TurnAroundTimeResults
						Insert Into #TurnAroundTimeResults EXEC dbo.repairTurnTimesByWorkOrder @ID, @InstrumentType,1,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag

						--Insert Into #TurnAroundTimesOutsourced (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From dbo.fnTurnAroundTimesByWorkOrder(@InstrumentType,1,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag)
						Insert Into #TurnAroundTimesOutsourced (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From #TurnAroundTimeResults r
						Order By Case lRepairLevelKey 
										When 1 Then 3		--Minor
										When 2 Then 2		--Mid-Level
										When 3 Then 1		--Major
										When 4 Then 4		--VSI
								End
						
						SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
							'<td style="font-size: 10px;">' + IsNull(sRepairLevel,'') + '</td>' +
							'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
							'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
							'</tr>'
						FROM #TurnAroundTimesInHouse 
						ORDER BY ID

						SELECT @Table2 = @Table2 +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
							'<td style="font-size: 10px;">' + IsNull(sRepairLevel,'') + '</td>' +
							'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
							'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
							'</tr>'
						FROM #TurnAroundTimesOutsourced
						ORDER BY ID

						SET @tableHTML = 
						N'<H4><font color="black">' + Case @InstrumentType When 'F' Then Case When @lEndoChoiceFlag=3 Then 'Flexible' Else 'FUSE' End  When 'R' Then 'Rigid' When 'I' Then 'Instrument' When 'C' Then 'Camera' End + ' In House' + Case When @InstrumentType = 'F' Then ' Large Diameter' Else '' End + '</H4>' +
						N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
						N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
						<th style="padding-left:10px; padding-right:10px">Repair Level</th>
						<th style="padding-left:10px; padding-right:10px">Repair Count</th>
						<th style="padding-left:10px; padding-right:10px">Turnaround Time</th>
						</tr>' + @Table + N'</table>'

						SET @tableHTML2 = 
						N'<H4><font color="black">' + Case @InstrumentType When 'F' Then Case When @lEndoChoiceFlag=3 Then 'Flexible' Else 'FUSE' End When 'R' Then 'Rigid' When 'I' Then 'Instrument' When 'C' Then 'Camera' End + ' Outsourced' + Case When @InstrumentType = 'F' Then ' Large Diameter' Else '' End + '</H4>' +
						N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
						N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
						<th style="padding-left:10px; padding-right:10px">Repair Level</th>
						<th style="padding-left:10px; padding-right:10px">Repair Count</th>
						<th style="padding-left:10px; padding-right:10px">Turnaround Time</th>
						</tr>' + @Table2 + N'</table>'

						If @InstrumentType='F' And @lEndoChoiceFlag = 3
							Begin
								Truncate Table #TurnAroundTimeResults
								--if @lDatabaseKey = 2
								--	BEGIN	
								--		--This adds data to a temp table in the North database.  The below EXEC statement uses this data.
								--		exec TSI.WinscopeNet.dbo.repairTurnTimesByWorkOrderForSouth @ID, @InstrumentType,2,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag
								--	END

								Insert Into #TurnAroundTimeResults EXEC dbo.repairTurnTimesByWorkOrder @ID, @InstrumentType,2,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag
								
								--Insert Into #TurnAroundTimesInHouseSmallDiameter (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From dbo.fnTurnAroundTimesByWorkOrder(@InstrumentType,2,1,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag)
								Insert Into #TurnAroundTimesInHouseSmallDiameter (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From #TurnAroundTimeResults r
								Order By Case lRepairLevelKey 
												When 1 Then 3		--Minor
												When 2 Then 2		--Mid-Level
												When 3 Then 1		--Major
												When 4 Then 4		--VSI
										End
		
								Truncate Table #TurnAroundTimeResults
								--if @lDatabaseKey = 2
								--	BEGIN	
								--		--This adds data to a temp table in the North database.  The below EXEC statement uses this data.
								--		exec TSI.WinscopeNet.dbo.repairTurnTimesByWorkOrderForSouth @ID, @InstrumentType,2,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag
								--	END

								Insert Into #TurnAroundTimeResults EXEC dbo.repairTurnTimesByWorkOrder @ID, @InstrumentType,2,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag

								--Insert Into #TurnAroundTimesOutsourcedSmallDiameter (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From dbo.fnTurnAroundTimesByWorkOrder(@InstrumentType,2,0,0,'1/1/2016','1/1/2016',1,0,@lEndoChoiceFlag)
								Insert Into #TurnAroundTimesOutsourcedSmallDiameter (sRepairLevel, LastMonth, LastMonthCount ) Select sRepairLevel, LastMonth, LastMonthCount From #TurnAroundTimeResults r
								Order By Case lRepairLevelKey 
												When 1 Then 3		--Minor
												When 2 Then 2		--Mid-Level
												When 3 Then 1		--Major
												When 4 Then 4		--VSI
										End

								SELECT @Table3 = @Table3 +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
									'<td style="font-size: 10px;">' + IsNull(sRepairLevel,'') + '</td>' +
									'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
									'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
									'</tr>'
								FROM #TurnAroundTimesInHouseSmallDiameter
								ORDER BY ID

								SELECT @Table4 = @Table4 +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
									'<td style="font-size: 10px;">' + IsNull(sRepairLevel,'') + '</td>' +
									'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
									'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
									'</tr>'
								FROM #TurnAroundTimesOutsourcedSmallDiameter
								ORDER BY ID

								SET @tableHTML3 = 
								N'<H4><font color="black">Flexible In House Small Diameter</H4>' +
								N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
								N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
								<th style="padding-left:10px; padding-right:10px">Repair Level</th>
								<th style="padding-left:10px; padding-right:10px">Repair Count</th>
								<th style="padding-left:10px; padding-right:10px">Turnaround Time</th>
								</tr>' + @Table3 + N'</table>'

								SET @tableHTML4 = 
								N'<H4><font color="black">Flexible Outsourced Small Diameter</H4>' +
								N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
								N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
								<th style="padding-left:10px; padding-right:10px">Repair Level</th>
								<th style="padding-left:10px; padding-right:10px">Repair Count</th>
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
							'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
							'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
							'</tr>'
						FROM #TurnAroundTimesInHouse 
						ORDER BY ID

						SELECT @Table2 = @Table2 +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
							'<td style="font-size: 10px;">' + Cast(IsNull(InstrumentCount,0) as varchar(10)) + '</td>' +
							'<td style="font-size: 10px;">' + Cast(IsNull(LastMonthCount,0) as varchar(10)) + '</td>' +
							'<td style="font-size: 10px;">' + Cast(IsNull(LastMonth,0) as varchar(10)) + '</td>' +
							'</tr>'
						FROM #TurnAroundTimesOutsourced
						ORDER BY ID

						SET @tableHTML = 
						N'<H4><font color="black">' + Case @InstrumentType When 'F' Then 'Flexible' When 'R' Then 'Rigid' When 'I' Then 'Instrument' When 'C' Then 'Camera' End + ' In House' + Case When @InstrumentType = 'F' Then ' Large Diameter' Else '' End + '</H4>' +
						N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
						N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
						<th style="padding-left:10px; padding-right:10px">Total Instruments</th>
						<th style="padding-left:10px; padding-right:10px">Repair Count</th>
						<th style="padding-left:10px; padding-right:10px">Turnaround Time</th>
						</tr>' + @Table + N'</table>'

						SET @tableHTML2 = 
						N'<H4><font color="black">' + Case @InstrumentType When 'F' Then 'Flexible' When 'R' Then 'Rigid' When 'I' Then 'Instrument' When 'C' Then 'Camera' End + ' Outsourced' + Case When @InstrumentType = 'F' Then ' Large Diameter' Else '' End + '</H4>' +
						N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
						N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
						<th style="padding-left:10px; padding-right:10px">Total Instruments</th>
						<th style="padding-left:10px; padding-right:10px">Repair Count</th>
						<th style="padding-left:10px; padding-right:10px">Turnaround Time</th>
						</tr>' + @Table2 + N'</table>'


					End

				SET @tableHTML = 
					N'<table border="0" cellpadding="4" cellspacing="0">' +
					--N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe; vertical-align:top">' +
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

				Set @emailHTML = @emailHTML + @tableHTML

				Set @i = @i + 1

				If @i = 5 And @bTSI = 1 
					Set @i = 6				--Skip FUSE for North
			End

			--Set @Table = @Table + '<tr><td colspan="7"></td></tr><tr><td colspan="7"></td></tr>'
			--Set @Table = @Table + '<tr><td colspan="7">The numbers of repairs estimated to be shipped on ' + dbo.fn_FormatDate(DateAdd(day,-1,@dtCheckDate),'MM/dd/yyyy') + ' was ' + Cast(@totalCount as varchar(10)) + '.  The numbers of repairs actually shipped was ' + Cast(@shipCount as varchar(10)) + '.</td></tr>'
			--Set @Table = @Table + '<tr><td colspan="7">This a ship percentage of ' + Cast(@percentageShipped*100 as varchar(10)) + '%.</td></tr>'

		Drop Table #TurnAroundTimesInHouse
		Drop Table #TurnAroundTimesOutsourced
		Drop Table #TurnAroundTimesInHouseSmallDiameter
		Drop Table #TurnAroundTimesOutsourcedSmallDiameter
		Drop Table #TurnAroundTimeResults
	End 


	--Begin --Draft Invoices
	--	SET @emailHTML = @emailHTML + N'<H2><font color="black">Draft Invoices</H2>'
	--	Set @Table = ''

	--	SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
	--		'<td style="font-size: 10px; text-align:left">' + IsNull(Customer,'') + '</td>' +
	--		'<td style="font-size: 10px; text-align:center">' + IsNull(sTranNumber,'') + '</td>' +
	--		'<td style="font-size: 10px; text-align:center">' + dbo.fn_FormatDate(dtTranDate,'MM/dd/yyyy') + '</td>' +
	--		'<td style="font-size: 10px; text-align:left">' + IsNull(SalesRep,'') + '</td>' +
	--		'<td style="font-size: 10px; text-align:center">' + IsNull(sPurchaseOrder,'') + '</td>' +
	--		'<td style="font-size: 10px; text-align:center">' + IsNull(TrackingRequired,'') + '</td>' +
	--		'<td style="font-size: 10px; text-align:center">' + IsNull(TrackingNumber,'') + '</td>' +
	--		'<td style="font-size: 10px; text-align:left">' + IsNull(DraftReason,'') + '</td>' +
	--		'</tr>'
	--	FROM dbo.fnInvoicesDraft() a 
	--	ORDER BY ID


	--	SET @tableHTML = 
	--	N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
	--	N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
	--	<th style="padding-left:10px; padding-right:10px">Customer</th>
	--	<th style="padding-left:10px; padding-right:10px">Invoice Number</th>
	--	<th style="padding-left:10px; padding-right:10px">Invoice Date</th>
	--	<th style="padding-left:10px; padding-right:10px">Sales Rep</th>
	--	<th style="padding-left:10px; padding-right:10px">Purchase Order</th>
	--	<th style="padding-left:10px; padding-right:10px">Tracking Required</th>
	--	<th style="padding-left:10px; padding-right:10px">Tracking Number</th>
	--	<th style="padding-left:10px; padding-right:10px">Draft Reason</th>
	--	</tr>' + @Table + N'</table>'

	--	Set @emailHTML = @emailHTML + @tableHTML
	--End
	
	Declare @cnt int
	Declare @cnt2 int

	Begin --Loaner Requests
		SET @emailHTML = @emailHTML + N'<H2><font color="black">Loaner Requests</H2>'
		Set @Table = ''

		SELECT @cnt = Count(s.TaskStatus)
		From dbo.tblTasks t left join dbo.tblTaskTypes tt on (t.lTaskTypeKey=tt.lTaskTypeKey)
			left join (Select h.lTaskKey, Max(h.dtTaskStatusDate) As MaxDate from dbo.tblTaskStatusHistory h Group By h.lTaskKey) m on (t.lTaskKey=m.lTaskKey)
			left join dbo.tblTaskStatusHistory h on (m.lTaskKey=h.lTaskKey) And (m.MaxDate=h.dtTaskStatusDate)	
			left join dbo.tblTaskStatuses s on (h.lTaskStatusKey=s.TaskStatusKey)
		Where	tt.lTaskTypeKey = 1
			And (h.lTaskStatusKey In (1,2) Or h.dtTaskStatusDate >= @pdtAsOfDate)
			
		SELECT @cnt2 = Count(s.TaskStatus)
		From dbo.tblTasks t left join dbo.tblTaskTypes tt on (t.lTaskTypeKey=tt.lTaskTypeKey)
			left join (Select h.lTaskKey, Max(h.dtTaskStatusDate) As MaxDate from dbo.tblTaskStatusHistory h Group By h.lTaskKey) m on (t.lTaskKey=m.lTaskKey)
			left join dbo.tblTaskStatusHistory h on (m.lTaskKey=h.lTaskKey) And (m.MaxDate=h.dtTaskStatusDate)	
			left join dbo.tblTaskStatuses s on (h.lTaskStatusKey=s.TaskStatusKey)
		Where	tt.lTaskTypeKey = 1
			And h.dtTaskStatusDate >= @pdtAsOfDate
			And h.lTaskStatusKey In (3,6,7)

			
			
		Create Table #LoanerRequests
			(
				lTaskKey int,
				lTaskPriorityKey int,
				dtTaskDate date,
				sClientName1 nvarchar(300),
				sDepartmentName nvarchar(300),
				sTaskPriority nvarchar(50),
				sScopeTypeDesc nvarchar(300),
				lQuantity int,
				TaskStatus nvarchar(50)
			)

		Insert Into #LoanerRequests ( lTaskKey, lTaskPriorityKey, dtTaskDate, sClientName1, sDepartmentName, sTaskPriority, sScopeTypeDesc, lQuantity, TaskStatus ) 
		Select t.lTaskKey, t.lTaskPriorityKey, t.dtTaskDate, c.sClientName1, d.sDepartmentName, p.sTaskPriority, st.sScopeTypeDesc, tl.lQuantity, s.TaskStatus
		From dbo.tblTasks t 
			join dbo.tblTaskPriorities p on (t.lTaskPriorityKey = p.lTaskPriorityKey)
			left join dbo.tblTaskLoaners tl on (t.lTaskKey = tl.lTaskKey)
			left join dbo.tblScopeType st on (tl.lScopeTypeKey = st.lScopeTypeKey)
			left join dbo.tblTaskTypes tt on (t.lTaskTypeKey=tt.lTaskTypeKey)
			left join dbo.tblDepartment d on (t.lDepartmentKey = d.lDepartmentKey)
			left join dbo.tblClient c on (d.lClientKey = c.lClientKey)
			left join (Select h.lTaskKey, Max(h.dtTaskStatusDate) As MaxDate from dbo.tblTaskStatusHistory h Group By h.lTaskKey) m on (t.lTaskKey=m.lTaskKey)
			left join dbo.tblTaskStatusHistory h on (m.lTaskKey=h.lTaskKey) And (m.MaxDate=h.dtTaskStatusDate)	
			left join dbo.tblTaskStatuses s on (h.lTaskStatusKey=s.TaskStatusKey)
		Where	tt.lTaskTypeKey = 1
			And (h.lTaskStatusKey In (1,2) Or h.dtTaskStatusDate >= @pdtAsOfDate)
			And (d.lServiceLocationKey = @lDatabaseKey)

		if @lDatabaseKey = 2
			BEGIN
				Insert Into #LoanerRequests ( lTaskKey, lTaskPriorityKey, dtTaskDate, sClientName1, sDepartmentName, sTaskPriority, sScopeTypeDesc, lQuantity, TaskStatus ) 
				exec TSI.WinscopeNet.dbo.loanerRequestsGetForSouth @pdtAsOfDate

				Declare @cnt3 int
				Declare @cnt4 int 

				Create Table #cntTemp
					(
						cnt int,
						cnt2 int
					)

				Insert Into #cntTemp ( cnt, cnt2 ) exec TSI.WinscopeNet.dbo.loanerRequestsInProcessForSouth @pdtAsOfDate
				Select @cnt3 = cnt, @cnt4 = cnt2 From #cntTemp
				Drop Table #cntTemp

				Set @cnt = ISNULL(@cnt,0) + @cnt3
				Set @cnt2 = ISNULL(@cnt2,0) + @cnt4
			END

		SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY lr.lTaskPriorityKey, lr.dtTaskDate, lr.lTaskKey))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
			'<td style="font-size: 10px; text-align:left">' + IsNull(lr.sClientName1,'') + '</td>' +
			'<td style="font-size: 10px; text-align:left">' + IsNull(lr.sDepartmentName,'') + '</td>' +
			'<td style="font-size: 10px; text-align:center">' + dbo.fn_FormatDate(lr.dtTaskDate,'MM/dd/yyyy') + '</td>' +
			'<td style="font-size: 10px; text-align:center">' + IsNull(lr.sTaskPriority,'') + '</td>' +
			'<td style="font-size: 10px; text-align:left">' + ISNULL(lr.sScopeTypeDesc,'Unknown') + '</td>' +
			'<td style="font-size: 10px; text-align:center">' + Cast(ISNULL(lr.lQuantity,0) as varchar(10)) + '</td>' +
			'<td style="font-size: 10px; text-align:center">' + IsNull(lr.TaskStatus,'') + '</td>' +
			'</tr>'
		From #LoanerRequests lr
		Order By lr.lTaskPriorityKey, lr.dtTaskDate, lr.lTaskKey

		Drop Table #LoanerRequests
		
		--SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY t.lTaskPriorityKey, t.dtTaskDate, t.lTaskKey))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
		--	'<td style="font-size: 10px; text-align:left">' + IsNull(c.sClientName1,'') + '</td>' +
		--	'<td style="font-size: 10px; text-align:left">' + IsNull(d.sDepartmentName,'') + '</td>' +
		--	'<td style="font-size: 10px; text-align:center">' + dbo.fn_FormatDate(t.dtTaskDate,'MM/dd/yyyy') + '</td>' +
		--	'<td style="font-size: 10px; text-align:center">' + IsNull(p.sTaskPriority,'') + '</td>' +
		--	'<td style="font-size: 10px; text-align:left">' + ISNULL(st.sScopeTypeDesc,'Unknown') + '</td>' +
		--	'<td style="font-size: 10px; text-align:center">' + Cast(ISNULL(tl.lQuantity,0) as varchar(10)) + '</td>' +
		--	'<td style="font-size: 10px; text-align:center">' + IsNull(s.TaskStatus,'') + '</td>' +
		--	'</tr>'
		--From dbo.tblTasks t 
		--	join dbo.tblTaskPriorities p on (t.lTaskPriorityKey = p.lTaskPriorityKey)
		--	left join dbo.tblTaskLoaners tl on (t.lTaskKey = tl.lTaskKey)
		--	left join dbo.tblScopeType st on (tl.lScopeTypeKey = st.lScopeTypeKey)
		--	left join dbo.tblTaskTypes tt on (t.lTaskTypeKey=tt.lTaskTypeKey)
		--	left join dbo.tblDepartment d on (t.lDepartmentKey = d.lDepartmentKey)
		--	left join dbo.tblClient c on (d.lClientKey = c.lClientKey)
		--	left join (Select h.lTaskKey, Max(h.dtTaskStatusDate) As MaxDate from dbo.tblTaskStatusHistory h Group By h.lTaskKey) m on (t.lTaskKey=m.lTaskKey)
		--	left join dbo.tblTaskStatusHistory h on (m.lTaskKey=h.lTaskKey) And (m.MaxDate=h.dtTaskStatusDate)	
		--	left join dbo.tblTaskStatuses s on (h.lTaskStatusKey=s.TaskStatusKey)
		--Where	tt.lTaskTypeKey = 1
		--	And (h.lTaskStatusKey In (1,2) Or h.dtTaskStatusDate >= @pdtAsOfDate)
		--Order By t.lTaskPriorityKey, t.dtTaskDate, t.lTaskKey


		SET @tableHTML = 
		N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
		N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
		<th style="padding-left:10px; padding-right:10px">Client</th>
		<th style="padding-left:10px; padding-right:10px">Department</th>
		<th style="padding-left:10px; padding-right:10px">Request Date</th>
		<th style="padding-left:10px; padding-right:10px">Priority</th>
		<th style="padding-left:10px; padding-right:10px">Model</th>
		<th style="padding-left:10px; padding-right:10px">Quantity</th>
		<th style="padding-left:10px; padding-right:10px">Status</th>
		</tr>' + @Table + N'</table>'

		Set @emailHTML = @emailHTML + @tableHTML

		--if @cnt > 0
		--	BEGIN
		--		Set @Table = ''

		--		Select  @Table = @Table +'<tr style="background-color:#FFFFFF; font-size: 10px;">' +
		--			'<td style="font-size: 10px; text-align:left">' + IsNull(s.TaskStatus,'') + '</td>' +
		--			'<td style="font-size: 10px; text-align:right">' + Cast(Case When ISNULL(@cnt2,0)=0 Then 0 Else Cast((Cast(Count(s.TaskStatus) as decimal(10,2))/Cast(@cnt2 as decimal(10,2))) * 100 as decimal(10,2)) End As varchar(10)) + '%</td>' +
		--			'</tr>'
		--		From dbo.tblTasks t left join dbo.tblTaskTypes tt on (t.lTaskTypeKey=tt.lTaskTypeKey)
		--			left join (Select h.lTaskKey, Max(h.dtTaskStatusDate) As MaxDate from dbo.tblTaskStatusHistory h Group By h.lTaskKey) m on (t.lTaskKey=m.lTaskKey)
		--			left join dbo.tblTaskStatusHistory h on (m.lTaskKey=h.lTaskKey) And (m.MaxDate=h.dtTaskStatusDate)	
		--			left join dbo.tblTaskStatuses s on (h.lTaskStatusKey=s.TaskStatusKey)
		--		Where	tt.lTaskTypeKey = 1
		--			--And (h.lTaskStatusKey In (1,2) Or h.dtTaskStatusDate >= @pdtAsOfDate)
		--			And h.dtTaskStatusDate >= @pdtAsOfDate
		--			And h.lTaskStatusKey In (3,6,7)
		--		Group By s.TaskStatus
		--		Order By s.TaskStatus


		--		SET @tableHTML = 
		--		N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
		--		N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
		--		<th style="padding-left:10px; padding-right:10px">Loaner Request Status</th>
		--		<th style="padding-left:10px; padding-right:10px">Percentage</th>
		--		</tr>' + @Table + N'</table>'

		--		Set @emailHTML = @emailHTML + '<br />' + @tableHTML
		--	END

		if @cnt > 0
			BEGIN
				Set @Table = ''

				Create Table #TaskStatuses
					(
						TaskStatus nvarchar(50),
						Cnt int
					)

				Insert Into #TaskStatuses ( TaskStatus, Cnt ) 
				Select s.TaskStatus, Count(s.TaskStatus) As cnt 
				From dbo.tblTasks t left join dbo.tblTaskTypes tt on (t.lTaskTypeKey=tt.lTaskTypeKey)
					left join (Select h.lTaskKey, Max(h.dtTaskStatusDate) As MaxDate from dbo.tblTaskStatusHistory h Group By h.lTaskKey) m on (t.lTaskKey=m.lTaskKey)
					left join dbo.tblTaskStatusHistory h on (m.lTaskKey=h.lTaskKey) And (m.MaxDate=h.dtTaskStatusDate)	
					left join dbo.tblTaskStatuses s on (h.lTaskStatusKey=s.TaskStatusKey)
				Where	tt.lTaskTypeKey = 1
					--And (h.lTaskStatusKey In (1,2) Or h.dtTaskStatusDate >= @pdtAsOfDate)
					And h.dtTaskStatusDate >= @pdtAsOfDate
					And h.lTaskStatusKey In (3,6,7)
				Group By s.TaskStatus

				if @lDatabaseKey = 2
					BEGIN
						Create Table #TaskStatusesNorth
							(
								TaskStatus nvarchar(50),
								Cnt int
							)

						Insert Into #TaskStatusesNorth EXEC TSI.WinscopeNet.dbo.loanerRequestsTaskStatusesGetForSouth @pdtAsOfDate

						Update a Set Cnt = ISNULL(a.Cnt,0) + ISNULL(b.Cnt,0) From #TaskStatuses a join #TaskStatusesNorth b on (a.TaskStatus = b.TaskStatus)
						Insert Into #TaskStatuses ( TaskStatus, Cnt ) 
						Select b.TaskStatus, b.Cnt
						From #TaskStatusesNorth b left join #TaskStatuses a on (b.TaskStatus = a.TaskStatus) Where a.TaskStatus IS Null

						Drop Table #TaskStatusesNorth
					END

				Select  @Table = @Table +'<tr style="background-color:#FFFFFF; font-size: 10px;">' +
					'<td style="font-size: 10px; text-align:left">' + IsNull(s.TaskStatus,'') + '</td>' +
					'<td style="font-size: 10px; text-align:right">' + Cast(Case When ISNULL(@cnt2,0)=0 Then 0 Else Cast((Cast(s.Cnt as decimal(10,2))/Cast(@cnt2 as decimal(10,2))) * 100 as decimal(10,2)) End As varchar(10)) + '%</td>' +
					'</tr>'
				From #TaskStatuses s
				Order By s.TaskStatus

				--Select  @Table = @Table +'<tr style="background-color:#FFFFFF; font-size: 10px;">' +
				--	'<td style="font-size: 10px; text-align:left">' + IsNull(s.TaskStatus,'') + '</td>' +
				--	'<td style="font-size: 10px; text-align:right">' + Cast(Case When ISNULL(@cnt2,0)=0 Then 0 Else Cast((Cast(Count(s.TaskStatus) as decimal(10,2))/Cast(@cnt2 as decimal(10,2))) * 100 as decimal(10,2)) End As varchar(10)) + '%</td>' +
				--	'</tr>'
				--From dbo.tblTasks t left join dbo.tblTaskTypes tt on (t.lTaskTypeKey=tt.lTaskTypeKey)
				--	left join (Select h.lTaskKey, Max(h.dtTaskStatusDate) As MaxDate from dbo.tblTaskStatusHistory h Group By h.lTaskKey) m on (t.lTaskKey=m.lTaskKey)
				--	left join dbo.tblTaskStatusHistory h on (m.lTaskKey=h.lTaskKey) And (m.MaxDate=h.dtTaskStatusDate)	
				--	left join dbo.tblTaskStatuses s on (h.lTaskStatusKey=s.TaskStatusKey)
				--Where	tt.lTaskTypeKey = 1
				--	--And (h.lTaskStatusKey In (1,2) Or h.dtTaskStatusDate >= @pdtAsOfDate)
				--	And h.dtTaskStatusDate >= @pdtAsOfDate
				--	And h.lTaskStatusKey In (3,6,7)
				--Group By s.TaskStatus
				--Order By s.TaskStatus


				SET @tableHTML = 
				N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
				N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
				<th style="padding-left:10px; padding-right:10px">Loaner Request Status</th>
				<th style="padding-left:10px; padding-right:10px">Percentage</th>
				</tr>' + @Table + N'</table>'

				Set @emailHTML = @emailHTML + '<br />' + @tableHTML

				Drop Table #TaskStatuses
			END
	End

	Begin --Loaner Requests Unfulfilled
		SET @emailHTML = @emailHTML + N'<H2><font color="black">Month-To-Date Unfulfilled Loaner Request Counts (> 1)</H2>'
		Set @Table = ''


		SELECT @cnt = Count(s.TaskStatus)
		From dbo.tblTasks t left join dbo.tblTaskTypes tt on (t.lTaskTypeKey=tt.lTaskTypeKey)
			left join (Select h.lTaskKey, Max(h.dtTaskStatusDate) As MaxDate from dbo.tblTaskStatusHistory h Group By h.lTaskKey) m on (t.lTaskKey=m.lTaskKey)
			left join dbo.tblTaskStatusHistory h on (m.lTaskKey=h.lTaskKey) And (m.MaxDate=h.dtTaskStatusDate)	
			left join dbo.tblTaskStatuses s on (h.lTaskStatusKey=s.TaskStatusKey)
		Where	tt.lTaskTypeKey = 1
			And (h.lTaskStatusKey In (1,2) Or (h.dtTaskStatusDate >= dbo.fn_FirstOfMonth(@pdtAsOfDate) And h.dtTaskStatusDate < DATEADD(day,1,@pdtAsOfDate)))


		Select @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY a.sScopeTypeDesc))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
			'<td style="font-size: 10px; text-align:left; min-width:150px;">' + IsNull(a.sScopeTypeDesc,'') + '</td>' +
			'<td style="font-size: 10px; text-align:center"; width:90px;>' + IsNull(a.InstrumentType,'') + '</td>' +
			'<td style="font-size: 10px; text-align:right; width:90px;">' + Cast(a.cnt as varchar(10)) + '</td>'
		From
			(
				Select s.sScopeTypeDesc, 
					Case st.sRigidOrFlexible	
						When 'F' Then 'Flexible'
						When 'R' Then 'Rigid'
						When 'I' Then 'Instrument'
						When 'C' Then 'Camera'
						Else 'Unknown'
					End As InstrumentType,
					Count(s.sScopeTypeDesc) as cnt 
				From dbo.vwTaskStatuses s join dbo.tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
				Where s.dtTaskDate >= @dtFirstOfMonth And s.dtTaskDate < @dtFirstOfNextMonth
					And s.TaskStatus='Unable to Fulfill'
				Group By s.sScopeTypeDesc, Case st.sRigidOrFlexible	
												When 'F' Then 'Flexible'
												When 'R' Then 'Rigid'
												When 'I' Then 'Instrument'
												When 'C' Then 'Camera'
												Else 'Unknown'
											End
				Having Count(s.sScopeTypeDesc) > 1
			) a

		SET @tableHTML = 
		N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
		N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
		<th style="padding-left:10px; padding-right:10px">Scope Type</th>
		<th style="padding-left:10px; padding-right:10px">Instrument Type</th>
		<th style="padding-left:10px; padding-right:10px">Count</th>
		</tr>' + @Table + N'</table>'

		Set @emailHTML = @emailHTML + @tableHTML


		if @cnt > 0
			BEGIN
				Set @Table = ''

				Select  @Table = @Table +'<tr style="background-color:#FFFFFF; font-size: 10px;">' +
					'<td style="font-size: 10px; text-align:left">' + IsNull(s.TaskStatus,'') + '</td>' +
					'<td style="font-size: 10px; text-align:right">' + Cast(Count(s.TaskStatus) as varchar(10)) + '</td>' +
					'</tr>'
				From dbo.tblTasks t left join dbo.tblTaskTypes tt on (t.lTaskTypeKey=tt.lTaskTypeKey)
					left join (Select h.lTaskKey, Max(h.dtTaskStatusDate) As MaxDate from dbo.tblTaskStatusHistory h Group By h.lTaskKey) m on (t.lTaskKey=m.lTaskKey)
					left join dbo.tblTaskStatusHistory h on (m.lTaskKey=h.lTaskKey) And (m.MaxDate=h.dtTaskStatusDate)	
					left join dbo.tblTaskStatuses s on (h.lTaskStatusKey=s.TaskStatusKey)
				Where	tt.lTaskTypeKey = 1
					And (h.lTaskStatusKey In (1,2) Or (h.dtTaskStatusDate >= dbo.fn_FirstOfMonth(@pdtAsOfDate) And h.dtTaskStatusDate < DATEADD(day,1,@pdtAsOfDate)))
				Group By s.TaskStatus
				Order By s.TaskStatus


				SET @tableHTML = 
				N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
				N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
				<th style="padding-left:10px; padding-right:10px">Loaner Request Status</th>
				<th style="padding-left:10px; padding-right:10px">Count</th>
				</tr>' + @Table + N'</table>'

				Set @emailHTML = @emailHTML + '<br />' 
				Set @emailHTML = @emailHTML + Cast(@cnt as varchar(10)) + ' Loaner Request' + Case When @cnt = 1 Then '' else 's' End + '<br />' + @tableHTML
			END

	End

	Begin --Incoming Products
		SET @emailHTML = @emailHTML + N'<H2><font color="black">Incoming Products</H2>'
		Set @Table = ''

		Create Table #Repairs 
			(
				ID int identity(1,1),
				lDepartmentKey int,
				sInstrumentType nvarchar(50),
				sClientName1 nvarchar(200),
				sDepartmentName nvarchar(200),
				sWorkOrderNumber nvarchar(50),
				sScopeTypeDesc nvarchar(200),
				sSerialNumber nvarchar(50),
				LastInvoiceDate date,
				NewClientFlag nvarchar(50),
				UnderContractFlag nvarchar(50),
				dtDateReceived datetime
			)

		Create Table #RepairsTemp
			(
				ID int identity(1,1),
				lRepairKey int,
				lDepartmentKey int,
				sInstrumentType nvarchar(50),
				sClientName1 nvarchar(200),
				sDepartmentName nvarchar(200),
				sWorkOrderNumber nvarchar(50),
				sScopeTypeDesc nvarchar(200),
				sSerialNumber nvarchar(50),
				LastInvoiceDate date,
				NewClientFlag nvarchar(50),
				UnderContractFlag nvarchar(50),
				lContractKey int,
				dtDateReceived datetime
			)

		Insert Into #RepairsTemp ( lRepairKey, lDepartmentKey, sInstrumentType, sClientName1, sDepartmentName, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, UnderContractFlag, lContractKey )
		Select r.lRepairKey, r.lDepartmentKey, it.sInstrumentType, c.sClientName1, d.sDepartmentName, r.sWorkOrderNumber, st.sScopeTypeDesc, s.sSerialNumber,
			Case When ISNULL(r.lContractKey,0)=0 Then '' Else 'X' End, ISNULL(r.lContractKey,0) As lContractKey
		From dbo.tblRepair r
			join dbo.tblScope s on (r.lScopeKey = s.lScopeKey)
			join dbo.tblScopeType st on (s.lScopeTypeKey = st.lScopeTypeKey)
			join dbo.tblDepartment d on (r.lDepartmentKey = d.lDepartmentKey)
			join dbo.tblClient c on (d.lClientKey = c.lClientKey)
			join dbo.tblInstrumentTypes it on (st.sRigidOrFlexible = it.sInstrumentTypeKey)
		Where r.dtDateIn >= @pdtAsOfDate And r.dtDateIn < DATEADD(day,1,@pdtAsOfDate)
			And (	(@lDatabaseKey = 1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
					Or
					(@lDatabaseKey = 2 And SUBSTRING(r.sWorkOrderNumber,1,1)='S')
				)
			--And (	(ISNULL(d.lServiceLocationKey,@lDatabaseKey) = @lDatabaseKey)
			--		Or
			--		(@lDatabaseKey = 1 And SUBSTRING(r.sWorkOrderNumber,1,1)<>'S')
			--	)
		Order By Case it.sInstrumentType When 'F' Then 1 When 'R' Then 2 When 'I' Then 3 When 'C' Then 4 Else 5 End, it.sInstrumentType, 
			Case When ISNULL(r.lContractKey,0)=0 Then 1 Else 0 End,
			c.sClientName1, d.sDepartmentName, r.sWorkOrderNumber

		Update t
		Set dtDateReceived = a.StatusDate
		From #RepairsTemp t join 
			(
				Select t.lRepairKey, MIN(st.dtCompleteDate) As StatusDate
				From #RepairsTemp t join dbo.tblStatusTran st on (t.lRepairKey=st.lRepairKey) 
					join dbo.tblStatus s on (st.lStatusKey=s.lStatusKey) 
				Where s.sStatusDesc = 'Scope In'
				Group By t.lRepairKey
			) a on (t.lRepairKey = a.lRepairKey)

		Update r 
		Set LastInvoiceDate = a.LastInvoiceDate
		From #RepairsTemp r join
			(
				Select r.lDepartmentKey, MAX(i.dtTranDate) As LastInvoiceDate From #RepairsTemp r join tblInvoice i on (r.lDepartmentKey = i.lDepartmentKey)
				Where i.bFinalized=1
				Group By r.lDepartmentKey 
			) a on (r.lDepartmentKey = a.lDepartmentKey)

		Update #RepairsTemp
		Set NewClientFlag = Case	When ISNULL(LastInvoiceDate,'1/1/1900') <= DATEADD(month,-6,@pdtAsOfDate) Then 'New Client'
									When ISNULL(LastInvoiceDate,'1/1/1900') >= DATEADD(day,-15,DATEADD(month,-5,@pdtAsOfDate)) Then 'Existing Client'
									Else 'Last Invoice - ' + dbo.fn_FormatDate(LastInvoiceDate,'MM/dd/yyyy') + ' - Possible New Client'
							End


		if @lDatabaseKey = 2
			BEGIN
				--Get North invoices where Service Location = South and WO# starts with S.
				Exec TSI.WinscopeNet.dbo.managersReportIncomingProductsForSouth @pdtAsOfDate = @pdtAsOfDate 
				Insert Into #RepairsTemp ( lRepairKey, lDepartmentKey, sInstrumentType, sClientName1, sDepartmentName, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, UnderContractFlag, lContractKey, dtDateReceived )
				Select lRepairKey, lDepartmentKey, sInstrumentType, sClientName1, sDepartmentName, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, UnderContractFlag, lContractKey, dtDateReceived 
				From TSI.WinscopeNet.dbo.tblIncomingProductsForManagersReport
				Group By lRepairKey, lDepartmentKey, sInstrumentType, sClientName1, sDepartmentName, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, UnderContractFlag, lContractKey, dtDateReceived 
			END

		Insert Into #Repairs ( lDepartmentKey, sInstrumentType, sClientName1, sDepartmentName, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, UnderContractFlag, dtDateReceived )
		Select lDepartmentKey, sInstrumentType, sClientName1, sDepartmentName, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, UnderContractFlag, dtDateReceived
		From #RepairsTemp 
		Group By lDepartmentKey, sInstrumentType, sClientName1, sDepartmentName, sWorkOrderNumber, sScopeTypeDesc, sSerialNumber, UnderContractFlag, dtDateReceived, Case When ISNULL(lContractKey,0)=0 Then 1 Else 0 End
		Order By Case sInstrumentType When 'F' Then 1 When 'R' Then 2 When 'I' Then 3 When 'C' Then 4 Else 5 End, sInstrumentType, 
			Case When ISNULL(lContractKey,0)=0 Then 1 Else 0 End, sClientName1, sDepartmentName, sWorkOrderNumber


		SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
			'<td style="font-size: 10px; text-align:center">' + IsNull(sInstrumentType,'') + '</td>' +
			'<td style="font-size: 10px; text-align:left">' + IsNull(sClientName1,'') + '</td>' +
			'<td style="font-size: 10px; text-align:left">' + IsNull(sDepartmentName,'') + '</td>' +
			'<td style="font-size: 10px; text-align:center">' + IsNull(sWorkOrderNumber,'') + '</td>' +
			'<td style="font-size: 10px; text-align:center">' + IsNull(sScopeTypeDesc,'') + '</td>' +
			'<td style="font-size: 10px; text-align:center">' + IsNull(sSerialNumber,'') + '</td>' +
			'<td style="font-size: 10px; text-align:center">' + IsNull(NewClientFlag,'') + '</td>' +
			'<td style="font-size: 10px; text-align:center">' + IsNull(UnderContractFlag,'') + '</td>' +
			'<td style="font-size: 10px; text-align:center">' + Case When dtDateReceived Is Null Then '' Else dbo.fn_FormatDate(dtDateReceived,'DateTime') End + '</td>' +
			'</tr>'
		From #Repairs 
		Order By ID

		SET @tableHTML = 
		N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
		N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
		<th style="padding-left:10px; padding-right:10px">Instrument Type</th>
		<th style="padding-left:10px; padding-right:10px">Client</th>
		<th style="padding-left:10px; padding-right:10px">Department</th>
		<th style="padding-left:10px; padding-right:10px">Work Order</th>
		<th style="padding-left:10px; padding-right:10px">Model</th>
		<th style="padding-left:10px; padding-right:10px">Serial Number</th>
		<th style="padding-left:10px; padding-right:10px">New Client Flag</th>
		<th style="padding-left:10px; padding-right:10px">Under Contract</th>
		<th style="padding-left:10px; padding-right:10px">Date Received</th>
		</tr>' + @Table + N'</table>'

		Set @emailHTML = @emailHTML + @tableHTML
	End

	Begin --Within 40 Days Month-to-Date
		--SET @emailHTML = @emailHTML + N'<H2><font color="black">Within 40 Days - Month-to-Date</H2>'
		
		SET @emailHTML = @emailHTML + N'<H2><font color="black">Within 40 Days - Totals Per Instrument Type and Checked Item</H2>'

		Set @StartDate = DateAdd(day,-datepart(day,@pdtAsOfDate)+1,@pdtAsOfDate)
		Set @Table = ''

		Create Table #Within40DaysCounts
			(
				ID int,
				sInstrumentType nvarchar(150),
				sFailureCode nvarchar(150),
				Cnt int
			)

		Insert Into #Within40DaysCounts ( ID, sInstrumentType, sFailureCode, Cnt ) 
		Select w.ID, w.sInstrumentType, w.sFailureCode, w.Cnt
		From dbo.fnWithin40Days_Counts(@StartDate, @pdtAsOfDate, 'A', 0) w

		if @lDatabaseKey = 2
			BEGIN
				Insert Into #Within40DaysCounts ( ID, sInstrumentType, sFailureCode, Cnt ) exec dbo.within40Days_Counts_ForSouth @StartDate, @pdtAsOfDate, 'A'
			END

		SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY w.sInstrumentType, w.sFailureCode))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
			'<td style="font-size: 10px; text-align:left;">' + IsNull(sInstrumentType,'') + '</td>' +
			'<td style="font-size: 10px; text-align:left;">' + IsNull(sFailureCode,'') + '</td>' +
			--'<td style="font-size: 10px; text-align:right">' + Cast(IsNull(cnt,0) as varchar(10)) + '</td>' +
			'<td style="font-size: 10px; text-align:right">' + Cast(SUM(IsNull(cnt,0)) as varchar(10)) + '</td>' +
			'</tr>'
		--FROM dbo.fnWithin40Days_Counts(@StartDate, @pdtAsOfDate, 'A', 0) w
		From #Within40DaysCounts w
		Group By w.sInstrumentType, w.sFailureCode
		Order By w.sInstrumentType, w.sFailureCode
		
		SET @tableHTML = 
		N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
		N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
		<th style="padding-left:10px; padding-right:10px">Instrument Type</th>
		<th style="padding-left:10px; padding-right:10px">Checked Item</th>
		<th style="padding-left:10px; padding-right:10px"># of Work Orders</th>
		</tr>' + @Table + N'</table>'

		Set @emailHTML = @emailHTML + @tableHTML

		SET @emailHTML = @emailHTML + N'<H2><font color="black">Within 40 Days - Clients with 3+ 40-Day Repairs</H2>'

		Declare @Within40 Table
			(
				ID int identity(1,1),
				InstrumentType nvarchar(50),
				sWorkOrderNumber nvarchar(50),
				sClientName1 nvarchar(300),
				sDepartmentName nvarchar(300),
				sScopeTypeDesc nvarchar(300),
				sSerialNumber nvarchar(50),
				dtDateIn nvarchar(20),
				sComplaintDesc nvarchar(300),
				ResultOfImproperCareByCustomer nvarchar(20),
				Failure_ImproperCare nvarchar(1),
				Failure_Part nvarchar(1),
				Failure_Cosmetic nvarchar(1),
				Failure_ImproperTechnique nvarchar(1),
				Failure_PreviousInspection nvarchar(1),
				Failure_PreviousRepairs nvarchar(1),
				Failure_Complaint nvarchar(1),
				Failure_NoPreviousRepairs nvarchar(1),
				Failure_Other nvarchar(1),
				lDepartmentKey int
			)

		Insert Into @Within40 ( sWorkOrderNumber, InstrumentType, sClientName1, sDepartmentName, sScopeTypeDesc, sSerialNumber, dtDateIn, sComplaintDesc,
			ResultOfImproperCareByCustomer, Failure_ImproperCare, Failure_Part, Failure_Cosmetic, Failure_ImproperTechnique, Failure_PreviousInspection,
			Failure_PreviousRepairs, Failure_Complaint, Failure_NoPreviousRepairs, Failure_Other, lDepartmentKey )
		Select  w.sWorkOrderNumber, Case st.sRigidOrFlexible
				When 'F' Then 'Flexible'
				When 'R' Then 'Rigid'
				When 'I' Then 'Instrument'
				When 'C' Then 'Camera'
				Else '' 
				End As InstrumentType, w.sClientName1, w.sDepartmentName, w.sScopeTypeDesc, w.sSerialNumber, w.dtDateIn, w.sComplaintDesc,
			w.ResultOfImproperCareByCustomer, w.Failure_ImproperCare, w.Failure_Part, w.Failure_Cosmetic, w.Failure_ImproperTechnique, w.Failure_PreviousInspection,
			w.Failure_PreviousRepairs, w.Failure_Complaint, w.Failure_NoPreviousRepairs, w.Failure_Other, r.lDepartmentKey
		From dbo.fnWithin40Days(@StartDate, @pdtAsOfDate, 'A', 0) w join tblRepair r on (w.sWorkOrderNumber=r.sWorkOrderNumber)
			join tblScope s on (r.lScopeKey=s.lScopeKey) 
			join tblScopeType st on (s.lScopeTypeKey=st.lScopeTypeKey)
		Order By w.sClientName1, w.sDepartmentName, Convert(Date, w.dtDateIn), w.sWorkOrderNumber

		if @lDatabaseKey = 2
			BEGIN
				Create Table #With40DaysNorth
					(
						sWorkOrderNumber nvarchar(50),
						InstrumentType nvarchar(50),
						sClientName1 nvarchar(200),
						sDepartmentName nvarchar(200),
						sScopeTypeDesc nvarchar(200),
						sSerialNumber nvarchar(50),
						dtDateIn nvarchar(20),
						sComplaintDesc nvarchar(300),
						ResultOfImproperCareByCustomer nvarchar(20),
						Failure_ImproperCare nvarchar(1),
						Failure_Part nvarchar(1),
						Failure_Cosmetic nvarchar(1),
						Failure_ImproperTechnique nvarchar(1),
						Failure_PreviousInspection nvarchar(1),
						Failure_PreviousRepairs nvarchar(1),
						Failure_Complaint nvarchar(1),
						Failure_NoPreviousRepairs nvarchar(1),
						Failure_Other nvarchar(1),
						lDepartmentKey int
					)
					
				Insert Into #With40DaysNorth EXEC TSI.WinscopeNet.dbo.within40DaysForSouth @StartDate, @pdtAsOfDate, 'A'
				
				Insert Into @Within40 ( 
					InstrumentType, sWorkOrderNumber, sClientName1, sDepartmentName, sScopeTypeDesc, sSerialNumber, dtDateIn, sComplaintDesc, 
					ResultOfImproperCareByCustomer, Failure_ImproperCare, Failure_Part, Failure_Cosmetic, Failure_ImproperTechnique, Failure_PreviousInspection,
					Failure_PreviousRepairs, Failure_Complaint, Failure_NoPreviousRepairs, Failure_Other, lDepartmentKey )
				Select 
					InstrumentType, sWorkOrderNumber, sClientName1, sDepartmentName, sScopeTypeDesc, sSerialNumber, dtDateIn, sComplaintDesc, 
					ResultOfImproperCareByCustomer, Failure_ImproperCare, Failure_Part, Failure_Cosmetic, Failure_ImproperTechnique, Failure_PreviousInspection,
					Failure_PreviousRepairs, Failure_Complaint, Failure_NoPreviousRepairs, Failure_Other, -w.lDepartmentKey
				From #With40DaysNorth w

				Drop Table #With40DaysNorth
			END

		Set @Table = ''
		SELECT @Table = @Table +'<tr style="background-color:'+CASE WHEN (ROW_NUMBER() OVER (ORDER BY ID))%2 =1 THEN '#DCDCDC' ELSE '#FFFFFF' END +'; font-size: 10px;">' +
			'<td style="font-size: 10px;">' + IsNull(InstrumentType,'') + '</td>' +
			'<td style="font-size: 10px;">' + IsNull(sWorkOrderNumber,'') + '</td>' +
			'<td style="font-size: 10px; text-align:left">' + IsNull(sClientName1,'') + '</td>' +
			'<td style="font-size: 10px; text-align:left">' + IsNull(sDepartmentName,'') + '</td>' +
			'<td style="font-size: 10px; text-align:left">' + IsNull(sScopeTypeDesc,'') + '</td>' +
			'<td style="font-size: 10px;">' + IsNull(sSerialNumber,'') + '</td>' +
			'<td style="font-size: 10px;">' + IsNull(dtDateIn,'') + '</td>' +
			'<td style="font-size: 10px; text-align:left">' + IsNull(sComplaintDesc,'') + '</td>' +
			'<td style="font-size: 10px; text-align:left">' 
				+ Case When IsNull(Failure_ImproperCare,'')='' Then '' Else 'Improper Care' + '<br \>' End + 
				+ Case When IsNull(Failure_Part,'')='' Then '' Else 'Part failure unrelated to previous repairs' + '<br \>' End + 
				+ Case When IsNull(Failure_Cosmetic,'')='' Then '' Else 'Cosmetic issue unrelated to previous repairs' + '<br \>' End + 
				+ Case When IsNull(Failure_ImproperTechnique,'')='' Then '' Else 'Failure Improper Technique' + '<br \>' End + 
				+ Case When IsNull(Failure_PreviousInspection,'')='' Then '' Else 'Failure during previous final inspection' + '<br \>' End + 
				+ Case When IsNull(Failure_PreviousRepairs,'')='' Then '' Else 'Failure during previous repairs' + '<br \>' End + 
				+ Case When IsNull(Failure_Complaint,'')='' Then '' Else 'Unable to duplicate customer complaint' + '<br \>' End + 
				+ Case When IsNull(Failure_NoPreviousRepairs,'')='' Then '' Else 'No previous repairs' + '<br \>' End + 
				+ Case When IsNull(Failure_Other,'')='' Then '' Else 'Other' + '<br \>' End + 
			'</td>' +
			'</tr>'
		FROM @Within40 w join (Select lDepartmentKey From @Within40 Group By lDepartmentKey Having Count(lDepartmentKey)>2) d on (w.lDepartmentKey=d.lDepartmentKey)
		ORDER BY ID

		SET @tableHTML = 
		N'<table border="1" cellpadding="2" cellspacing="0" style="color:black;font-family:arial,helvetica,sans-serif;text-align:center;" >' +
		N'<tr style ="font-size: 10px;font-weight: normal;background: #b9c9fe;">
		<th style="padding-left:10px; padding-right:10px">Instrument Type</th>
		<th style="padding-left:10px; padding-right:10px">Work Order</th>
		<th style="padding-left:10px; padding-right:10px">Client</th>
		<th style="padding-left:10px; padding-right:10px">Department</th>
		<th style="padding-left:10px; padding-right:10px">Model</th>
		<th style="padding-left:10px; padding-right:10px">Serial #</th>
		<th style="padding-left:10px; padding-right:10px">Date In</th>
		<th style="padding-left:10px; padding-right:10px">Complaint</th>
		<th style="padding-left:10px; padding-right:10px">Checked Items</th>
		</tr>' + @Table + N'</table>'

		Set @emailHTML = @emailHTML + @tableHTML
	End

	Drop Table #Repairs
	Drop Table #RepairsTemp
	Drop Table #Within40DaysCounts

	Declare @ProfileName nvarchar(50)

	If @@ServerName='SBLACK17R'		
		Set @ProfileName = 'Master Profile'
	Else
		Set @ProfileName = 'TSI Profile'

	If @bTSI = 1
		BEGIN
			EXEC msdb.dbo.sp_send_dbmail @recipients='JBrassell@totalscopeinc.com; dkennedy@totalscopeinc.com; ecarrafa@totalscopeinc.com; aglavin@totalscopeinc.com; mglavin@totalscopeinc.com; jmartin@totalscopeinc.com; rGeorge@totalscopeinc.com; jlloyd@totalscopeinc.com',
			--EXEC msdb.dbo.sp_send_dbmail @recipients='steve.black@brightlogix.com',
			@profile_name = @ProfileName,
			@subject = @subject,
			@body = @emailHTML,
			@body_format = 'HTML' ;
		END
	else
		BEGIN
			EXEC msdb.dbo.sp_send_dbmail @recipients='JBrassell@totalscopeinc.com; dkennedy@totalscopeinc.com; aglavin@totalscopeinc.com; mglavin@totalscopeinc.com; ceccles@totalscopeinc.com; ddelancey@totalscopeinc.com',
			--EXEC msdb.dbo.sp_send_dbmail @recipients='steve.black@brightlogix.com',
			@profile_name = @ProfileName,
			@blind_copy_recipients = 'steve.black@brightlogix.com',
			@subject = @subject,
			@body = @emailHTML,
			@body_format = 'HTML' ;
		END

END
